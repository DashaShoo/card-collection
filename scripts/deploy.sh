#!/bin/bash
# Скрипт для развёртывания приложения с использованием предварительно собранного образа

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Функция для вывода справки
usage() {
    echo "Usage: $0 <environment> <image-tag> [options]"
    echo ""
    echo "Environments: development, staging, production"
    echo ""
    echo "Examples:"
    echo "  $0 development localhost:5000/card-collection-backend:1.0.0"
    echo "  $0 staging ghcr.io/user/card-collection-backend:1.0.0-build-123"
    echo "  $0 production ghcr.io/user/card-collection-backend:1.0.0"
    echo ""
    echo "Options:"
    echo "  --replicas N    Number of backend replicas (default: 3)"
    echo "  --pull          Always pull image before running"
    exit 1
}

# Проверяем аргументы
if [ $# -lt 2 ]; then
    usage
fi

ENVIRONMENT=$1
IMAGE_TAG=$2
REPLICAS=3
PULL_IMAGE=false

# Парсим дополнительные опции
shift 2
while [[ $# -gt 0 ]]; do
    case $1 in
        --replicas)
            REPLICAS=$2
            shift 2
            ;;
        --pull)
            PULL_IMAGE=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Загружаем .env
ENV_FILE=".env.${ENVIRONMENT}"
if [ ! -f "$ENV_FILE" ]; then
    print_warning "Environment file not found: $ENV_FILE"
    print_info "Using .env as fallback"
    if [ -f .env ]; then
        ENV_FILE=".env"
    else
        print_error "No environment configuration found"
        exit 1
    fi
fi

# Загружаем переменные окружения
set -a
source "$ENV_FILE"
set +a

print_step "Deployment Information"
echo "Environment: $ENVIRONMENT"
echo "Image: $IMAGE_TAG"
echo "Replicas: $REPLICAS"
echo "Config file: $ENV_FILE"

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi

# Подготавливаем docker-compose override файл для конкретного окружения
print_step "Preparing deployment configuration"

COMPOSE_OVERRIDE_FILE="docker-compose.override.${ENVIRONMENT}.yml"
cat > "$COMPOSE_OVERRIDE_FILE" << EOF
version: "3.8"

services:
  backend:
    image: $IMAGE_TAG
    deploy:
      replicas: $REPLICAS
    pull_policy: ${PULL_IMAGE:+always||missing}
    environment:
      NODE_ENV: $ENVIRONMENT
      APP_VERSION: ${APP_VERSION:-1.0.0}
      
      # Database
      DB_HOST: ${DB_HOST:-db}
      DB_PORT: ${DB_PORT:-5432}
      DB_NAME: ${DB_NAME:-cards}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:-postgres}
      
      # Redis
      REDIS_HOST: ${REDIS_HOST:-redis}
      REDIS_PORT: ${REDIS_PORT:-6379}
      REDIS_PASSWORD: ${REDIS_PASSWORD:-}
      
      # Security
      JWT_SECRET: ${JWT_SECRET:-supersecret}
      SESSION_TTL: ${SESSION_TTL:-86400}

  db:
    environment:
      POSTGRES_DB: ${DB_NAME:-cards}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}

  redis:
    command: redis-server --appendonly yes ${REDIS_PASSWORD:+--requirepass ${REDIS_PASSWORD}}
EOF

print_info "Created: $COMPOSE_OVERRIDE_FILE"

# Сохраняем информацию о развёртывании
print_step "Creating deployment manifest"

DEPLOYMENT_MANIFEST="deployment-manifest-${ENVIRONMENT}-$(date +%s).json"
cat > "$DEPLOYMENT_MANIFEST" << EOF
{
  "environment": "$ENVIRONMENT",
  "image": "$IMAGE_TAG",
  "replicas": $REPLICAS,
  "config_file": "$ENV_FILE",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "docker_compose_version": "$(docker-compose --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo 'unknown')",
  "docker_version": "$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo 'unknown')"
}
EOF

print_info "Manifest: $DEPLOYMENT_MANIFEST"

# Готовы к развёртыванию
print_step "Deployment ready"
echo ""
echo "To start the deployment, run:"
echo "  docker-compose -f docker-compose.yml -f $COMPOSE_OVERRIDE_FILE up -d"
echo ""
echo "Or let this script do it (uncomment the next line if running interactively)"
echo ""

# Опционально: автоматический запуск (с подтверждением)
read -p "Start deployment now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Starting deployment..."
    docker-compose -f docker-compose.yml -f "$COMPOSE_OVERRIDE_FILE" up -d
    
    print_step "Waiting for services to be healthy"
    sleep 5
    
    # Проверяем статус
    if docker-compose ps | grep -q "healthy"; then
        print_info "Deployment successful!"
        docker-compose ps
    else
        print_warning "Some services may not be healthy yet"
        docker-compose ps
    fi
else
    print_info "Deployment cancelled"
fi
