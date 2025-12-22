#!/bin/bash

# Local CI E2E Test Environment Simulator
# Replicates the exact CI E2E test environment locally for debugging
# Based on .github/workflows/pull-request.yml e2e-test job

set -e

# Default values
KEEP_CONTAINERS=false
SKIP_BUILD=false
VERBOSE=false
TIMEOUT_MULTIPLIER=1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${CYAN}=== $1 ===${NC}"
}

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

print_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${CYAN}[VERBOSE]${NC} $1"
    fi
}

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Local CI E2E Test Environment Simulator
Replicates the exact CI E2E test environment locally for debugging

OPTIONS:
    --keep-containers    Keep containers running after tests (for debugging)
    --skip-build         Skip Docker image building (use existing images)
    --verbose            Enable verbose output
    --timeout-multiplier N  Multiply all timeouts by N (default: 1)
    --help               Show this help message

EXAMPLES:
    $0                           # Run full CI simulation
    $0 --keep-containers         # Keep containers for debugging
    $0 --skip-build --verbose    # Skip build and show verbose output
    $0 --timeout-multiplier 2    # Double all timeouts for slow systems

ENVIRONMENT VARIABLES:
    CI_TIMEOUT_MULTIPLIER        Same as --timeout-multiplier

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --keep-containers)
            KEEP_CONTAINERS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --timeout-multiplier)
            TIMEOUT_MULTIPLIER="$2"
            shift 2
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Allow environment variable override
if [ -n "$CI_TIMEOUT_MULTIPLIER" ]; then
    TIMEOUT_MULTIPLIER="$CI_TIMEOUT_MULTIPLIER"
fi

# Validate timeout multiplier
if ! [[ "$TIMEOUT_MULTIPLIER" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    print_error "Timeout multiplier must be a number"
    exit 1
fi

# Simple validation without bc
if command -v bc > /dev/null 2>&1; then
    if [ "$(echo "$TIMEOUT_MULTIPLIER < 0.1" | bc -l)" -eq 1 ]; then
        print_error "Timeout multiplier must be >= 0.1"
        exit 1
    fi
else
    # Fallback validation for integer multipliers only
    if [[ "$TIMEOUT_MULTIPLIER" =~ ^0\. ]] || [ "${TIMEOUT_MULTIPLIER%.*}" -eq 0 ]; then
        print_error "Timeout multiplier must be >= 0.1 (bc not available for precise validation)"
        exit 1
    fi
fi

print_header "Local CI E2E Test Environment Simulator"
print_status "Configuration:"
echo "  • Keep containers: $KEEP_CONTAINERS"
echo "  • Skip build: $SKIP_BUILD"
echo "  • Verbose: $VERBOSE"
echo "  • Timeout multiplier: ${TIMEOUT_MULTIPLIER}x"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check for required tools
for tool in curl docker; do
    if ! command -v "$tool" > /dev/null 2>&1; then
        print_error "Required tool '$tool' is not installed"
        exit 1
    fi
done

# Calculate timeouts
if command -v bc > /dev/null 2>&1; then
    POSTGRES_TIMEOUT=$(echo "30 * $TIMEOUT_MULTIPLIER" | bc)
    REDIS_TIMEOUT=$(echo "30 * $TIMEOUT_MULTIPLIER" | bc)
    BACKEND_TIMEOUT=$(echo "60 * $TIMEOUT_MULTIPLIER" | bc)
    FRONTEND_TIMEOUT=$(echo "60 * $TIMEOUT_MULTIPLIER" | bc)
    E2E_TIMEOUT_MINUTES=$(echo "5 * $TIMEOUT_MULTIPLIER" | bc)
else
    # Fallback using awk for floating point arithmetic
    POSTGRES_TIMEOUT=$(awk "BEGIN {printf \"%.0f\", 30 * $TIMEOUT_MULTIPLIER}")
    REDIS_TIMEOUT=$(awk "BEGIN {printf \"%.0f\", 30 * $TIMEOUT_MULTIPLIER}")
    BACKEND_TIMEOUT=$(awk "BEGIN {printf \"%.0f\", 60 * $TIMEOUT_MULTIPLIER}")
    FRONTEND_TIMEOUT=$(awk "BEGIN {printf \"%.0f\", 60 * $TIMEOUT_MULTIPLIER}")
    E2E_TIMEOUT_MINUTES=$(awk "BEGIN {printf \"%.0f\", 5 * $TIMEOUT_MULTIPLIER}")
fi

print_verbose "Calculated timeouts:"
print_verbose "  • PostgreSQL: ${POSTGRES_TIMEOUT}s"
print_verbose "  • Redis: ${REDIS_TIMEOUT}s"
print_verbose "  • Backend: ${BACKEND_TIMEOUT}s"
print_verbose "  • Frontend: ${FRONTEND_TIMEOUT}s"
print_verbose "  • E2E: ${E2E_TIMEOUT_MINUTES}m"

# Cleanup function
cleanup() {
    print_header "Cleanup"

    if [ "$KEEP_CONTAINERS" = true ]; then
        print_warning "Keeping containers running for debugging"
        print_status "To cleanup manually, run:"
        echo "  docker stop backend frontend postgres redis || true"
        echo "  docker rm backend frontend postgres redis || true"
        echo "  docker network rm gift-genie-test || true"
        return
    fi

    print_status "Stopping and removing containers..."
    docker stop backend frontend postgres redis 2>/dev/null || true
    docker rm backend frontend postgres redis 2>/dev/null || true
    docker network rm gift-genie-test 2>/dev/null || true
    print_success "Cleanup completed"
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Step 1: Build Docker images
print_header "Step 1: Building Docker Images"

if [ "$SKIP_BUILD" = true ]; then
    print_status "Skipping Docker image build (using existing images)"

    # Check if required images exist
    required_images=("gift-genie-backend:prod" "gift-genie-frontend:dev" "gift-genie-frontend:e2e")
    for image in "${required_images[@]}"; do
        if ! docker images --format "table {{.Repository}}:{{.Tag}}" | grep -q "$image"; then
            print_error "Required image $image not found. Cannot skip build."
            exit 1
        fi
    done
    print_success "All required images found"
else
    print_status "Building backend production image..."
    docker build -t gift-genie-backend:prod ./backend --target production
    print_success "Backend production image built"

    print_status "Building frontend development image..."
    docker build -t gift-genie-frontend:dev ./frontend --target development
    print_success "Frontend development image built"

    print_status "Building frontend e2e image..."
    docker build -t gift-genie-frontend:e2e ./frontend --target e2e
    print_success "Frontend e2e image built"
fi

# Step 2: Create Docker network
print_header "Step 2: Creating Docker Network"

print_status "Creating Docker network 'gift-genie-test'..."
if docker network ls | grep -q gift-genie-test; then
    print_warning "Network 'gift-genie-test' already exists, removing it first"
    docker network rm gift-genie-test
fi
docker network create gift-genie-test
print_success "Network created"

# Step 3: Start PostgreSQL and Redis
print_header "Step 3: Starting Database Services"

print_status "Starting PostgreSQL..."
docker run -d \
    --name postgres \
    --network gift-genie-test \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=gift_genie_test \
    postgres:16

print_status "Starting Redis..."
docker run -d \
    --name redis \
    --network gift-genie-test \
    redis:7-alpine

print_success "Database services started"

# Step 4: Wait for services to be healthy
print_header "Step 4: Waiting for Services to be Healthy"

print_status "Waiting for PostgreSQL..."
postgres_ready=false
for i in $(seq 1 "$POSTGRES_TIMEOUT"); do
    if docker exec postgres pg_isready -U postgres > /dev/null 2>&1; then
        print_success "PostgreSQL is ready (took ${i}s)"
        postgres_ready=true
        break
    fi
    if [ "$VERBOSE" = true ]; then
        echo "  Attempt $i/$POSTGRES_TIMEOUT: PostgreSQL not ready yet..."
    fi
    sleep 1
done

if [ "$postgres_ready" = false ]; then
    print_error "PostgreSQL did not become ready in time"
    docker logs postgres
    exit 1
fi

print_status "Waiting for Redis..."
redis_ready=false
for i in $(seq 1 "$REDIS_TIMEOUT"); do
    if docker exec redis redis-cli ping 2>/dev/null | grep -q PONG; then
        print_success "Redis is ready (took ${i}s)"
        redis_ready=true
        break
    fi
    if [ "$VERBOSE" = true ]; then
        echo "  Attempt $i/$REDIS_TIMEOUT: Redis not ready yet..."
    fi
    sleep 1
done

if [ "$redis_ready" = false ]; then
    print_error "Redis did not become ready in time"
    docker logs redis
    exit 1
fi

# Step 5: Run database migrations
print_header "Step 5: Running Database Migrations"

print_status "Running database migrations..."
if docker run --rm \
    --network gift-genie-test \
    -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/gift_genie_test \
    -e DATABASE_URL_SYNC=postgresql://postgres:postgres@postgres:5432/gift_genie_test \
    gift-genie-backend:prod \
    alembic upgrade head; then
    print_success "Database migrations completed"
else
    print_error "Database migrations failed"
    exit 1
fi

# Step 6: Start backend server
print_header "Step 6: Starting Backend Server"

print_status "Starting backend server..."
docker run -d \
    --name backend \
    --network gift-genie-test \
    -p 8000:8000 \
    -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/gift_genie_test \
    -e DATABASE_URL_SYNC=postgresql://postgres:postgres@postgres:5432/gift_genie_test \
    -e REDIS_URL=redis://redis:6379 \
    -e SECRET_KEY=test-secret-key-for-ci \
    -e ALGORITHM=HS256 \
    -e ACCESS_TOKEN_EXPIRE_MINUTES=30 \
    gift-genie-backend:prod

print_success "Backend server started"

# Step 7: Wait for backend to be healthy
print_header "Step 7: Waiting for Backend Health Check"

print_status "Waiting for backend to be healthy..."
backend_healthy=false
for i in $(seq 1 "$BACKEND_TIMEOUT"); do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend is healthy (took ${i}s)"
        backend_healthy=true
        break
    fi

    # Check container status
    status=$(docker inspect backend --format='{{.State.Status}} (exit={{.State.ExitCode}})' 2>/dev/null || echo 'unknown')
    if [ "$VERBOSE" = true ]; then
        echo "  Attempt $i/$BACKEND_TIMEOUT: not ready (status=$status)"
    fi
    sleep 2
done

if [ "$backend_healthy" = false ]; then
    print_error "Backend did not become healthy in time"
    print_error "Collecting backend diagnostics..."
    echo "--- docker ps -a ---"
    docker ps -a || true
    echo "--- docker inspect backend ---"
    docker inspect backend || true
    echo "--- docker logs backend ---"
    docker logs backend || true
    exit 1
fi

# Step 8: Start frontend server
print_header "Step 8: Starting Frontend Server"

print_status "Starting frontend dev server..."
docker run -d \
    --name frontend \
    --network gift-genie-test \
    -p 5173:5173 \
    -e VITE_API_BASE_URL=http://backend:8000/api/v1 \
    gift-genie-frontend:dev

print_success "Frontend server started"

# Step 9: Wait for frontend to be healthy
print_header "Step 9: Waiting for Frontend Health Check"

print_status "Waiting for frontend to be fully loaded..."
frontend_ready=false
for i in $(seq 1 "$FRONTEND_TIMEOUT"); do
    if curl -sf http://localhost:5173 2>/dev/null | grep -q "root" 2>/dev/null; then
        print_success "Frontend is ready (took ${i}s)"
        frontend_ready=true
        break
    fi
    if [ "$VERBOSE" = true ]; then
        echo "  Attempt $i/$FRONTEND_TIMEOUT: Frontend not ready yet..."
    fi
    sleep 1
done

if [ "$frontend_ready" = false ]; then
    print_error "Frontend did not become ready in time"
    docker logs frontend
    exit 1
fi

# Give frontend a bit more time to fully hydrate
print_status "Allowing frontend to fully hydrate..."
sleep 5

# Step 10: Verify network connectivity
print_header "Step 10: Verifying Network Connectivity"

print_status "Testing network connectivity from E2E container perspective..."

# Test backend connectivity
print_status "Testing backend at http://backend:8000/health..."
if docker run --rm --network gift-genie-test curlimages/curl:latest \
    curl -v --max-time 10 http://backend:8000/health > /dev/null 2>&1; then
    print_success "Backend connectivity verified"
else
    print_error "Backend connectivity failed"
    exit 1
fi

# Test frontend connectivity
print_status "Testing frontend at http://frontend:5173..."
if docker run --rm --network gift-genie-test curlimages/curl:latest \
    curl -v --max-time 10 http://frontend:5173 > /dev/null 2>&1; then
    print_success "Frontend connectivity verified"
else
    print_error "Frontend connectivity failed"
    exit 1
fi

# Test API endpoint that frontend will use
print_status "Testing API endpoint at http://backend:8000/api/v1/health..."
if docker run --rm --network gift-genie-test curlimages/curl:latest \
    curl -v --max-time 10 http://backend:8000/api/v1/health > /dev/null 2>&1; then
    print_success "API endpoint connectivity verified"
else
    print_error "API endpoint connectivity failed"
    exit 1
fi

# Test connectivity from frontend container perspective
print_status "Testing backend connectivity from frontend container..."
if docker exec frontend curl -v --max-time 10 http://backend:8000/health > /dev/null 2>&1; then
    print_success "Frontend-to-backend connectivity verified"
else
    print_warning "Frontend container cannot reach backend (this may be expected)"
fi

print_success "Network connectivity verified"

# Step 11: Verify E2E image and dependencies
print_header "Step 11: Verifying E2E Test Environment"

print_status "Checking e2e image..."
if docker run --rm gift-genie-frontend:e2e ls -la /app/playwright.config.ts > /dev/null 2>&1; then
    print_success "Playwright config found"
else
    print_error "Playwright config not found"
    exit 1
fi

if docker run --rm gift-genie-frontend:e2e ls -la /app/e2e/ > /dev/null 2>&1; then
    print_success "E2E tests found"
else
    print_error "E2E tests not found"
    exit 1
fi

if docker run --rm gift-genie-frontend:e2e which bunx > /dev/null 2>&1; then
    print_success "Bun found"
else
    print_error "Bun not found"
    exit 1
fi

# Create Playwright directories
print_status "Creating Playwright directories..."
mkdir -p playwright/.auth
mkdir -p playwright/screenshots
mkdir -p playwright/screenshots/test-results
mkdir -p test-results/screenshots
print_success "Playwright directories created"

# Step 12: Run E2E tests
print_header "Step 12: Running E2E Tests"

# Create test results directory
mkdir -p test-results

print_status "Running E2E tests with ${E2E_TIMEOUT_MINUTES} minute timeout..."

# Run E2E tests with comprehensive logging and diagnostics
e2e_success=false
if timeout "${E2E_TIMEOUT_MINUTES}m" docker run --name e2e-tests \
    --network gift-genie-test \
    -e CI=true \
    -e DEBUG=pw:api \
    -e VITE_API_BASE_URL=http://backend:8000/api/v1 \
    -v "$(pwd)/test-results:/app/test-results" \
    -v "$(pwd)/playwright:/app/playwright" \
    gift-genie-frontend:e2e \
    npx playwright test --reporter=list,html --trace=on; then
    e2e_success=true
    print_success "E2E tests completed"
else
    e2e_exit_code=$?
    print_error "E2E tests failed with exit code: $e2e_exit_code"
fi

# Get exit code from container
if [ "$e2e_success" = true ]; then
    EXIT_CODE=0
else
    EXIT_CODE=$(docker inspect e2e-tests --format='{{.State.ExitCode}}' 2>/dev/null || echo "$e2e_exit_code")
fi

# Copy test results from container (in case volume mount had issues)
print_status "Collecting test results..."
docker cp e2e-tests:/app/playwright-report ./test-results/ 2>/dev/null || true
docker cp e2e-tests:/app/playwright ./playwright-results 2>/dev/null || true
docker cp e2e-tests:/app/coverage ./test-results/ 2>/dev/null || true
docker cp e2e-tests:/app/test-results ./test-results/container-results 2>/dev/null || true

# Copy screenshots from all possible locations
print_status "Collecting screenshots from container..."
docker cp e2e-tests:/app/playwright-report ./test-results/playwright-report-copy 2>/dev/null || true
docker cp e2e-tests:/app/playwright/screenshots ./test-results/screenshots-from-container 2>/dev/null || true
docker cp e2e-tests:/app/test-results/screenshots ./test-results/screenshots-from-test-results 2>/dev/null || true
docker cp e2e-tests:/app/playwright/*.png ./test-results/screenshots/ 2>/dev/null || true

# Clean up E2E container
docker rm -f e2e-tests 2>/dev/null || true

# Step 13: Display results
print_header "Test Results"

if [ "$EXIT_CODE" -eq 0 ]; then
    print_success "E2E tests passed!"
    echo ""
    echo "📊 Test results available at:"
    echo "  • HTML Report: ./test-results/playwright-report/index.html"
    echo "  • Screenshots: ./test-results/screenshots/"
    echo "  • Traces: ./test-results/playwright-results/"
    echo "  • Coverage: ./test-results/coverage/"
else
    print_error "E2E tests failed with exit code: $EXIT_CODE"
    echo ""
    echo "🔍 Debug information:"
    echo "  • HTML Report: ./test-results/playwright-report/index.html"
    echo "  • Screenshots: ./test-results/screenshots/"
    echo "  • Container logs: Check ./test-results/ for detailed logs"
    echo ""
    echo "💡 Common debugging steps:"
    echo "  1. Check backend logs: docker logs backend"
    echo "  2. Check frontend logs: docker logs frontend"
    echo "  3. View HTML report for detailed test failures"
    echo "  4. Check network connectivity manually"
fi

# Show container status if keeping containers
if [ "$KEEP_CONTAINERS" = true ]; then
    echo ""
    print_header "Container Status"
    docker ps --filter "name=backend\|frontend\|postgres\|redis" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    print_status "Services running:"
    echo "  • PostgreSQL: localhost:5432 (container: postgres:5432)"
    echo "  • Redis: localhost:6379 (container: redis:6379)"
    echo "  • Backend API: http://localhost:8000"
    echo "  • Frontend: http://localhost:5173"
    echo ""
    print_status "To cleanup manually:"
    echo "  docker stop backend frontend postgres redis"
    echo "  docker rm backend frontend postgres redis"
    echo "  docker network rm gift-genie-test"
fi

exit $EXIT_CODE
