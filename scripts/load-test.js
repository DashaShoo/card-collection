#!/usr/bin/env node
/**
 * Load Testing Tool для проверки горизонтального масштабирования
 * Работает на Windows, macOS и Linux
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");

// Параметры по умолчанию
const config = {
  apiUrl: process.env.API_BASE_URL || "http://localhost:8080",
  numRequests: parseInt(process.env.NUM_REQUESTS) || 50,
  concurrency: parseInt(process.env.CONCURRENCY) || 5,
  numUsers: parseInt(process.env.NUM_USERS) || 3,
};

// Цвета для консоли
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg) => console.log(`${colors.green}[INFO]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warning: (msg) =>
    console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.blue}=== ${msg} ===${colors.reset}`),
  result: (msg) => console.log(`${colors.cyan}${msg}${colors.reset}`),
};

// Функция для отправки HTTP запроса
function makeRequest(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(urlStr);
    const protocol = requestUrl.protocol === "https:" ? https : http;

    const requestOptions = {
      hostname: requestUrl.hostname,
      port: requestUrl.port || (requestUrl.protocol === "https:" ? 443 : 80),
      path: requestUrl.pathname + requestUrl.search,
      method: options.method || "GET",
      timeout: 5000,
      headers: {
        "User-Agent": "LoadTester/1.0",
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          timestamp: Date.now(),
        });
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Функция для параллельного выполнения задач
async function parallel(tasks, concurrency) {
  const results = [];
  const executing = [];

  for (const [index, task] of tasks.entries()) {
    const promise = Promise.resolve()
      .then(() => task())
      .then((result) => {
        results[index] = result;
      });

    results[index] = promise;
    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1,
      );
    }
  }

  await Promise.all(executing);
  return results;
}

// Test 1: Health Check
async function testHealthCheck() {
  log.step("Test 1: Health Check");

  try {
    const response = await makeRequest(`${config.apiUrl}/health`);

    if (response.statusCode === 200) {
      log.result(`✓ Health check passed (HTTP ${response.statusCode})`);
      const body = JSON.parse(response.body);
      console.log(JSON.stringify(body, null, 2));
      return true;
    } else {
      log.error(`Health check failed (HTTP ${response.statusCode})`);
      console.log(response.body);
      return false;
    }
  } catch (err) {
    log.error(`Health check error: ${err.message}`);
    return false;
  }
}

// Test 2: Instance Distribution
async function testInstanceDistribution() {
  log.step("Test 2: Instance Distribution Check");

  const instances = new Map();
  log.info("Making requests to detect instances...");

  const tasks = Array.from({ length: 20 }, async (_, i) => {
    try {
      const response = await makeRequest(`${config.apiUrl}/status`);
      const body = JSON.parse(response.body);
      const instance = body.instanceId || "unknown";
      const pid = body.pid || "unknown";

      instances.set(instance, (instances.get(instance) || 0) + 1);
      console.log(`Request ${i + 1}: Instance=${instance}, PID=${pid}`);

      return { instance, pid };
    } catch (err) {
      console.log(`Request ${i + 1}: Error - ${err.message}`);
      return null;
    }
  });

  await Promise.all(tasks);

  log.result(`Found ${instances.size} different instances:`);
  for (const [instance, count] of instances.entries()) {
    console.log(`  - ${instance}: ${count} requests`);
  }

  return instances;
}

// Test 3: Session Persistence
async function testSessionPersistence() {
  log.step("Test 3: Session Persistence Test");

  const cookieJars = {};
  const results = [];

  for (let user = 1; user <= config.numUsers; user++) {
    log.info(`Simulating User ${user}...`);

    try {
      // Login
      const loginResponse = await makeRequest(`${config.apiUrl}/auth/login`, {
        method: "POST",
        body: JSON.stringify({ userId: `user-${user}` }),
      });

      const loginBody = JSON.parse(loginResponse.body);
      const sessionId = loginBody.sessionId;
      const setCookie = loginResponse.headers["set-cookie"];

      cookieJars[user] = setCookie ? setCookie[0] : "";

      log.result(`  User ${user}: SessionID=${sessionId}`);

      // Make 5 requests to check session persistence
      let sessionMaintained = true;
      for (let req = 1; req <= 5; req++) {
        const headers = cookieJars[user]
          ? { Cookie: cookieJars[user] }
          : undefined;

        const profileResponse = await makeRequest(
          `${config.apiUrl}/auth/profile`,
          { headers },
        );

        if (profileResponse.statusCode === 200) {
          const profileBody = JSON.parse(profileResponse.body);
          const responseUserId = profileBody.userId;

          if (responseUserId === `user-${user}`) {
            console.log(
              `    Request ${req}: ✓ Session maintained (User=${responseUserId})`,
            );
          } else {
            console.log(
              `    Request ${req}: ✗ Session lost (Expected user-${user}, got ${responseUserId})`,
            );
            sessionMaintained = false;
          }
        } else {
          console.log(
            `    Request ${req}: ✗ Error (HTTP ${profileResponse.statusCode})`,
          );
          sessionMaintained = false;
        }
      }

      results.push({
        user,
        sessionId,
        maintained: sessionMaintained,
      });
    } catch (err) {
      log.error(`User ${user}: ${err.message}`);
      results.push({
        user,
        maintained: false,
        error: err.message,
      });
    }
  }

  return results;
}

// Test 4: Concurrent Load Test
async function testConcurrentLoad() {
  log.step("Test 4: Concurrent Requests Load Test");

  log.info(
    `Sending ${config.numRequests} concurrent requests with concurrency=${config.concurrency}...`,
  );

  const results = [];
  const startTime = Date.now();

  const tasks = Array.from({ length: config.numRequests }, async (_, i) => {
    const reqStartTime = Date.now();
    try {
      const response = await makeRequest(`${config.apiUrl}/cards`);
      const reqTime = (Date.now() - reqStartTime) / 1000;

      return {
        index: i,
        statusCode: response.statusCode,
        responseTime: reqTime,
        success: response.statusCode === 200,
      };
    } catch (err) {
      const reqTime = (Date.now() - reqStartTime) / 1000;
      return {
        index: i,
        statusCode: 0,
        responseTime: reqTime,
        success: false,
        error: err.message,
      };
    }
  });

  await parallel(tasks, config.concurrency);

  const totalTime = (Date.now() - startTime) / 1000;

  // Анализируем результаты
  const successCount = tasks.filter((t) => t.success).length;
  const failCount = tasks.filter((t) => !t.success).length;
  const responseTimes = tasks.map((t) => t.responseTime);
  const avgTime =
    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minTime = Math.min(...responseTimes);
  const maxTime = Math.max(...responseTimes);
  const requestsPerSec = (config.numRequests / totalTime).toFixed(2);

  log.step("Load Test Results Analysis");

  log.result(`Total Requests: ${config.numRequests}`);
  log.result(
    `Successful: ${successCount} (${((successCount * 100) / config.numRequests).toFixed(2)}%)`,
  );
  log.result(`Failed: ${failCount}`);
  log.result(`Avg Response Time: ${avgTime.toFixed(3)}s`);
  log.result(`Min Response Time: ${minTime.toFixed(3)}s`);
  log.result(`Max Response Time: ${maxTime.toFixed(3)}s`);
  log.result(`Total Time: ${totalTime.toFixed(2)}s`);
  log.result(`Requests/sec: ${requestsPerSec}`);

  return {
    totalRequests: config.numRequests,
    success: successCount,
    failed: failCount,
    avgTime,
    minTime,
    maxTime,
    totalTime,
    requestsPerSec,
  };
}

// Test 5: Instance Load Distribution
async function testInstanceLoadDistribution() {
  log.step("Test 5: Instance Load Distribution");

  const instanceCounts = new Map();

  const tasks = Array.from({ length: 50 }, async () => {
    try {
      const response = await makeRequest(`${config.apiUrl}/status`);
      const body = JSON.parse(response.body);
      const instance = body.instanceId || "unknown";

      return instance;
    } catch (err) {
      return "error";
    }
  });

  const results = await Promise.all(tasks);

  for (const instance of results) {
    instanceCounts.set(instance, (instanceCounts.get(instance) || 0) + 1);
  }

  log.result("Instance distribution (50 requests):");
  for (const [instance, count] of instanceCounts.entries()) {
    const percentage = ((count * 100) / 50).toFixed(1);
    console.log(`  ${instance}: ${count} requests (${percentage}%)`);
  }

  return instanceCounts;
}

// Main function
async function main() {
  log.step("Load Testing Configuration");
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Total Requests: ${config.numRequests}`);
  console.log(`Concurrency: ${config.concurrency}`);
  console.log(`Simulated Users: ${config.numUsers}`);
  console.log();

  try {
    // Run all tests
    const results = {};

    results.healthCheck = await testHealthCheck();
    console.log();

    results.instances = await testInstanceDistribution();
    console.log();

    results.sessions = await testSessionPersistence();
    console.log();

    results.loadTest = await testConcurrentLoad();
    console.log();

    results.distribution = await testInstanceLoadDistribution();
    console.log();

    // Save results
    const resultsDir = `load-test-results-${Date.now()}`;
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir);
    }

    const summaryFile = path.join(resultsDir, "summary.json");
    fs.writeFileSync(summaryFile, JSON.stringify(results, null, 2));

    log.info(`Results saved to: ${resultsDir}`);
    log.step("Load Testing Completed");
  } catch (err) {
    log.error(`Test failed: ${err.message}`);
    process.exit(1);
  }
}

main();
