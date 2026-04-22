# Deployment and Scaling Guide

## Overview

This project implements:

1. **Automated CI/CD with Docker** - Build images once with unique tags
2. **Build-Config Separation** - Same image used across environments
3. **Horizontal Scaling** - Multiple backend instances with load balancing
4. **Session Management** - Redis-based sessions for stateless instances
5. **Environment-Specific Config** - Different configs per environment

## Project Structure

```
.
├── .github/workflows/
│   └── ci-cd.yml                    # GitHub Actions CI/CD pipeline
├── backend/
│   ├── dockerfile                   # Multi-stage Docker build
│   ├── package.json                 # Dependencies with Redis support
│   └── src/
│       ├── config/
│       │   ├── config.js           # Environment configuration
│       │   └── session.js          # Redis session setup
│       └── app.js                  # Express app with session middleware
├── docker-compose.yml              # Production-ready compose file
├── .env.example                    # Example environment file
├── .env.development                # Development config
├── .env.staging                    # Staging config
├── .env.production                 # Production config
└── scripts/
    ├── build.sh                    # Local build with tagging
    ├── deploy.sh                   # Deploy with specific image tags
    └── load-test.js               # Load testing tool
```

## Quick Start - Local Development

### 1. Install Dependencies

Ensure you have:

- Docker Desktop (or Docker + Docker Compose)
- Node.js 18+ (for load testing)
- git

### 2. Start Development Environment

```bash
# Copy environment file
cp .env.example .env.development

# Start all services
docker-compose -f docker-compose.yml up -d

# Wait for services to be healthy
sleep 10

# Check status
docker-compose ps
```

### 3. Verify Services

```bash
# Check health
curl http://localhost:8080/health

# Check API
curl http://localhost:8080/

# Check status and instance info
curl http://localhost:8080/status
```

### 4. Test Sessions (Sticky Sessions with Redis)

```bash
# Login
curl -c cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}' \
  http://localhost:8080/auth/login

# Check profile (session should be preserved across instances)
curl -b cookies.txt http://localhost:8080/auth/profile

# Logout
curl -b cookies.txt -X POST http://localhost:8080/auth/logout
```

### 5. Run Load Testing

```bash
# Install load testing dependencies (already have Node.js)
# Run load tests
node scripts/load-test.js

# Or with custom settings
API_BASE_URL=http://localhost:8080 \
NUM_REQUESTS=100 \
CONCURRENCY=10 \
NUM_USERS=5 \
node scripts/load-test.js
```

## Docker Build Process

### Local Build with Tagging

```bash
# Build with unique tag
chmod +x scripts/build.sh
./scripts/build.sh

# Build with custom version
APP_VERSION=1.2.3 BUILD_NUMBER=42 ./scripts/build.sh
```

This generates:

- `localhost:5000/card-collection-backend:1.0.0`
- `localhost:5000/card-collection-backend:1.0.0-build-42`
- `localhost:5000/card-collection-backend:1.0.0-<commit-hash>`
- `localhost:5000/card-collection-backend:latest`

### Understanding the Docker Build

**Multi-stage Dockerfile:**

1. **Builder stage**: Installs production dependencies
2. **Runtime stage**: Copies dependencies, adds source code
3. **No environment variables in image**: All config via docker-compose or deployment

Key points:

- The image is **environment-agnostic**
- Port not hardcoded (passed via ENV)
- No secrets in image
- Uses `npm start` (production mode, not nodemon)
- Includes health check

## Deployment Process

### 1. Build Image (CI/CD does this automatically)

```bash
# Local example
docker build -t ghcr.io/username/card-collection-backend:1.0.0 ./backend
docker push ghcr.io/username/card-collection-backend:1.0.0
```

### 2. Deploy with Configuration

```bash
# Deploy to development
chmod +x scripts/deploy.sh
./scripts/deploy.sh development localhost:5000/card-collection-backend:1.0.0

# Deploy to staging
./scripts/deploy.sh staging ghcr.io/username/card-collection-backend:1.0.0 --replicas 5

# Deploy to production
./scripts/deploy.sh production ghcr.io/username/card-collection-backend:1.0.0 --replicas 10 --pull
```

The deploy script:

- Loads environment-specific `.env.{environment}` file
- Creates a docker-compose override file with the image tag
- Passes all configuration via environment variables
- **Does NOT rebuild the image**

### 3. Verify Deployment

```bash
docker-compose ps
docker-compose logs -f backend

# Check specific instance
curl http://localhost:8080/status
curl http://localhost:8081/status
curl http://localhost:8082/status
```

## Horizontal Scaling

### Current Setup

The `docker-compose.yml` specifies:

```yaml
deploy:
  replicas: 3
```

This creates 3 instances of the backend service.

### Scaling Up

**Option 1: Using docker-compose deploy**

```bash
# Modify docker-compose.yml
# Or use the deploy script
./scripts/deploy.sh development localhost:5000/card-collection-backend:1.0.0 --replicas 5
```

**Option 2: Manual scaling**

```bash
docker-compose up -d --scale backend=5
```

### Verify Load Distribution

```bash
# Run multiple requests and check instance IDs
for i in {1..20}; do
  curl -s http://localhost:8080/status | jq '.instanceId'
  curl -s http://localhost:8081/status | jq '.instanceId'
  curl -s http://localhost:8082/status | jq '.instanceId'
done
```

## Session Management (Redis)

### Architecture

1. **Before (problematic):**
   - Each instance had its own in-memory sessions
   - If user's request went to different instance → session lost
   - Called "sticky sessions" - problematic for scaling

2. **After (correct):**
   - All sessions stored in Redis
   - Any instance can access any session
   - True stateless instances
   - Can scale horizontally safely

### Testing Session Persistence

```bash
# Login on port 8080
curl -c cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId": "user1"}' \
  http://localhost:8080/auth/login

# Make multiple requests - should work even if routed to different instances
for i in {1..10}; do
  echo "Request $i:"
  curl -b cookies.txt http://localhost:8080/auth/profile | jq '.'
done

# Logout
curl -b cookies.txt -X POST http://localhost:8080/auth/logout

# Should now return 401
curl -b cookies.txt http://localhost:8080/auth/profile
```

### Redis Configuration

Set in `.env` files:

```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

In production, use external Redis:

```env
REDIS_HOST=redis.production.example.com
REDIS_PORT=6379
REDIS_PASSWORD=very-secure-password
```

## Environment Variables

### Available Variables

| Variable         | Default     | Purpose                        |
| ---------------- | ----------- | ------------------------------ |
| `NODE_ENV`       | development | Environment mode               |
| `PORT`           | 3000        | Server port                    |
| `APP_VERSION`    | dev         | Application version            |
| `DB_HOST`        | localhost   | Database host                  |
| `DB_PORT`        | 5432        | Database port                  |
| `DB_NAME`        | cards       | Database name                  |
| `DB_USER`        | postgres    | Database user                  |
| `DB_PASSWORD`    | postgres    | Database password              |
| `REDIS_HOST`     | localhost   | Redis host                     |
| `REDIS_PORT`     | 6379        | Redis port                     |
| `REDIS_PASSWORD` | -           | Redis password                 |
| `JWT_SECRET`     | supersecret | JWT signing secret             |
| `SESSION_TTL`    | 86400       | Session time-to-live (seconds) |

### Configuration Hierarchy

1. Environment variables in container (highest priority)
2. Defaults in `config.js`

The image contains NO hardcoded configuration - all set at runtime.

## CI/CD Pipeline (GitHub Actions)

### Workflow: `.github/workflows/ci-cd.yml`

**On every push to main/staging/develop:**

1. Checkout code
2. Set up Docker Buildx
3. Extract metadata (version, build number, commit hash)
4. Build Docker image
5. Push to container registry

**Image tags generated:**

- `ghcr.io/user/card-collection-backend:main` (branch)
- `ghcr.io/user/card-collection-backend:build-123` (build number)
- `ghcr.io/user/card-collection-backend:sha-abc123` (commit hash)

**On push to main or staging:**

- Additionally runs deployment job
- Creates deployment manifest with timestamp
- Deploys with environment-specific config

### GitHub Secrets Required

```
PROD_DB_HOST
PROD_DB_NAME
PROD_DB_USER
PROD_JWT_SECRET
STAGING_DB_HOST
STAGING_DB_NAME
STAGING_DB_USER
STAGING_JWT_SECRET
```

## Load Testing

### Using Node.js Load Test Tool

```bash
node scripts/load-test.js
```

Tests performed:

1. Health check
2. Instance distribution
3. Session persistence (multiple users)
4. Concurrent load (50 requests, 5 concurrency)
5. Load distribution across instances

Output:

- Console report
- Results saved to `load-test-results-{timestamp}/`
- Includes metrics, logs, and cookies for debugging

### Custom Load Testing

```bash
# Increase concurrency
NUM_REQUESTS=200 CONCURRENCY=20 node scripts/load-test.js

# Test against production
API_BASE_URL=https://api.production.example.com node scripts/load-test.js
```

## Troubleshooting

### Service fails to start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Redis not running: docker-compose logs redis
# - Database not ready: docker-compose logs db
# - Port already in use
```

### Sessions not persisting

```bash
# Check Redis connection
docker-compose logs redis

# Verify Redis is working
redis-cli ping

# Check session configuration
curl http://localhost:8080/auth/profile  # Should be 401 if not logged in
```

### Instances not receiving balanced load

```bash
# Check that all instances are running
docker-compose ps

# Monitor request distribution
for i in {1..30}; do
  curl -s http://localhost:8080/status | jq '.instanceId'
  sleep 0.1
done
```

### Image pull fails

```bash
# Check image exists in registry
docker pull ghcr.io/username/card-collection-backend:1.0.0

# Login to registry
docker login ghcr.io
```

## Best Practices

1. **Always use specific version tags** in production (not `latest`)
2. **Test in staging** before production deployment
3. **Monitor session storage** - ensure Redis is healthy
4. **Use load balancing** - docker-compose does this automatically
5. **Environment secrets** - use GitHub Secrets for sensitive data
6. **Health checks** - monitor `/health` endpoint regularly
7. **Gradual rollout** - test with 1-2 replicas first

## Next Steps

1. Set up GitHub repository and enable GitHub Actions
2. Configure secrets in GitHub Settings → Secrets
3. Test CI/CD pipeline with a test push
4. Set up proper database (not localhost)
5. Set up Redis cluster for high availability
6. Implement monitoring (Prometheus, Grafana)
7. Add log aggregation (ELK stack)
8. Set up automated backups for database
