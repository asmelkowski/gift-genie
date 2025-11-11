#!/bin/bash

# E2E Test Runner Script
# Runs E2E tests in the replicated CI environment

set -e

echo "🧪 Running E2E tests..."

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

# Create necessary directories
mkdir -p frontend/test-results
mkdir -p frontend/playwright/.auth
mkdir -p frontend/playwright/screenshots

print_status "Testing network connectivity..."

# Test backend connectivity from e2e container perspective
print_status "Testing backend connectivity..."
docker run --rm --network gift-genie_gift-genie-e2e-network curlimages/curl:latest \
    curl -v --max-time 10 http://backend:8000/health || {
    print_error "Backend connectivity test failed"
    exit 1
}

# Test frontend connectivity from e2e container perspective
print_status "Testing frontend connectivity..."
docker run --rm --network gift-genie_gift-genie-e2e-network curlimages/curl:latest \
    curl -v --max-time 10 http://frontend:5173 || {
    print_error "Frontend connectivity test failed"
    exit 1
}

print_success "Network connectivity verified"

# Create test results directory
mkdir -p frontend/test-results

print_status "Running E2E tests..."

# Build the e2e image if it doesn't exist
if ! docker images | grep -q gift-genie-frontend-e2e; then
    print_status "Building E2E test image..."
    docker build -t gift-genie-frontend-e2e ./frontend --target e2e
fi

# Run E2E tests with comprehensive logging and diagnostics
docker run --name e2e-tests \
    --network gift-genie_gift-genie-e2e-network \
    -e CI=true \
    -e DEBUG=pw:api \
    -e VITE_API_BASE_URL=http://backend:8000/api/v1 \
    -v $(pwd)/frontend/test-results:/app/test-results \
    -v $(pwd)/frontend/playwright:/app/playwright \
    gift-genie-frontend-e2e \
    npx playwright test --reporter=list,html --trace=on

# Get exit code from container
EXIT_CODE=$(docker inspect e2e-tests --format='{{.State.ExitCode}}')

# Copy test results from container
docker cp e2e-tests:/app/playwright-report ./frontend/test-results/ 2>/dev/null || true
docker cp e2e-tests:/app/playwright ./frontend/playwright-results 2>/dev/null || true
docker cp e2e-tests:/app/coverage ./frontend/test-results/ 2>/dev/null || true
docker cp e2e-tests:/app/test-results ./frontend/test-results/container-results 2>/dev/null || true

# Clean up container
docker rm -f e2e-tests 2>/dev/null || true

if [ "$EXIT_CODE" -eq 0 ]; then
    print_success "E2E tests passed!"
    echo ""
    echo "📊 Test results available at:"
    echo "  • HTML Report: ./frontend/test-results/playwright-report/index.html"
    echo "  • Screenshots: ./frontend/playwright/screenshots/"
    echo "  • Traces: ./frontend/playwright-results/"
else
    print_error "E2E tests failed with exit code: $EXIT_CODE"
    echo ""
    echo "🔍 Debug information:"
    echo "  • HTML Report: ./frontend/test-results/playwright-report/index.html"
    echo "  • Screenshots: ./frontend/playwright/screenshots/"
    echo "  • Container logs: Check ./frontend/test-results/ for detailed logs"
    echo ""
    echo "💡 Common debugging steps:"
    echo "  1. Check backend logs: docker logs gift-genie-backend-e2e"
    echo "  2. Check frontend logs: docker logs gift-genie-frontend-e2e"
    echo "  3. View HTML report for detailed test failures"
    echo "  4. Check network connectivity: ./scripts/e2e-network-test.sh"
fi

exit $EXIT_CODE
