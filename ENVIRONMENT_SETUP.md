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
VITE_API_BASE_URL=http://localhost:8000
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

## Step 4: Pre-commit Hooks Setup

### What are Pre-commit Hooks?

Pre-commit hooks are automated scripts that run before each git commit to ensure code quality and consistency. They automatically:
- Format code according to project standards
- Check for common issues and bugs
- Validate configuration files
- Run security checks
- Enforce consistent file formatting

### Installation

```bash
# Install pre-commit (if not already installed)
pip install pre-commit

# Or using uv
uv tool install pre-commit

# Or using homebrew (macOS)
brew install pre-commit
```

### Install the Hooks

```bash
# From the project root directory
pre-commit install

# This installs the hooks defined in .pre-commit-config.yaml
# You should see output like:
# pre-commit installed at .git/hooks/pre-commit
```

### What Hooks Are Configured?

The project includes hooks for:

#### Backend (Python)
- **Ruff Format**: Auto-formats Python code
- **Ruff Linter**: Checks and fixes Python code style issues
- **Bandit**: Security vulnerability scanner

#### Frontend (JavaScript/TypeScript)
- **Prettier**: Formats frontend code (TS/JS/JSX/TSX, JSON, CSS, MD)
- **ESLint**: Lints and fixes frontend code issues

#### General
- **Trailing Whitespace**: Removes trailing spaces
- **End-of-file-fixer**: Ensures files end with newline
- **Mixed-line-ending**: Normalizes line endings to LF
- **Check YAML/JSON/TOML**: Validates configuration files
- **Check merge conflicts**: Detects unresolved merge conflicts
- **Check added large files**: Prevents committing large files (>1MB)
- **Check case conflicts**: Detects case-insensitive filename conflicts
- **Check docstring first**: Ensures docstrings come before code

#### Docker
- **Hadolint**: Lints Dockerfiles for best practices

### Running Hooks Manually

```bash
# Run all hooks on all files
pre-commit run --all-files

# Run hooks on specific files
pre-commit run --files backend/src/gift_genie/main.py

# Run specific hook
pre-commit run ruff-format --all-files

# Run hooks on staged files only
pre-commit run
```

### How Hooks Work During Development

1. **Automatic on Commit**: When you run `git commit`, hooks run on staged files
2. **Auto-fix**: Many hooks (like ruff, prettier) will automatically fix issues
3. **Re-stage Fixed Files**: If files are modified, you need to re-stage them:
   ```bash
   git add .  # Re-stage all modified files
   git commit  # Try committing again
   ```

### Bypassing Hooks (Use with Caution)

```bash
# Skip all hooks for a single commit (not recommended)
git commit --no-verify

# Or the shorter form
git commit -n

# Skip hooks for a specific file (remove from staging)
git reset HEAD path/to/file
git commit  # Commit without that file
```

⚠️ **Warning**: Only bypass hooks when absolutely necessary. They ensure code quality and prevent common issues.

### Updating Hooks

```bash
# Update to latest versions of all hooks
pre-commit autoupdate

# Re-install after updating
pre-commit install
```

### Troubleshooting Common Issues

#### Hook Installation Fails
```bash
# Clean and reinstall
pre-commit clean
pre-commit install
```

#### Hook Fails on Specific File
```bash
# Run hooks on specific file to see detailed error
pre-commit run --files path/to/problematic/file

# Check which hook is failing
pre-commit run --all-files | grep -E "(FAIL|passed)"
```

#### Virtual Environment Issues
```bash
# Ensure hooks use correct Python version
pre-commit run --all-files --verbose

# Update default Python version in .pre-commit-config.yaml if needed
```

#### Frontend Dependencies Missing
```bash
# Install frontend dependencies first
cd frontend
bun install

# Then run hooks again
cd ..
pre-commit run --all-files
```

#### Performance Issues
```bash
# Run hooks on fewer files to speed up
git add -p  # Interactive staging
git commit  # Only runs on staged files

# Or exclude certain files temporarily
# Edit .pre-commit-config.yaml to add exclude patterns
```

### Hook Configuration

The hook configuration is in `.pre-commit-config.yaml`. Key settings:
- `fail_fast: false`: Continues running all hooks even if one fails
- `default_stages: [commit]`: Runs on commit by default
- Language versions specified for consistency

### Best Practices

1. **Always install hooks** when setting up a new development machine
2. **Read hook output carefully** - it often provides helpful fix suggestions
3. **Commit frequently** to run hooks on smaller changesets
4. **Update hooks regularly** with `pre-commit autoupdate`
5. **Don't bypass hooks** unless you understand the implications
6. **Fix issues at the source** rather than just bypassing the check

## Step 5: Verify Installation

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

# Install pre-commit hooks (if not already done)
pre-commit install

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

**Option 1: Using Pre-commit Hooks (Recommended)**

```bash
# Stage your changes
git add .

# Commit - pre-commit hooks will run automatically
git commit -m "feat: your changes"

# If hooks modify files, re-stage and commit again
git add .
git commit -m "feat: your changes"
```

**Option 2: Manual Checks (If hooks bypassed)**

```bash
# Run all checks manually
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

### Pre-commit Hooks

| Command | Purpose |
|---------|---------|
| `pre-commit install` | Install hooks in git repository |
| `pre-commit run` | Run hooks on staged files |
| `pre-commit run --all-files` | Run hooks on all files |
| `pre-commit autoupdate` | Update hook versions |
| `pre-commit clean` | Clean hook cache |
| `git commit --no-verify` | Bypass hooks (use with caution) |

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
