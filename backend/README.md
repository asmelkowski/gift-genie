# Gift Genie Backend

A FastAPI-based backend for Gift Genie, a secret Santa draw application with role-based permission management.

## Quick Start

### Prerequisites

- Python 3.13+
- `uv` package manager
- PostgreSQL database
- Redis for caching/sessions

### Setup

```bash
cd backend

# Install dependencies
uv sync

# Run database migrations
make db-migrate

# Start development server
make run
```

### Running Tests

```bash
# Run all tests
make test

# Run with coverage
make test-cov

# Run specific test file
pytest tests/test_auth_login_api.py

# Run in watch mode
pytest -v --tb=short -k "test_" --disable-warnings
```

## Permission System

Gift Genie implements a role-based permission system with fine-grained access control.

### Permission Enforcement

All API endpoints require specific permissions. Permissions are enforced using FastAPI dependencies:

```python
@router.post("/groups")
async def create_group(
    current_user_id: Annotated[str, Depends(require_permission("groups:create"))],
):
    # Only users with groups:create permission can reach here
```

### Available Permissions

| Resource | Action | Permission Code |
|----------|--------|----------------|
| **Groups** | Create | `groups:create` |
|  | Read | `groups:read` |
|  | Update | `groups:update` |
|  | Delete | `groups:delete` |
| **Members** | Create | `members:create` |
|  | Read | `members:read` |
|  | Update | `members:update` |
|  | Delete | `members:delete` |
| **Draws** | Create | `draws:create` |
|  | Read | `draws:read` |
|  | Finalize | `draws:finalize` |
|  | Notify | `draws:notify` |
|  | View Assignments | `draws:view_assignments` |
|  | Delete | `draws:delete` |
| **Exclusions** | Create | `exclusions:create` |
|  | Read | `exclusions:read` |
|  | Delete | `exclusions:delete` |

### User Roles

- **Regular User**: Has all standard permissions by default
- **Admin**: Has all permissions including administrative capabilities

### Testing with Permissions

In tests, permissions are automatically granted to test users via the `conftest.py` fixtures. Test users are created with ADMIN role by default, giving them all permissions.

To test permission denial:
```python
async def test_endpoint_without_permission(client):
    # Override get_current_user to return user without permission
    # Test will receive 403 Forbidden
```

### Adding New Permissions

1. Add permission to `PermissionRegistry` in `src/gift_genie/infrastructure/permissions/permission_registry.py`:
   ```python
   NEW_RESOURCE_CREATE = "new_resource:create"
   ```

2. Add to default permissions in `src/gift_genie/infrastructure/permissions/default_permissions.py`

3. Use `require_permission()` in endpoint:
   ```python
   @router.post("/new-resources")
   async def create_resource(
       current_user_id: Annotated[str, Depends(require_permission("new_resource:create"))],
   ):
       # ...
   ```

4. Test permission enforcement in endpoint tests

### Troubleshooting

**403 Forbidden Error**:
- Check if user has required permission in database (`user_permissions` table)
- Verify JWT token is valid and contains correct user_id
- Check endpoint requires correct permission code

**Checking User Permissions**:
```python
# In a test
async def test_user_has_permission(client, admin_user):
    # Admin users have all permissions by default
    response = await client.post(
        "/api/v1/groups",
        json={"name": "Test Group"},
        headers={"Authorization": f"Bearer {admin_user.token}"}
    )
    assert response.status_code == 201
```

## Project Structure

```
backend/
├── src/gift_genie/
│   ├── domain/                 # Business logic layer
│   │   ├── entities/          # Domain models
│   │   ├── interfaces/        # Ports (repository interfaces)
│   │   └── exceptions/        # Custom exceptions
│   ├── application/           # Application logic layer
│   │   └── use_cases/        # Use case implementations
│   ├── infrastructure/        # External services layer
│   │   ├── database/         # Database adapters
│   │   ├── permissions/      # Permission system
│   │   └── services/         # External service implementations
│   └── presentation/          # API layer
│       └── api/
│           ├── v1/           # API v1 endpoints
│           └── dependencies/ # FastAPI dependencies
├── tests/                     # Test suite
│   ├── test_*.py             # Integration tests
│   └── conftest.py           # Pytest configuration & fixtures
├── alembic/                   # Database migrations
├── Dockerfile                 # Container image
├── pyproject.toml            # Poetry dependencies
└── README.md                 # This file
```

## Architecture Principles

### Clean Architecture

Gift Genie follows clean architecture principles:

- **Domain Layer**: Pure business logic, no framework dependencies
- **Application Layer**: Use cases orchestrate domain logic
- **Infrastructure Layer**: Adapters for databases, services, permissions
- **Presentation Layer**: FastAPI endpoints and HTTP concerns

### Permission vs Ownership

The system distinguishes between two types of authorization:

| Aspect | Permission | Ownership |
|--------|-----------|-----------|
| **Location** | Presentation layer | Application layer |
| **Purpose** | Global capability | Resource-specific |
| **Example** | "Can user create groups?" | "Does user own this group?" |

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user info

### Groups

- `POST /api/v1/groups` - Create group (requires `groups:create`)
- `GET /api/v1/groups` - List user's groups (requires `groups:read`)
- `GET /api/v1/groups/{group_id}` - Get group details (requires `groups:read`)
- `PATCH /api/v1/groups/{group_id}` - Update group (requires `groups:update`)
- `DELETE /api/v1/groups/{group_id}` - Delete group (requires `groups:delete`)

### Members

- `POST /api/v1/groups/{group_id}/members` - Add member (requires `members:create`)
- `GET /api/v1/groups/{group_id}/members` - List members (requires `members:read`)
- `GET /api/v1/groups/{group_id}/members/{member_id}` - Get member (requires `members:read`)
- `PATCH /api/v1/groups/{group_id}/members/{member_id}` - Update member (requires `members:update`)
- `DELETE /api/v1/groups/{group_id}/members/{member_id}` - Delete member (requires `members:delete`)

### Draws

- `POST /api/v1/groups/{group_id}/draws` - Create draw (requires `draws:create`)
- `GET /api/v1/groups/{group_id}/draws` - List draws (requires `draws:read`)
- `GET /api/v1/groups/{group_id}/draws/{draw_id}` - Get draw (requires `draws:read`)
- `POST /api/v1/groups/{group_id}/draws/{draw_id}/execute` - Execute draw (requires `draws:create`)
- `POST /api/v1/groups/{group_id}/draws/{draw_id}/finalize` - Finalize draw (requires `draws:finalize`)
- `POST /api/v1/groups/{group_id}/draws/{draw_id}/notify` - Send notifications (requires `draws:notify`)
- `GET /api/v1/groups/{group_id}/draws/{draw_id}/assignments` - View assignments (requires `draws:view_assignments`)
- `DELETE /api/v1/groups/{group_id}/draws/{draw_id}` - Delete draw (requires `draws:delete`)

### Exclusions

- `POST /api/v1/groups/{group_id}/exclusions` - Create exclusion (requires `exclusions:create`)
- `POST /api/v1/groups/{group_id}/exclusions/bulk` - Bulk create exclusions (requires `exclusions:create`)
- `GET /api/v1/groups/{group_id}/exclusions` - List exclusions (requires `exclusions:read`)
- `DELETE /api/v1/groups/{group_id}/exclusions/{exclusion_id}` - Delete exclusion (requires `exclusions:delete`)

### Admin

- `GET /api/admin/users` - List all users (admin only)
- `GET /api/admin/users/{user_id}/permissions` - Get user permissions (admin only)
- `POST /api/admin/users/{user_id}/permissions` - Grant permission (admin only)
- `DELETE /api/admin/users/{user_id}/permissions/{permission_id}` - Revoke permission (admin only)
- `GET /api/admin/permissions` - List all available permissions (admin only)

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/gift_genie

# Redis
REDIS_URL=redis://localhost:6379

# JWT
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=false
```

## Database

Gift Genie uses PostgreSQL with SQLAlchemy ORM and Alembic for migrations.

### Migrations

```bash
# Create new migration
make db-new-migration MSG="description"

# Run migrations
make db-migrate

# Rollback migration
make db-downgrade
```

### Schema

Key tables:
- `users` - User accounts
- `user_permissions` - User permission assignments
- `groups` - Group (event) records
- `members` - Group members
- `draws` - Secret Santa draws
- `assignments` - Draw assignments (who gives to whom)
- `exclusions` - Exclusion rules (who shouldn't draw whom)

## Development

### Code Style

- **Python**: `ruff` for linting, `black` for formatting
- **Type Checking**: `mypy` strict mode
- **Line Length**: 100 characters
- **Imports**: Absolute from `src.gift_genie`

### Running Quality Checks

```bash
# Format code
make format

# Lint code
make lint

# Type check
make typecheck

# All checks
make check
```

### Testing

- Unit tests for use cases and business logic
- Integration tests for endpoints
- E2E tests in Playwright (frontend)
- Use `pytest.mark.asyncio` for async tests
- Mock external services, use real database fixtures

## Deployment

### Docker

```bash
# Build image
docker build -t gift-genie-backend .

# Run container
docker run -p 8000:8000 gift-genie-backend
```

### Health Check

```bash
curl http://localhost:8000/health
```

## Troubleshooting

### Database Connection Issues

```bash
# Check connection string
echo $DATABASE_URL

# Test connection
python -c "from sqlalchemy import create_engine; create_engine('$DATABASE_URL').connect()"
```

### JWT Token Issues

- Verify `SECRET_KEY` is set
- Check token hasn't expired
- Ensure token is in `Authorization: Bearer <token>` header

### Permission Denied Errors

1. Check user has permission in database
2. Verify JWT token contains correct user_id
3. Check endpoint requires correct permission
4. See "Troubleshooting" section above

## Contributing

1. Create feature branch: `git checkout -b feature/description`
2. Make changes following code style guidelines
3. Write tests for new functionality
4. Run full test suite: `make test`
5. Commit with conventional commits: `git commit -m "feat(scope): description"`
6. Create pull request

## License

Proprietary - Gift Genie Project
