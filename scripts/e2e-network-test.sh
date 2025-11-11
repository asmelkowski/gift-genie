#!/bin/bash

# E2E Network Connectivity Test Script

echo "🔍 Testing E2E network connectivity..."

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if E2E environment is running
if ! docker ps | grep -q gift-genie-frontend-e2e; then
    print_error "E2E environment is not running. Run './scripts/e2e-setup.sh' first."
    exit 1
fi

echo ""
print_status "Testing connectivity from E2E container perspective..."
echo ""

# Test backend connectivity from E2E container perspective
echo "🔗 Testing backend connectivity (http://backend:8000/health)..."
if docker run --rm --network gift-genie_gift-genie-e2e-network curlimages/curl:latest \
    curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://backend:8000/health | grep -q "200"; then
    print_success "Backend is accessible from E2E container"
else
    print_error "Backend is NOT accessible from E2E container"
fi

# Test frontend connectivity from E2E container perspective
echo "🔗 Testing frontend connectivity (http://frontend:5173)..."
if docker run --rm --network gift-genie_gift-genie-e2e-network curlimages/curl:latest \
    curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://frontend:5173 | grep -q "200"; then
    print_success "Frontend is accessible from E2E container"
else
    print_error "Frontend is NOT accessible from E2E container"
fi

echo ""
print_status "Testing local connectivity..."
echo ""

# Test local backend connectivity
echo "🔗 Testing backend connectivity from localhost (http://localhost:8001/health)..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8001/health | grep -q "200"; then
    print_success "Backend is accessible from localhost"
else
    print_error "Backend is NOT accessible from localhost"
fi

# Test local frontend connectivity
echo "🔗 Testing frontend connectivity from localhost (http://localhost:5174)..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:5174 | grep -q "200"; then
    print_success "Frontend is accessible from localhost"
else
    print_error "Frontend is NOT accessible from localhost"
fi

echo ""
print_status "Container status..."
echo ""

# Show container status
docker ps --filter "name=gift-genie.*e2e" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
print_status "Network information..."
echo ""

# Show network info
docker network inspect gift-genie_gift-genie-e2e-network --format '{
  "Name": "{{.Name}}",
  "Driver": "{{.Driver}}",
  "Containers": {{range $key, $value := .Containers}}{
    "Name": "{{$value.Name}}",
    "IPv4Address": "{{$value.IPv4Address}}"
  }{{end}}
}' | jq . 2>/dev/null || docker network inspect gift-genie_gift-genie-e2e-network

echo ""
print_status "Service health checks..."
echo ""

# Check backend health
echo "🏥 Backend health check:"
docker exec gift-genie-backend-e2e curl -s http://localhost:8000/health || echo "Backend health check failed"

# Check frontend health
echo "🏥 Frontend health check:"
docker exec gift-genie-frontend-e2e wget -qO- http://localhost/ | head -5 || echo "Frontend health check failed"
