import pytest
import asyncio
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from gift_genie.domain.entities.enums import ExclusionType
from gift_genie.domain.entities.exclusion import Exclusion
from gift_genie.infrastructure.database.models.base import Base
from gift_genie.infrastructure.database.repositories.exclusions import (
    ExclusionRepositorySqlAlchemy,
)


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    # In-memory SQLite for integration-style tests
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with Session() as s:
        yield s

    await engine.dispose()


def _make_group(admin_user_id: str, name: str = "Test Group") -> str:
    return str(uuid4())


def _make_member(group_id: str, name: str = "Test Member") -> str:
    return str(uuid4())


def _make_exclusion(
    group_id: str,
    giver_member_id: str,
    receiver_member_id: str,
    exclusion_type: ExclusionType = ExclusionType.MANUAL,
    is_mutual: bool = False,
    created_by_user_id: str | None = None,
) -> Exclusion:
    now = datetime.now(tz=UTC)
    return Exclusion(
        id=str(uuid4()),
        group_id=group_id,
        giver_member_id=giver_member_id,
        receiver_member_id=receiver_member_id,
        exclusion_type=exclusion_type,
        is_mutual=is_mutual,
        created_at=now,
        created_by_user_id=created_by_user_id,
    )


@pytest.mark.anyio
async def test_create_exclusion(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    # Create test data
    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    exclusion = _make_exclusion(group_id, giver_id, receiver_id)

    result = await repo.create(exclusion)

    assert result.id == exclusion.id
    assert result.group_id == exclusion.group_id
    assert result.giver_member_id == exclusion.giver_member_id
    assert result.receiver_member_id == exclusion.receiver_member_id
    assert result.exclusion_type == exclusion.exclusion_type
    assert result.is_mutual == exclusion.is_mutual


@pytest.mark.anyio
async def test_create_many_exclusions(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    # Create test data
    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    exclusions = [
        _make_exclusion(group_id, giver_id, receiver_id),
        _make_exclusion(group_id, receiver_id, giver_id, is_mutual=True),
    ]

    results = await repo.create_many(exclusions)

    assert len(results) == 2
    assert all(r.id in [e.id for e in exclusions] for r in results)


@pytest.mark.anyio
async def test_get_by_id(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    # Create test data
    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    exclusion = _make_exclusion(group_id, giver_id, receiver_id)
    await repo.create(exclusion)

    result = await repo.get_by_id(exclusion.id)

    assert result is not None
    assert result.id == exclusion.id


@pytest.mark.anyio
async def test_get_by_group_and_id(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    # Create test data
    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    exclusion = _make_exclusion(group_id, giver_id, receiver_id)
    await repo.create(exclusion)

    result = await repo.get_by_group_and_id(group_id, exclusion.id)

    assert result is not None
    assert result.id == exclusion.id
    assert result.group_id == group_id


@pytest.mark.anyio
async def test_exists_for_pair_direct(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    # Create test data
    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    exclusion = _make_exclusion(group_id, giver_id, receiver_id)
    await repo.create(exclusion)

    exists = await repo.exists_for_pair(group_id, giver_id, receiver_id)
    assert exists is True

    # Test non-existent pair
    exists = await repo.exists_for_pair(group_id, receiver_id, giver_id)
    assert exists is False


@pytest.mark.anyio
async def test_exists_for_pair_mutual(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    # Create test data
    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    exclusion = _make_exclusion(group_id, giver_id, receiver_id, is_mutual=True)
    await repo.create(exclusion)

    # Should find in both directions
    exists = await repo.exists_for_pair(group_id, giver_id, receiver_id)
    assert exists is True

    exists = await repo.exists_for_pair(group_id, receiver_id, giver_id)
    assert exists is True


@pytest.mark.anyio
async def test_check_conflicts_bulk_no_conflicts(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    pairs = [(giver_id, receiver_id)]
    conflicts = await repo.check_conflicts_bulk(group_id, pairs)

    assert conflicts == []


@pytest.mark.anyio
async def test_check_conflicts_bulk_with_existing(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    # Create test data
    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    exclusion = _make_exclusion(group_id, giver_id, receiver_id)
    await repo.create(exclusion)

    pairs = [(giver_id, receiver_id)]
    conflicts = await repo.check_conflicts_bulk(group_id, pairs)

    assert len(conflicts) == 1
    assert conflicts[0]["reason"] == "already_exists"


@pytest.mark.anyio
async def test_check_conflicts_bulk_duplicate_in_batch(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    pairs = [(giver_id, receiver_id), (giver_id, receiver_id)]
    conflicts = await repo.check_conflicts_bulk(group_id, pairs)

    assert len(conflicts) == 1
    assert conflicts[0]["reason"] == "duplicate_in_batch"


@pytest.mark.anyio
async def test_delete_exclusion(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    # Create test data
    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    exclusion = _make_exclusion(group_id, giver_id, receiver_id)
    await repo.create(exclusion)

    # Verify it exists
    result = await repo.get_by_id(exclusion.id)
    assert result is not None

    # Delete it
    await repo.delete(exclusion.id)

    # Verify it's gone
    result = await repo.get_by_id(exclusion.id)
    assert result is None


@pytest.mark.anyio
async def test_list_by_group_basic(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    # Create test data
    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    exclusion = _make_exclusion(group_id, giver_id, receiver_id)
    await repo.create(exclusion)

    exclusions, total = await repo.list_by_group(
        group_id=group_id,
        exclusion_type=None,
        giver_member_id=None,
        receiver_member_id=None,
        page=1,
        page_size=10,
        sort="created_at",
    )

    assert total == 1
    assert len(exclusions) == 1
    assert exclusions[0].id == exclusion.id


@pytest.mark.anyio
async def test_list_by_group_with_filters(session: AsyncSession):
    repo = ExclusionRepositorySqlAlchemy(session)

    # Create test data
    group_id = _make_group("admin123")
    giver_id = _make_member(group_id)
    receiver_id = _make_member(group_id)

    manual_exclusion = _make_exclusion(group_id, giver_id, receiver_id, ExclusionType.MANUAL)
    historical_exclusion = _make_exclusion(
        group_id, receiver_id, giver_id, ExclusionType.HISTORICAL
    )
    await repo.create(manual_exclusion)
    await repo.create(historical_exclusion)

    # Filter by type
    exclusions, total = await repo.list_by_group(
        group_id=group_id,
        exclusion_type=ExclusionType.MANUAL,
        giver_member_id=None,
        receiver_member_id=None,
        page=1,
        page_size=10,
        sort="created_at",
    )

    assert total == 1
    assert exclusions[0].exclusion_type == ExclusionType.MANUAL
