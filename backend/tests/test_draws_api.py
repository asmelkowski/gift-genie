import pytest
from typing import Optional
from uuid import uuid4
from datetime import datetime, UTC

from httpx import AsyncClient

from gift_genie.main import app
from gift_genie.presentation.api.v1 import draws as draws_router
from gift_genie.presentation.api.v1 import groups as groups_router
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.entities.enums import DrawStatus, ExclusionType
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.member import Member
from gift_genie.domain.entities.assignment import Assignment
from gift_genie.domain.interfaces.repositories import (
    GroupRepository,
    DrawRepository,
    MemberRepository,
    ExclusionRepository,
    AssignmentRepository,
)
from gift_genie.domain.interfaces.notification_service import NotificationService
from gift_genie.domain.interfaces.draw_algorithm import DrawAlgorithm


# In-memory implementations
class InMemoryGroupRepo(GroupRepository):
    def __init__(self):
        self._groups: dict[str, Group] = {}

    async def create(self, group: Group) -> Group:
        self._groups[group.id] = group
        return group

    async def list_by_admin_user(
        self, user_id: str, search: str | None, page: int, page_size: int, sort: str
    ):
        groups = [g for g in self._groups.values() if g.admin_user_id == user_id]
        total = len(groups)
        return groups, total

    async def get_by_id(self, group_id: str) -> Optional[Group]:
        return self._groups.get(group_id)

    async def get_member_stats(self, group_id: str) -> tuple[int, int]:
        return (0, 0)

    async def update(self, group: Group) -> Group:
        self._groups[group.id] = group
        return group

    async def delete(self, group_id: str) -> None:
        self._groups.pop(group_id, None)


class InMemoryDrawRepo(DrawRepository):
    def __init__(self):
        self._draws: dict[str, Draw] = {}

    async def create(self, draw: Draw) -> Draw:
        self._draws[draw.id] = draw
        return draw

    async def list_by_group(
        self, group_id: str, status: DrawStatus | None, page: int, page_size: int, sort: str
    ):
        draws = [d for d in self._draws.values() if d.group_id == group_id]
        if status:
            draws = [d for d in draws if d.status == status]
        total = len(draws)
        # naive sort by created_at
        reverse = sort.startswith("-")
        draws.sort(key=lambda d: d.created_at, reverse=reverse)
        start = (page - 1) * page_size
        end = start + page_size
        return draws[start:end], total

    async def get_by_id(self, draw_id: str) -> Optional[Draw]:
        return self._draws.get(draw_id)

    async def get_by_group_and_id(self, group_id: str, draw_id: str) -> Optional[Draw]:
        draw = self._draws.get(draw_id)
        if draw and draw.group_id == group_id:
            return draw
        return None

    async def update(self, draw: Draw) -> Draw:
        self._draws[draw.id] = draw
        return draw

    async def delete(self, draw_id: str) -> None:
        self._draws.pop(draw_id, None)


class InMemoryMemberRepo(MemberRepository):
    def __init__(self):
        self._members: dict[str, Member] = {}

    async def create(self, member: Member) -> Member:
        self._members[member.id] = member
        return member

    async def list_by_group(
        self,
        group_id: str,
        is_active: bool | None,
        search: str | None,
        page: int,
        page_size: int,
        sort: str,
    ):
        members = [m for m in self._members.values() if m.group_id == group_id]
        if is_active is not None:
            members = [m for m in members if m.is_active == is_active]
        total = len(members)
        return members, total

    async def get_by_id(self, member_id: str) -> Optional[Member]:
        return self._members.get(member_id)

    async def get_by_group_and_id(self, group_id: str, member_id: str) -> Optional[Member]:
        m = self._members.get(member_id)
        if m and m.group_id == group_id:
            return m
        return None

    async def name_exists_in_group(
        self, group_id: str, name: str, exclude_member_id: str | None = None
    ) -> bool:
        return False

    async def email_exists_in_group(
        self, group_id: str, email: str, exclude_member_id: str | None = None
    ) -> bool:
        return False

    async def has_pending_draw(self, member_id: str) -> bool:
        return False

    async def update(self, member: Member) -> Member:
        self._members[member.id] = member
        return member

    async def delete(self, member_id: str) -> None:
        self._members.pop(member_id, None)


class InMemoryExclusionRepo(ExclusionRepository):
    async def list_by_group(
        self,
        group_id: str,
        exclusion_type: ExclusionType | None,
        giver_member_id: str | None,
        receiver_member_id: str | None,
        page: int,
        page_size: int,
        sort: str,
    ):
        return [], 0

    async def create(self, exclusion):
        return exclusion

    async def create_many(self, exclusions):
        return exclusions

    async def get_by_id(self, exclusion_id: str):
        return None

    async def get_by_group_and_id(self, group_id: str, exclusion_id: str):
        return None

    async def exists_for_pair(
        self, group_id: str, giver_member_id: str, receiver_member_id: str
    ) -> bool:
        return False

    async def check_conflicts_bulk(self, group_id: str, pairs: list[tuple[str, str]]):
        return []

    async def delete(self, exclusion_id: str) -> None:
        return None


class InMemoryAssignmentRepo(AssignmentRepository):
    def __init__(self):
        self._assignments_by_draw: dict[str, list[Assignment]] = {}

    async def create_many(self, assignments: list[Assignment]) -> list[Assignment]:
        if not assignments:
            return []
        draw_id = assignments[0].draw_id
        self._assignments_by_draw.setdefault(draw_id, [])
        self._assignments_by_draw[draw_id].extend(assignments)
        return assignments

    async def list_by_draw(self, draw_id: str) -> list[Assignment]:
        return list(self._assignments_by_draw.get(draw_id, []))

    async def count_by_draw(self, draw_id: str) -> int:
        return len(self._assignments_by_draw.get(draw_id, []))

    async def get_historical_exclusions(
        self, group_id: str, lookback_count: int
    ) -> list[tuple[str, str]]:
        return []


class StubNotificationService(NotificationService):
    def __init__(self):
        self.calls: list[tuple[str, str, str, str, str]] = []

    async def send_assignment_notification(
        self, member_email: str, member_name: str, receiver_name: str, group_name: str
    ) -> bool:
        self.calls.append((member_email, member_name, receiver_name, group_name))
        return True


class SimpleDrawAlgorithm(DrawAlgorithm):
    def generate_assignments(
        self, member_ids: list[str], exclusions: set[tuple[str, str]]
    ) -> dict[str, str]:
        if len(member_ids) < 3:
            raise ValueError("Draw requires at least 3 members")
        # Simple rotation by 1, ignoring exclusions for test simplicity
        mapping = {}
        n = len(member_ids)
        for i, giver in enumerate(member_ids):
            receiver = member_ids[(i + 1) % n]
            mapping[giver] = receiver
        return mapping


@pytest.mark.anyio
async def test_list_draws_empty(client: AsyncClient):
    group_repo = InMemoryGroupRepo()
    draw_repo = InMemoryDrawRepo()

    app.dependency_overrides[groups_router.get_group_repository] = lambda: group_repo
    app.dependency_overrides[draws_router.get_draw_repository] = lambda: draw_repo
    app.dependency_overrides[groups_router.get_current_user] = lambda: "user-123"

    # Create a group for the user
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
    await group_repo.create(group)

    resp = await client.get(f"/api/v1/groups/{group.id}/draws")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"] == []
    assert body["meta"]["total"] == 0

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_create_and_get_draw(client: AsyncClient):
    group_repo = InMemoryGroupRepo()
    draw_repo = InMemoryDrawRepo()

    app.dependency_overrides[groups_router.get_group_repository] = lambda: group_repo
    app.dependency_overrides[draws_router.get_draw_repository] = lambda: draw_repo
    app.dependency_overrides[groups_router.get_current_user] = lambda: "user-123"

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
    await group_repo.create(group)

    # Create draw
    resp = await client.post(f"/api/v1/groups/{group.id}/draws", json={"seed": "s"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["group_id"] == group.id
    assert body["status"] == "pending"
    draw_id = body["id"]

    # Get draw
    resp2 = await client.get(f"/api/v1/draws/{draw_id}")
    assert resp2.status_code == 200
    body2 = resp2.json()
    assert body2["id"] == draw_id
    assert body2["status"] == "pending"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_delete_draw(client: AsyncClient):
    group_repo = InMemoryGroupRepo()
    draw_repo = InMemoryDrawRepo()

    app.dependency_overrides[groups_router.get_group_repository] = lambda: group_repo
    app.dependency_overrides[draws_router.get_draw_repository] = lambda: draw_repo
    app.dependency_overrides[groups_router.get_current_user] = lambda: "user-123"

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
    await group_repo.create(group)

    # Create draw
    create_resp = await client.post(f"/api/v1/groups/{group.id}/draws", json={})
    draw_id = create_resp.json()["id"]

    # Delete draw
    resp = await client.delete(f"/api/v1/draws/{draw_id}")
    assert resp.status_code == 204

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_delete_finalized_draw(client: AsyncClient):
    group_repo = InMemoryGroupRepo()
    draw_repo = InMemoryDrawRepo()
    member_repo = InMemoryMemberRepo()
    exclusion_repo = InMemoryExclusionRepo()
    assignment_repo = InMemoryAssignmentRepo()
    notif = StubNotificationService()
    algorithm = SimpleDrawAlgorithm()

    app.dependency_overrides[groups_router.get_group_repository] = lambda: group_repo
    app.dependency_overrides[draws_router.get_draw_repository] = lambda: draw_repo
    app.dependency_overrides[draws_router.get_member_repository] = lambda: member_repo
    app.dependency_overrides[draws_router.get_exclusion_repository] = lambda: exclusion_repo
    app.dependency_overrides[draws_router.get_assignment_repository] = lambda: assignment_repo
    app.dependency_overrides[draws_router.get_notification_service] = lambda: notif
    app.dependency_overrides[draws_router.get_draw_algorithm] = lambda: algorithm
    app.dependency_overrides[groups_router.get_current_user] = lambda: "user-123"

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
    await group_repo.create(group)

    # Create members
    member1 = Member(
        id=str(uuid4()),
        group_id=group.id,
        name="Alice",
        email="alice@example.com",
        is_active=True,
        created_at=now,
    )
    member2 = Member(
        id=str(uuid4()),
        group_id=group.id,
        name="Bob",
        email="bob@example.com",
        is_active=True,
        created_at=now,
    )
    member3 = Member(
        id=str(uuid4()),
        group_id=group.id,
        name="Charlie",
        email="charlie@example.com",
        is_active=True,
        created_at=now,
    )
    await member_repo.create(member1)
    await member_repo.create(member2)
    await member_repo.create(member3)

    # Create draw
    create_resp = await client.post(f"/api/v1/groups/{group.id}/draws", json={})
    draw_id = create_resp.json()["id"]

    # Execute draw
    exec_resp = await client.post(f"/api/v1/draws/{draw_id}/execute", json={"seed": 42})
    assert exec_resp.status_code == 200

    # Finalize draw
    fin_resp = await client.post(f"/api/v1/draws/{draw_id}/finalize", json={})
    assert fin_resp.status_code == 200

    # Try to delete finalized draw - should fail
    resp = await client.delete(f"/api/v1/draws/{draw_id}")
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "cannotdeletefinalizeddrawerror"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_execute_finalized_draw(client: AsyncClient):
    group_repo = InMemoryGroupRepo()
    draw_repo = InMemoryDrawRepo()
    member_repo = InMemoryMemberRepo()
    exclusion_repo = InMemoryExclusionRepo()
    assignment_repo = InMemoryAssignmentRepo()
    notif = StubNotificationService()
    algorithm = SimpleDrawAlgorithm()

    app.dependency_overrides[groups_router.get_group_repository] = lambda: group_repo
    app.dependency_overrides[draws_router.get_draw_repository] = lambda: draw_repo
    app.dependency_overrides[draws_router.get_member_repository] = lambda: member_repo
    app.dependency_overrides[draws_router.get_exclusion_repository] = lambda: exclusion_repo
    app.dependency_overrides[draws_router.get_assignment_repository] = lambda: assignment_repo
    app.dependency_overrides[draws_router.get_notification_service] = lambda: notif
    app.dependency_overrides[draws_router.get_draw_algorithm] = lambda: algorithm
    app.dependency_overrides[groups_router.get_current_user] = lambda: "user-123"

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
    await group_repo.create(group)

    # Create members
    member1 = Member(
        id=str(uuid4()),
        group_id=group.id,
        name="Alice",
        email="alice@example.com",
        is_active=True,
        created_at=now,
    )
    member2 = Member(
        id=str(uuid4()),
        group_id=group.id,
        name="Bob",
        email="bob@example.com",
        is_active=True,
        created_at=now,
    )
    member3 = Member(
        id=str(uuid4()),
        group_id=group.id,
        name="Charlie",
        email="charlie@example.com",
        is_active=True,
        created_at=now,
    )
    await member_repo.create(member1)
    await member_repo.create(member2)
    await member_repo.create(member3)

    # Create draw
    create_resp = await client.post(f"/api/v1/groups/{group.id}/draws", json={})
    draw_id = create_resp.json()["id"]

    # Execute draw
    exec_resp = await client.post(f"/api/v1/draws/{draw_id}/execute", json={"seed": 42})
    assert exec_resp.status_code == 200

    # Finalize draw
    fin_resp = await client.post(f"/api/v1/draws/{draw_id}/finalize", json={})
    assert fin_resp.status_code == 200

    # Try to execute finalized draw - should fail
    resp = await client.post(f"/api/v1/draws/{draw_id}/execute", json={"seed": 42})
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "drawalreadyfinalizederror"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_execute_finalize_notify_draw_flow(client: AsyncClient):
    group_repo = InMemoryGroupRepo()
    draw_repo = InMemoryDrawRepo()
    member_repo = InMemoryMemberRepo()
    exclusion_repo = InMemoryExclusionRepo()
    assignment_repo = InMemoryAssignmentRepo()
    notif = StubNotificationService()
    algorithm = SimpleDrawAlgorithm()

    app.dependency_overrides[groups_router.get_group_repository] = lambda: group_repo
    app.dependency_overrides[draws_router.get_draw_repository] = lambda: draw_repo
    app.dependency_overrides[draws_router.get_member_repository] = lambda: member_repo
    app.dependency_overrides[draws_router.get_exclusion_repository] = lambda: exclusion_repo
    app.dependency_overrides[draws_router.get_assignment_repository] = lambda: assignment_repo
    app.dependency_overrides[draws_router.get_notification_service] = lambda: notif
    app.dependency_overrides[draws_router.get_draw_algorithm] = lambda: algorithm
    app.dependency_overrides[groups_router.get_current_user] = lambda: "user-123"

    # Create group and three members
    now = datetime.now(UTC)
    group = Group(
        id=str(uuid4()),
        admin_user_id="user-123",
        name="Test Group",
        historical_exclusions_enabled=False,
        historical_exclusions_lookback=0,
        created_at=now,
        updated_at=now,
    )
    await group_repo.create(group)

    m_ids = [str(uuid4()) for _ in range(3)]
    members = [
        Member(
            id=m_ids[0],
            group_id=group.id,
            name="A",
            email="a@example.com",
            is_active=True,
            created_at=now,
        ),
        Member(
            id=m_ids[1],
            group_id=group.id,
            name="B",
            email="b@example.com",
            is_active=True,
            created_at=now,
        ),
        Member(
            id=m_ids[2],
            group_id=group.id,
            name="C",
            email="c@example.com",
            is_active=True,
            created_at=now,
        ),
    ]
    for m in members:
        await member_repo.create(m)

    # Create draw
    create_resp = await client.post(f"/api/v1/groups/{group.id}/draws", json={})
    assert create_resp.status_code == 201
    draw_id = create_resp.json()["id"]

    # Execute draw
    exec_resp = await client.post(f"/api/v1/draws/{draw_id}/execute", json={})
    assert exec_resp.status_code == 200
    exec_body = exec_resp.json()
    assert exec_body["draw"]["status"] == "pending"
    assert len(exec_body["assignments"]) == 3

    # Finalize draw
    fin_resp = await client.post(f"/api/v1/draws/{draw_id}/finalize", json={})
    assert fin_resp.status_code == 200
    assert fin_resp.json()["status"] == "finalized"

    # Notify draw
    notify_resp = await client.post(f"/api/v1/draws/{draw_id}/notify", json={"resend": False})
    assert notify_resp.status_code == 202
    nb = notify_resp.json()
    assert nb["sent"] + nb["skipped"] == 3
    assert nb["sent"] >= 1

    app.dependency_overrides.clear()
