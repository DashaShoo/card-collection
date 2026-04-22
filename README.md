# Card Collection - Scalable API with CI/CD

A production-ready Node.js/Express API for card collection management, demonstrating:

- ✅ CI/CD pipeline with Docker image tagging
- ✅ Build-Config separation for multi-environment deployments
- ✅ Horizontal scaling with load distribution
- ✅ Session management with Redis (stateless instances)
- ✅ Docker Compose for local development and staging

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for load testing)
- Git

### Start Development Environment (Windows)

```powershell
# Run the quick start script
.\scripts\quick-start.ps1
```

### Start Development Environment (Linux/macOS)

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run docker-compose
docker-compose -f docker-compose.yml up -d

# Wait for services to be ready
sleep 10

# Test health
curl http://localhost:8080/health
```

### Run Load Tests

```powershell
# Windows
node scripts/load-test.js

# Linux/macOS
node scripts/load-test.js
```

## Architecture

### Key Components

1. **Backend API** (Node.js/Express)
   - 3 instances by default (configurable)
   - No hardcoded configuration
   - Environment-specific setup at runtime

2. **PostgreSQL Database**
   - Persistent data storage
   - Automatic initialization

3. **Redis**
   - Centralized session storage
   - Enables stateless backend instances
   - Supports horizontal scaling

4. **CI/CD Pipeline** (GitHub Actions)
   - Automated builds on every push
   - Unique image tags (version + build number + commit hash)
   - Automatic deployment to staging/production

## Deployment Models

### Model 1: Local Development

```bash
docker-compose -f docker-compose.yml up -d
# Access: http://localhost:8080
```

### Model 2: Staging

```bash
./scripts/deploy.sh staging ghcr.io/username/card-collection-backend:1.0.0 --replicas 3
```

### Model 3: Production

```bash
./scripts/deploy.sh production ghcr.io/username/card-collection-backend:1.0.0 --replicas 10
```

## API Endpoints

### Health & Status

- `GET /health` - Health check
- `GET /status` - Instance status and metrics
- `GET /` - API information

### Cards (Example API)

- `GET /cards` - List all cards
- `POST /cards` - Create new card
- `GET /cards/:id` - Get card by ID

### Authentication & Sessions

- `POST /auth/login` - Login (stores session in Redis)
- `GET /auth/profile` - Get current user (session-based)
- `POST /auth/logout` - Logout (clears session)

## Environment Configuration

### Available Variables

```env
# Application
NODE_ENV=development          # development|staging|production
APP_VERSION=1.0.0            # Version string
PORT=3000                    # Server port

# Database
DB_HOST=localhost            # Database hostname
DB_PORT=5432                 # Database port
DB_NAME=cards                # Database name
DB_USER=postgres             # Database user
DB_PASSWORD=postgres         # Database password

# Redis (Sessions)
REDIS_HOST=localhost         # Redis hostname
REDIS_PORT=6379             # Redis port
REDIS_PASSWORD=             # Redis password (if required)

# Security
JWT_SECRET=supersecret       # JWT signing secret
SESSION_TTL=86400            # Session duration in seconds
```

### Configuration Files

- `.env.example` - Template with all variables
- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

## Testing

### Unit & Integration Tests (Placeholder)

```bash
cd backend
npm test
```

### Load Testing

```bash
# Default: 50 requests, 5 concurrent users
node scripts/load-test.js

# Custom settings
API_BASE_URL=http://localhost:8080 \
NUM_REQUESTS=200 \
CONCURRENCY=20 \
NUM_USERS=10 \
node scripts/load-test.js
```

Load test verifies:
✓ Health check and availability
✓ Instance distribution
✓ Session persistence across instances
✓ Concurrent request handling
✓ Response time metrics

### Manual Testing

```bash
# Terminal 1: Start services
docker-compose up

# Terminal 2: Run tests
# Test login with session
curl -c cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId": "test"}' \
  http://localhost:8080/auth/login

# Test session persistence
curl -b cookies.txt http://localhost:8080/auth/profile

# Test multiple instances
curl http://localhost:8080/status   # Instance 1
curl http://localhost:8081/status   # Instance 2
curl http://localhost:8082/status   # Instance 3
```

## Project Structure

```
card-collection/
├── .github/workflows/
│   └── ci-cd.yml                    # GitHub Actions pipeline
├── backend/
│   ├── dockerfile                   # Multi-stage Docker build
│   ├── package.json
│   └── src/
│       ├── config/
│       │   ├── config.js           # Environment config loader
│       │   ├── db.js               # Database config
│       │   └── session.js          # Redis session middleware
│       ├── controllers/
│       ├── routes/
│       ├── services/
│       ├── app.js                  # Main Express app
│       └── initDb.js
├── frontend/
│   └── ...
├── docker-compose.yml              # Development & staging setup
├── .env.example
├── .env.development
├── .env.staging
├── .env.production
├── DEPLOYMENT.md                   # Detailed deployment guide
└── scripts/
    ├── build.sh                    # Local Docker build
    ├── deploy.sh                   # Deploy with image tag
    ├── load-test.sh               # Bash load testing
    ├── load-test.js               # Node.js load testing
    └── quick-start.ps1            # Windows quick start
```

## Building and Pushing Images

### Local Build (with tagging)

```bash
chmod +x scripts/build.sh
./scripts/build.sh
```

Generates tags like:

- `localhost:5000/card-collection-backend:1.0.0`
- `localhost:5000/card-collection-backend:1.0.0-build-42`
- `localhost:5000/card-collection-backend:1.0.0-abc123` (commit hash)
- `localhost:5000/card-collection-backend:latest`

### Push to Registry

```bash
docker push ghcr.io/username/card-collection-backend:1.0.0
docker push ghcr.io/username/card-collection-backend:1.0.0-build-42
```

## CI/CD Pipeline

### GitHub Actions Workflow

When you push to the repository:

1. **main branch** → Build image + Deploy to production
2. **staging branch** → Build image + Deploy to staging
3. **Pull requests** → Build image (no deploy)

Images are automatically tagged with:

- Version (from package.json or APP_VERSION)
- Build number
- Commit hash

### Required GitHub Secrets

```
PROD_DB_HOST
PROD_DB_NAME
PROD_DB_USER
PROD_DB_PASSWORD
PROD_JWT_SECRET

STAGING_DB_HOST
STAGING_DB_NAME
STAGING_DB_USER
STAGING_DB_PASSWORD
STAGING_JWT_SECRET
```

## Scaling

### Horizontal Scaling

1. **Local (docker-compose):**

```bash
docker-compose up -d --scale backend=5
```

2. **Via deploy script:**

```bash
./scripts/deploy.sh production <image-tag> --replicas 10
```

3. **In kubernetes or cloud platform:**
   - Use the exact image tag (e.g., `ghcr.io/username/backend:1.0.0-build-123`)
   - Set environment variables for each environment
   - All instances share Redis for sessions

### Load Balancing

The built-in Docker Compose network automatically load-balances across instances. Requests to `http://localhost:8080` are distributed among running backend instances.

Verify distribution:

```bash
# Make 30 requests and check which instance handles each
for i in {1..30}; do
  curl -s http://localhost:8080/status | jq '.instanceId'
done
```

## Stateless Design

### Why Stateless?

Traditional stateful design fails when scaling:

- Instance 1: Has user session
- Instance 2: Doesn't have session → User logged out
- Solution: Store sessions externally (Redis)

### Session Flow

1. User logs in → Session created in Redis
2. Cookie/Token sent to client
3. Client sends cookie with each request
4. Any instance retrieves session from Redis
5. Works regardless of which instance handles the request

### Verification

```bash
# Login creates Redis session
curl -c cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId": "user1"}' \
  http://localhost:8080/auth/login

# Multiple requests maintain session
# Can be routed to different instances
for i in {1..10}; do
  curl -b cookies.txt http://localhost:8080/auth/profile
done

# All should return the same user
```

## Docker Image Details

### Multi-stage Build

1. **Builder Stage:** Installs production dependencies
2. **Runtime Stage:** Minimal image with only dependencies + code

Benefits:

- Smaller image size
- No build tools in production
- No source code compilation artifacts

### No Hardcoded Configuration

- No environment variables in image
- No secrets in image
- Same image works for dev/staging/production
- Configuration passed at runtime

### Health Check

Built-in health check in Docker image:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000), ...)"
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs backend
docker-compose logs redis
docker-compose logs db

# Clean up and restart
docker-compose down -v
docker-compose up -d
```

### Sessions not working

```bash
# Verify Redis is running
docker-compose logs redis
redis-cli ping

# Check session configuration
cat backend/src/config/session.js
```

### Load balancing not working

```bash
# Verify multiple instances are running
docker-compose ps

# Check ports 8080, 8081, 8082
curl http://localhost:8080/status
curl http://localhost:8081/status
curl http://localhost:8082/status
```

### Image build fails

```bash
# Check Docker
docker ps
docker images

# Check build log
docker build -t test ./backend

# Clean Docker cache if needed
docker system prune -a
```

## Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide with examples
- [backend/README.md](backend/README.md) - Backend API documentation
- [frontend/README.md](frontend/README.md) - Frontend documentation

## Contributing

1. Create a feature branch from `develop`
2. Make changes
3. Test with load-test.js
4. Create pull request
5. CI/CD pipeline validates changes
6. Merge to trigger automatic deployment

## License

ISC

## Support

For issues or questions, see [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section.
