import pytest
import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from gift_genie.domain.entities.assignment import Assignment
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.entities.enums import DrawStatus
from gift_genie.infrastructure.database.models.base import Base
from gift_genie.infrastructure.database.repositories.assignments import (
    AssignmentRepositorySqlAlchemy,
)
from gift_genie.infrastructure.database.repositories.draws import (
    DrawRepositorySqlAlchemy,
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


def _make_draw(
    group_id: str,
    status: DrawStatus = DrawStatus.PENDING,
    finalized_at: datetime | None = None,
    notification_sent_at: datetime | None = None,
) -> Draw:
    now = datetime.now()
    return Draw(
        id=str(uuid4()),
        group_id=group_id,
        status=status,
        created_at=now,
        finalized_at=finalized_at if finalized_at else None,
        notification_sent_at=notification_sent_at if notification_sent_at else None,
    )


def _make_assignment(draw_id: str, giver_member_id: str, receiver_member_id: str) -> Assignment:
    now = datetime.now(tz=UTC)
    return Assignment(
        id=str(uuid4()),
        draw_id=draw_id,
        giver_member_id=giver_member_id,
        receiver_member_id=receiver_member_id,
        encrypted_receiver_id=None,
        created_at=now,
    )


@pytest.mark.anyio
async def test_draw_create(session: AsyncSession):
    repo = DrawRepositorySqlAlchemy(session)

    group_id = str(uuid4())
    draw = _make_draw(group_id)

    result = await repo.create(draw)

    assert result.id == draw.id
    assert result.group_id == draw.group_id
    assert result.status == draw.status
    # Compare datetime values (allowing for small differences)
    assert abs((result.created_at - draw.created_at).total_seconds()) < 1
    assert result.finalized_at == draw.finalized_at
    assert result.notification_sent_at == draw.notification_sent_at


@pytest.mark.anyio
async def test_draw_get_by_id(session: AsyncSession):
    repo = DrawRepositorySqlAlchemy(session)

    group_id = str(uuid4())
    draw = _make_draw(group_id)
    await repo.create(draw)

    result = await repo.get_by_id(draw.id)

    assert result is not None
    assert result.id == draw.id
    assert result.group_id == draw.group_id


@pytest.mark.anyio
async def test_draw_get_by_id_not_found(session: AsyncSession):
    repo = DrawRepositorySqlAlchemy(session)

    result = await repo.get_by_id(str(uuid4()))

    assert result is None


@pytest.mark.anyio
async def test_draw_get_by_group_and_id(session: AsyncSession):
    repo = DrawRepositorySqlAlchemy(session)

    group_id = str(uuid4())
    draw = _make_draw(group_id)
    await repo.create(draw)

    result = await repo.get_by_group_and_id(group_id, draw.id)

    assert result is not None
    assert result.id == draw.id
    assert result.group_id == group_id


@pytest.mark.anyio
async def test_draw_list_by_group_basic(session: AsyncSession):
    repo = DrawRepositorySqlAlchemy(session)

    group_id = str(uuid4())
    draw1 = _make_draw(group_id)
    draw2 = _make_draw(group_id)
    await repo.create(draw1)
    await repo.create(draw2)

    draws, total = await repo.list_by_group(
        group_id=group_id,
        status=None,
        page=1,
        page_size=10,
        sort="created_at",
    )

    assert total == 2
    assert len(draws) == 2
    assert all(d.group_id == group_id for d in draws)


@pytest.mark.anyio
async def test_draw_list_by_group_with_status_filter(session: AsyncSession):
    repo = DrawRepositorySqlAlchemy(session)

    group_id = str(uuid4())
    pending_draw = _make_draw(group_id, DrawStatus.PENDING)
    finalized_draw = _make_draw(group_id, DrawStatus.FINALIZED, finalized_at=datetime.now(tz=UTC))
    await repo.create(pending_draw)
    await repo.create(finalized_draw)

    # Filter by pending
    draws, total = await repo.list_by_group(
        group_id=group_id,
        status=DrawStatus.PENDING,
        page=1,
        page_size=10,
        sort="created_at",
    )

    assert total == 1
    assert len(draws) == 1
    assert draws[0].status == DrawStatus.PENDING


@pytest.mark.anyio
async def test_draw_list_by_group_pagination(session: AsyncSession):
    repo = DrawRepositorySqlAlchemy(session)

    group_id = str(uuid4())
    draws = [_make_draw(group_id) for _ in range(5)]
    for draw in draws:
        await repo.create(draw)

    # Page 1 with page_size 2
    page_draws, total = await repo.list_by_group(
        group_id=group_id,
        status=None,
        page=1,
        page_size=2,
        sort="created_at",
    )

    assert total == 5
    assert len(page_draws) == 2

    # Page 2
    page_draws, total = await repo.list_by_group(
        group_id=group_id,
        status=None,
        page=2,
        page_size=2,
        sort="created_at",
    )

    assert total == 5
    assert len(page_draws) == 2


@pytest.mark.anyio
async def test_draw_update(session: AsyncSession):
    repo = DrawRepositorySqlAlchemy(session)

    group_id = str(uuid4())
    draw = _make_draw(group_id, DrawStatus.PENDING)
    await repo.create(draw)

    # Update to finalized
    updated_draw = Draw(
        id=draw.id,
        group_id=draw.group_id,
        status=DrawStatus.FINALIZED,
        created_at=draw.created_at,
        finalized_at=datetime.now(tz=UTC),
        notification_sent_at=None,
    )

    result = await repo.update(updated_draw)

    assert result.status == DrawStatus.FINALIZED
    assert result.finalized_at is not None


@pytest.mark.anyio
async def test_draw_delete(session: AsyncSession):
    repo = DrawRepositorySqlAlchemy(session)

    group_id = str(uuid4())
    draw = _make_draw(group_id)
    await repo.create(draw)

    # Verify it exists
    result = await repo.get_by_id(draw.id)
    assert result is not None

    # Delete it
    await repo.delete(draw.id)

    # Verify it's gone
    result = await repo.get_by_id(draw.id)
    assert result is None


@pytest.mark.anyio
async def test_assignment_create_many(session: AsyncSession):
    repo = AssignmentRepositorySqlAlchemy(session)

    draw_id = str(uuid4())
    giver_id = str(uuid4())
    receiver_id = str(uuid4())

    assignments = [
        _make_assignment(draw_id, giver_id, receiver_id),
        _make_assignment(draw_id, receiver_id, giver_id),
    ]

    results = await repo.create_many(assignments)

    assert len(results) == 2
    assert all(r.id in [a.id for a in assignments] for r in results)


@pytest.mark.anyio
async def test_assignment_list_by_draw(session: AsyncSession):
    repo = AssignmentRepositorySqlAlchemy(session)

    draw_id = str(uuid4())
    giver_id = str(uuid4())
    receiver_id = str(uuid4())

    assignment = _make_assignment(draw_id, giver_id, receiver_id)
    await repo.create_many([assignment])

    results = await repo.list_by_draw(draw_id)

    assert len(results) == 1
    assert results[0].id == assignment.id
    assert results[0].draw_id == draw_id


@pytest.mark.anyio
async def test_assignment_count_by_draw(session: AsyncSession):
    repo = AssignmentRepositorySqlAlchemy(session)

    draw_id = str(uuid4())
    giver_id = str(uuid4())
    receiver_id = str(uuid4())

    assignments = [
        _make_assignment(draw_id, giver_id, receiver_id),
        _make_assignment(draw_id, receiver_id, giver_id),
    ]
    await repo.create_many(assignments)

    count = await repo.count_by_draw(draw_id)

    assert count == 2


@pytest.mark.anyio
async def test_assignment_get_historical_exclusions(session: AsyncSession):
    repo = AssignmentRepositorySqlAlchemy(session)

    # This test would require setting up draws and assignments
    # For now, test with empty result
    group_id = str(uuid4())
    exclusions = await repo.get_historical_exclusions(group_id, 5)

    assert exclusions == []
