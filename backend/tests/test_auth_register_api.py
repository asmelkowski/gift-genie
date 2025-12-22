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

    async def verify(self, password: str, password_hash: str) -> bool:  # pragma: no cover
        return password_hash == f"hashed:{password}"


class InMemoryUserRepo(UserRepository):
    def __init__(self, existing_emails: Optional[set[str]] = None):
        self._users: dict[str, User] = {}
        self._emails = {e.lower() for e in (existing_emails or set())}

    async def create(self, user: User) -> User:
        # store by id
        self._users[user.id] = user
        self._emails.add(user.email.lower())
        return user

    async def get_by_id(self, user_id: str) -> User | None:
        return self._users.get(user_id)

    async def get_by_email_ci(self, email: str) -> Optional[User]:
        for u in self._users.values():
            if u.email.lower() == email.lower():
                return u
        return None

    async def email_exists_ci(self, email: str) -> bool:
        return email.lower() in self._emails

    async def list_all(
        self, search: str | None, page: int, page_size: int, sort: str
    ) -> tuple[list[User], int]:
        users = list(self._users.values())
        # Apply search filter if provided
        if search:
            search_lower = search.lower()
            users = [
                u
                for u in users
                if search_lower in u.email.lower() or search_lower in u.name.lower()
            ]
        # Simple pagination
        total = len(users)
        start = (page - 1) * page_size
        end = start + page_size
        return users[start:end], total


@pytest.mark.anyio
async def test_register_success(client: AsyncClient, monkeypatch):
    # Override dependencies
    repo = InMemoryUserRepo()
    app.dependency_overrides[auth_router.get_user_repository] = lambda: repo
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()

    payload = {"email": "alice@example.com", "password": "Str0ng!Pass1", "name": "Alice"}

    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == payload["email"]
    assert body["name"] == payload["name"]
    assert "id" in body and isinstance(body["id"], str)
    assert "created_at" in body

    # Cleanup
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_register_weak_password_returns_400(client: AsyncClient):
    app.dependency_overrides[auth_router.get_user_repository] = lambda: InMemoryUserRepo()
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()

    payload = {"email": "bob@example.com", "password": "password", "name": "Bob"}

    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 400
    body = resp.json()
    assert body.get("detail", {}).get("code") == "invalid_payload"
    assert body.get("detail", {}).get("field") == "password"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_register_conflict_returns_409(client: AsyncClient):
    # Simulate existing email (case-insensitive)
    existing = {"carol@example.com"}
    repo = InMemoryUserRepo(existing_emails=existing)

    app.dependency_overrides[auth_router.get_user_repository] = lambda: repo
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()

    payload = {"email": "Carol@Example.com", "password": "Str0ng!Pass1", "name": "Carol"}

    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409
    assert resp.json().get("detail", {}).get("code") == "email_conflict"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_register_rejects_extra_fields_422(client: AsyncClient):
    app.dependency_overrides[auth_router.get_user_repository] = lambda: InMemoryUserRepo()
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()

    payload = {
        "email": "dave@example.com",
        "password": "Str0ng!Pass1",
        "name": "Dave",
        "unexpected": "field",
    }

    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 422

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_register_invalid_email_422(client: AsyncClient):
    app.dependency_overrides[auth_router.get_user_repository] = lambda: InMemoryUserRepo()
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()

    payload = {"email": "not-an-email", "password": "Str0ng!Pass1", "name": "Eve"}
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 422

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_register_name_empty_422(client: AsyncClient):
    app.dependency_overrides[auth_router.get_user_repository] = lambda: InMemoryUserRepo()
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()

    payload = {"email": "frank@example.com", "password": "Str0ng!Pass1", "name": ""}
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 422

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_register_name_too_long_422(client: AsyncClient):
    app.dependency_overrides[auth_router.get_user_repository] = lambda: InMemoryUserRepo()
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()

    long_name = "A" * 101
    payload = {"email": "gina@example.com", "password": "Str0ng!Pass1", "name": long_name}
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 422

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_register_sets_location_header_on_success(client: AsyncClient):
    repo = InMemoryUserRepo()
    app.dependency_overrides[auth_router.get_user_repository] = lambda: repo
    app.dependency_overrides[auth_router.get_password_hasher] = lambda: FakePasswordHasher()

    payload = {"email": "henry@example.com", "password": "Str0ng!Pass1", "name": "Henry"}
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201
    assert resp.headers.get("Location", "").startswith("/api/v1/users/")

    app.dependency_overrides.clear()
