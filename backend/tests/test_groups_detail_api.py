import pytest
from typing import Optional
from uuid import uuid4
from datetime import datetime, UTC

from httpx import AsyncClient
from fastapi import HTTPException

from gift_genie.main import app
from gift_genie.presentation.api.v1 import groups as groups_router
from gift_genie.presentation.api import dependencies as api_dependencies
from gift_genie.domain.entities.group import Group
from gift_genie.domain.interfaces.repositories import GroupRepository


class InMemoryGroupRepo(GroupRepository):
    def __init__(self):
        self._groups: dict[str, Group] = {}
        self._member_stats: dict[str, tuple[int, int]] = {}

    async def create(self, group: Group) -> Group:
        self._groups[group.id] = group
        self._member_stats[group.id] = (0, 0)  # Default no members
        return group

    async def list_by_user_permissions(
        self,
        user_id: str,
        search: str | None,
        page: int,
        page_size: int,
        sort: str,
    ) -> tuple[list[Group], int]:
        groups = [g for g in self._groups.values() if g.admin_user_id == user_id]
        if search:
            groups = [g for g in groups if search.lower() in g.name.lower()]
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
        return self._member_stats.get(group_id, (0, 0))

    async def update(self, group: Group) -> Group:
        if group.id not in self._groups:
            raise ValueError("Group not found")
        self._groups[group.id] = group
        return group

    async def delete(self, group_id: str) -> None:
        if group_id in self._groups:
            del self._groups[group_id]
            del self._member_stats[group_id]


def _make_group(admin_user_id: str, name: str = "Test Group") -> Group:
    now = datetime.now(tz=UTC)
    return Group(
        id=str(uuid4()),
        admin_user_id=admin_user_id,
        name=name,
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=2,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.anyio
async def test_get_group_details_success(client: AsyncClient):
    repo = InMemoryGroupRepo()
    group = _make_group("admin-123", "Family Secret Santa")
    await repo.create(group)
    repo._member_stats[group.id] = (15, 12)  # Set stats

    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "admin-123"

    resp = await client.get(f"/api/v1/groups/{group.id}")

    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == group.id
    assert data["name"] == "Family Secret Santa"
    assert data["admin_user_id"] == "admin-123"
    assert data["stats"]["member_count"] == 15
    assert data["stats"]["active_member_count"] == 12


@pytest.mark.anyio
async def test_get_group_details_unauthorized(client: AsyncClient):
    repo = InMemoryGroupRepo()
    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo

    # Override to raise unauthorized
    async def unauthorized():
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})

    app.dependency_overrides[api_dependencies.get_current_user] = unauthorized

    resp = await client.get("/api/v1/groups/some-id")

    assert resp.status_code == 401
    assert resp.json() == {"detail": {"code": "unauthorized"}}


@pytest.mark.anyio
async def test_get_group_details_forbidden(client: AsyncClient):
    repo = InMemoryGroupRepo()
    group = _make_group("admin-456")  # Different admin
    await repo.create(group)

    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "user-123"  # Wrong user

    resp = await client.get(f"/api/v1/groups/{group.id}")

    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "forbidden"


@pytest.mark.anyio
async def test_get_group_details_not_found(client: AsyncClient):
    repo = InMemoryGroupRepo()
    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    # Use an admin user to bypass permission check and reach use case
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "admin-123"

    nonexistent_uuid = str(uuid4())  # Valid UUID that doesn't exist
    resp = await client.get(f"/api/v1/groups/{nonexistent_uuid}")

    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "group_not_found"


@pytest.mark.anyio
async def test_patch_group_success_partial_update(client: AsyncClient):
    repo = InMemoryGroupRepo()
    group = _make_group("admin-123", "Original Name")
    await repo.create(group)

    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "admin-123"

    payload = {"name": "Updated Name", "historical_exclusions_lookback": 3}
    resp = await client.patch(f"/api/v1/groups/{group.id}", json=payload)

    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == group.id
    assert data["name"] == "Updated Name"
    assert data["historical_exclusions_enabled"] is True  # Unchanged
    assert data["historical_exclusions_lookback"] == 3


@pytest.mark.anyio
async def test_patch_group_invalid_payload_no_fields(client: AsyncClient):
    repo = InMemoryGroupRepo()
    group = _make_group("admin-123")
    await repo.create(group)

    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "admin-123"

    resp = await client.patch(f"/api/v1/groups/{group.id}", json={})

    assert resp.status_code == 422  # Pydantic validation error
    # The custom validator message might not be reached due to Pydantic


@pytest.mark.anyio
async def test_patch_group_invalid_name(client: AsyncClient):
    repo = InMemoryGroupRepo()
    group = _make_group("admin-123")
    await repo.create(group)

    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "admin-123"

    payload = {"name": ""}  # Invalid empty name
    resp = await client.patch(f"/api/v1/groups/{group.id}", json=payload)

    assert resp.status_code == 422  # Pydantic validation error


@pytest.mark.anyio
async def test_patch_group_forbidden(client: AsyncClient):
    repo = InMemoryGroupRepo()
    group = _make_group("admin-456")  # Different admin
    await repo.create(group)

    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "user-123"  # Wrong user

    payload = {"name": "New Name"}
    resp = await client.patch(f"/api/v1/groups/{group.id}", json=payload)

    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "forbidden"


@pytest.mark.anyio
async def test_delete_group_success(client: AsyncClient):
    repo = InMemoryGroupRepo()
    group = _make_group("admin-123")
    await repo.create(group)

    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "admin-123"

    resp = await client.delete(f"/api/v1/groups/{group.id}")

    assert resp.status_code == 204
    assert resp.text == ""  # Empty body

    # Verify deleted
    assert await repo.get_by_id(group.id) is None


@pytest.mark.anyio
async def test_delete_group_forbidden(client: AsyncClient):
    repo = InMemoryGroupRepo()
    group = _make_group("admin-456")  # Different admin
    await repo.create(group)

    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "user-123"  # Wrong user

    resp = await client.delete(f"/api/v1/groups/{group.id}")

    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "forbidden"

    # Verify not deleted
    assert await repo.get_by_id(group.id) is not None


@pytest.mark.anyio
async def test_delete_group_not_found(client: AsyncClient):
    repo = InMemoryGroupRepo()
    app.dependency_overrides[groups_router.get_group_repository] = lambda: repo
    # Use an admin user to bypass permission check and reach use case
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: "admin-123"

    nonexistent_uuid = str(uuid4())  # Valid UUID that doesn't exist
    resp = await client.delete(f"/api/v1/groups/{nonexistent_uuid}")

    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "group_not_found"
