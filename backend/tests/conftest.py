import pytest
from httpx import AsyncClient, ASGITransport
from gift_genie.main import app, limiter


@pytest.fixture
async def client():
    """Async test client with rate limiting disabled"""
    # Disable rate limiting for tests
    limiter._enabled = False

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    # Re-enable after tests
    limiter._enabled = True


@pytest.fixture
def anyio_backend():
    return "asyncio"
