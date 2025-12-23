import pytest
from datetime import datetime, UTC

from httpx import AsyncClient

from gift_genie.main import app
from gift_genie.presentation.api.v1 import groups as groups_router
from gift_genie.presentation.api import dependencies as api_dependencies
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.user_permission import UserPermission
from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.interfaces.repositories import (
    GroupRepository,
    UserRepository,
    UserPermissionRepository,
)
from gift_genie.infrastructure.permissions.default_permissions import USER_BASIC_PERMISSIONS


class InMemoryUserRepo(UserRepository):
    def __init__(self):
        self._users: dict[str, User] = {}

    async def create(self, user: User) -> User:
        self._users[user.id] = user
        return user

    async def get_by_id(self, user_id: str) -> User | None:
        return self._users.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        for u in self._users.values():
            if u.email == email:
                return u
        return None

    async def update(self, user: User) -> User:
        self._users[user.id] = user
        return user

    async def list_users(self, page: int, page_size: int) -> tuple[list[User], int]:
        users = list(self._users.values())
        return users, len(users)


class InMemoryUserPermissionRepo(UserPermissionRepository):
    def __init__(self):
        self._permissions: dict[tuple[str, str], UserPermission] = {}

    async def grant_permission(
        self, user_id: str, permission_code: str, granted_by: str | None = None
    ) -> UserPermission:
        user_permission = UserPermission(
            user_id=user_id,
            permission_code=permission_code,
            granted_at=datetime.now(UTC),
            granted_by=granted_by,
        )
        self._permissions[(user_id, permission_code)] = user_permission
        return user_permission

    async def grant_permissions_bulk(
        self, user_id: str, permission_codes: list[str], granted_by: str | None = None
    ) -> list[UserPermission]:
        result = []
        for code in permission_codes:
            perm = await self.grant_permission(user_id, code, granted_by)
            result.append(perm)
        return result

    async def has_permission(self, user_id: str, permission_code: str) -> bool:
        return (user_id, permission_code) in self._permissions

    async def list_by_user(self, user_id: str) -> list[UserPermission]:
        return [perm for perm in self._permissions.values() if perm.user_id == user_id]

    async def list_permissions_for_user(self, user_id: str) -> list[Permission]:
        # Returns empty list as this is a test mock
        return []

    async def revoke_permission(self, user_id: str, permission_code: str) -> bool:
        key = (user_id, permission_code)
        if key in self._permissions:
            del self._permissions[key]
            return True
        return False


class InMemoryGroupRepo(GroupRepository):
    def __init__(self):
        self._groups: dict[str, Group] = {}

    async def create(self, group: Group) -> Group:
        self._groups[group.id] = group
        return group

    async def get_by_id(self, group_id: str) -> Group | None:
        return self._groups.get(group_id)

    async def list_by_user_permissions(
        self,
        user_id: str,
        search: str | None,
        page: int,
        page_size: int,
        sort: str,
    ) -> tuple[list[Group], int]:
        groups = [g for g in self._groups.values() if g.admin_user_id == user_id]
        return groups, len(groups)

    async def list_all(
        self, search: str | None, page: int, page_size: int, sort: str
    ) -> tuple[list[Group], int]:
        groups = list(self._groups.values())
        if search:
            groups = [g for g in groups if search.lower() in g.name.lower()]
        total = len(groups)
        start = (page - 1) * page_size
        end = start + page_size
        return groups[start:end], total

    async def update(self, group: Group) -> Group:
        self._groups[group.id] = group
        return group

    async def get_member_stats(self, group_id: str) -> tuple[int, int]:
        return (0, 0)

    async def delete(self, group_id: str) -> None:
        self._groups.pop(group_id, None)


@pytest.fixture
def user_repo():
    return InMemoryUserRepo()


@pytest.fixture
def permission_repo():
    return InMemoryUserPermissionRepo()


@pytest.fixture
def group_repo():
    return InMemoryGroupRepo()


@pytest.mark.anyio
async def test_granular_permissions_flow(
    client: AsyncClient,
    user_repo: InMemoryUserRepo,
    permission_repo: InMemoryUserPermissionRepo,
    group_repo: InMemoryGroupRepo,
):
    # 1. Setup users
    creator_id = "creator-123"
    creator = User(
        id=creator_id,
        email="creator@example.com",
        password_hash="hash",
        name="Creator",
        role=UserRole.USER,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await user_repo.create(creator)

    # Grant basic permissions to creator
    for perm in USER_BASIC_PERMISSIONS:
        await permission_repo.grant_permission(creator_id, perm)

    other_user_id = "other-456"
    other_user = User(
        id=other_user_id,
        email="other@example.com",
        password_hash="hash",
        name="Other",
        role=UserRole.USER,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await user_repo.create(other_user)
    # Grant basic permissions to other user
    for perm in USER_BASIC_PERMISSIONS:
        await permission_repo.grant_permission(other_user_id, perm)

    # 2. Setup Dependency Overrides
    app.dependency_overrides[api_dependencies.get_user_repository] = lambda: user_repo
    app.dependency_overrides[api_dependencies.get_user_permission_repository] = (
        lambda: permission_repo
    )
    app.dependency_overrides[groups_router.get_group_repository] = lambda: group_repo

    # helper to switch current user
    current_user_context = {"id": creator_id}
    app.dependency_overrides[api_dependencies.get_current_user] = lambda: current_user_context["id"]

    # 3. Creator creates a group
    resp = await client.post("/api/v1/groups", json={"name": "Power Gamers"})
    assert resp.status_code == 201
    group_id = resp.json()["id"]

    # 4. Verify granular permissions were granted to creator
    creator_perms = await permission_repo.list_by_user(creator_id)
    creator_perm_codes = [p.permission_code for p in creator_perms]
    assert f"groups:read:{group_id}" in creator_perm_codes
    assert f"groups:update:{group_id}" in creator_perm_codes
    assert f"groups:delete:{group_id}" in creator_perm_codes
    assert f"members:create:{group_id}" in creator_perm_codes
    assert f"draws:create:{group_id}" in creator_perm_codes

    # 5. Creator accesses group details (should OK via granular)
    resp = await client.get(f"/api/v1/groups/{group_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Power Gamers"

    # 6. Creator updates group (should OK via granular)
    resp = await client.patch(f"/api/v1/groups/{group_id}", json={"name": "Ultimate Gamers"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Ultimate Gamers"

    # 7. Other user tries to access group details (should FAIL)
    current_user_context["id"] = other_user_id
    resp = await client.get(f"/api/v1/groups/{group_id}")
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "forbidden"

    # 8. Other user tries to update group (should FAIL)
    resp = await client.patch(f"/api/v1/groups/{group_id}", json={"name": "Hacker Group"})
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "forbidden"

    # 9. Clean up
    app.dependency_overrides.clear()
