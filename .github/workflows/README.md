# CI/CD Pipeline Documentation

## Overview

The Gift Genie CI/CD pipeline uses a **Docker-first approach** where all testing and validation happens inside containers. This ensures that what's tested in CI is exactly what runs in production.

## Architecture

```mermaid
graph TB
    A[Pull Request] --> B[Build Docker Images]
    B --> C[Lint]
    B --> D[Unit Tests]
    B --> E[E2E Tests]
    C --> F[Status Comment]
    D --> F
    E --> F
```

## Pipeline Jobs

### 1. Build Images (`build-images`)
**Purpose:** Build all Docker images once and cache them for reuse

**What it builds:**
- `backend:dev` (development target with dev dependencies)
- `backend:prod` (production target, minimal image)
- `frontend:dev` (development target with Vite/HMR)
- `frontend:prod` (production target with Nginx)

**Features:**
- Uses Docker Buildx for multi-platform builds
- GitHub Actions cache (`type=gha`) for Docker layer caching
- Exports images as tar files for artifact sharing
- Parallel builds for all targets

**Output:** Uploads 4 image artifacts for downstream jobs

### 2. Lint (`lint`)
**Purpose:** Run linters and type checkers inside development containers

**Dependencies:** `build-images`

**What it runs:**
```bash
# Backend (inside backend:dev container)
- ruff check src/
- mypy src/

# Frontend (inside frontend:dev container)
- bun run lint
```

**Why development containers?**
Development containers include dev dependencies (ruff, mypy, eslint) needed for linting.

### 3. Unit Tests (`unit-test`)
**Purpose:** Run unit tests with coverage inside containers

**Dependencies:** `build-images`, `lint`

**Infrastructure:**
- PostgreSQL 16 (GitHub Actions service)
- Redis 7 (GitHub Actions service)

**What it runs:**
```bash
# Backend (inside backend:dev container)
docker run --network host \
  -e DATABASE_URL=... \
  -e REDIS_URL=... \
  gift-genie-backend:dev \
  pytest --cov=gift_genie --cov-report=xml

# Frontend (inside frontend:dev container)
docker run gift-genie-frontend:dev \
  bun run test:coverage
```

**Network:** Uses `--network host` to connect to GitHub Actions services (PostgreSQL, Redis)

**Coverage:** Uploads coverage reports as artifacts

### 4. E2E Tests (`e2e-test`)
**Purpose:** Run end-to-end tests using Playwright

**Dependencies:** `build-images`, `lint`

**Infrastructure:**
- PostgreSQL 16 (manual Docker container)
- Redis 7 (manual Docker container)
- Backend (production image)
- Frontend dev container (for Playwright)

**Architecture:**
```
┌─────────────────────┐
│  Custom Network     │
│  (gift-genie-test)  │
├─────────────────────┤
│  ┌──────────────┐   │
│  │  PostgreSQL  │   │
│  └──────────────┘   │
│  ┌──────────────┐   │
│  │    Redis     │   │
│  └──────────────┘   │
│  ┌──────────────┐   │
│  │   Backend    │◄──┼───┐
│  │  (prod img)  │   │   │
│  └──────────────┘   │   │
└─────────────────────┘   │
                          │
┌─────────────────────────┤
│  Host Network           │
│  ┌──────────────────┐   │
│  │   Playwright     │   │
│  │ (frontend:dev)   │───┘
│  └──────────────────┘
└─────────────────────────┘
```

**Steps:**
1. Create custom Docker network
2. Start PostgreSQL and Redis containers
3. Run database migrations (using backend:prod)
4. Start backend server (using backend:prod)
5. Install Playwright browsers
6. Run E2E tests (using frontend:dev with host network)

**Why production backend for E2E?**
- Tests the actual production image
- Validates production Dockerfile works correctly
- Ensures migrations run properly in production image

**Cleanup:** Always stops and removes containers, even on failure

### 5. Status Comment (`status-comment`)
**Purpose:** Post job results as PR comment

**Dependencies:** `lint`, `unit-test`, `e2e-test` (with `if: always()`)

**Features:**
- Updates existing comment instead of creating duplicates
- Shows emoji status for each job
- Links to workflow run details
- Downloads and displays coverage info (optional)

## Benefits of Docker-First CI

### ✅ Consistency
- CI tests exactly what runs in production
- No "works on my machine" issues
- Eliminates drift between CI and production environments

### ✅ Validation
- Docker setup is tested on every PR
- Dockerfile changes are validated automatically
- Multi-stage build targets are tested

### ✅ Efficiency
- Docker layer caching speeds up builds (5-10x faster)
- No need to install dependencies on CI runner
- Images built once, used multiple times

### ✅ Reliability
- Production images tested in CI before deployment
- Database migrations tested against production image
- Health checks validated

## GitHub Actions Cache

### Docker Layer Caching
Uses GitHub Actions cache backend for Docker layers:

```yaml
cache-from: type=gha,scope=backend-dev
cache-to: type=gha,mode=max,scope=backend-dev
```

**Scopes:**
- `backend-dev` - Backend development image layers
- `backend-prod` - Backend production image layers
- `frontend-dev` - Frontend development image layers
- `frontend-prod` - Frontend production image layers

**Benefits:**
- Automatic cache management
- No manual cache expiration needed
- Shared across all PRs and branches
- Cache hit rate: ~80-90% on typical PRs

## Image Artifacts

### Storage Strategy
Images are exported as tar files and uploaded as artifacts:

```bash
outputs: type=docker,dest=/tmp/backend-dev.tar
```

**Retention:** 1 day (temporary, only needed during PR workflow)

**Size:** ~2GB total for all 4 images

**Why not push to registry?**
- Faster (no push/pull overhead)
- No registry authentication needed
- Automatic cleanup after 1 day
- Works great for PR validation

## Running Locally

### Test the CI pipeline locally:

```bash
# 1. Build all images (simulates build-images job)
docker build --target development -t gift-genie-backend:dev ./backend
docker build --target production -t gift-genie-backend:prod ./backend
docker build --target development -t gift-genie-frontend:dev ./frontend
docker build --target production -t gift-genie-frontend:prod ./frontend

# 2. Run lint (simulates lint job)
docker run --rm gift-genie-backend:dev ruff check src/
docker run --rm gift-genie-backend:dev mypy src/
docker run --rm gift-genie-frontend:dev bun run lint

# 3. Run unit tests (simulates unit-test job)
docker compose -f docker-compose.yml up -d postgres redis
docker run --rm --network host \
  -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/gift_genie_test \
  -e REDIS_URL=redis://localhost:6379 \
  gift-genie-backend:dev pytest

# 4. Run E2E tests (simulates e2e-test job)
# See .github/workflows/pull-request.yml for full setup
```

## Troubleshooting

### Build failures

**Symptom:** Docker build fails in CI but works locally

**Solutions:**
- Check if `.dockerignore` is excluding required files
- Verify all COPY paths exist in the build context
- Ensure base images are accessible
- Check for platform-specific issues (amd64 vs arm64)

### Cache misses

**Symptom:** Docker builds are slow, not using cache

**Solutions:**
- Check if Dockerfile changed significantly
- Verify cache keys in `cache-from`/`cache-to`
- Review GitHub Actions cache usage (10GB limit)
- Consider if dependencies changed (lockfile updates)

### E2E test failures

**Symptom:** E2E tests fail in CI but work locally

**Solutions:**
- Check if backend is healthy (`curl http://localhost:8000/api/v1/health`)
- Verify network connectivity (use `--network host` for Playwright)
- Check database migrations ran successfully
- Review container logs (`docker logs backend`)
- Ensure Playwright dependencies installed

### Artifact upload failures

**Symptom:** Cannot upload/download image artifacts

**Solutions:**
- Check artifact size (GitHub has limits)
- Verify artifact names are unique
- Ensure tar files were created successfully
- Check GitHub Actions runner disk space

## Future Enhancements

### Potential improvements:
1. **Push to GitHub Container Registry** for deployment
2. **Matrix builds** for multiple Node/Python versions
3. **Dependabot** integration for Docker base images
4. **Vulnerability scanning** (Trivy, Snyk)
5. **Image signing** (cosign) for security
6. **Parallel test execution** for faster feedback
7. **Deploy preview environments** for PRs

## Resources

- [Docker Build GitHub Action](https://github.com/docker/build-push-action)
- [Docker Buildx Documentation](https://docs.docker.com/buildx/)
- [GitHub Actions Cache](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)

