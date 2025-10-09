import pytest
from httpx import AsyncClient, ASGITransport
from gift_genie.main import app


@pytest.fixture
async def client():
    """Async test client"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def anyio_backend():
    return 'asyncio'
