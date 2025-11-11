# Local CI E2E Test Environment Simulator

This script replicates the exact CI E2E test environment from `.github/workflows/pull-request.yml` locally for debugging purposes.

## Overview

The `test-e2e-local-ci.sh` script simulates the complete CI E2E test workflow by:

1. Building the necessary Docker images (backend:prod, frontend:dev, frontend:e2e)
2. Creating a Docker network identical to CI (`gift-genie-test`)
3. Starting PostgreSQL and Redis containers with the same configuration
4. Running database migrations
5. Starting the backend server with production configuration
6. Starting the frontend development server
7. Waiting for services to be healthy with CI-like timeouts
8. Running network connectivity tests
9. Executing E2E tests with the same configuration as CI
10. Collecting test results and artifacts
11. Cleaning up containers and network (optional)

## Usage

```bash
# Run full CI simulation
./scripts/test-e2e-local-ci.sh

# Keep containers running for debugging
./scripts/test-e2e-local-ci.sh --keep-containers

# Skip Docker image building (use existing images)
./scripts/test-e2e-local-ci.sh --skip-build

# Enable verbose output
./scripts/test-e2e-local-ci.sh --verbose

# Double all timeouts for slow systems
./scripts/test-e2e-local-ci.sh --timeout-multiplier 2

# Combine options
./scripts/test-e2e-local-ci.sh --keep-containers --verbose --timeout-multiplier 1.5
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `--keep-containers` | Keep containers running after tests for debugging |
| `--skip-build` | Skip Docker image building (use existing images) |
| `--verbose` | Enable verbose output with detailed progress |
| `--timeout-multiplier N` | Multiply all timeouts by N (default: 1) |
| `--help` | Show help message |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CI_TIMEOUT_MULTIPLIER` | Same as `--timeout-multiplier` option |

## Container Names and Network

The script uses the same naming convention as CI:

- **Network**: `gift-genie-test`
- **PostgreSQL**: `postgres`
- **Redis**: `redis`
- **Backend**: `backend`
- **Frontend**: `frontend`
- **E2E Tests**: `e2e-tests` (temporary)

## Service Ports

When running locally, services are exposed on:

- **PostgreSQL**: `localhost:5432` (internal: `5432`)
- **Redis**: `localhost:6379` (internal: `6379`)
- **Backend API**: `http://localhost:8000`
- **Frontend**: `http://localhost:5173`

## Test Results

After running, test results are available in:

- **HTML Report**: `./test-results/playwright-report/index.html`
- **Screenshots**: `./test-results/screenshots/`
- **Traces**: `./test-results/playwright-results/`
- **Coverage**: `./test-results/coverage/`

## Debugging

### When Tests Fail

1. **Check the HTML report** for detailed failure information
2. **Examine screenshots** in the test results directory
3. **Review container logs**:
   ```bash
   docker logs backend
   docker logs frontend
   docker logs postgres
   docker logs redis
   ```

### Manual Cleanup (if using --keep-containers)

```bash
# Stop containers
docker stop backend frontend postgres redis

# Remove containers
docker rm backend frontend postgres redis

# Remove network
docker network rm gift-genie-test
```

### Network Connectivity Testing

The script includes comprehensive network connectivity tests. You can also test manually:

```bash
# Test backend from E2E container perspective
docker run --rm --network gift-genie-test curlimages/curl:latest \
  curl -v http://backend:8000/health

# Test frontend from E2E container perspective
docker run --rm --network gift-genie-test curlimages/curl:latest \
  curl -v http://frontend:5173
```

## Timeouts

The script uses the same timeouts as CI, which can be multiplied:

- **PostgreSQL ready**: 30s × multiplier
- **Redis ready**: 30s × multiplier
- **Backend healthy**: 60s × multiplier
- **Frontend ready**: 60s × multiplier
- **E2E tests**: 5 minutes × multiplier

## Requirements

- Docker
- Docker Compose (optional, for comparison)
- curl
- Standard Unix tools (awk, grep, etc.)

## Comparison with CI

This script replicates the exact CI environment with these differences:

1. **Local ports**: Services are exposed to localhost for debugging
2. **Verbose output**: More detailed logging by default
3. **Flexible timeouts**: Can be adjusted for local hardware
4. **Debugging options**: Keep containers running for inspection

## Troubleshooting

### Port Conflicts

If ports are already in use, the script will fail. You can:

1. Stop conflicting services
2. Use `docker ps` to identify conflicts
3. Modify the script to use different ports

### Image Build Failures

Ensure you have sufficient disk space and Docker resources. If builds fail:

1. Run `docker system prune` to clean up
2. Check Docker daemon is running
3. Verify you have build permissions

### Permission Issues

If you encounter permission errors:

1. Ensure your user is in the `docker` group
2. Try running with `sudo` (not recommended)
3. Check Docker daemon permissions

## Examples

### Quick Test Run

```bash
./scripts/test-e2e-local-ci.sh
```

### Debug Session

```bash
# Start environment and keep containers
./scripts/test-e2e-local-ci.sh --keep-containers --verbose

# In another terminal, check logs
docker logs -f backend

# Test manually
curl http://localhost:8000/health

# When done, cleanup
docker stop backend frontend postgres redis
docker rm backend frontend postgres redis
docker network rm gift-genie-test
```

### Slow System

```bash
# Give more time for services to start
./scripts/test-e2e-local-ci.sh --timeout-multiplier 2
```

### Skip Build for Iterative Testing

```bash
# First time: build images
./scripts/test-e2e-local-ci.sh

# Subsequent runs: skip build
./scripts/test-e2e-local-ci.sh --skip-build
```
