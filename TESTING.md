# Testing Guide for Gift Genie

A comprehensive guide to the testing infrastructure, setup, and best practices for the Gift Genie application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Backend Testing](#backend-testing)
4. [Frontend Testing](#frontend-testing)
5. [E2E Testing](#e2e-testing)
6. [Verification Checklist](#verification-checklist)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Resources](#resources)

---

## Quick Start

Get up and running in 5 minutes:

```bash
# 1. Install dependencies
cd backend && uv sync
cd ../frontend && bun install

# 2. Start services
cd ../backend && make db-up

# 3. Run tests
make test                          # Backend tests
cd ../frontend && bun test -- --run  # Frontend tests

# 4. Access applications
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Expected Outcome
- All existing tests pass (or show meaningful failures, not setup issues)
- No import or configuration errors

---

## Environment Setup

### Prerequisites

- **Node.js**: v18+ (for frontend)
- **Python**: v3.13+ (for backend)
- **Docker Desktop**: For PostgreSQL and Redis
- **bun**: Node package manager
- **Git**: For version control

### Backend Setup

```bash
cd backend

# Install dependencies
uv sync
# OR using pip:
# python3.13 -m venv venv
# source venv/bin/activate  # On Windows: venv\Scripts\activate
# pip install -e .

# Start PostgreSQL and Redis containers
make db-up

# Verify containers are running
docker-compose -f ../docker-compose.yml ps

# Apply database migrations
make db-upgrade
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
bun install

# Configure environment
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:8000/api/v1
EOF
```

### IDE Setup

#### VS Code

**Recommended Extensions:**
- Python, Pylance, Ruff, mypy Type Checker, Pytest
- ESLint, Prettier, TypeScript Vue Plugin, Vitest
- Docker, Git Graph

**Settings (.vscode/settings.json):**
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
  "python.testing.pytestEnabled": true
}
```

#### PyCharm
- Configure Python interpreter to point to your venv
- Enable pytest as test framework
- Use Ruff for code style

### Debugging Setup

**Backend:**
```bash
# Add breakpoint in code
import pdb; pdb.set_trace()

# Run with debug output
uv run pytest tests/test_file.py -s -v --pdb
```

**Frontend:**
```bash
# Run tests with UI
bun run test:ui

# E2E debug mode
bun run e2e:debug
```

---

## Backend Testing

### Running Backend Tests

```bash
cd backend

# Run all tests
make test

# Run with coverage report
make test-coverage

# Run in watch mode
make test-watch

# Run with verbose output
make test-verbose

# Run specific test file
uv run pytest tests/test_auth_login_api.py

# Run tests matching a pattern
uv run pytest -k "auth"

# Run specific test
uv run pytest tests/test_auth_login_api.py::test_login_success
```

### Writing Backend Unit Tests

Backend tests follow the **Arrange-Act-Assert** pattern using pytest:

```python
import pytest
from httpx import AsyncClient
from gift_genie.main import app

@pytest.mark.asyncio
async def test_user_registration(client: AsyncClient):
    # Arrange
    user_data = {
        "email": "test@example.com",
        "password": "09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q"
    }
    
    # Act
    response = await client.post("/auth/register", json=user_data)
    
    # Assert
    assert response.status_code == 201
    assert response.json()["access_token"]
```

**Key Points:**
- Use `@pytest.mark.asyncio` for async tests
- Use the `client` fixture from `conftest.py` for API testing
- Mock database operations where appropriate
- Test both success and failure paths

### Test Markers

Organize tests using markers:

```bash
# Run specific category
uv run pytest -m unit           # Unit tests only
uv run pytest -m integration    # Integration tests
uv run pytest -m auth           # Auth-related tests
uv run pytest -m slow           # Slow tests
```

**Available markers:**
- `unit` - Unit tests for individual functions/classes
- `integration` - Integration tests for multiple components
- `e2e` - End-to-end tests
- `auth` - Authentication-related tests
- `slow` - Slow running tests

### Backend Coverage

```bash
# Generate coverage report
make test-coverage

# Opens: htmlcov/index.html
```

**Coverage Goals:**
- Domain entities: 90%+
- Use cases: 85%+
- Infrastructure: 80%+
- Overall: 80%+

---

## Frontend Testing

### Running Frontend Unit Tests

```bash
cd frontend

# Run all tests
bun test

# Run in watch mode
bun run test:watch

# Run with UI
bun run test:ui

# Run with coverage
bun run test:coverage

# Run specific test file
bun test -- src/components/LoginForm.test.tsx

# Run tests matching a pattern
bun test -- --grep "login"
```

### Writing Frontend Unit Tests

Frontend tests use vitest and React Testing Library:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should render login form', () => {
    // Arrange
    render(<LoginForm onSubmit={vi.fn()} />);
    
    // Act & Assert
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    // Arrange
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} />);
    
    // Act
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Assert
    expect(handleSubmit).toHaveBeenCalled();
  });
});
```

**Key Points:**
- Use `render()` from React Testing Library
- Query elements using user-facing selectors (role, label, placeholder)
- Use `vi.fn()` for mocking functions
- Follow Arrange-Act-Assert pattern
- Test user behavior, not implementation details

### Mocking API Calls

API calls are mocked using Mock Service Worker (MSW):

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('should display user profile', async () => {
    // Override default handler for this test
    server.use(
      http.get('*/auth/me', () => {
        return HttpResponse.json({
          id: 'user-1',
          email: 'test@example.com',
        });
      })
    );
    
    render(<UserProfile />);
    
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });
});
```

**Mock Handlers:** Located in `src/test/mocks/handlers.ts`

### Frontend Coverage

```bash
bun run test:coverage

# Opens: coverage/index.html
```

**Coverage Goals:**
- Components: 80%+
- Hooks: 85%+
- Utilities: 90%+
- Overall: 80%+

---

## E2E Testing

### Running E2E Tests

```bash
cd frontend

# Run all e2e tests
bun run e2e

# Run in UI mode (visual test runner)
bun run e2e:ui

# Run in debug mode
bun run e2e:debug

# Run specific test file
bun run e2e -- e2e/auth.spec.ts

# Record new test with codegen
bun run e2e:codegen
```

### Writing E2E Tests

E2E tests use the **Page Object Model** pattern for maintainability:

```typescript
import { test, expect } from './fixtures';

test('should complete gift draw cycle', async ({ authenticatedPage, groupsPage, drawsPage }) => {
  // Navigate to groups
  await groupsPage.goto();
  
  // Create a new group
  await groupsPage.createGroup('Test Group', 'A test group');
  await groupsPage.expectGroupVisible('Test Group');
  
  // Navigate to draws
  await drawsPage.goto('group-1');
  
  // Create a draw
  await drawsPage.createDraw('Christmas 2024');
  await drawsPage.expectDrawVisible('Christmas 2024');
  
  // Execute draw
  await drawsPage.executeDraw();
  
  // Verify results
  await expect(page).toHaveScreenshot();
});
```

### Page Object Model

Pages are defined as classes with semantic methods:

```typescript
export class GroupsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/groups');
  }

  async createGroup(name: string, description?: string) {
    await this.page.click('button:has-text("Create Group")');
    await this.page.fill('input[placeholder*="Group name"]', name);
    if (description) {
      await this.page.fill('textarea', description);
    }
    await this.page.click('button:has-text("Create")');
  }

  async expectGroupVisible(groupName: string) {
    await expect(this.page.locator(`text=${groupName}`)).toBeVisible();
  }
}
```

**Available Fixtures:**
- `LoginPage` - Authentication flows
- `HomePage` - Home page interactions
- `GroupsPage` - Group management
- `DrawsPage` - Draw operations
- `authenticatedPage` - Pre-authenticated page

**Key Points:**
- Use fixtures from `e2e/fixtures.ts`
- Follow Page Object Model for reusable interactions
- Use semantic locators: role, placeholder, test-id
- Use visual comparisons with `expect(page).toHaveScreenshot()`
- Test complete user workflows

---

## Verification Checklist

Use this checklist to verify the testing environment is properly set up:

### Pre-Requisites Check
- [ ] Git repository cloned successfully
- [ ] Node.js v18+ installed
- [ ] Python 3.13+ installed
- [ ] Docker Desktop running
- [ ] bun installed

### Backend Setup Verification
- [ ] Dependencies installed: `cd backend && uv sync`
- [ ] pytest installed: `uv run pytest --version`
- [ ] pytest.ini exists
- [ ] Docker containers can start: `make db-up`
- [ ] PostgreSQL container running
- [ ] Redis container running
- [ ] Database migrations applied: `make db-upgrade`
- [ ] Basic tests run: `make test`
- [ ] Coverage report generates: `make test-coverage`

### Frontend Setup Verification
- [ ] Dependencies installed: `cd frontend && bun install`
- [ ] vitest installed: check in node_modules
- [ ] @playwright/test installed
- [ ] msw installed
- [ ] vite.config.ts has test config
- [ ] playwright.config.ts exists
- [ ] Unit tests run: `bun test`
- [ ] Test UI works: `bun run test:ui`
- [ ] Coverage report generates: `bun run test:coverage`
- [ ] E2E tests can start: `bun run e2e`

### Documentation & Git
- [ ] All TESTING_*.md files in place
- [ ] ENVIRONMENT_SETUP.md exists
- [ ] .gitignore updated with test artifacts

### Integration Verification
- [ ] Backend server starts: `make run`
- [ ] Frontend dev server starts: `bun run dev`
- [ ] E2E tests can connect to application
- [ ] API proxy working

### Success Indicators
- [ ] All tools report correct versions
- [ ] Configuration files are in place
- [ ] Existing tests pass
- [ ] Coverage reports generate
- [ ] Team can run tests locally
- [ ] Testing workflow established

---

## Implementation Roadmap

### Phase 1: Initial Setup (Now)
- Install dependencies
- Verify configurations
- Run baseline tests
- **Estimated Time**: 1-2 hours

### Phase 2: Team Onboarding (This Week)
- Share documentation
- Conduct setup review
- Establish testing standards
- **Estimated Time**: 2-3 hours

### Phase 3: Expand Coverage (Ongoing)

**Backend Tests - Priority Order:**
```
1. Authentication (CRITICAL)
   - Login, logout, registration
   - Token validation
   - Password reset

2. Group Management (HIGH)
   - CRUD operations
   - Authorization checks

3. Draw Algorithm (HIGH)
   - Algorithm correctness
   - Constraint validation

4. Infrastructure (MEDIUM)
   - Database operations
   - Repository methods
```

**Frontend Tests - Priority Order:**
```
1. Components (HIGH)
   - LoginForm, GroupCard, DrawCard
   - Forms and validation

2. Hooks (HIGH)
   - useAuthStore
   - useGroupsQuery
   - useMutations

3. Utilities (MEDIUM)
   - API client functions
   - Validation utilities
```

**E2E Tests - Priority Order:**
```
1. Authentication Flow (CRITICAL)
   - Registration, login, logout

2. Group Management Flow (HIGH)
   - Create group, add members

3. Draw Management Flow (HIGH)
   - Create draw, execute, view results

4. Full User Journey (MEDIUM)
   - Complete gift exchange scenario
```

**Estimated Time**: 4-8 weeks

### Phase 4: CI/CD Integration (Next Sprint)

Create `.github/workflows/tests.yml`:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.13'
      - run: |
          cd backend
          pip install -e .
          pytest --cov=src.gift_genie

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: |
          cd frontend
          bun install
          bun run test -- --run
          bun run test:coverage
```

**Set branch protection rules:**
- Require tests to pass before merge
- Require minimum coverage threshold
- Dismiss stale approvals on new commits

**Estimated Time**: 1-2 days

### Phase 5: Maintenance (Continuous)

**Weekly:**
- Review test failures in CI
- Check for flaky tests
- Update documentation

**Monthly:**
- Review coverage reports
- Identify untested code
- Plan improvements

**Ongoing:**
- Update tests with features
- Remove obsolete tests
- Refactor duplicate code
- Keep MSW handlers current

---

## Best Practices

### General Testing Principles

1. **Keep tests focused** - One assertion per test when possible
2. **Use semantic selectors** - Prefer role, label, placeholder over CSS
3. **Avoid interdependence** - Each test should be independent
4. **Mock external services** - Database, APIs, file systems
5. **Test user behavior** - Not implementation details
6. **Use meaningful names** - Test name describes what's being tested
7. **Maintain test data** - Keep close to test, use factories
8. **Regular cleanup** - Delete obsolete tests, update with features

### Backend Best Practices

1. Use descriptive test names: `test_user_can_register_with_valid_email`
2. Follow Arrange-Act-Assert pattern
3. Use `@pytest.mark` decorators for categorization
4. Mock database operations where appropriate
5. Test both success and failure paths
6. Group related tests using classes when appropriate

### Frontend Best Practices

1. Test user behavior, not implementation
2. Use semantic queries (role, label, placeholder)
3. Keep tests focused and independent
4. Mock API responses with MSW
5. Use `vi.fn()` for function mocks
6. Keep MSW handlers up-to-date

### E2E Best Practices

1. Use Page Object Model for reusable pages
2. Test complete user workflows
3. Use visual comparisons with screenshots
4. Keep tests maintainable with page classes
5. Use meaningful assertions with semantic locators
6. Avoid testing implementation details

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Tests won't start | Run `bun install` or `uv sync`, check Node/Python versions |
| Port already in use | `lsof -ti:PORT \| xargs kill -9` |
| MSW not intercepting | Check handlers in `src/test/mocks/handlers.ts` |
| Playwright browser issues | Run `npx playwright install` |
| Database issues | Run `make db-reset` to reset database |
| Coverage report missing | Check reporters are configured in config files |
| Stale cache issues | Clear `.pytest_cache`, `node_modules/.vitest`, `.coverage` |
| E2E authentication fails | Ensure test database has test user set up |
| Flaky E2E tests | Add `await page.waitForLoadState()` or increase timeouts |

### Debugging Commands

```bash
# Backend
cd backend
uv run pytest --version         # Check pytest
uv run pytest --collect-only    # List all tests
uv run pytest -v               # Verbose test output
make lint                       # Check code style
make typecheck                  # Check types

# Frontend
cd frontend
bun run test -- --version       # Check vitest
bun run test -- --list          # List all tests
bun run test -- -v              # Verbose output
bun run lint                    # Check code style
npx tsc --noEmit               # Check types

# E2E
bun run e2e -- --list          # List all e2e tests
bun run e2e:debug              # Debug mode
PWDEBUG=1 bun run e2e          # Enable debug mode
```

---

## Resources

### Documentation
- [pytest Documentation](https://docs.pytest.org/)
- [vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Mock Service Worker](https://mswjs.io/)

### Testing Patterns & Guidelines
- Backend: [FastAPI Testing](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
- Frontend: Testing Library [Query Priority](https://testing-library.com/docs/queries/about/#priority)

### Tools
- Coverage: HTML reports in `htmlcov/` (backend) and `coverage/` (frontend)
- Playwright: HTML reports in `playwright-report/`
- Trace: Available when running with `bun run e2e:debug`

---

## Summary

The Gift Genie testing environment is **production-ready** with comprehensive support for:

✅ **Unit Testing** - Backend (pytest) and Frontend (vitest)  
✅ **Integration Testing** - With mocked APIs and databases  
✅ **End-to-End Testing** - Playwright with Page Object Model  
✅ **Coverage Reporting** - HTML reports for both stacks  
✅ **Developer Tools** - Watch modes, debug modes, visual UIs  
✅ **Comprehensive Guides** - Setup, best practices, troubleshooting  

**Time to First Test**: 5 minutes  
**Time to Full Setup**: 1-2 hours  
**Time to Team Adoption**: 1 week  
**Time to Full Coverage**: 4-8 weeks recommended

**Next Steps:**
1. Follow the [Quick Start](#quick-start) section
2. Run [Verification Checklist](#verification-checklist)
3. Choose tests to prioritize from [Phase 3](#phase-3-expand-coverage-ongoing)
4. Start writing tests following the examples above
5. Generate coverage reports regularly
6. Keep tests updated as features change
