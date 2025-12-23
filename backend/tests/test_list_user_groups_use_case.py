import pytest
from datetime import UTC, datetime
from uuid import uuid4

from gift_genie.application.dto.list_groups_query import ListGroupsQuery
from gift_genie.application.use_cases.list_user_groups import ListUserGroupsUseCase
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.interfaces.repositories import GroupRepository


class InMemoryGroupRepo(GroupRepository):
    """Mock group repository for testing"""

    def __init__(self):
        self._groups: dict[str, Group] = {}
        self._user_permissions: dict[tuple[str, str], bool] = {}
        self._all_groups_call_count = 0

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
        # Simple sort
        groups.sort(key=lambda g: g.created_at, reverse=True)
        total = len(groups)
        start = (page - 1) * page_size
        end = start + page_size
        return groups[start:end], total

    async def list_all(
        self, search: str | None, page: int, page_size: int, sort: str
    ) -> tuple[list[Group], int]:
        self._all_groups_call_count += 1
        groups = list(self._groups.values())
        if search:
            groups = [g for g in groups if search.lower() in g.name.lower()]
        groups.sort(key=lambda g: g.created_at, reverse=True)
        total = len(groups)
        start = (page - 1) * page_size
        end = start + page_size
        return groups[start:end], total

    async def get_by_id(self, group_id: str) -> Group | None:
        return self._groups.get(group_id)

    async def get_member_stats(self, group_id: str) -> tuple[int, int]:
        return (0, 0)

    async def update(self, group: Group) -> Group:
        self._groups[group.id] = group
        return group

    async def delete(self, group_id: str) -> None:
        self._groups.pop(group_id, None)


@pytest.mark.anyio
async def test_regular_user_sees_only_permitted_groups():
    """Test that regular users see only groups they have permission for"""
    repo = InMemoryGroupRepo()
    now = datetime.now(UTC)

    # Create two groups
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

    use_case = ListUserGroupsUseCase(group_repository=repo)
    query = ListGroupsQuery(user_id=user.id, search=None, page=1, page_size=10, sort="-created_at")
    groups, total = await use_case.execute(query, user)

    # Should only see group1
    assert len(groups) == 1
    assert groups[0].id == group1.id
    assert total == 1


@pytest.mark.anyio
async def test_regular_user_sees_no_groups_without_permissions():
    """Test that users without permissions see empty list"""
    repo = InMemoryGroupRepo()
    now = datetime.now(UTC)

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

    use_case = ListUserGroupsUseCase(group_repository=repo)
    query = ListGroupsQuery(user_id=user.id, search=None, page=1, page_size=10, sort="-created_at")
    groups, total = await use_case.execute(query, user)

    assert len(groups) == 0
    assert total == 0


@pytest.mark.anyio
async def test_admin_user_sees_all_groups():
    """Test that admin users see all groups regardless of permissions"""
    repo = InMemoryGroupRepo()
    now = datetime.now(UTC)

    # Create two groups
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

    use_case = ListUserGroupsUseCase(group_repository=repo)
    query = ListGroupsQuery(
        user_id=admin_user.id, search=None, page=1, page_size=10, sort="-created_at"
    )
    groups, total = await use_case.execute(query, admin_user)

    # Admin should see both groups
    assert len(groups) == 2
    assert total == 2
    # Verify list_all was called (not list_by_user_permissions)
    assert repo._all_groups_call_count == 1


@pytest.mark.anyio
async def test_invalid_page_raises_error():
    """Test that page < 1 raises ValueError"""
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

    use_case = ListUserGroupsUseCase(group_repository=repo)
    query = ListGroupsQuery(user_id=user.id, search=None, page=0, page_size=10, sort="-created_at")

    with pytest.raises(ValueError, match="page must be >= 1"):
        await use_case.execute(query, user)


@pytest.mark.anyio
async def test_invalid_page_size_too_large_raises_error():
    """Test that page_size > 100 raises ValueError"""
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

    use_case = ListUserGroupsUseCase(group_repository=repo)
    query = ListGroupsQuery(user_id=user.id, search=None, page=1, page_size=101, sort="-created_at")

    with pytest.raises(ValueError, match="page_size must be 1-100"):
        await use_case.execute(query, user)


@pytest.mark.anyio
async def test_invalid_page_size_zero_raises_error():
    """Test that page_size < 1 raises ValueError"""
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

    use_case = ListUserGroupsUseCase(group_repository=repo)
    query = ListGroupsQuery(user_id=user.id, search=None, page=1, page_size=0, sort="-created_at")

    with pytest.raises(ValueError, match="page_size must be 1-100"):
        await use_case.execute(query, user)
