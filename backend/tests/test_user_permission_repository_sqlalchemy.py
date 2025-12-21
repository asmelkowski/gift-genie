"""Tests for UserPermissionRepositorySqlAlchemy."""

import pytest
import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.user_permission import UserPermission
from gift_genie.domain.entities.enums import UserRole
from gift_genie.infrastructure.database.models.base import Base
from gift_genie.infrastructure.database.repositories.permissions import (
    PermissionRepositorySqlAlchemy,
)
from gift_genie.infrastructure.database.repositories.user_permissions import (
    UserPermissionRepositorySqlAlchemy,
)
from gift_genie.infrastructure.database.repositories.users import (
    UserRepositorySqlAlchemy,
)


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def session() -> AsyncSession:
    """Create an in-memory SQLite session for testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with Session() as s:
        yield s

    await engine.dispose()


def _make_user(email: str, name: str = "Test User") -> User:
    """Helper to create a User domain entity."""
    now = datetime.now(tz=UTC)
    return User(
        id=str(uuid4()),
        email=email,
        password_hash="hashed:password",
        name=name,
        role=UserRole.USER,
        created_at=now,
        updated_at=now,
    )


def _make_permission(
    code: str = "test:permission",
    name: str = "Test Permission",
    category: str = "test",
    description: str = "A test permission",
) -> Permission:
    """Helper to create a Permission domain entity."""
    now = datetime.now(tz=UTC)
    return Permission(
        code=code,
        name=name,
        description=description,
        category=category,
        created_at=now,
    )


@pytest.mark.anyio
async def test_grant_permission(session: AsyncSession):
    """Test granting a permission to a user."""
    user_repo = UserRepositorySqlAlchemy(session)
    perm_repo = PermissionRepositorySqlAlchemy(session)
    user_perm_repo = UserPermissionRepositorySqlAlchemy(session)

    user = _make_user("test@example.com")
    perm = _make_permission(code="draws:notify")

    created_user = await user_repo.create(user)
    await perm_repo.create(perm)

    granted = await user_perm_repo.grant_permission(
        user_id=created_user.id,
        permission_code="draws:notify",
        granted_by=None,
    )

    assert granted.user_id == created_user.id
    assert granted.permission_code == "draws:notify"
    assert granted.granted_by is None


@pytest.mark.anyio
async def test_grant_permission_with_granted_by(session: AsyncSession):
    """Test granting a permission with audit trail (granted_by)."""
    user_repo = UserRepositorySqlAlchemy(session)
    perm_repo = PermissionRepositorySqlAlchemy(session)
    user_perm_repo = UserPermissionRepositorySqlAlchemy(session)

    admin_user = _make_user("admin@example.com", "Admin")
    regular_user = _make_user("user@example.com", "Regular User")
    perm = _make_permission(code="draws:notify")

    created_admin = await user_repo.create(admin_user)
    created_user = await user_repo.create(regular_user)
    await perm_repo.create(perm)

    granted = await user_perm_repo.grant_permission(
        user_id=created_user.id,
        permission_code="draws:notify",
        granted_by=created_admin.id,
    )

    assert granted.granted_by == created_admin.id


@pytest.mark.anyio
async def test_has_permission_returns_true_for_granted(session: AsyncSession):
    """Test that has_permission returns True for granted permissions."""
    user_repo = UserRepositorySqlAlchemy(session)
    perm_repo = PermissionRepositorySqlAlchemy(session)
    user_perm_repo = UserPermissionRepositorySqlAlchemy(session)

    user = _make_user("test@example.com")
    perm = _make_permission(code="groups:create")

    created_user = await user_repo.create(user)
    await perm_repo.create(perm)
    await user_perm_repo.grant_permission(
        user_id=created_user.id,
        permission_code="groups:create",
        granted_by=None,
    )

    has_it = await user_perm_repo.has_permission(
        user_id=created_user.id,
        permission_code="groups:create",
    )

    assert has_it is True


@pytest.mark.anyio
async def test_has_permission_returns_false_for_ungrant(session: AsyncSession):
    """Test that has_permission returns False for ungranted permissions."""
    user_repo = UserRepositorySqlAlchemy(session)
    user = _make_user("test@example.com")
    created_user = await user_repo.create(user)

    user_perm_repo = UserPermissionRepositorySqlAlchemy(session)
    has_it = await user_perm_repo.has_permission(
        user_id=created_user.id,
        permission_code="admin:view_dashboard",
    )

    assert has_it is False


@pytest.mark.anyio
async def test_revoke_permission(session: AsyncSession):
    """Test revoking a permission from a user."""
    user_repo = UserRepositorySqlAlchemy(session)
    perm_repo = PermissionRepositorySqlAlchemy(session)
    user_perm_repo = UserPermissionRepositorySqlAlchemy(session)

    user = _make_user("test@example.com")
    perm = _make_permission(code="draws:finalize")

    created_user = await user_repo.create(user)
    await perm_repo.create(perm)

    await user_perm_repo.grant_permission(
        user_id=created_user.id,
        permission_code="draws:finalize",
        granted_by=None,
    )

    # Verify it was granted
    has_it_before = await user_perm_repo.has_permission(
        user_id=created_user.id,
        permission_code="draws:finalize",
    )
    assert has_it_before is True

    # Revoke it
    revoked = await user_perm_repo.revoke_permission(
        user_id=created_user.id,
        permission_code="draws:finalize",
    )

    assert revoked is True

    # Verify it was revoked
    has_it_after = await user_perm_repo.has_permission(
        user_id=created_user.id,
        permission_code="draws:finalize",
    )
    assert has_it_after is False


@pytest.mark.anyio
async def test_revoke_nonexistent_permission_returns_false(session: AsyncSession):
    """Test that revoking a non-granted permission returns False."""
    user_repo = UserRepositorySqlAlchemy(session)
    user = _make_user("test@example.com")
    created_user = await user_repo.create(user)

    user_perm_repo = UserPermissionRepositorySqlAlchemy(session)
    revoked = await user_perm_repo.revoke_permission(
        user_id=created_user.id,
        permission_code="nonexistent:permission",
    )

    assert revoked is False


@pytest.mark.anyio
async def test_list_by_user_returns_all_user_permissions(session: AsyncSession):
    """Test listing all permissions for a user."""
    user_repo = UserRepositorySqlAlchemy(session)
    perm_repo = PermissionRepositorySqlAlchemy(session)
    user_perm_repo = UserPermissionRepositorySqlAlchemy(session)

    user = _make_user("test@example.com")
    created_user = await user_repo.create(user)

    perms = [
        _make_permission(code="groups:create", category="groups"),
        _make_permission(code="groups:delete", category="groups"),
        _make_permission(code="draws:notify", category="draws"),
    ]

    for perm in perms:
        await perm_repo.create(perm)
        await user_perm_repo.grant_permission(
            user_id=created_user.id,
            permission_code=perm.code,
            granted_by=None,
        )

    user_perms = await user_perm_repo.list_by_user(user_id=created_user.id)

    assert len(user_perms) == 3
    codes = {perm.permission_code for perm in user_perms}
    assert codes == {"groups:create", "groups:delete", "draws:notify"}


@pytest.mark.anyio
async def test_list_by_user_empty_for_user_with_no_permissions(
    session: AsyncSession,
):
    """Test that list_by_user returns empty list for user with no permissions."""
    user_repo = UserRepositorySqlAlchemy(session)
    user = _make_user("test@example.com")
    created_user = await user_repo.create(user)

    user_perm_repo = UserPermissionRepositorySqlAlchemy(session)
    user_perms = await user_perm_repo.list_by_user(user_id=created_user.id)

    assert user_perms == []


@pytest.mark.anyio
async def test_list_permissions_for_user_returns_permission_objects(
    session: AsyncSession,
):
    """Test that list_permissions_for_user returns full Permission objects."""
    user_repo = UserRepositorySqlAlchemy(session)
    perm_repo = PermissionRepositorySqlAlchemy(session)
    user_perm_repo = UserPermissionRepositorySqlAlchemy(session)

    user = _make_user("test@example.com")
    created_user = await user_repo.create(user)

    perms = [
        _make_permission(
            code="groups:create",
            name="Create Groups",
            category="groups",
        ),
        _make_permission(
            code="groups:delete",
            name="Delete Groups",
            category="groups",
        ),
    ]

    for perm in perms:
        await perm_repo.create(perm)
        await user_perm_repo.grant_permission(
            user_id=created_user.id,
            permission_code=perm.code,
            granted_by=None,
        )

    perms_for_user = await user_perm_repo.list_permissions_for_user(user_id=created_user.id)

    assert len(perms_for_user) == 2
    assert all(isinstance(p, Permission) for p in perms_for_user)
    assert perms_for_user[0].code in {"groups:create", "groups:delete"}
    assert perms_for_user[0].name in {"Create Groups", "Delete Groups"}


@pytest.mark.anyio
async def test_grant_duplicate_permission_raises_error(session: AsyncSession):
    """Test that granting duplicate permission raises error."""
    user_repo = UserRepositorySqlAlchemy(session)
    perm_repo = PermissionRepositorySqlAlchemy(session)
    user_perm_repo = UserPermissionRepositorySqlAlchemy(session)

    user = _make_user("test@example.com")
    perm = _make_permission(code="draws:notify")

    created_user = await user_repo.create(user)
    await perm_repo.create(perm)

    await user_perm_repo.grant_permission(
        user_id=created_user.id,
        permission_code="draws:notify",
        granted_by=None,
    )

    # Try to grant the same permission again
    with pytest.raises(ValueError):
        await user_perm_repo.grant_permission(
            user_id=created_user.id,
            permission_code="draws:notify",
            granted_by=None,
        )


@pytest.mark.anyio
async def test_user_permission_validation(session: AsyncSession):
    """Test UserPermission entity validation."""
    now = datetime.now(tz=UTC)
    user_perm = UserPermission(
        user_id=str(uuid4()),
        permission_code="test:code",
        granted_at=now,
        granted_by=None,
    )

    assert user_perm.validate() is True

    invalid_perm = UserPermission(
        user_id="",
        permission_code="test:code",
        granted_at=now,
        granted_by=None,
    )

    assert invalid_perm.validate() is False
