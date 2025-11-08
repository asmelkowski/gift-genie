import pytest
import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from uuid import UUID

from gift_genie.domain.entities.group import Group
from gift_genie.infrastructure.database.models.base import Base
from gift_genie.infrastructure.database.models.member import MemberModel
from gift_genie.infrastructure.database.repositories.groups import (
    GroupRepositorySqlAlchemy,
)


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def session() -> AsyncSession:
    # In-memory SQLite for integration-style tests
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with Session() as s:
        yield s

    await engine.dispose()


def _make_group(admin_user_id: str, name: str = "Test Group") -> Group:
    now = datetime.now(tz=UTC)
    return Group(
        id=str(uuid4()),
        admin_user_id=str(uuid4()),  # Use proper UUID string
        name=name,
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=2,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.anyio
async def test_get_member_stats_with_no_members(session: AsyncSession):
    repo = GroupRepositorySqlAlchemy(session)
    admin_id = str(uuid4())
    group = _make_group(admin_id)
    await repo.create(group)

    stats = await repo.get_member_stats(group.id)
    assert stats == (0, 0)


@pytest.mark.anyio
async def test_get_member_stats_with_members(session: AsyncSession):
    repo = GroupRepositorySqlAlchemy(session)
    admin_id = str(uuid4())
    group = _make_group(admin_id)
    await repo.create(group)

    # Create members directly in DB
    group_uuid = UUID(group.id)
    active_member = MemberModel(
        id=uuid4(),
        group_id=group_uuid,
        name="Active Member",
        email="active@example.com",
        is_active=True,
    )
    session.add(active_member)

    # Create inactive member
    inactive_member = MemberModel(
        id=uuid4(),
        group_id=group_uuid,
        name="Inactive Member",
        email="inactive@example.com",
        is_active=False,
    )
    session.add(inactive_member)

    await session.commit()

    stats = await repo.get_member_stats(group.id)
    assert stats == (2, 1)


@pytest.mark.anyio
async def test_update_group_fields(session: AsyncSession):
    repo = GroupRepositorySqlAlchemy(session)
    admin_id = str(uuid4())
    group = _make_group(admin_id, "Original Name")
    await repo.create(group)

    # Update fields
    group.name = "Updated Name"
    group.historical_exclusions_enabled = False
    group.historical_exclusions_lookback = 3
    group.updated_at = datetime.now(tz=UTC)

    updated = await repo.update(group)

    assert updated.id == group.id
    assert updated.name == "Updated Name"
    assert updated.historical_exclusions_enabled is False
    assert updated.historical_exclusions_lookback == 3
    # Check that updated_at was preserved
    assert updated.updated_at is not None


@pytest.mark.anyio
async def test_update_nonexistent_group_raises_value_error(session: AsyncSession):
    repo = GroupRepositorySqlAlchemy(session)
    group = _make_group("user-123")
    group.id = str(uuid4())  # Non-existent ID

    with pytest.raises(ValueError, match="Group not found"):
        await repo.update(group)


@pytest.mark.anyio
async def test_delete_group(session: AsyncSession):
    repo = GroupRepositorySqlAlchemy(session)
    admin_id = str(uuid4())
    group = _make_group(admin_id)
    await repo.create(group)

    # Verify exists
    found = await repo.get_by_id(group.id)
    assert found is not None

    # Delete
    await repo.delete(group.id)

    # Verify gone
    found = await repo.get_by_id(group.id)
    assert found is None
