# Environment Setup Guide

This guide covers setting up your development environment for working on Gift Genie, including testing infrastructure.

## Prerequisites

### System Requirements
- **macOS/Linux**: Native support
- **Windows**: Use WSL2 (Windows Subsystem for Linux 2)
- **RAM**: Minimum 8GB
- **Disk Space**: Minimum 10GB

### Required Software
- **Git**: Version control
- **Docker Desktop**: For PostgreSQL and Redis
- **Node.js**: v18 or later (for frontend)
- **Python**: v3.13 or later (for backend)
- **bun**: Node package manager

## Step 1: Clone and Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd gift-genie

# Create a .envrc file for direnv (optional, recommended)
cp backend/.envrc.example backend/.envrc  # if available
```

## Step 2: Backend Setup

### Install Backend Dependencies

```bash
cd backend

# Using uv (recommended)
uv sync

# Or using pip and venv
python3.13 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
```

### Database Setup

```bash
# Start PostgreSQL and Redis containers
make db-up

# Verify containers are running
docker-compose -f ../docker-compose.yml ps

# Apply migrations
make db-upgrade
```

### Run Backend Tests

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Run specific test file
uv run pytest tests/test_auth_login_api.py -v

# Watch mode
make test-watch
```

### Start Backend Development Server

```bash
make run
# Server will be available at http://localhost:8000
# API docs at http://localhost:8000/docs
```

## Step 3: Frontend Setup

### Install Frontend Dependencies

```bash
cd ../frontend

# Using bun
bun install
```

### Configure Environment Variables

```bash
# Create a .env file for frontend
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:8000/api/v1
EOF
```

### Run Frontend Tests

```bash
# Run unit tests
bun test

# Run in watch mode
bun run test:watch

# Run with UI
bun run test:ui

# Run with coverage
bun run test:coverage

# Run E2E tests (requires backend running)
bun run e2e

# Run E2E tests in UI mode
bun run e2e:ui

# Record new E2E tests with codegen
bun run e2e:codegen
```

### Start Frontend Development Server

```bash
bun run dev
# Frontend will be available at http://localhost:3000
# The dev server proxies /api requests to http://localhost:8000
```

## Step 4: Verify Installation

### Quick Smoke Test

```bash
# Terminal 1: Backend
cd backend
make run

# Terminal 2: Frontend
cd frontend
bun run dev

# Terminal 3: Run tests
cd frontend
bun test -- --run  # Run once instead of watch mode

cd ../backend
make test
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- **ReDoc API Docs**: http://localhost:8000/redoc

## IDE Setup

### VS Code

#### Extensions
- **Python**
  - Python
  - Pylance
  - Ruff (linting and formatting)
  - mypy Type Checker
  - Pytest

- **JavaScript/TypeScript**
  - ESLint
  - Prettier
  - TypeScript Vue Plugin
  - Vitest

- **General**
  - Docker
  - Git Graph
  - Thunder Client (API testing)

#### Settings

Create `.vscode/settings.json`:

```json
{
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.ruff": "explicit"
    }
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "python.linting.enabled": true
}
```

### PyCharm

- **Python**: Professional Edition (or Community)
- Configure Python interpreter to point to your venv
- Enable pytest as test framework
- Use Ruff for code style

## Testing Database Setup

### Using Test Database

The test database is automatically set up when running tests. Migrations are applied to a test database.

```bash
# View test database status
docker-compose -f ../docker-compose.yml ps

# Manual test database reset
docker-compose -f ../docker-compose.yml exec postgres psql -U postgres -c "DROP DATABASE test_gift_genie; CREATE DATABASE test_gift_genie;"
```

### Seeding Test Data

Test fixtures are available in `backend/tests/conftest.py` for common test scenarios.

## Debugging

### Backend Debugging

```bash
# Add breakpoint in code
import pdb; pdb.set_trace()

# Run specific test with debug output
uv run pytest tests/test_auth.py::test_login -s -v --pdb

# Use VS Code debugger
# Add to .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: pytest",
      "type": "python",
      "request": "launch",
      "module": "pytest",
      "args": ["${file}"],
      "console": "integratedTerminal",
      "justMyCode": true
    }
  ]
}
```

### Frontend Debugging

```bash
# Vitest UI
bun run test:ui

# Playwright Inspector
bun run e2e:debug

# Browser DevTools
# Available automatically during e2e:ui
```

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Kill process on port 5432 (PostgreSQL)
lsof -ti:5432 | xargs kill -9
```

### Docker Issues

```bash
# View Docker logs
docker-compose -f docker-compose.yml logs postgres

# Restart containers
docker-compose -f docker-compose.yml restart

# Remove and recreate
docker-compose -f docker-compose.yml down -v
docker-compose -f docker-compose.yml up -d
```

### Test Failures

```bash
# Clear pytest cache
cd backend
rm -rf .pytest_cache
make test

# Reset frontend test environment
cd ../frontend
rm -rf node_modules/.vitest
bun test
```

## Development Workflow

### 1. Feature Development

```bash
# Create a new branch
git checkout -b feat/your-feature

# Terminal 1: Run backend
cd backend && make run

# Terminal 2: Run frontend
cd frontend && bun run dev

# Terminal 3: Run tests in watch mode
cd backend && make test-watch  # Or frontend: bun run test:watch
```

### 2. Writing Tests

```bash
# Backend: Create test_your_feature.py
backend/tests/test_your_feature.py

# Frontend: Add .test.tsx or .spec.ts files
frontend/src/components/YourComponent.test.tsx
frontend/e2e/your_feature.spec.ts

# Run your tests
cd backend && uv run pytest tests/test_your_feature.py -v
cd frontend && bun test -- your_feature
```

### 3. Code Quality Checks

```bash
# Backend
cd backend
make lint      # Check code style
make format    # Fix code style
make typecheck # Run type checker

# Frontend
cd frontend
bun run lint   # Check code style
bun run lint -- --fix  # Fix code style
```

### 4. Before Commit

```bash
# Run all checks
cd backend
make lint
make format
make typecheck
make test

cd ../frontend
bun run lint
bun run lint -- --fix
bun test -- --run
bun run build  # Check that build succeeds
```

## Useful Commands Reference

### Backend

| Command | Purpose |
|---------|---------|
| `make install` | Install dependencies |
| `make run` | Start development server |
| `make test` | Run tests |
| `make test-coverage` | Run tests with coverage report |
| `make test-watch` | Run tests in watch mode |
| `make lint` | Check code style |
| `make format` | Fix code style |
| `make typecheck` | Run type checker |
| `make db-up` | Start database containers |
| `make db-down` | Stop database containers |
| `make db-reset` | Reset database |

### Frontend

| Command | Purpose |
|---------|---------|
| `bun install` | Install dependencies |
| `bun run dev` | Start development server |
| `bun test` | Run unit tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:ui` | Run tests with UI |
| `bun run test:coverage` | Run tests with coverage |
| `bun run e2e` | Run e2e tests |
| `bun run e2e:ui` | Run e2e tests with UI |
| `bun run e2e:debug` | Debug e2e tests |
| `bun run lint` | Check code style |
| `bun run build` | Build for production |

## Next Steps

1. Read [TESTING.md](./TESTING.md) for detailed testing guide
2. Read [README.md](./README.md) for project overview
3. Familiarize yourself with the [Clean Architecture](./backend/README.md)
4. Check out the test plan in [.ai/test-plan.md](./.ai/test-plan.md)

## Getting Help

- Check the project's README files for each directory
- Review existing tests for patterns and examples
- Consult the [TESTING.md](./TESTING.md) guide
- Check the GitHub Issues for similar problems
- Ask in team communication channels

## Additional Resources

- [Python Testing with pytest](https://docs.pytest.org/)
- [Frontend Testing with Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/)
- [Playwright E2E Testing](https://playwright.dev/)
- [Mock Service Worker](https://mswjs.io/)
- [FastAPI Testing](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
