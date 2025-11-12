#!/bin/bash

# Parallel E2E Test Runner
# Provides convenient commands for running Playwright tests with different parallel configurations

set -e

cd "$(dirname "$0")/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print usage
usage() {
    echo -e "${BLUE}Parallel E2E Test Runner${NC}"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  all          Run all tests in parallel (default)"
    echo "  serial       Run tests serially (1 worker)"
    echo "  fast         Run tests with maximum parallelism"
    echo "  debug        Run tests in debug mode"
    echo "  report       Show test report"
    echo "  smoke        Run a quick smoke test (single test file)"
    echo "  ci           Run tests as they would in CI"
    echo "  help         Show this help message"
    echo ""
    echo "Options:"
    echo "  --file=FILE  Run specific test file"
    echo "  --grep=PATTERN  Run tests matching pattern"
    echo "  --workers=N  Override worker count"
    echo ""
    echo "Examples:"
    echo "  $0 all"
    echo "  $0 serial --file=02-app-auth.spec.ts"
    echo "  $0 fast --grep='login'"
    echo "  $0 ci"
}

# Function to run tests
run_tests() {
    local workers="$1"
    local extra_args="$2"

    echo -e "${BLUE}🚀 Running E2E tests (workers: $workers)${NC}"

    if [ -n "$extra_args" ]; then
        echo -e "${YELLOW}Extra args: $extra_args${NC}"
    fi

    npx playwright test --workers="$workers" $extra_args
}

# Function to check if backend is running
check_backend() {
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend is not running on http://localhost:8000${NC}"
        echo -e "${YELLOW}💡 Start the backend with: cd backend && make dev${NC}"
        return 1
    fi
}

# Function to check if frontend is running
check_frontend() {
    if curl -sf http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Frontend is not running on http://localhost:5173${NC}"
        echo -e "${YELLOW}💡 Start the frontend with: npm run dev${NC}"
        return 1
    fi
}

# Parse command line arguments
COMMAND="all"
EXTRA_ARGS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        all|serial|fast|debug|report|smoke|ci|help)
            COMMAND="$1"
            shift
            ;;
        --file=*)
            EXTRA_ARGS="$EXTRA_ARGS --grep=\"${1#*=}\""
            shift
            ;;
        --grep=*)
            EXTRA_ARGS="$EXTRA_ARGS --grep=\"${1#*=}\""
            shift
            ;;
        --workers=*)
            WORKERS_OVERRIDE="${1#*=}"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Execute commands
case $COMMAND in
    help)
        usage
        exit 0
        ;;

    all)
        check_backend && check_frontend && run_tests 2 "$EXTRA_ARGS"
        ;;

    serial)
        check_backend && check_frontend && run_tests 1 "$EXTRA_ARGS"
        ;;

    fast)
        check_backend && check_frontend && run_tests 0 "$EXTRA_ARGS"  # 0 = use all CPUs
        ;;

    debug)
        check_backend && check_frontend && npx playwright test --debug $EXTRA_ARGS
        ;;

    report)
        npx playwright show-report
        ;;

    smoke)
        check_backend && check_frontend && run_tests 1 "--grep=02-app-auth.spec.ts"
        ;;

    ci)
        echo -e "${BLUE}🏗️  Running tests in CI mode${NC}"
        CI=true run_tests 4 "$EXTRA_ARGS"
        ;;

    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        usage
        exit 1
        ;;
esac
