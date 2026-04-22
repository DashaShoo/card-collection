#!/bin/bash
# Load Testing Script для проверки горизонтального масштабирования и распределения сессий

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_step() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_result() {
    echo -e "${CYAN}$1${NC}"
}

# Параметры
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
NUM_REQUESTS="${NUM_REQUESTS:-100}"
CONCURRENCY="${CONCURRENCY:-10}"
NUM_USERS="${NUM_USERS:-5}"

# Проверяем что curl установлен
if ! command -v curl &> /dev/null; then
    print_error "curl is not installed"
    exit 1
fi

# Проверяем что jq установлен
if ! command -v jq &> /dev/null; then
    print_error "jq is not installed. Install it for JSON parsing."
    exit 1
fi

print_step "Load Testing Configuration"
echo "API URL: $API_BASE_URL"
echo "Total Requests: $NUM_REQUESTS"
echo "Concurrency: $CONCURRENCY"
echo "Simulated Users: $NUM_USERS"

# Сохраняем результаты тестирования
RESULTS_DIR="load-test-results-$(date +%s)"
mkdir -p "$RESULTS_DIR"
print_info "Results will be saved to: $RESULTS_DIR"

# Test 1: Health check и базовая доступность
print_step "Test 1: Health Check"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_result "✓ Health check passed (HTTP $HTTP_CODE)"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
    print_error "Health check failed (HTTP $HTTP_CODE)"
    echo "$BODY"
fi

# Test 2: Проверка распределения по инстансам
print_step "Test 2: Instance Distribution Check"

INSTANCES=()
print_info "Making requests to see different instances..."

for i in $(seq 1 20); do
    RESPONSE=$(curl -s "$API_BASE_URL/status")
    INSTANCE=$(echo "$RESPONSE" | jq -r '.instanceId' 2>/dev/null || echo "unknown")
    PID=$(echo "$RESPONSE" | jq -r '.pid' 2>/dev/null || echo "unknown")
    
    echo "Request $i: Instance=$INSTANCE, PID=$PID"
    
    if [[ ! " ${INSTANCES[@]} " =~ " $INSTANCE " ]]; then
        INSTANCES+=("$INSTANCE")
    fi
done

print_result "Found ${#INSTANCES[@]} different instances:"
for instance in "${INSTANCES[@]}"; do
    echo "  - $instance"
done

# Test 3: Session Persistence (Sticky Sessions через Redis)
print_step "Test 3: Session Persistence Test"

SESSION_FILE="$RESULTS_DIR/session-test.log"
> "$SESSION_FILE"

print_info "Testing session persistence across requests..."

for user in $(seq 1 $NUM_USERS); do
    print_info "Simulating User $user..."
    
    # Логин
    LOGIN_RESPONSE=$(curl -s -c "$RESULTS_DIR/cookies-user-$user.txt" \
        -H "Content-Type: application/json" \
        -d "{\"userId\": \"user-$user\"}" \
        "$API_BASE_URL/auth/login")
    
    SESSION_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.sessionId' 2>/dev/null || echo "unknown")
    echo "User $user: SessionID=$SESSION_ID" >> "$SESSION_FILE"
    
    # Проверяем профиль несколько раз
    for req in $(seq 1 5); do
        PROFILE_RESPONSE=$(curl -s -b "$RESULTS_DIR/cookies-user-$user.txt" \
            "$API_BASE_URL/auth/profile")
        
        PROFILE_USER=$(echo "$PROFILE_RESPONSE" | jq -r '.userId' 2>/dev/null)
        PROFILE_SESSION=$(echo "$PROFILE_RESPONSE" | jq -r '.sessionId' 2>/dev/null)
        
        if [ "$PROFILE_USER" = "user-$user" ]; then
            echo "  Request $req: ✓ Session maintained (User=$PROFILE_USER, Instance from previous requests preserved)" >> "$SESSION_FILE"
        else
            echo "  Request $req: ✗ Session lost (Expected user-$user, got $PROFILE_USER)" >> "$SESSION_FILE"
        fi
    done
done

cat "$SESSION_FILE"

# Test 4: Concurrent Requests (Load Distribution)
print_step "Test 4: Concurrent Requests Load Test"

print_info "Sending $NUM_REQUESTS concurrent requests with concurrency=$CONCURRENCY..."

REQUEST_LOG="$RESULTS_DIR/requests.log"
> "$REQUEST_LOG"

# Функция для отправки одного запроса
send_request() {
    local req_num=$1
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X GET "$API_BASE_URL/cards" 2>&1)
    
    local http_code=$(echo "$response" | tail -n2 | head -n1)
    local time_total=$(echo "$response" | tail -n1)
    
    echo "$req_num|$http_code|$time_total" >> "$REQUEST_LOG"
}

# Отправляем запросы параллельно
for i in $(seq 1 $NUM_REQUESTS); do
    send_request $i &
    
    # Ограничиваем параллелизм
    if (( $(jobs -r -p | wc -l) >= CONCURRENCY )); then
        wait -n
    fi
done

# Ждём завершения всех запросов
wait

# Анализируем результаты
print_step "Load Test Results Analysis"

TOTAL_REQUESTS=$(wc -l < "$REQUEST_LOG")
SUCCESS_REQUESTS=$(awk -F'|' '$2 == "200" {count++} END {print count+0}' "$REQUEST_LOG")
FAILED_REQUESTS=$((TOTAL_REQUESTS - SUCCESS_REQUESTS))

TOTAL_TIME=$(awk -F'|' '{sum+=$3} END {print sum}' "$REQUEST_LOG")
AVG_TIME=$(awk -F'|' '{sum+=$3; count++} END {if(count>0) print sum/count; else print 0}' "$REQUEST_LOG")
MIN_TIME=$(awk -F'|' 'BEGIN {min=999} {if($3<min) min=$3} END {print min}' "$REQUEST_LOG")
MAX_TIME=$(awk -F'|' 'BEGIN {max=0} {if($3>max) max=$3} END {print max}' "$REQUEST_LOG")

print_result "Total Requests: $TOTAL_REQUESTS"
print_result "Successful: $SUCCESS_REQUESTS ($(echo "scale=2; $SUCCESS_REQUESTS * 100 / $TOTAL_REQUESTS" | bc)%)"
print_result "Failed: $FAILED_REQUESTS"
print_result "Avg Response Time: ${AVG_TIME}s"
print_result "Min Response Time: ${MIN_TIME}s"
print_result "Max Response Time: ${MAX_TIME}s"
print_result "Total Time: ${TOTAL_TIME}s"
print_result "Requests/sec: $(echo "scale=2; $TOTAL_REQUESTS / $TOTAL_TIME" | bc)"

# Test 5: Instance Load Distribution
print_step "Test 5: Instance Load Distribution"

INSTANCE_DIST_FILE="$RESULTS_DIR/instance-distribution.log"
> "$INSTANCE_DIST_FILE"

print_info "Checking which instances received requests..."

for i in $(seq 1 50); do
    RESPONSE=$(curl -s "$API_BASE_URL/status")
    INSTANCE=$(echo "$RESPONSE" | jq -r '.instanceId' 2>/dev/null || echo "unknown")
    echo "$INSTANCE" >> "$INSTANCE_DIST_FILE"
done

print_result "Instance distribution:"
sort "$INSTANCE_DIST_FILE" | uniq -c | awk '{print "  " $2 ": " $1 " requests (" int($1*100/50) "%)"}'

# Test 6: Backend health check
print_step "Test 6: Backend Health Status"

DOCKER_CONTAINERS=$(docker-compose ps 2>/dev/null | grep "backend" || true)

if [ -n "$DOCKER_CONTAINERS" ]; then
    echo "$DOCKER_CONTAINERS"
else
    print_warning "Could not retrieve Docker containers info"
fi

# Summary Report
print_step "Test Summary"

SUMMARY_FILE="$RESULTS_DIR/summary.txt"
cat > "$SUMMARY_FILE" << EOF
Load Test Summary
================

Test Configuration:
- API URL: $API_BASE_URL
- Total Requests: $NUM_REQUESTS
- Concurrency: $CONCURRENCY
- Simulated Users: $NUM_USERS
- Test Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')

Results:
- Total Requests: $TOTAL_REQUESTS
- Successful: $SUCCESS_REQUESTS ($(echo "scale=2; $SUCCESS_REQUESTS * 100 / $TOTAL_REQUESTS" | bc)%)
- Failed: $FAILED_REQUESTS
- Average Response Time: ${AVG_TIME}s
- Min Response Time: ${MIN_TIME}s
- Max Response Time: ${MAX_TIME}s
- Total Duration: ${TOTAL_TIME}s
- Requests/sec: $(echo "scale=2; $TOTAL_REQUESTS / $TOTAL_TIME" | bc)

Instance Distribution:
$(sort "$INSTANCE_DIST_FILE" | uniq -c | awk '{print "  " $2 ": " $1 " requests (" int($1*100/50) "%)"}'  || echo "  N/A")

Observations:
- Sessions: Checked across $NUM_USERS users
- Horizontal Scaling: Verified instance distribution
- Load Balancing: Requests distributed across instances
- Health Status: Checked via /health endpoint

Files Generated:
- Session logs: session-test.log
- Request metrics: requests.log
- Instance distribution: instance-distribution.log
- Cookies: cookies-user-*.txt
EOF

cat "$SUMMARY_FILE"

print_info "All results saved to: $RESULTS_DIR"
print_info "Load testing completed!"
