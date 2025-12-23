"""API integration tests for admin permission endpoints."""

import pytest
from datetime import datetime, timezone
from typing import Optional

from httpx import AsyncClient

from gift_genie.main import app
from gift_genie.presentation.api.v1 import admin as admin_router
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.entities.user_permission import UserPermission
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.member import Member
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.entities.exclusion import Exclusion
from gift_genie.domain.interfaces.repositories import (
    UserRepository,
    PermissionRepository,
    UserPermissionRepository,
    GroupRepository,
    MemberRepository,
    DrawRepository,
    ExclusionRepository,
)
from gift_genie.domain.services.permission_validator import PermissionValidator


# =====================
# Fake Repositories for Testing
# =====================


class InMemoryUserRepo(UserRepository):
    """In-memory user repository for testing."""

    def __init__(self, existing_users: Optional[list[User]] = None):
        self.users = {u.id: u for u in (existing_users or [])}

    async def create(self, user: User) -> User:
        self.users[user.id] = user
        return user

    async def get_by_id(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)

    async def get_by_email_ci(self, email: str) -> Optional[User]:
        for user in self.users.values():
            if user.email.lower() == email.lower():
                return user
        return None

    async def email_exists_ci(self, email: str) -> bool:
        return any(u.email.lower() == email.lower() for u in self.users.values())

    async def update(self, user: User) -> User:
        self.users[user.id] = user
        return user

    async def list_all(
        self, search: Optional[str], page: int, page_size: int, sort: str
    ) -> tuple[list[User], int]:
        users = list(self.users.values())
        total = len(users)
        start = (page - 1) * page_size
        end = start + page_size
        return users[start:end], total


class InMemoryPermissionRepo(PermissionRepository):
    """In-memory permission repository for testing."""

    def __init__(self, existing_permissions: Optional[list[Permission]] = None):
        self.permissions = {p.code: p for p in (existing_permissions or [])}

    async def create(self, permission: Permission) -> Permission:
        self.permissions[permission.code] = permission
        return permission

    async def get_by_code(self, code: str) -> Optional[Permission]:
        return self.permissions.get(code)

    async def list_all(self) -> list[Permission]:
        return list(self.permissions.values())

    async def list_by_category(self, category: str) -> list[Permission]:
        return [p for p in self.permissions.values() if p.category == category]

    async def permission_exists(self, code: str) -> bool:
        return code in self.permissions


class InMemoryUserPermissionRepo(UserPermissionRepository):
    """In-memory user permission repository for testing."""

    def __init__(self, existing_grants: Optional[list[UserPermission]] = None):
        # Store as (user_id, permission_code) -> UserPermission
        self.grants = {(g.user_id, g.permission_code): g for g in (existing_grants or [])}

    async def grant_permission(
        self, user_id: str, permission_code: str, granted_by: Optional[str] = None
    ) -> UserPermission:
        user_permission = UserPermission(
            user_id=user_id,
            permission_code=permission_code,
            granted_at=datetime.now(timezone.utc),
            granted_by=granted_by,
        )
        self.grants[(user_id, permission_code)] = user_permission
        return user_permission

    async def grant_permissions_bulk(
        self, user_id: str, permission_codes: list[str], granted_by: Optional[str] = None
    ) -> list[UserPermission]:
        """Grant multiple permissions to a user."""
        results = []
        for permission_code in permission_codes:
            user_permission = await self.grant_permission(user_id, permission_code, granted_by)
            results.append(user_permission)
        return results

    async def revoke_permission(self, user_id: str, permission_code: str) -> bool:
        key = (user_id, permission_code)
        if key in self.grants:
            del self.grants[key]
            return True
        return False

    async def has_permission(self, user_id: str, permission_code: str) -> bool:
        return (user_id, permission_code) in self.grants

    async def list_by_user(self, user_id: str) -> list[UserPermission]:
        """List all permissions granted to a user."""
        return [perm for (uid, _), perm in self.grants.items() if uid == user_id]

    async def list_permissions_for_user(self, user_id: str) -> list[Permission]:
        # Return permission objects (not implemented fully, just ids)
        return []


class InMemoryGroupRepo(GroupRepository):
    """In-memory group repository for testing."""

    def __init__(self, existing_groups: Optional[list[Group]] = None):
        self.groups = {g.id: g for g in (existing_groups or [])}

    async def create(self, group: Group) -> Group:
        self.groups[group.id] = group
        return group

    async def list_by_admin_user(
        self, user_id: str, search: Optional[str], page: int, page_size: int, sort: str
    ) -> tuple[list[Group], int]:
        return list(self.groups.values()), len(self.groups)

    async def list_all(
        self, search: Optional[str], page: int, page_size: int, sort: str
    ) -> tuple[list[Group], int]:
        return list(self.groups.values()), len(self.groups)

    async def get_by_id(self, group_id: str) -> Optional[Group]:
        return self.groups.get(group_id)

    async def get_member_stats(self, group_id: str) -> tuple[int, int]:
        return 0, 0

    async def update(self, group: Group) -> Group:
        self.groups[group.id] = group
        return group

    async def delete(self, group_id: str) -> None:
        if group_id in self.groups:
            del self.groups[group_id]


class InMemoryMemberRepo(MemberRepository):
    """In-memory member repository for testing."""

    def __init__(self, existing_members: Optional[list[Member]] = None):
        self.members = {m.id: m for m in (existing_members or [])}

    async def create(self, member: Member) -> Member:
        self.members[member.id] = member
        return member

    async def list_by_group(
        self,
        group_id: str,
        is_active: Optional[bool],
        search: Optional[str],
        page: int,
        page_size: int,
        sort: str,
    ) -> tuple[list[Member], int]:
        members = [m for m in self.members.values() if m.group_id == group_id]
        return members, len(members)

    async def get_by_id(self, member_id: str) -> Optional[Member]:
        return self.members.get(member_id)

    async def get_many_by_ids(self, member_ids: list[str]) -> dict[str, Member]:
        return {mid: m for mid, m in self.members.items() if mid in member_ids}

    async def get_by_group_and_id(self, group_id: str, member_id: str) -> Optional[Member]:
        member = self.members.get(member_id)
        if member and member.group_id == group_id:
            return member
        return None

    async def name_exists_in_group(
        self, group_id: str, name: str, exclude_member_id: Optional[str] = None
    ) -> bool:
        for member in self.members.values():
            if member.group_id == group_id and member.name == name:
                if exclude_member_id and member.id == exclude_member_id:
                    continue
                return True
        return False

    async def email_exists_in_group(
        self, group_id: str, email: str, exclude_member_id: Optional[str] = None
    ) -> bool:
        for member in self.members.values():
            if member.group_id == group_id and member.email == email:
                if exclude_member_id and member.id == exclude_member_id:
                    continue
                return True
        return False

    async def has_pending_draw(self, member_id: str) -> bool:
        return False

    async def update(self, member: Member) -> Member:
        self.members[member.id] = member
        return member

    async def delete(self, member_id: str) -> None:
        if member_id in self.members:
            del self.members[member_id]


class InMemoryDrawRepo(DrawRepository):
    """In-memory draw repository for testing."""

    def __init__(self, existing_draws: Optional[list[Draw]] = None):
        self.draws = {d.id: d for d in (existing_draws or [])}

    async def create(self, draw: Draw) -> Draw:
        self.draws[draw.id] = draw
        return draw

    async def list_by_group(
        self, group_id: str, status: Optional[str], page: int, page_size: int, sort: str
    ) -> tuple[list[Draw], int]:
        draws = [d for d in self.draws.values() if d.group_id == group_id]
        return draws, len(draws)

    async def get_by_id(self, draw_id: str) -> Optional[Draw]:
        return self.draws.get(draw_id)

    async def update(self, draw: Draw) -> Draw:
        self.draws[draw.id] = draw
        return draw

    async def delete(self, draw_id: str) -> None:
        if draw_id in self.draws:
            del self.draws[draw_id]


class InMemoryExclusionRepo(ExclusionRepository):
    """In-memory exclusion repository for testing."""

    def __init__(self, existing_exclusions: Optional[list[Exclusion]] = None):
        self.exclusions = {e.id: e for e in (existing_exclusions or [])}

    async def list_by_group(
        self,
        group_id: str,
        exclusion_type: Optional[str],
        giver_member_id: Optional[str],
        receiver_member_id: Optional[str],
        page: int,
        page_size: int,
        sort: str,
    ) -> tuple[list[Exclusion], int]:
        exclusions = [e for e in self.exclusions.values() if e.group_id == group_id]
        return exclusions, len(exclusions)

    async def create(self, exclusion: Exclusion) -> Exclusion:
        self.exclusions[exclusion.id] = exclusion
        return exclusion

    async def create_many(self, exclusions: list[Exclusion]) -> list[Exclusion]:
        for exclusion in exclusions:
            self.exclusions[exclusion.id] = exclusion
        return exclusions

    async def get_by_id(self, exclusion_id: str) -> Optional[Exclusion]:
        return self.exclusions.get(exclusion_id)

    async def get_by_group_and_id(self, group_id: str, exclusion_id: str) -> Optional[Exclusion]:
        exclusion = self.exclusions.get(exclusion_id)
        if exclusion and exclusion.group_id == group_id:
            return exclusion
        return None

    async def exists_for_pair(
        self, group_id: str, giver_member_id: str, receiver_member_id: str
    ) -> bool:
        return False

    async def check_conflicts_bulk(self, group_id: str, pairs: list[tuple[str, str]]) -> list[dict]:
        return []

    async def delete(self, exclusion_id: str) -> None:
        if exclusion_id in self.exclusions:
            del self.exclusions[exclusion_id]


# =====================
# Test Fixtures
# =====================


@pytest.fixture
def admin_user() -> User:
    """Create an admin user for testing."""
    return User(
        id="admin-id",
        email="admin@example.com",
        password_hash="hashed:password",
        name="Admin User",
        role=UserRole.ADMIN,
        created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
    )


@pytest.fixture
def regular_user() -> User:
    """Create a regular user for testing."""
    return User(
        id="user-1",
        email="user1@example.com",
        password_hash="hashed:password",
        name="User One",
        role=UserRole.USER,
        created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
    )


@pytest.fixture
def sample_permissions() -> list[Permission]:
    """Create sample permissions for testing."""
    return [
        Permission(
            code="draws:notify",
            name="Notify About Draws",
            description="Can send notifications about draw events",
            category="draws",
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
        ),
        Permission(
            code="groups:create",
            name="Create Groups",
            description="Can create new groups",
            category="groups",
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
        ),
        Permission(
            code="groups:delete",
            name="Delete Groups",
            description="Can delete groups",
            category="groups",
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
        ),
    ]


# =====================
# Tests: Grant Permission
# =====================


@pytest.mark.anyio
async def test_grant_permission_success(
    client: AsyncClient, admin_user: User, regular_user: User, sample_permissions: list[Permission]
):
    """Test successfully granting a permission to a user."""
    user_repo = InMemoryUserRepo([admin_user, regular_user])
    permission_repo = InMemoryPermissionRepo(sample_permissions)
    user_permission_repo = InMemoryUserPermissionRepo()
    group_repo = InMemoryGroupRepo()
    member_repo = InMemoryMemberRepo()
    draw_repo = InMemoryDrawRepo()
    exclusion_repo = InMemoryExclusionRepo()

    permission_validator = PermissionValidator(
        permission_repository=permission_repo,
        group_repository=group_repo,
        member_repository=member_repo,
        draw_repository=draw_repo,
        exclusion_repository=exclusion_repo,
    )

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_permission_validator] = lambda: permission_validator
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    payload = {"permission_code": "draws:notify"}
    response = await client.post(
        f"/api/v1/admin/users/{regular_user.id}/permissions",
        json=payload,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == regular_user.id
    assert data["permission_code"] == "draws:notify"
    assert "granted_at" in data

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_grant_permission_idempotent(
    client: AsyncClient, admin_user: User, regular_user: User, sample_permissions: list[Permission]
):
    """Test that granting the same permission twice is idempotent."""
    user_repo = InMemoryUserRepo([admin_user, regular_user])
    permission_repo = InMemoryPermissionRepo(sample_permissions)
    user_permission_repo = InMemoryUserPermissionRepo()
    group_repo = InMemoryGroupRepo()
    member_repo = InMemoryMemberRepo()
    draw_repo = InMemoryDrawRepo()
    exclusion_repo = InMemoryExclusionRepo()

    permission_validator = PermissionValidator(
        permission_repository=permission_repo,
        group_repository=group_repo,
        member_repository=member_repo,
        draw_repository=draw_repo,
        exclusion_repository=exclusion_repo,
    )

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_permission_validator] = lambda: permission_validator
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    payload = {"permission_code": "draws:notify"}

    # First grant - should return 201 Created
    response1 = await client.post(
        f"/api/v1/admin/users/{regular_user.id}/permissions",
        json=payload,
    )
    assert response1.status_code == 201
    data1 = response1.json()
    assert data1["user_id"] == regular_user.id
    assert data1["permission_code"] == "draws:notify"

    # Second grant of same permission - should return 200 OK (idempotent)
    response2 = await client.post(
        f"/api/v1/admin/users/{regular_user.id}/permissions",
        json=payload,
    )
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["user_id"] == regular_user.id
    assert data2["permission_code"] == "draws:notify"
    # Should have same IDs and granted_by (though granted_at may differ in test repos)
    assert data2["user_id"] == data1["user_id"]
    assert data2["permission_code"] == data1["permission_code"]
    assert data2["granted_by"] == data1["granted_by"]

    # Verify permission exists exactly once via has_permission
    has_perm = await user_permission_repo.has_permission(regular_user.id, "draws:notify")
    assert has_perm is True

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_grant_permission_with_notes(
    client: AsyncClient, admin_user: User, regular_user: User, sample_permissions: list[Permission]
):
    """Test granting a permission with optional notes."""
    user_repo = InMemoryUserRepo([admin_user, regular_user])
    permission_repo = InMemoryPermissionRepo(sample_permissions)
    user_permission_repo = InMemoryUserPermissionRepo()
    group_repo = InMemoryGroupRepo()
    member_repo = InMemoryMemberRepo()
    draw_repo = InMemoryDrawRepo()
    exclusion_repo = InMemoryExclusionRepo()

    permission_validator = PermissionValidator(
        permission_repository=permission_repo,
        group_repository=group_repo,
        member_repository=member_repo,
        draw_repository=draw_repo,
        exclusion_repository=exclusion_repo,
    )

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_permission_validator] = lambda: permission_validator
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    payload = {"permission_code": "draws:notify", "notes": "Trusted user for notifications"}
    response = await client.post(
        f"/api/v1/admin/users/{regular_user.id}/permissions",
        json=payload,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == regular_user.id

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_grant_permission_nonexistent_user(
    client: AsyncClient, admin_user: User, sample_permissions: list[Permission]
):
    """Test granting permission to non-existent user returns 404."""
    user_repo = InMemoryUserRepo([admin_user])
    permission_repo = InMemoryPermissionRepo(sample_permissions)
    user_permission_repo = InMemoryUserPermissionRepo()
    group_repo = InMemoryGroupRepo()
    member_repo = InMemoryMemberRepo()
    draw_repo = InMemoryDrawRepo()
    exclusion_repo = InMemoryExclusionRepo()

    permission_validator = PermissionValidator(
        permission_repository=permission_repo,
        group_repository=group_repo,
        member_repository=member_repo,
        draw_repository=draw_repo,
        exclusion_repository=exclusion_repo,
    )

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_permission_validator] = lambda: permission_validator
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    payload = {"permission_code": "draws:notify"}
    response = await client.post(
        "/api/v1/admin/users/nonexistent-id/permissions",
        json=payload,
    )

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "not_found"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_grant_permission_nonexistent_permission(
    client: AsyncClient, admin_user: User, regular_user: User
):
    """Test granting non-existent permission returns 404."""
    user_repo = InMemoryUserRepo([admin_user, regular_user])
    permission_repo = InMemoryPermissionRepo([])
    user_permission_repo = InMemoryUserPermissionRepo()
    group_repo = InMemoryGroupRepo()
    member_repo = InMemoryMemberRepo()
    draw_repo = InMemoryDrawRepo()
    exclusion_repo = InMemoryExclusionRepo()

    permission_validator = PermissionValidator(
        permission_repository=permission_repo,
        group_repository=group_repo,
        member_repository=member_repo,
        draw_repository=draw_repo,
        exclusion_repository=exclusion_repo,
    )

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_permission_validator] = lambda: permission_validator
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    payload = {"permission_code": "nonexistent:permission"}
    response = await client.post(
        f"/api/v1/admin/users/{regular_user.id}/permissions",
        json=payload,
    )

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "not_found"

    app.dependency_overrides.clear()


# =====================
# Tests: Revoke Permission
# =====================


@pytest.mark.anyio
async def test_revoke_permission_success(
    client: AsyncClient, admin_user: User, regular_user: User, sample_permissions: list[Permission]
):
    """Test successfully revoking a permission from a user."""
    user_repo = InMemoryUserRepo([admin_user, regular_user])

    # Create existing grant
    existing_grant = UserPermission(
        user_id=regular_user.id,
        permission_code="draws:notify",
        granted_at=datetime.now(timezone.utc),
        granted_by=admin_user.id,
    )
    user_permission_repo = InMemoryUserPermissionRepo([existing_grant])

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    response = await client.delete(
        f"/api/v1/admin/users/{regular_user.id}/permissions/draws:notify"
    )

    assert response.status_code == 204

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_revoke_permission_idempotent(
    client: AsyncClient, admin_user: User, regular_user: User
):
    """Test revoking non-existent permission (idempotent) returns 204."""
    user_repo = InMemoryUserRepo([admin_user, regular_user])
    user_permission_repo = InMemoryUserPermissionRepo()

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    response = await client.delete(
        f"/api/v1/admin/users/{regular_user.id}/permissions/nonexistent:permission"
    )

    assert response.status_code == 204

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_revoke_permission_nonexistent_user(client: AsyncClient, admin_user: User):
    """Test revoking permission from non-existent user returns 404."""
    user_repo = InMemoryUserRepo([admin_user])
    user_permission_repo = InMemoryUserPermissionRepo()

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    response = await client.delete("/api/v1/admin/users/nonexistent-id/permissions/draws:notify")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "not_found"

    app.dependency_overrides.clear()


# =====================
# Tests: List User Permissions
# =====================


@pytest.mark.anyio
async def test_list_user_permissions_success(
    client: AsyncClient, admin_user: User, regular_user: User, sample_permissions: list[Permission]
):
    """Test successfully listing all permissions for a user."""
    user_repo = InMemoryUserRepo([admin_user, regular_user])

    # Create existing grants
    existing_grants = [
        UserPermission(
            user_id=regular_user.id,
            permission_code="draws:notify",
            granted_at=datetime.now(timezone.utc),
            granted_by=admin_user.id,
        ),
        UserPermission(
            user_id=regular_user.id,
            permission_code="groups:create",
            granted_at=datetime.now(timezone.utc),
            granted_by=admin_user.id,
        ),
    ]

    # Create a mock repo that returns permission objects
    class MockUserPermissionRepo(InMemoryUserPermissionRepo):
        async def list_permissions_for_user(self, user_id: str) -> list[Permission]:
            return [p for p in sample_permissions if p.code in ["draws:notify", "groups:create"]]

    user_permission_repo = MockUserPermissionRepo(existing_grants)

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    response = await client.get(f"/api/v1/admin/users/{regular_user.id}/permissions")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert any(p["code"] == "draws:notify" for p in data)
    assert any(p["code"] == "groups:create" for p in data)

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_list_user_permissions_empty(
    client: AsyncClient, admin_user: User, regular_user: User
):
    """Test listing permissions for user with no permissions."""
    user_repo = InMemoryUserRepo([admin_user, regular_user])

    # Create a mock repo that returns empty permission list
    class MockUserPermissionRepo(InMemoryUserPermissionRepo):
        async def list_permissions_for_user(self, user_id: str) -> list[Permission]:
            return []

    user_permission_repo = MockUserPermissionRepo()

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    response = await client.get(f"/api/v1/admin/users/{regular_user.id}/permissions")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_list_user_permissions_nonexistent_user(client: AsyncClient, admin_user: User):
    """Test listing permissions for non-existent user returns 404."""
    user_repo = InMemoryUserRepo([admin_user])
    user_permission_repo = InMemoryUserPermissionRepo()

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    response = await client.get("/api/v1/admin/users/nonexistent-id/permissions")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "not_found"

    app.dependency_overrides.clear()


# =====================
# Tests: List Available Permissions
# =====================


@pytest.mark.anyio
async def test_list_available_permissions_success(
    client: AsyncClient, admin_user: User, sample_permissions: list[Permission]
):
    """Test successfully listing all available permissions."""
    user_repo = InMemoryUserRepo([admin_user])
    permission_repo = InMemoryPermissionRepo(sample_permissions)

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_permission_repository] = lambda: permission_repo

    response = await client.get("/api/v1/admin/permissions")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert any(p["code"] == "draws:notify" for p in data)
    assert any(p["code"] == "groups:create" for p in data)
    assert any(p["code"] == "groups:delete" for p in data)

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_list_available_permissions_with_category_filter(
    client: AsyncClient, admin_user: User, sample_permissions: list[Permission]
):
    """Test listing available permissions filtered by category."""
    user_repo = InMemoryUserRepo([admin_user])
    permission_repo = InMemoryPermissionRepo(sample_permissions)

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_permission_repository] = lambda: permission_repo

    response = await client.get("/api/v1/admin/permissions?category=draws")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["code"] == "draws:notify"
    assert data[0]["category"] == "draws"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_list_available_permissions_category_filter_groups(
    client: AsyncClient, admin_user: User, sample_permissions: list[Permission]
):
    """Test listing available permissions filtered by groups category."""
    user_repo = InMemoryUserRepo([admin_user])
    permission_repo = InMemoryPermissionRepo(sample_permissions)

    app.dependency_overrides[admin_router.get_current_admin_user] = lambda: admin_user.id
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_permission_repository] = lambda: permission_repo

    response = await client.get("/api/v1/admin/permissions?category=groups")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert all(p["category"] == "groups" for p in data)

    app.dependency_overrides.clear()


# =====================
# Tests: Non-Admin Access
# =====================


@pytest.mark.anyio
async def test_grant_permission_forbidden_non_admin(
    client: AsyncClient, regular_user: User, sample_permissions: list[Permission]
):
    """Test non-admin cannot grant permissions."""
    from fastapi import HTTPException

    user_repo = InMemoryUserRepo([regular_user])
    permission_repo = InMemoryPermissionRepo(sample_permissions)
    user_permission_repo = InMemoryUserPermissionRepo()
    group_repo = InMemoryGroupRepo()
    member_repo = InMemoryMemberRepo()
    draw_repo = InMemoryDrawRepo()
    exclusion_repo = InMemoryExclusionRepo()

    permission_validator = PermissionValidator(
        permission_repository=permission_repo,
        group_repository=group_repo,
        member_repository=member_repo,
        draw_repository=draw_repo,
        exclusion_repository=exclusion_repo,
    )

    # Override get_current_admin_user to raise 403 Forbidden (simulating non-admin user)
    def raise_forbidden():
        raise HTTPException(
            status_code=403, detail={"code": "forbidden", "message": "Admin access required"}
        )

    app.dependency_overrides[admin_router.get_current_admin_user] = raise_forbidden
    app.dependency_overrides[admin_router.get_user_repository] = lambda: user_repo
    app.dependency_overrides[admin_router.get_permission_validator] = lambda: permission_validator
    app.dependency_overrides[admin_router.get_user_permission_repository] = (
        lambda: user_permission_repo
    )

    payload = {"permission_code": "draws:notify"}
    response = await client.post(
        f"/api/v1/admin/users/{regular_user.id}/permissions",
        json=payload,
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "forbidden"

    app.dependency_overrides.clear()
