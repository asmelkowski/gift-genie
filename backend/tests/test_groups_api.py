import pytest
from typing import Optional
from uuid import uuid4
from datetime import datetime, UTC

from httpx import AsyncClient

from gift_genie.main import app
from gift_genie.presentation.api.v1 import groups as groups_router
from gift_genie.presentation.api import dependencies as api_dependencies
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.interfaces.repositories import GroupRepository


class InMemoryGroupRepo(GroupRepository):
    def __init__(self):
        self._groups: dict[str, Group] = {}
        self._user_permissions: dict[tuple[str, str], bool] = {}

    async def create(self, group: Group) -> Group:
        self._groups[group.id] = group
        return group

    def add_permission(self, user_id: str, group_id: str) -> None:
        """Helper for testing: add a groups:read permission"""
        permission_code = f"groups:read:{group_id}"
        self._user_permissions[(user_id, permission_code)] = True

    async def list_by_user_permissions(
        self,
        user_id: str,
        search: str | None,
        page: int,
        page_size: int,
        sort: str,
    ) -> tuple[list[Group], int]:
        # Filter groups where user has groups:read:{group_id} permission
        groups = []
        for g in self._groups.values():
            permission_code = f"groups:read:{g.id}"
            if self._user_permissions.get((user_id, permission_code), False):
                groups.append(g)

        if search:
            groups = [g for g in groups if search.lower() in g.name.lower()]
        # Simple sort, assume -created_at
        groups.sort(key=lambda g: g.created_at, reverse=True)
        total = len(groups)
        start = (page - 1) * page_size
        end = start + page_size
        return groups[start:end], total

    async def list_all(
        self, search: str | None, page: int, page_size: int, sort: str
    ) -> tuple[list[Group], int]:
        groups = list(self._groups.values())
        if search:
            groups = [g for g in groups if search.lower() in g.name.lower()]
        groups.sort(key=lambda g: g.created_at, reverse=True)
        total = len(groups)
        start = (page - 1) * page_size
        end = start + page_size
        return groups[start:end], total

    async def get_by_id(self, group_id: str) -> Optional[Group]:
        return self._groups.get(group_id)

    async def get_member_stats(self, group_id: str) -> tuple[int, int]:
        return (0, 0)

    async def update(self, group: Group) -> Group:
        self._groups[group.id] = group
        return group

    async def delete(self, group_id: str) -> None:
        self._groups.pop(group_id, None)


@pytest.mark.anyio
async def test_get_groups_empty(client: AsyncClient):
    repo = InMemoryGroupRepo()
    user = User(
        id="user-123",
        email="user@example.com",
        password_hash="hash",
        name="Test User",
        role=UserRole.USER,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user_object] = lambda: user

    resp = await client.get("/api/v1/groups")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"] == []
    assert body["meta"]["total"] == 0

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_get_groups_with_data(client: AsyncClient):
    repo = InMemoryGroupRepo()
    now = datetime.now(UTC)
    group = Group(
        id=str(uuid4()),
        admin_user_id="user-456",
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=now,
        updated_at=now,
    )
    await repo.create(group)
    # Grant permission to user-123 for this group
    repo.add_permission("user-123", group.id)

    user = User(
        id="user-123",
        email="user@example.com",
        password_hash="hash",
        name="Test User",
        role=UserRole.USER,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user_object] = lambda: user

    resp = await client.get("/api/v1/groups")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 1
    assert body["data"][0]["name"] == "Test Group"
    assert body["meta"]["total"] == 1

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_get_groups_unauthorized(client: AsyncClient):
    resp = await client.get("/api/v1/groups")
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "unauthorized"


@pytest.mark.anyio
async def test_create_group_success(client: AsyncClient):
    repo = InMemoryGroupRepo()
    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "user-123"

    payload = {"name": "New Group"}
    resp = await client.post("/api/v1/groups", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "New Group"
    assert body["admin_user_id"] == "user-123"
    assert "id" in body
    assert resp.headers.get("Location", "").startswith("/api/v1/groups/")

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_create_group_invalid_name(client: AsyncClient):
    repo = InMemoryGroupRepo()
    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "user-123"

    payload = {"name": ""}
    resp = await client.post("/api/v1/groups", json=payload)
    assert resp.status_code == 422  # Pydantic validation
    assert "detail" in resp.json()

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_create_group_unauthorized(client: AsyncClient):
    from fastapi import HTTPException

    def raise_unauthorized():
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})

    app.dependency_overrides[api_dependencies.get_current_user] = raise_unauthorized

    payload = {"name": "Group"}
    resp = await client.post("/api/v1/groups", json=payload)
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "unauthorized"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_list_groups_permission_filtering(client: AsyncClient):
    """Test that users only see groups they have permissions for"""
    repo = InMemoryGroupRepo()
    now = datetime.now(UTC)

    # Create two groups owned by different users
    group1 = Group(
        id=str(uuid4()),
        admin_user_id="user-456",
        name="Group 1",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=now,
        updated_at=now,
    )
    group2 = Group(
        id=str(uuid4()),
        admin_user_id="user-789",
        name="Group 2",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=now,
        updated_at=now,
    )
    await repo.create(group1)
    await repo.create(group2)

    # Grant permission only to group1
    repo.add_permission("user-123", group1.id)

    user = User(
        id="user-123",
        email="user@example.com",
        password_hash="hash",
        name="Test User",
        role=UserRole.USER,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user_object] = lambda: user

    resp = await client.get("/api/v1/groups")
    assert resp.status_code == 200
    body = resp.json()
    # Should only see group1
    assert len(body["data"]) == 1
    assert body["data"][0]["id"] == group1.id
    assert body["data"][0]["name"] == "Group 1"
    assert body["meta"]["total"] == 1

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_list_groups_user_without_permissions_sees_none(client: AsyncClient):
    """Test that users without permissions see empty list"""
    repo = InMemoryGroupRepo()
    now = datetime.now(UTC)

    # Create a group but don't grant permission to user-123
    group = Group(
        id=str(uuid4()),
        admin_user_id="user-456",
        name="Forbidden Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=now,
        updated_at=now,
    )
    await repo.create(group)

    user = User(
        id="user-123",
        email="user@example.com",
        password_hash="hash",
        name="Test User",
        role=UserRole.USER,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user_object] = lambda: user

    resp = await client.get("/api/v1/groups")
    assert resp.status_code == 200
    body = resp.json()
    # Should see nothing
    assert body["data"] == []
    assert body["meta"]["total"] == 0

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_list_groups_admin_sees_all(client: AsyncClient):
    """Test that admin users see all groups"""
    repo = InMemoryGroupRepo()
    now = datetime.now(UTC)

    # Create two groups owned by different users
    group1 = Group(
        id=str(uuid4()),
        admin_user_id="user-456",
        name="Group 1",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=now,
        updated_at=now,
    )
    group2 = Group(
        id=str(uuid4()),
        admin_user_id="user-789",
        name="Group 2",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=now,
        updated_at=now,
    )
    await repo.create(group1)
    await repo.create(group2)

    # Don't grant any permissions - admin should bypass anyway
    admin_user = User(
        id="admin-123",
        email="admin@example.com",
        password_hash="hash",
        name="Admin User",
        role=UserRole.ADMIN,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user_object] = lambda: admin_user

    resp = await client.get("/api/v1/groups")
    assert resp.status_code == 200
    body = resp.json()
    # Admin should see both groups
    assert len(body["data"]) == 2
    assert body["meta"]["total"] == 2

    app.dependency_overrides.clear()
