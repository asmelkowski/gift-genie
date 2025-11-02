### DevOps — Docker

## Core Principles
- Use **single Dockerfiles with multiple named stages** (not separate Dockerfile.dev files)
- Use multi-stage builds to minimize production image size
- Optimize layer caching for dependency installs
- Run containers as non-root users in production
- Use minimal base images (alpine, slim variants)

## Multi-Stage Build Pattern

Use named targets for development and production in a single Dockerfile:

```dockerfile
# Base stage - common dependencies
FROM base-image AS base
# ... common setup ...

# Development stage - hot-reloading, dev dependencies
FROM base AS development
# ... dev dependencies & hot-reload ...

# Builder stage - production build
FROM base AS builder
# ... production dependencies ...

# Production stage - minimal runtime
FROM minimal-base AS production
# ... copy from builder, run as non-root ...
```

**Usage:**
```yaml
# docker-compose.yml
services:
  app:
    build:
      target: production  # default

# docker-compose.dev.yml
services:
  app:
    build:
      target: development  # override for dev
```

## Best Practices

### Security
- Always run as non-root user in production
- Use `COPY --chown` to avoid extra chmod layers
- Scan images for vulnerabilities regularly
- Keep base images updated

### Performance
- Order Dockerfile commands from least to most frequently changing
- Copy lock files before source code for better caching
- Combine RUN commands when appropriate to reduce layers
- Clean up package manager caches in the same RUN command
- Use `.dockerignore` to exclude unnecessary files

### Health Checks
Every service should have a health check:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
```

### Environment Variables
- Use `.env` files for local development
- Never commit secrets to version control
- Use `${VAR:-default}` syntax for defaults
- Validate required variables at startup

### Development Workflow
- Use volume mounts for hot-reloading in development
- Mount source code as read-only (`:ro`) when possible
- Keep dev and prod environments as similar as possible
- Use the same base image for both targets when feasible

## Backend (Python + uv)
- Use `uv sync --frozen` for reproducible builds
- Use `--no-dev` flag in production builder stage
- Set `UV_COMPILE_BYTECODE=1` in production for performance
- Install dependencies before copying source code for better caching

## Frontend (Bun + Vite)
- Use `bun install --frozen-lockfile`
- Build in separate stage to cache artifacts
- Serve production builds with nginx
- Configure nginx with security headers and gzip compression