#!/bin/bash
# Скрипт для локальной сборки Docker образа с тегированием

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функции
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Загружаем .env если существует
if [ -f .env ]; then
    source .env
    print_info "Loaded .env file"
fi

# Параметры по умолчанию
REGISTRY="${DOCKER_REGISTRY:-localhost:5000}"
IMAGE_NAME="${DOCKER_IMAGE_NAME:-card-collection-backend}"
BUILD_PATH="${BUILD_PATH:-./backend}"
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%s)}"
VERSION="${APP_VERSION:-1.0.0}"

# Теги для образа
TAGS=(
    "$REGISTRY/$IMAGE_NAME:$VERSION"
    "$REGISTRY/$IMAGE_NAME:$VERSION-build-$BUILD_NUMBER"
    "$REGISTRY/$IMAGE_NAME:$VERSION-$COMMIT_HASH"
    "$REGISTRY/$IMAGE_NAME:latest"
)

print_info "Building Docker image..."
print_info "Registry: $REGISTRY"
print_info "Image: $IMAGE_NAME"
print_info "Version: $VERSION"
print_info "Commit: $COMMIT_HASH"
print_info "Build: $BUILD_NUMBER"

# Подготавливаем теги для docker build
TAG_ARGS=""
for tag in "${TAGS[@]}"; do
    TAG_ARGS="$TAG_ARGS -t $tag"
done

# Собираем образ
print_info "Running: docker build $TAG_ARGS $BUILD_PATH"
docker build $TAG_ARGS \
    --build-arg BUILD_NUMBER=$BUILD_NUMBER \
    --build-arg COMMIT_HASH=$COMMIT_HASH \
    --build-arg VERSION=$VERSION \
    $BUILD_PATH

print_info "Build completed successfully!"
print_info "Image tags:"
for tag in "${TAGS[@]}"; do
    echo "  - $tag"
done

# Опционально: push если PUSH_REGISTRY установлен
if [ -n "$PUSH_REGISTRY" ]; then
    print_info "Pushing image to registry..."
    for tag in "${TAGS[@]}"; do
        print_info "Pushing: $tag"
        docker push "$tag"
    done
fi

# Сохраняем информацию о сборке
BUILD_INFO_FILE="build-info-$BUILD_NUMBER.json"
cat > "$BUILD_INFO_FILE" << EOF
{
  "version": "$VERSION",
  "build_number": $BUILD_NUMBER,
  "commit_hash": "$COMMIT_HASH",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "image_tags": [$(printf '"%s",' "${TAGS[@]}" | sed 's/,$//')],
  "registry": "$REGISTRY"
}
EOF

print_info "Build info saved to: $BUILD_INFO_FILE"
