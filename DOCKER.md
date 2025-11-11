# Docker Setup for Gift Genie

This document provides instructions for running Gift Genie using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose V2+ ([Install Docker Compose](https://docs.docker.com/compose/install/))

## Quick Reference

### Single Dockerfile, Multiple Targets

This project uses a **single Dockerfile per service** with multiple named stages. This approach is cleaner than maintaining separate `Dockerfile` and `Dockerfile.dev` files:

```dockerfile
# backend/Dockerfile
FROM python:3.13-slim AS base
# ... common setup ...

FROM base AS development
# ... dev dependencies & hot-reload ...

FROM base AS builder
# ... production dependencies ...

FROM python:3.13-slim AS production
# ... minimal runtime image ...
```

### Build Targets

```bash
# Production (default target)
docker compose up

# Development (with hot-reloading)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or build specific targets manually
docker build --target development -t myapp:dev .
docker build --target production -t myapp:prod .
```

## Quick Start

### Production Build

Run the entire application stack in production mode:

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

The application will be available at:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Development Build

Run the application with hot-reloading for development:

```bash
# Build and start all services with development configuration
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Stop all services
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

The application will be available at:
- **Frontend**: http://localhost:5173 (Vite dev server with HMR)
- **Backend API**: http://localhost:8000 (uvicorn with auto-reload)
- **API Docs**: http://localhost:8000/docs

## Architecture

### Multi-Stage Dockerfiles

Both the backend and frontend use **multi-stage builds** with named targets:

#### Backend Dockerfile Stages
1. **base** - Common Python dependencies and uv setup
2. **development** - Includes dev dependencies, hot-reloading enabled
3. **builder** - Production dependencies only, optimized
4. **production** - Minimal runtime image (~150MB)

#### Frontend Dockerfile Stages
1. **base** - Bun with dependencies installed
2. **development** - Vite dev server with HMR
3. **builder** - Production build artifacts
4. **production** - Nginx serving static files (~50MB)

### Services

#### 1. PostgreSQL (`postgres`)
- **Image**: `postgres:16-alpine`
- **Port**: 5432
- **Database**: `gift_genie`
- **Volume**: `postgres_data` (persistent storage)

#### 2. Redis (`redis`)
- **Image**: `redis:7-alpine`
- **Port**: 6379
- **Volume**: `redis_data` (persistent storage)

#### 3. Backend (`backend`)
- **Build**: Multi-stage Python 3.13 image with uv
- **Target**: `production` (default) or `development`
- **Port**: 8000
- **Health Check**: `/api/v1/health`
- **Dependencies**: PostgreSQL, Redis

#### 4. Frontend (`frontend`)
- **Build**: Multi-stage Bun + Nginx image
- **Target**: `production` (default) or `development`
- **Port**: 80 (production) / 5173 (development)
- **Dependencies**: Backend

### Network

All services communicate on a bridge network called `gift-genie-network`.

## Configuration

### Environment Variables

Create a `.env` file in the project root with your configuration:

```bash
cp .env.example .env
```

Key variables:
- `SECRET_KEY`: JWT secret key (change in production!)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `CORS_ORIGINS`: Allowed CORS origins (JSON array)
- `VITE_API_BASE_URL`: Frontend API base URL

### Database Migrations

Run migrations after starting the services:

```bash
# Production
docker compose exec backend alembic upgrade head

# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend alembic upgrade head
```

## Docker Commands

### Building

```bash
# Build all services (production target)
docker compose build

# Build specific service
docker compose build backend

# Build without cache
docker compose build --no-cache

# Build development targets
docker compose -f docker-compose.yml -f docker-compose.dev.yml build

# Build specific stage manually
docker build --target development -t gift-genie-backend:dev ./backend
docker build --target production -t gift-genie-backend:prod ./backend
```

### Running

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d backend

# Start with logs
docker compose up

# Scale services (not recommended for this setup)
docker compose up -d --scale backend=2
```

### Logs

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend

# View last 100 lines
docker compose logs -f --tail=100
```

### Stopping

```bash
# Stop all services
docker compose stop

# Stop specific service
docker compose stop backend

# Stop and remove containers
docker compose down

# Stop, remove containers, and volumes
docker compose down -v
```

### Executing Commands

```bash
# Access backend shell
docker compose exec backend bash

# Access backend Python shell
docker compose exec backend python

# Run backend tests
docker compose exec backend pytest

# Access database
docker compose exec postgres psql -U postgres -d gift_genie

# Access Redis CLI
docker compose exec redis redis-cli
```

### Health Checks

```bash
# Check service health
docker compose ps

# Inspect backend health
docker inspect gift-genie-backend --format='{{.State.Health.Status}}'
```

## Development Workflow

### 1. Start Development Environment

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 2. Watch Logs

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
```

### 3. Make Code Changes

- Backend changes in `backend/src/` trigger auto-reload
- Frontend changes in `frontend/src/` trigger Hot Module Replacement (HMR)

### 4. Run Tests

```bash
# Backend tests
docker compose exec backend pytest

# Backend tests with coverage
docker compose exec backend pytest --cov=gift_genie --cov-report=term

# Frontend tests (if available)
docker compose exec frontend bun test
```

### 5. Database Operations

```bash
# Create migration
docker compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker compose exec backend alembic upgrade head

# Rollback migration
docker compose exec backend alembic downgrade -1
```

## Production Deployment

### Building Production Images

```bash
# Build production images
docker compose build

# Tag images for registry
docker tag gift-genie-backend:latest your-registry/gift-genie-backend:latest
docker tag gift-genie-frontend:latest your-registry/gift-genie-frontend:latest

# Push to registry
docker push your-registry/gift-genie-backend:latest
docker push your-registry/gift-genie-frontend:latest
```

### Security Considerations

1. **Change default credentials**: Update `SECRET_KEY`, database passwords
2. **Use environment variables**: Never commit secrets to version control
3. **Enable HTTPS**: Use a reverse proxy (nginx, Traefik, Caddy)
4. **Run as non-root**: Both Dockerfiles use non-root users
5. **Keep images updated**: Regularly update base images and dependencies

### Resource Limits

Add resource limits to `docker-compose.yml` for production:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker compose logs backend

# Verify database connection
docker compose exec backend env | grep DATABASE_URL

# Test database connectivity
docker compose exec backend python -c "from sqlalchemy import create_engine; engine = create_engine('postgresql://postgres:postgres@postgres:5432/gift_genie'); print(engine.connect())"
```

### Frontend build fails

```bash
# Check logs
docker compose logs frontend

# Rebuild without cache
docker compose build --no-cache frontend

# Verify environment variables
docker compose exec frontend env | grep VITE
```

### Database connection issues

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Test connection
docker compose exec postgres pg_isready -U postgres
```

### Port conflicts

If ports 80, 8000, 5432, or 6379 are already in use:

```bash
# Change ports in docker-compose.yml
# Example: "8080:8000" instead of "8000:8000"
```

### Clean slate

```bash
# Stop everything and remove volumes
docker compose down -v

# Remove all images
docker compose down --rmi all -v

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

## Performance Optimization

### Multi-stage builds with targets
Both Dockerfiles use **multi-stage builds with named targets** for maximum flexibility:

**Benefits:**
- Single Dockerfile per service (no separate dev/prod files)
- Shared base layers between dev and prod
- Docker layer caching for faster rebuilds
- Minimal production images:
  - Backend: ~150MB (Python slim base)
  - Frontend: ~50MB (Nginx alpine)

**Development target features:**
- Includes dev dependencies (pytest, ruff, mypy, etc.)
- Hot-reloading enabled
- No build optimization for faster iteration

**Production target features:**
- Production dependencies only
- Compiled bytecode (uv)
- Optimized builds
- Non-root users for security
- Minimal attack surface

### Caching
- Docker layer caching speeds up rebuilds
- uv and bun use lockfiles for reproducible builds
- Frontend static assets are cached with long expiry
- Base stages are reused between development and production

### Health checks
All services have health checks to ensure proper startup order and monitoring.

## CI/CD Integration

The Docker setup integrates with GitHub Actions workflow:

```yaml
- name: Build Docker images
  run: docker compose build

- name: Run tests in containers
  run: docker compose run --rm backend pytest
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI in Docker](https://fastapi.tiangolo.com/deployment/docker/)
- [Vite Docker Guide](https://vitejs.dev/guide/static-deploy.html)
