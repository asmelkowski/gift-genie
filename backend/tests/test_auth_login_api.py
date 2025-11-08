import pytest
from typing import Optional

from httpx import AsyncClient

from gift_genie.main import app
from gift_genie.presentation.api.v1 import auth as auth_router
from gift_genie.domain.entities.user import User
from gift_genie.domain.interfaces.repositories import UserRepository


class FakePasswordHasher:
    async def hash(self, password: str) -> str:
        return f"hashed:{password}"

    async def verify(self, password: str, password_hash: str) -> bool:
        return password_hash == f"hashed:{password}"


class FakeJWTService:
    def create_access_token(self, data: dict, expires_delta=None) -> str:
        return "fake.jwt.token"

    def verify_token(self, token: str) -> Optional[dict]:
        if token == "fake.jwt.token":
            return {"sub": "user-id"}
        return None


class InMemoryUserRepo(UserRepository):
    def __init__(self, existing_users: Optional[list[User]] = None):
        self._users: dict[str, User] = {}
        self._emails: set[str] = set()
        if existing_users:
            for user in existing_users:
                self._users[user.id] = user
                self._emails.add(user.email.lower())

    async def create(self, user: User) -> User:
        self._users[user.id] = user
        self._emails.add(user.email.lower())
        return user

    async def get_by_email_ci(self, email: str) -> Optional[User]:
        for u in self._users.values():
            if u.email.lower() == email.lower():
                return u
        return None

    async def email_exists_ci(self, email: str) -> bool:
        return email.lower() in self._emails


@pytest.mark.anyio
async def test_login_success(client: AsyncClient, monkeypatch):
    # Create a test user
    test_user = User(
        id="test-user-id",
        email="alice@example.com",
        password_hash="hashed:Str0ng!Pass1",
        name="Alice",
        created_at=None,  # Not needed for test
        updated_at=None,
    )
    repo = InMemoryUserRepo(existing_users=[test_user])

    app.dependency_overrides[auth_router.get_user_repository] = lambda: repo
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()
    app.dependency_overrides[auth_router.get_jwt_service] = lambda: FakeJWTService()

    payload = {"email": "alice@example.com", "password": "Str0ng!Pass1"}

    resp = await client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["id"] == "test-user-id"
    assert body["user"]["email"] == "alice@example.com"
    assert body["user"]["name"] == "Alice"
    assert body["token_type"] == "Bearer"

    # Check cookie
    assert "access_token" in resp.cookies
    assert resp.cookies["access_token"] == "fake.jwt.token"

    # Check CSRF header
    assert "X-CSRF-Token" in resp.headers

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_login_invalid_credentials_returns_401(client: AsyncClient):
    repo = InMemoryUserRepo()

    app.dependency_overrides[auth_router.get_user_repository] = lambda: repo
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()
    app.dependency_overrides[auth_router.get_jwt_service] = lambda: FakeJWTService()

    payload = {"email": "nonexistent@example.com", "password": "password"}

    resp = await client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 401
    body = resp.json()
    assert body.get("detail", {}).get("code") == "invalid_credentials"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_login_wrong_password_returns_401(client: AsyncClient):
    test_user = User(
        id="test-user-id",
        email="bob@example.com",
        password_hash="hashed:correctpassword",
        name="Bob",
        created_at=None,
        updated_at=None,
    )
    repo = InMemoryUserRepo(existing_users=[test_user])

    app.dependency_overrides[auth_router.get_user_repository] = lambda: repo
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()
    app.dependency_overrides[auth_router.get_jwt_service] = lambda: FakeJWTService()

    payload = {"email": "bob@example.com", "password": "wrongpassword"}

    resp = await client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 401
    body = resp.json()
    assert body.get("detail", {}).get("code") == "invalid_credentials"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_login_invalid_email_format_422(client: AsyncClient):
    app.dependency_overrides[auth_router.get_user_repository] = lambda: InMemoryUserRepo()
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()
    app.dependency_overrides[auth_router.get_jwt_service] = lambda: FakeJWTService()

    payload = {"email": "not-an-email", "password": "password123"}

    resp = await client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 422

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_login_password_too_short_422(client: AsyncClient):
    app.dependency_overrides[auth_router.get_user_repository] = lambda: InMemoryUserRepo()
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()
    app.dependency_overrides[auth_router.get_jwt_service] = lambda: FakeJWTService()

    payload = {"email": "charlie@example.com", "password": "short"}

    resp = await client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 422

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_login_rejects_extra_fields_422(client: AsyncClient):
    app.dependency_overrides[auth_router.get_user_repository] = lambda: InMemoryUserRepo()
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()
    app.dependency_overrides[auth_router.get_jwt_service] = lambda: FakeJWTService()

    payload = {
        "email": "dave@example.com",
        "password": "password123",
        "unexpected": "field",
    }

    resp = await client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 422

    app.dependency_overrides.clear()
