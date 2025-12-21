import pytest
from httpx import AsyncClient, ASGITransport
from gift_genie.main import app
from gift_genie.infrastructure.rate_limiting import limiter
from gift_genie.presentation.api import dependencies as api_dependencies
from gift_genie.domain.interfaces.repositories import UserRepository, UserPermissionRepository
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.enums import UserRole
from datetime import datetime, UTC
from typing import Optional


class InMemoryUserRepo(UserRepository):
    """Mock user repository for testing"""

    def __init__(self):
        self._users: dict[str, User] = {}

    async def create(self, user: User) -> User:
        self._users[user.id] = user
        return user

    async def get_by_id(self, user_id: str) -> Optional[User]:
        return self._users.get(user_id)

    async def get_by_email(self, email: str) -> Optional[User]:
        return next((u for u in self._users.values() if u.email == email), None)

    async def update(self, user: User) -> User:
        self._users[user.id] = user
        return user


class InMemoryUserPermissionRepo(UserPermissionRepository):
    """Mock user permission repository for testing"""

    def __init__(self):
        self._permissions: dict[str, set[str]] = {}

    async def get_user_permissions(self, user_id: str) -> set[str]:
        """Return all permissions granted to a user"""
        return self._permissions.get(user_id, set())

    async def grant_permission(self, user_id: str, permission_code: str) -> None:
        if user_id not in self._permissions:
            self._permissions[user_id] = set()
        self._permissions[user_id].add(permission_code)

    async def revoke_permission(self, user_id: str, permission_code: str) -> None:
        if user_id in self._permissions:
            self._permissions[user_id].discard(permission_code)


@pytest.fixture
async def client():
    """Async test client with rate limiting disabled"""
    # Disable rate limiting for tests
    limiter._enabled = False

    # Create mock repos for permission checking
    user_repo = InMemoryUserRepo()
    perm_repo = InMemoryUserPermissionRepo()

    # Create test users with ADMIN role so they bypass permission checks
    test_user_ids = ["user-123", "admin-123", "admin-456"]
    for i, user_id in enumerate(test_user_ids):
        user = User(
            id=user_id,
            email=f"{user_id}@example.com",
            name=f"Test User {user_id}",
            password_hash="dummy_hash",
            role=UserRole.ADMIN,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        await user_repo.create(user)

    # Grant all draws and groups permissions to the main test user
    all_perms = [
        "draws:read",
        "draws:create",
        "draws:delete",
        "draws:execute",
        "draws:finalize",
        "draws:notify",
        "groups:read",
        "groups:create",
        "groups:update",
        "groups:delete",
    ]
    for perm in all_perms:
        await perm_repo.grant_permission("user-123", perm)

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
