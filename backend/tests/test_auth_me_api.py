import pytest
from datetime import datetime, timezone
from typing import Optional

from httpx import AsyncClient

from gift_genie.main import app
from gift_genie.presentation.api.v1 import auth as auth_router
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.enums import UserRole
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
        self.users = {u.id: u for u in (existing_users or [])}

    async def create(self, user: User) -> User:
        self.users[user.id] = user
        return user

    async def get_by_id(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)

    async def update(self, user: User) -> User:
        self.users[user.id] = user
        return user

    async def get_by_email_ci(self, email: str) -> Optional[User]:
        for user in self.users.values():
            if user.email.lower() == email.lower():
                return user
        return None

    async def email_exists_ci(self, email: str) -> bool:
        return any(u.email.lower() == email.lower() for u in self.users.values())


@pytest.mark.anyio
async def test_get_me_success(client: AsyncClient):
    # Setup
    user = User(
        id="user-id",
        email="test@example.com",
        password_hash="hashed:password",
        name="Test User",
        role=UserRole.USER,
        created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
    )
    user_repo = InMemoryUserRepo([user])

    app.dependency_overrides[auth_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[auth_router.get_current_user] = lambda: "user-id"

    # Test
    response = await client.get("/api/v1/auth/me")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "user-id"
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.anyio
async def test_get_me_unauthorized(client: AsyncClient):
    # Setup - no user in repo
    user_repo = InMemoryUserRepo([])

    app.dependency_overrides[auth_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[auth_router.get_current_user] = lambda: "user-id"

    # Test
    response = await client.get("/api/v1/auth/me")

    # Assert
    assert response.status_code == 401
