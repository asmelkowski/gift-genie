#!/bin/bash

# E2E Environment Cleanup Script

echo "🧹 Cleaning up E2E testing environment..."

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

# Stop and remove containers
print_status "Stopping E2E containers..."
docker stop gift-genie-postgres-e2e gift-genie-redis-e2e gift-genie-backend-e2e gift-genie-frontend-e2e 2>/dev/null || true
docker rm gift-genie-postgres-e2e gift-genie-redis-e2e gift-genie-backend-e2e gift-genie-frontend-e2e 2>/dev/null || true

# Remove any leftover containers
print_status "Removing any leftover E2E containers..."
docker rm -f gift-genie-e2e-runner 2>/dev/null || true

# Remove network
print_status "Removing E2E network..."
docker network rm gift-genie-e2e-network 2>/dev/null || true

# Remove images
print_status "Removing E2E images..."
docker rmi gift-genie-backend-e2e gift-genie-frontend-e2e 2>/dev/null || true

print_success "E2E environment cleaned up!"
