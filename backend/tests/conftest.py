import pytest
from httpx import AsyncClient, ASGITransport
from gift_genie.main import app
from gift_genie.infrastructure.rate_limiting import limiter
from gift_genie.presentation.api import dependencies as api_dependencies
from gift_genie.domain.interfaces.repositories import UserRepository, UserPermissionRepository
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.user_permission import UserPermission
from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.entities.enums import UserRole
from datetime import datetime, UTC


class InMemoryUserRepo(UserRepository):
    """Mock user repository for testing"""

    def __init__(self):
        self._users: dict[str, User] = {}

    async def create(self, user: User) -> User:
        self._users[user.id] = user
        return user

    async def get_by_id(self, user_id: str) -> User | None:
        return self._users.get(user_id)

    async def get_by_email_ci(self, email: str) -> User | None:
        return next((u for u in self._users.values() if u.email.lower() == email.lower()), None)

    async def email_exists_ci(self, email: str) -> bool:
        return any(u.email.lower() == email.lower() for u in self._users.values())

    async def list_all(
        self, search: str | None, page: int, page_size: int, sort: str
    ) -> tuple[list[User], int]:
        users = list(self._users.values())
        # Apply search filter if provided
        if search:
            search_lower = search.lower()
            users = [
                u
                for u in users
                if search_lower in u.email.lower() or search_lower in u.name.lower()
            ]
        # Simple pagination
        total = len(users)
        start = (page - 1) * page_size
        end = start + page_size
        return users[start:end], total


class InMemoryUserPermissionRepo(UserPermissionRepository):
    """Mock user permission repository for testing"""

    def __init__(self):
        # Store as (user_id, permission_code) -> UserPermission
        self._permissions: dict[tuple[str, str], UserPermission] = {}

    async def grant_permission(
        self, user_id: str, permission_code: str, granted_by: str | None = None
    ) -> UserPermission:
        """Grant a permission to a user."""
        user_permission = UserPermission(
            user_id=user_id,
            permission_code=permission_code,
            granted_at=datetime.now(UTC),
            granted_by=granted_by,
        )
        self._permissions[(user_id, permission_code)] = user_permission
        return user_permission

    async def grant_permissions_bulk(
        self, user_id: str, permission_codes: list[str], granted_by: str | None = None
    ) -> list[UserPermission]:
        """Grant multiple permissions to a user."""
        results = []
        for permission_code in permission_codes:
            user_permission = await self.grant_permission(user_id, permission_code, granted_by)
            results.append(user_permission)
        return results

    async def revoke_permission(self, user_id: str, permission_code: str) -> bool:
        """Revoke a permission from a user."""
        key = (user_id, permission_code)
        if key in self._permissions:
            del self._permissions[key]
            return True
        return False

    async def has_permission(self, user_id: str, permission_code: str) -> bool:
        """Check if a user has a specific permission."""
        return (user_id, permission_code) in self._permissions

    async def list_by_user(self, user_id: str) -> list[UserPermission]:
        """List all permissions granted to a user."""
        return [perm for (uid, _), perm in self._permissions.items() if uid == user_id]

    async def list_permissions_for_user(self, user_id: str) -> list[Permission]:
        """List all permission objects granted to a user."""
        # Return empty list since we don't have Permission objects in this mock
        return []


@pytest.fixture
async def client():
    """Async test client with rate limiting disabled"""
    # Disable rate limiting for tests
    limiter._enabled = False

    # Create mock repos for permission checking
    user_repo = InMemoryUserRepo()
    perm_repo = InMemoryUserPermissionRepo()

    # Create test users
    # user-123 is a regular USER
    # admin-123 and admin-456 are ADMINs
    user_roles = {
        "user-123": UserRole.USER,
        "admin-123": UserRole.ADMIN,
        "admin-456": UserRole.ADMIN,
    }
    for user_id, role in user_roles.items():
        user = User(
            id=user_id,
            email=f"{user_id}@example.com",
            name=f"Test User {user_id}",
            password_hash="dummy_hash",
            role=role,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        await user_repo.create(user)

    # No global permissions for user-123 by default.
    # It will get granular permissions when creating groups in tests.
    # We keep some global permissions if needed for legacy tests,
    # but for now let's see what breaks.

    # Also grant group permissions to admin-123 and admin-456 for tests
    for user_id in ["admin-123", "admin-456"]:
        for perm in ["groups:read", "groups:create", "groups:update", "groups:delete"]:
            await perm_repo.grant_permission(user_id, perm)

    # Override the repositories for all tests
    app.dependency_overrides[api_dependencies.get_user_repository] = lambda: user_repo
    app.dependency_overrides[api_dependencies.get_user_permission_repository] = lambda: perm_repo

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    # Re-enable after tests
    limiter._enabled = True
    app.dependency_overrides.clear()


@pytest.fixture
def anyio_backend():
    return "asyncio"
