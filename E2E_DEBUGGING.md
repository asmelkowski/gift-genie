# E2E Testing Debugging Guide

This guide explains how to replicate the CI e2e testing environment locally for debugging failing tests.

## Overview

The CI e2e tests run in a Docker environment that closely mirrors production. To debug locally, we need to replicate this setup.

## Quick Start

1. **Setup the environment:**
   ```bash
   ./scripts/e2e-setup.sh
   ```

2. **Run the tests:**
   ```bash
   ./scripts/e2e-run.sh
   ```

3. **Clean up when done:**
   ```bash
   ./scripts/e2e-cleanup.sh
   ```

## What the Setup Does

The CI environment consists of:
- **PostgreSQL**: Database for test data
- **Redis**: Session store and caching
- **Backend**: Production FastAPI server
- **Frontend**: Development Vite server
- **E2E Runner**: Playwright container with pre-installed browsers

### Key Differences from Local Development

| Component | CI Environment | Local Development |
|-----------|----------------|-------------------|
| Backend | Production image | Development server |
| Frontend | Development image | Local dev server |
| Database | Fresh PostgreSQL container | May use existing data |
| Network | Docker network isolation | Host networking |
| Environment | Test secrets | Dev secrets |

## Debugging Steps

### 1. Check Network Connectivity

Run the network test script:
```bash
./scripts/e2e-network-test.sh
```

This verifies:
- Backend is accessible from E2E container
- Frontend is accessible from E2E container
- Local connectivity to both services

### 2. Check Service Logs

```bash
# Backend logs
docker logs gift-genie-backend-e2e

# Frontend logs
docker logs gift-genie-frontend-e2e

# Database logs
docker logs gift-genie-postgres-e2e
```

### 3. Inspect Containers

```bash
# Check container status
docker ps --filter "name=gift-genie.*e2e"

# Inspect container details
docker inspect gift-genie-backend-e2e

# Check container resource usage
docker stats gift-genie-postgres-e2e gift-genie-redis-e2e gift-genie-backend-e2e gift-genie-frontend-e2e
```

### 4. Test API Endpoints

```bash
# Test backend health
curl http://localhost:8001/health

# Test frontend
curl http://localhost:5174

# Test API from E2E container perspective
docker run --rm --network gift-genie-e2e-network curlimages/curl:latest \
  curl -v http://backend:8000/health
```

### 5. Debug Playwright Tests

```bash
# Run tests with debug mode
cd frontend
PWDEBUG=1 bun run e2e

# Run specific test
bun run e2e -- auth.spec.ts --grep "should login"

# Run with UI mode
bun run e2e:ui
```

## Common Issues and Solutions

### Issue: "Backend not accessible from E2E container"

**Symptoms:** Tests fail with network errors
**Solution:**
1. Check network: `./scripts/e2e-network-test.sh`
2. Verify backend is healthy: `curl http://localhost:8001/health`
3. Check backend logs: `docker logs gift-genie-backend-e2e`

### Issue: "Frontend not loading"

**Symptoms:** Tests timeout waiting for page loads
**Solution:**
1. Check frontend logs: `docker logs gift-genie-frontend-e2e`
2. Verify frontend is accessible: `curl http://localhost:5174`
3. Check if Vite build completed

### Issue: "Database connection errors"

**Symptoms:** Tests fail during global setup
**Solution:**
1. Check database logs: `docker logs gift-genie-postgres-e2e`
2. Verify migrations ran: Check backend logs for Alembic output
3. Test database connectivity: `docker exec gift-genie-postgres-e2e pg_isready -U postgres`

### Issue: "Playwright browser issues"

**Symptoms:** Browser fails to launch
**Solution:**
1. Check if browsers are installed: `docker run --rm gift-genie-frontend-e2e npx playwright install --dry-run`
2. Verify system dependencies: Check E2E container has required libraries
3. Try with different browser args: Modify `playwright.config.ts`

### Issue: "Authentication setup fails"

**Symptoms:** Global setup fails during registration/login
**Solution:**
1. Check backend API is working: Test `/auth/register` endpoint
2. Verify database has test user data
3. Check global setup logs in test output

## Environment Variables

The E2E environment uses these key variables:

```bash
# Backend
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/gift_genie_test
REDIS_URL=redis://redis:6379
SECRET_KEY=test-secret-key-for-e2e
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend
VITE_API_BASE_URL=http://backend:8000

# E2E Runner
CI=true
DEBUG=pw:api
VITE_API_BASE_URL=http://backend:8000
```

## File Structure

```
scripts/
├── e2e-setup.sh      # Builds images and starts the full environment
├── e2e-run.sh        # Runs the actual e2e tests
├── e2e-cleanup.sh    # Cleans up containers and images
└── e2e-network-test.sh # Tests network connectivity

frontend/
├── playwright.config.ts    # Playwright configuration
├── e2e/                    # Test files
│   ├── global-setup.ts     # Setup script run before tests
│   ├── fixtures.ts         # Test fixtures and page objects
│   └── *.spec.ts          # Test specifications
└── test-results/          # Test output and reports
```

## Manual Testing

If you need to test interactively:

1. Start the environment: `./scripts/e2e-setup.sh`
2. Open browser to frontend: http://localhost:5174
3. Test manually or run specific tests
4. Check logs as needed

## CI vs Local Differences

| Aspect | CI | Local |
|--------|----|-------|
| Backend Image | Production | Production |
| Frontend Image | Development | Development |
| Database | Fresh container | Fresh container |
| Network | Isolated | Isolated |
| Ports | Internal only | Exposed to localhost |
| Cleanup | Automatic | Manual |

## Troubleshooting Commands

```bash
# Check all containers
docker ps -a

# View logs
docker logs <container-name>

# Enter container
docker exec -it <container-name> bash

# Check network
docker network inspect gift-genie-e2e-network

# Clean everything
docker system prune -a --volumes
```

## Getting Help

1. Check this guide first
2. Review CI workflow logs for comparison
3. Check GitHub issues for similar problems
4. Ask in team chat with specific error messages

## Performance Tips

- Use `./scripts/e2e-network-test.sh` for quick connectivity checks
- Keep containers running between test runs to avoid rebuilds
- Use `--grep` to run specific tests
- Check `test-results/playwright-report/index.html` for detailed results
