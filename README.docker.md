# Gift Genie - Docker Setup

> Complete Docker setup for Gift Genie with single Dockerfiles using multi-stage builds

## 🚀 Quick Start

### Production (Default)
```bash
docker compose up -d
```
Access at http://localhost (frontend) and http://localhost:8000 (backend)

### Development (Hot-Reload)
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```
Access at http://localhost:5173 (frontend) and http://localhost:8000 (backend)

## 📁 Project Structure

```
gift-genie/
├── backend/
│   ├── Dockerfile              # Multi-stage: base → development → builder → production
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile              # Multi-stage: base → development → builder → production
│   └── .dockerignore
├── docker-compose.yml          # Production configuration (target: production)
├── docker-compose.dev.yml      # Development overrides (target: development)
├── .env.example                # Environment variables template
└── DOCKER.md                   # Comprehensive Docker documentation
```

## 🏗️ Architecture Highlights

### Single Dockerfile with Multiple Targets

**Backend Stages:**
- `base` - Common Python + uv setup
- `development` - Dev dependencies + hot-reload
- `builder` - Production dependencies only
- `production` - Minimal runtime (~150MB)

**Frontend Stages:**
- `base` - Bun + dependencies
- `development` - Vite dev server + HMR
- `builder` - Production build artifacts
- `production` - Nginx static server (~50MB)

### Why This Approach?

✅ **Single source of truth** - One Dockerfile per service
✅ **Shared layers** - Base stage reused across targets
✅ **Better caching** - Docker layers optimized
✅ **Cleaner** - No separate `Dockerfile.dev` files
✅ **Maintainable** - Changes in one place

## 🛠️ Common Commands

```bash
# Production
docker compose up -d              # Start all services
docker compose logs -f backend    # View backend logs
docker compose down               # Stop all services

# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Database
docker compose exec backend alembic upgrade head     # Run migrations
docker compose exec postgres psql -U postgres -d gift_genie

# Testing
docker compose exec backend pytest
docker compose exec backend pytest --cov

# Cleanup
docker compose down -v            # Stop and remove volumes
docker compose down --rmi all -v  # Stop and remove everything
```

## 🔧 Configuration

### Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Update key variables:
   ```env
   SECRET_KEY=your-secret-key-here-change-in-production
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/gift_genie
   REDIS_URL=redis://localhost:6379
   CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
   ```

### Service Ports

- **Frontend (prod)**: 80
- **Frontend (dev)**: 5173
- **Backend**: 8000
- **PostgreSQL**: 5432
- **Redis**: 6379

## 🔐 Security Features

- ✅ Non-root users in production
- ✅ Minimal base images (slim, alpine)
- ✅ Security headers configured (nginx)
- ✅ Health checks for all services
- ✅ No secrets in Dockerfiles

## 📊 Image Sizes

| Service | Target | Size |
|---------|--------|------|
| Backend | production | ~150MB |
| Backend | development | ~300MB |
| Frontend | production | ~50MB |
| Frontend | development | ~400MB |

## 🔄 Development Workflow

1. Start development environment:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

2. Code changes are automatically detected:
   - Backend: uvicorn auto-reload
   - Frontend: Vite HMR

3. View logs:
   ```bash
   docker compose logs -f
   ```

4. Run tests:
   ```bash
   docker compose exec backend pytest
   ```

5. Stop when done:
   ```bash
   docker compose down
   ```

## 📚 Documentation

- **[DOCKER.md](./DOCKER.md)** - Comprehensive Docker guide
- **[.ai/rules/devops-docker.md](./.ai/rules/devops-docker.md)** - Docker best practices

## 🚢 Production Deployment

1. Build production images:
   ```bash
   docker compose build
   ```

2. Tag for registry:
   ```bash
   docker tag gift-genie-backend:latest your-registry/gift-genie-backend:v1.0.0
   docker tag gift-genie-frontend:latest your-registry/gift-genie-frontend:v1.0.0
   ```

3. Push to registry:
   ```bash
   docker push your-registry/gift-genie-backend:v1.0.0
   docker push your-registry/gift-genie-frontend:v1.0.0
   ```

## 🐛 Troubleshooting

### Port Conflicts
If ports are already in use, edit `docker-compose.yml`:
```yaml
ports:
  - "8080:8000"  # Change host port
```

### Database Connection Issues
```bash
# Check PostgreSQL health
docker compose exec postgres pg_isready -U postgres

# View database logs
docker compose logs postgres
```

### Clean Slate
```bash
# Remove everything and start fresh
docker compose down -v --rmi all
docker compose build --no-cache
docker compose up -d
```

## 📈 Performance Tips

- Use `docker compose build --parallel` for faster builds
- Enable BuildKit: `export DOCKER_BUILDKIT=1`
- Use layer caching in CI/CD
- Prune unused images: `docker system prune -a`

## 🤝 Contributing

When making changes to Docker setup:
1. Test both production and development targets
2. Update DOCKER.md documentation
3. Verify image sizes haven't ballooned
4. Test clean builds (`--no-cache`)
5. Update .dockerignore if needed

---

**Note**: This Docker setup integrates with the GitHub Actions CI/CD pipeline. See `.github/workflows/pull-request.yml` for CI configuration.
