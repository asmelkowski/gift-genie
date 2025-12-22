import pytest
import asyncio
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.enums import UserRole
from gift_genie.application.errors import EmailConflictError
from gift_genie.infrastructure.database.models.base import Base
from gift_genie.infrastructure.database.repositories.users import (
    UserRepositorySqlAlchemy,
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


def _make_user(email: str, name: str = "Test User") -> User:
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


@pytest.mark.anyio
async def test_get_by_email_ci_finds_user(session: AsyncSession):
    repo = UserRepositorySqlAlchemy(session)
    u = _make_user("CaseTest@Example.com")
    await repo.create(u)

    # Lookup with different casing
    found = await repo.get_by_email_ci("casetest@example.COM")
    assert found is not None
    assert found.email == u.email


@pytest.mark.anyio
async def test_create_duplicate_email_raises_conflict(session: AsyncSession):
    repo = UserRepositorySqlAlchemy(session)

    u1 = _make_user("dupe@example.com", name="Dupe1")
    await repo.create(u1)

    u2 = _make_user("Dupe@Example.com", name="Dupe2")
    with pytest.raises(EmailConflictError):
        await repo.create(u2)
