import pytest
from typing import Optional
from uuid import uuid4
from datetime import datetime, UTC

from httpx import AsyncClient

from gift_genie.main import app
from gift_genie.presentation.api.v1 import groups as groups_router
from gift_genie.domain.entities.group import Group
from gift_genie.domain.interfaces.repositories import GroupRepository


class InMemoryGroupRepo(GroupRepository):
    def __init__(self):
        self._groups: dict[str, Group] = {}

    async def create(self, group: Group) -> Group:
        self._groups[group.id] = group
        return group

    async def list_by_admin_user(
        self, user_id: str, search: str | None, page: int, page_size: int, sort: str
    ) -> tuple[list[Group], int]:
        groups = [g for g in self._groups.values() if g.admin_user_id == user_id]
        if search:
            groups = [g for g in groups if search.lower() in g.name.lower()]
        # Simple sort, assume -created_at
        groups.sort(key=lambda g: g.created_at, reverse=True)
        total = len(groups)
        start = (page - 1) * page_size
        end = start + page_size
        return groups[start:end], total

    async def get_by_id(self, group_id: str) -> Optional[Group]:
        return self._groups.get(group_id)


@pytest.mark.anyio
async def test_get_groups_empty(client: AsyncClient):
    repo = InMemoryGroupRepo()
    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[groups_router.get_current_user] = lambda: "user-123"

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
        admin_user_id="user-123",
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=now,
        updated_at=now,
    )
    await repo.create(group)

    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[groups_router.get_current_user] = lambda: "user-123"

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
    app.dependency_overrides[groups_router.get_current_user] = lambda: "user-123"

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
    app.dependency_overrides[groups_router.get_current_user] = lambda: "user-123"

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

    app.dependency_overrides[groups_router.get_current_user] = raise_unauthorized

    payload = {"name": "Group"}
    resp = await client.post("/api/v1/groups", json=payload)
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "unauthorized"

    app.dependency_overrides.clear()
