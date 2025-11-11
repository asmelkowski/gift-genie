#!/bin/bash

# E2E Testing Setup Script
# Replicates CI environment for local debugging

set -e

echo "🚀 Setting up E2E testing environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

print_status "Building Docker images..."

# Build backend image
print_status "Building backend image..."
docker build -t gift-genie-backend-e2e ./backend --target production

# Build frontend development image
print_status "Building frontend development image..."
docker build -t gift-genie-frontend-e2e ./frontend --target development

print_success "Docker images built successfully"

print_status "Starting E2E services..."

# Create network
docker network create gift-genie_gift-genie-e2e-network 2>/dev/null || true

# Start PostgreSQL
print_status "Starting PostgreSQL..."
docker run -d \
    --name gift-genie-postgres-e2e \
    --network gift-genie_gift-genie-e2e-network \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=gift_genie_test \
    -p 5433:5432 \
    postgres:16-alpine

# Start Redis
print_status "Starting Redis..."
docker run -d \
    --name gift-genie-redis-e2e \
    --network gift-genie_gift-genie-e2e-network \
    -p 6380:6379 \
    redis:7-alpine

print_status "Waiting for services to be healthy..."

# Wait for PostgreSQL
print_status "Waiting for PostgreSQL..."
for i in {1..30}; do
    if docker exec gift-genie-postgres-e2e pg_isready -U postgres > /dev/null 2>&1; then
        print_success "PostgreSQL is ready"
        break
    fi
    echo "  Attempt $i/30: PostgreSQL not ready yet..."
    sleep 2
done

# Wait for Redis
print_status "Waiting for Redis..."
for i in {1..30}; do
    if docker exec gift-genie-redis-e2e redis-cli ping | grep -q PONG; then
        print_success "Redis is ready"
        break
    fi
    echo "  Attempt $i/30: Redis not ready yet..."
    sleep 1
done

# Run database migrations
print_status "Running database migrations..."
docker run --rm \
    --network gift-genie_gift-genie-e2e-network \
    -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/gift_genie_test \
    gift-genie-backend-e2e \
    alembic upgrade head

print_success "Database migrations completed"

# Start backend
print_status "Starting backend server..."
docker run -d \
    --name gift-genie-backend-e2e \
    --network gift-genie_gift-genie-e2e-network \
    -p 8001:8000 \
    -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/gift_genie_test \
    -e REDIS_URL=redis://redis:6379 \
    -e SECRET_KEY=test-secret-key-for-e2e \
    -e ALGORITHM=HS256 \
    -e ACCESS_TOKEN_EXPIRE_MINUTES=30 \
    -e PROD=true \
    gift-genie-backend-e2e

# Start frontend
print_status "Starting frontend server..."
docker run -d \
    --name gift-genie-frontend-e2e \
    --network gift-genie_gift-genie-e2e-network \
    -p 5174:5173 \
    -e VITE_API_BASE_URL=http://backend:8000/api/v1 \
    gift-genie-frontend-e2e

# Wait for backend
print_status "Waiting for backend to be healthy..."
success=0
for i in {1..60}; do
    if curl -sf http://localhost:8001/health > /dev/null; then
        print_success "Backend is healthy"
        success=1
        break
    fi
    status=$(docker inspect gift-genie-backend-e2e --format='{{.State.Status}} (exit={{.State.ExitCode}})' 2>/dev/null || echo 'unknown')
    echo "  Attempt $i/60: not ready (status=$status)"
    sleep 2
done

if [ "$success" -ne 1 ]; then
    print_error "Backend did not become healthy in time"
    print_error "Checking backend logs..."
    docker logs gift-genie-backend-e2e
    exit 1
fi

# Wait for frontend
print_status "Waiting for frontend to be ready..."
for i in {1..60}; do
    if curl -sf http://localhost:5174 | grep -q "root"; then
        print_success "Frontend is ready"
        break
    fi
    echo "  Attempt $i/60: Frontend not ready yet..."
    sleep 1
done

# Give frontend a bit more time to fully hydrate
print_status "Allowing frontend to fully hydrate..."
sleep 5

print_success "E2E environment is ready!"
echo ""
echo "🌐 Services running:"
echo "  • PostgreSQL: localhost:5433"
echo "  • Redis: localhost:6380"
echo "  • Backend API: http://localhost:8001"
echo "  • Frontend: http://localhost:5174"
echo ""
echo "🧪 To run E2E tests:"
echo "  ./scripts/e2e-run.sh"
echo ""
echo "🧹 To clean up:"
echo "  ./scripts/e2e-cleanup.sh"
