import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_logout_success_with_valid_token(client: AsyncClient):
    client.cookies.set("access_token", "fake.jwt.token")

    resp = await client.post("/api/v1/auth/logout")

    assert resp.status_code == 204
    assert resp.text == ""

    set_cookie_header = resp.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie_header
    assert "max-age=0" in set_cookie_header.lower()
    assert "httponly" in set_cookie_header.lower()
    assert "samesite=" in set_cookie_header.lower()


@pytest.mark.anyio
async def test_logout_success_without_token(client: AsyncClient):
    resp = await client.post("/api/v1/auth/logout")

    assert resp.status_code == 204
    assert resp.text == ""

    set_cookie_header = resp.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie_header


@pytest.mark.anyio
async def test_logout_success_with_invalid_token(client: AsyncClient):
    client.cookies.set("access_token", "invalid.token.here")

    resp = await client.post("/api/v1/auth/logout")

    assert resp.status_code == 204
    assert resp.text == ""


@pytest.mark.anyio
async def test_logout_idempotency(client: AsyncClient):
    resp1 = await client.post("/api/v1/auth/logout")
    assert resp1.status_code == 204

    resp2 = await client.post("/api/v1/auth/logout")
    assert resp2.status_code == 204

    resp3 = await client.post("/api/v1/auth/logout")
    assert resp3.status_code == 204


@pytest.mark.anyio
async def test_logout_clears_cookie_properly(client: AsyncClient):
    client.cookies.set("access_token", "some.token.value")

    resp = await client.post("/api/v1/auth/logout")

    set_cookie = resp.headers.get("set-cookie", "")

    assert "access_token=" in set_cookie
    assert "max-age=0" in set_cookie.lower()

    assert "httponly" in set_cookie.lower()
    assert "samesite=" in set_cookie.lower()
    assert "path=/" in set_cookie.lower()


@pytest.mark.anyio
async def test_logout_wrong_method_405(client: AsyncClient):
    resp = await client.get("/api/v1/auth/logout")
    assert resp.status_code == 405


@pytest.mark.anyio
async def test_logout_with_extra_payload_ignored(client: AsyncClient):
    resp = await client.post("/api/v1/auth/logout", json={"unexpected": "data"})

    assert resp.status_code == 204
