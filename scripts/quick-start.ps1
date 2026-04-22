# Windows Quick Start Script для локального тестирования

# Цвета
$colors = @{
    Reset = "`e[0m"
    Green = "`e[32m"
    Red = "`e[31m"
    Yellow = "`e[33m"
    Blue = "`e[34m"
    Cyan = "`e[36m"
}

function Write-Info {
    param([string]$Message)
    Write-Host "$($colors.Green)[INFO]$($colors.Reset) $Message"
}

function Write-Error {
    param([string]$Message)
    Write-Host "$($colors.Red)[ERROR]$($colors.Reset) $Message"
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n$($colors.Blue)=== $Message ===$($colors.Reset)"
}

function Write-Result {
    param([string]$Message)
    Write-Host "$($colors.Cyan)$Message$($colors.Reset)"
}

# Проверяем наличие Docker
Write-Step "Checking Prerequisites"

$checks = @(
    @{ Name = "Docker"; Command = "docker --version" }
    @{ Name = "Docker Compose"; Command = "docker-compose --version" }
    @{ Name = "Node.js"; Command = "node --version" }
)

foreach ($check in $checks) {
    try {
        $result = Invoke-Expression $check.Command 2>&1
        Write-Info "$($check.Name): $result"
    }
    catch {
        Write-Error "$($check.Name) is not installed: $_"
        exit 1
    }
}

# Шаг 1: Подготовка
Write-Step "Step 1: Preparing Environment"

if (!(Test-Path ".env.development")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.development"
        Write-Info "Created .env.development from .env.example"
    }
    else {
        Write-Error ".env.example not found"
        exit 1
    }
}
else {
    Write-Info ".env.development already exists"
}

# Шаг 2: Запуск Docker Compose
Write-Step "Step 2: Starting Services"

Write-Info "Starting Docker Compose services..."
& docker-compose -f docker-compose.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start Docker Compose"
    exit 1
}

Write-Info "Services started. Waiting for them to be ready..."
Start-Sleep -Seconds 10

# Шаг 3: Проверка здоровья сервисов
Write-Step "Step 3: Health Check"

$healthCheckUrl = "http://localhost:8080/health"
$maxRetries = 30
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri $healthCheckUrl -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Result "✓ Health check passed"
            Write-Info "Health status: $($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 1)"
            break
        }
    }
    catch {
        $retryCount++
        if ($retryCount % 5 -eq 0) {
            Write-Info "Retrying health check... ($retryCount/$maxRetries)"
        }
        Start-Sleep -Seconds 2
    }
}

if ($retryCount -eq $maxRetries) {
    Write-Error "Health check failed after $maxRetries attempts"
    Write-Info "Checking Docker Compose status:"
    & docker-compose ps
    exit 1
}

# Шаг 4: Информация о сервисах
Write-Step "Step 4: Service Status"

& docker-compose ps

# Шаг 5: Проверка инстансов
Write-Step "Step 5: Instance Information"

Write-Info "Checking available instances..."

@(8080, 8081, 8082) | ForEach-Object {
    $port = $_
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/status" -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        Write-Result "Port $port - Instance: $($data.instanceId), PID: $($data.pid)"
    }
    catch {
        Write-Info "Port $port - Not responding (might not be running)"
    }
}

# Шаг 6: Тестирование сессий
Write-Step "Step 6: Testing Session Management"

Write-Info "Testing user login and session persistence..."

try {
    # Login
    $loginUrl = "http://localhost:8080/auth/login"
    $body = @{ userId = "test-user-$(Get-Random)" } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri $loginUrl -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -SessionVariable session `
        -ErrorAction Stop
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    Write-Result "✓ Logged in: SessionID=$($loginData.sessionId)"
    
    # Check profile
    $profileUrl = "http://localhost:8080/auth/profile"
    $profileResponse = Invoke-WebRequest -Uri $profileUrl `
        -WebSession $session `
        -ErrorAction Stop
    
    $profileData = $profileResponse.Content | ConvertFrom-Json
    Write-Result "✓ Session persisted: UserID=$($profileData.userId)"
    
    # Logout
    $logoutUrl = "http://localhost:8080/auth/logout"
    $logoutResponse = Invoke-WebRequest -Uri $logoutUrl -Method POST `
        -WebSession $session `
        -ErrorAction Stop
    
    Write-Result "✓ Logged out successfully"
}
catch {
    Write-Error "Session test failed: $_"
}

# Шаг 7: Load Testing
Write-Step "Step 7: Running Load Tests"

Write-Info "Starting load test (50 requests, 5 concurrent)..."
$startTime = Get-Date

& node scripts/load-test.js

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Result "Load test completed in $([math]::Round($duration, 2)) seconds"

# Завершение
Write-Step "Quick Start Completed Successfully"

Write-Info "Available endpoints:"
Write-Info "  GET    http://localhost:8080/health      - Health check"
Write-Info "  GET    http://localhost:8080/status      - Instance status"
Write-Info "  GET    http://localhost:8080/            - API info"
Write-Info "  GET    http://localhost:8080/cards       - Get all cards"
Write-Info "  POST   http://localhost:8080/auth/login  - Login (JSON: {userId})"
Write-Info "  GET    http://localhost:8080/auth/profile - Get profile"
Write-Info "  POST   http://localhost:8080/auth/logout - Logout"

Write-Info ""
Write-Info "Docker Compose commands:"
Write-Info "  docker-compose logs -f backend    - View backend logs"
Write-Info "  docker-compose logs -f redis      - View Redis logs"
Write-Info "  docker-compose ps                 - Show service status"
Write-Info "  docker-compose down               - Stop all services"

Write-Info ""
Write-Info "To run load tests again:"
Write-Info "  node scripts/load-test.js"

Write-Info ""
Write-Info "To stop services:"
Write-Info "  docker-compose down"

Write-Result "Ready for testing! Press Ctrl+C to stop monitoring or run more tests."
