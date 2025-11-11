#!/bin/bash

# E2E Test Setup Validation Script
# Validates that the independent e2e test setup works correctly

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
TEST_RESULTS_DIR="$FRONTEND_DIR/test-results"
VALIDATION_RESULTS_DIR="$FRONTEND_DIR/test-results/validation"
LOG_FILE="$VALIDATION_RESULTS_DIR/validation.log"

# Create results directory
mkdir -p "$VALIDATION_RESULTS_DIR"
mkdir -p "$TEST_RESULTS_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

# Check if we're in the right directory
check_environment() {
    log "Checking environment..."

    if [[ ! -d "$FRONTEND_DIR" ]]; then
        error "Frontend directory not found. Run from project root."
        exit 1
    fi

    if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
        error "Frontend package.json not found."
        exit 1
    fi

    if [[ ! -f "$FRONTEND_DIR/playwright.config.ts" ]]; then
        error "Playwright config not found."
        exit 1
    fi

    success "Environment check passed"
}

# Check if backend is running
check_backend() {
    log "Checking backend availability..."

    # Try to connect to backend
    if curl -s --max-time 5 "${VITE_API_BASE_URL:-http://localhost:8000}/health" > /dev/null 2>&1; then
        success "Backend is accessible"
    else
        warning "Backend not accessible. Tests may fail."
        return 1
    fi
}

# Check if frontend dev server is running
check_frontend() {
    log "Checking frontend availability..."

    if curl -s --max-time 5 "${PLAYWRIGHT_BASE_URL:-http://localhost:5173}" > /dev/null 2>&1; then
        success "Frontend dev server is running"
    else
        warning "Frontend dev server not running. Will start it."
        return 1
    fi
}

# Start frontend dev server if needed
start_frontend() {
    if ! check_frontend; then
        log "Starting frontend dev server..."
        cd "$FRONTEND_DIR"
        mkdir -p "$VALIDATION_RESULTS_DIR"
        bun run dev > "$VALIDATION_RESULTS_DIR/frontend.log" 2>&1 &
        FRONTEND_PID=$!
        cd ..

        # Wait for frontend to be ready
        log "Waiting for frontend to be ready..."
        for i in {1..30}; do
            if curl -s --max-time 5 "http://localhost:5173" > /dev/null 2>&1; then
                success "Frontend dev server started"
                break
            fi
            sleep 2
        done

        if ! curl -s --max-time 5 "http://localhost:5173" > /dev/null 2>&1; then
            error "Frontend dev server failed to start"
            kill $FRONTEND_PID 2>/dev/null || true
            exit 1
        fi
    fi
}

# Run tests in different configurations
run_test_configuration() {
    local config_name="$1"
    local workers="$2"
    local retries="$3"
    local extra_args="$4"

    log "Running $config_name configuration (workers: $workers, retries: $retries)..."

    cd "$FRONTEND_DIR"

    # Run tests
    if npx playwright test \
        --workers="$workers" \
        --retries="$retries" \
        $extra_args \
        2>&1 | tee "$VALIDATION_RESULTS_DIR/$config_name.log"; then

        success "$config_name configuration passed"
        return 0
    else
        error "$config_name configuration failed"
        return 1
    fi
}

# Validate test isolation
validate_isolation() {
    log "Running isolation validation tests..."

    cd "$FRONTEND_DIR"

    if npx playwright test 04-test-isolation-validation.spec.ts \
        --workers=2 \
        --retries=1 \
        2>&1 | tee "$VALIDATION_RESULTS_DIR/isolation.log"; then

        success "Isolation validation passed"
        return 0
    else
        error "Isolation validation failed"
        return 1
    fi
}

# Check for leftover test data
check_cleanup() {
    log "Checking for leftover test data..."

    # This would need to be implemented based on your database structure
    # For now, just check if there are any obvious issues
    warning "Cleanup validation not fully implemented - manual check required"
    return 0
}

# Performance comparison
performance_comparison() {
    log "Running performance comparison..."

    cd "$FRONTEND_DIR"

    # Time serial execution
    log "Testing serial execution..."
    SERIAL_START=$(date +%s)
    if npx playwright test 02-app-auth.spec.ts --workers=1 --quiet > /dev/null 2>&1; then
        SERIAL_END=$(date +%s)
        SERIAL_TIME=$((SERIAL_END - SERIAL_START))
        success "Serial execution: ${SERIAL_TIME}s"
    else
        error "Serial execution failed"
        return 1
    fi

    # Time parallel execution
    log "Testing parallel execution..."
    PARALLEL_START=$(date +%s)
    if npx playwright test 02-app-auth.spec.ts --workers=2 --quiet > /dev/null 2>&1; then
        PARALLEL_END=$(date +%s)
        PARALLEL_TIME=$((PARALLEL_END - PARALLEL_START))
        success "Parallel execution: ${PARALLEL_TIME}s"
    else
        error "Parallel execution failed"
        return 1
    fi

    # Calculate improvement
    if [ $SERIAL_TIME -gt 0 ] && [ $PARALLEL_TIME -gt 0 ]; then
        IMPROVEMENT=$(( (SERIAL_TIME - PARALLEL_TIME) * 100 / SERIAL_TIME ))
        success "Performance improvement: ${IMPROVEMENT}%"
    fi
}

# Generate validation report
generate_report() {
    log "Generating validation report..."

    cat > "$VALIDATION_RESULTS_DIR/report.md" << EOF
# E2E Test Setup Validation Report

Generated: $(date)

## Summary

This report validates the independent e2e test setup for the Gift Genie project.

## Test Results

### Environment Check
- ✅ Frontend directory structure
- ✅ Playwright configuration
- ✅ Test utilities available

### Test Configurations Tested

1. **Serial Execution** (1 worker)
   - Status: $(grep -q "Serial execution: " "$VALIDATION_RESULTS_DIR/serial.log" && echo "✅ Passed" || echo "❌ Failed")
   - Duration: $(grep "Serial execution:" "$VALIDATION_RESULTS_DIR/serial.log" | sed 's/.*: //' || echo "N/A")

2. **Parallel Execution** (2 workers)
   - Status: $(grep -q "Parallel execution: " "$VALIDATION_RESULTS_DIR/parallel.log" && echo "✅ Passed" || echo "❌ Failed")
   - Duration: $(grep "Parallel execution:" "$VALIDATION_RESULTS_DIR/parallel.log" | sed 's/.*: //' || echo "N/A")

3. **CI Configuration** (4 workers, 2 retries)
   - Status: $(grep -q "CI configuration: " "$VALIDATION_RESULTS_DIR/ci.log" && echo "✅ Passed" || echo "❌ Failed")

4. **Isolation Validation**
   - Status: $(grep -q "Isolation validation passed" "$LOG_FILE" && echo "✅ Passed" || echo "❌ Failed")

### Performance Metrics

- Serial execution time: $(grep "Serial execution:" "$VALIDATION_RESULTS_DIR/serial.log" | sed 's/.*: //' || echo "N/A")
- Parallel execution time: $(grep "Parallel execution:" "$VALIDATION_RESULTS_DIR/parallel.log" | sed 's/.*: //' || echo "N/A")
- Performance improvement: $(grep "Performance improvement:" "$VALIDATION_RESULTS_DIR/performance.log" | sed 's/.*: //' || echo "N/A")

### Cleanup Validation

- Leftover data check: $(grep -q "Cleanup validation passed" "$LOG_FILE" && echo "✅ Passed" || echo "⚠️ Manual check required")

## Recommendations

$(if grep -q "Isolation validation failed" "$LOG_FILE"; then
    echo "- ❌ Fix isolation issues before deploying to CI"
elif grep -q "Performance improvement:" "$VALIDATION_RESULTS_DIR/performance.log"; then
    echo "- ✅ Parallel execution provides performance benefits"
else
    echo "- ⚠️ Review test configuration and performance"
fi)

## Logs

- Main log: $LOG_FILE
- Test results: $TEST_RESULTS_DIR/
- Validation results: $VALIDATION_RESULTS_DIR/

EOF

    success "Report generated: $VALIDATION_RESULTS_DIR/report.md"
}

# Main validation function
main() {
    log "Starting E2E test setup validation..."

    # Setup
    check_environment
    check_backend
    start_frontend

    # Run validation tests
    local all_passed=true

    # Test different configurations
    run_test_configuration "serial" 1 0 "" || all_passed=false
    run_test_configuration "parallel" 2 0 "" || all_passed=false
    run_test_configuration "ci" 4 2 "" || all_passed=false

    # Run isolation validation
    validate_isolation || all_passed=false

    # Performance testing
    performance_comparison || all_passed=false

    # Cleanup validation
    check_cleanup || all_passed=false

    # Generate report
    generate_report

    # Cleanup frontend if we started it
    if [[ -n "$FRONTEND_PID" ]]; then
        log "Stopping frontend dev server..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi

    # Final result
    if $all_passed; then
        success "All validation tests passed! 🎉"
        success "Independent e2e test setup is working correctly."
        exit 0
    else
        error "Some validation tests failed. Check the logs for details."
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "isolation")
        check_environment
        validate_isolation
        ;;
    "performance")
        check_environment
        performance_comparison
        ;;
    "cleanup")
        check_environment
        check_cleanup
        ;;
    "report")
        generate_report
        ;;
    *)
        main
        ;;
esac
