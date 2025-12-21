"""Tests for PermissionRepositorySqlAlchemy."""

import pytest
import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from gift_genie.domain.entities.permission import Permission
from gift_genie.infrastructure.database.models.base import Base
from gift_genie.infrastructure.database.repositories.permissions import (
    PermissionRepositorySqlAlchemy,
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
async def test_create_permission(session: AsyncSession):
    """Test creating a permission."""
    repo = PermissionRepositorySqlAlchemy(session)
    perm = _make_permission()

    created = await repo.create(perm)

    assert created.code == perm.code
    assert created.name == perm.name
    assert created.category == perm.category


@pytest.mark.anyio
async def test_get_by_code_finds_permission(session: AsyncSession):
    """Test fetching a permission by code."""
    repo = PermissionRepositorySqlAlchemy(session)
    perm = _make_permission(code="draws:notify", name="Send Draw Notifications")
    await repo.create(perm)

    found = await repo.get_by_code("draws:notify")

    assert found is not None
    assert found.code == "draws:notify"
    assert found.name == "Send Draw Notifications"


@pytest.mark.anyio
async def test_get_by_code_returns_none_for_missing_permission(session: AsyncSession):
    """Test that get_by_code returns None for non-existent permission."""
    repo = PermissionRepositorySqlAlchemy(session)

    found = await repo.get_by_code("nonexistent:permission")

    assert found is None


@pytest.mark.anyio
async def test_list_all_returns_all_permissions(session: AsyncSession):
    """Test listing all permissions."""
    repo = PermissionRepositorySqlAlchemy(session)

    perms = [
        _make_permission(code="groups:create", category="groups"),
        _make_permission(code="groups:delete", category="groups"),
        _make_permission(code="draws:notify", category="draws"),
    ]

    for perm in perms:
        await repo.create(perm)

    all_perms = await repo.list_all()

    assert len(all_perms) == 3
    codes = {perm.code for perm in all_perms}
    assert codes == {"groups:create", "groups:delete", "draws:notify"}


@pytest.mark.anyio
async def test_list_by_category_filters_correctly(session: AsyncSession):
    """Test listing permissions by category."""
    repo = PermissionRepositorySqlAlchemy(session)

    perms = [
        _make_permission(code="groups:create", category="groups"),
        _make_permission(code="groups:delete", category="groups"),
        _make_permission(code="draws:notify", category="draws"),
        _make_permission(code="draws:finalize", category="draws"),
        _make_permission(code="admin:manage_users", category="admin"),
    ]

    for perm in perms:
        await repo.create(perm)

    group_perms = await repo.list_by_category("groups")
    draw_perms = await repo.list_by_category("draws")
    admin_perms = await repo.list_by_category("admin")

    assert len(group_perms) == 2
    assert all(p.category == "groups" for p in group_perms)

    assert len(draw_perms) == 2
    assert all(p.category == "draws" for p in draw_perms)

    assert len(admin_perms) == 1
    assert admin_perms[0].category == "admin"


@pytest.mark.anyio
async def test_create_duplicate_code_raises_error(session: AsyncSession):
    """Test that creating a permission with duplicate code raises an error."""
    repo = PermissionRepositorySqlAlchemy(session)
    perm = _make_permission(code="duplicate:code")
    await repo.create(perm)

    duplicate = _make_permission(code="duplicate:code", name="Different Name")
    with pytest.raises(ValueError):
        await repo.create(duplicate)


@pytest.mark.anyio
async def test_permission_validation_code_format(session: AsyncSession):
    """Test permission code validation."""
    perm = _make_permission(code="draws:notify")
    assert perm.validate_code() is True

    perm_invalid = _make_permission(code="nodots")
    assert perm_invalid.validate_code() is False


@pytest.mark.anyio
async def test_permission_validation_name(session: AsyncSession):
    """Test permission name validation."""
    perm = _make_permission(name="Valid Name")
    assert perm.validate_name() is True

    perm_empty = _make_permission(name="")
    assert perm_empty.validate_name() is False

    perm_long = _make_permission(name="x" * 201)
    assert perm_long.validate_name() is False


@pytest.mark.anyio
async def test_permission_validation_category(session: AsyncSession):
    """Test permission category validation."""
    perm = _make_permission(category="draws")
    assert perm.validate_category() is True

    perm_empty = _make_permission(category="")
    assert perm_empty.validate_category() is False
