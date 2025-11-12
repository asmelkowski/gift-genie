import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from gift_genie.application.dto.create_exclusions_bulk_command import (
    CreateExclusionsBulkCommand,
    ExclusionItem,
)
from gift_genie.application.errors import (
    ExclusionConflictsError,
    SelfExclusionNotAllowedError,
)
from gift_genie.application.use_cases.create_exclusions_bulk import CreateExclusionsBulkUseCase
from gift_genie.domain.entities.enums import ExclusionType
from gift_genie.domain.entities.exclusion import Exclusion
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.member import Member


@pytest.mark.anyio
async def test_create_exclusions_bulk_success():
    group_repo = AsyncMock()
    member_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    group_id = str(uuid4())
    user_id = str(uuid4())
    giver_id = str(uuid4())
    receiver_id = str(uuid4())

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    giver = Member(
        id=giver_id, group_id=group_id, name="Giver", email=None, is_active=True, created_at=None
    )
    receiver = Member(
        id=receiver_id,
        group_id=group_id,
        name="Receiver",
        email=None,
        is_active=True,
        created_at=None,
    )
    member_repo.get_by_group_and_id.side_effect = [giver, receiver]

    exclusion_repo.check_conflicts_bulk.return_value = []

    created_exclusion = Exclusion(
        id=str(uuid4()),
        group_id=group_id,
        giver_member_id=giver_id,
        receiver_member_id=receiver_id,
        exclusion_type=ExclusionType.MANUAL,
        is_mutual=False,
        created_at=None,
        created_by_user_id=user_id,
    )
    exclusion_repo.create_many.return_value = [created_exclusion]

    use_case = CreateExclusionsBulkUseCase(
        group_repository=group_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
    )
    command = CreateExclusionsBulkCommand(
        group_id=group_id,
        requesting_user_id=user_id,
        items=[
            ExclusionItem(giver_member_id=giver_id, receiver_member_id=receiver_id, is_mutual=False)
        ],
    )

    result = await use_case.execute(command)

    assert len(result) == 1
    assert result[0].id == created_exclusion.id


@pytest.mark.anyio
async def test_create_exclusions_bulk_conflicts():
    group_repo = AsyncMock()
    member_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    group_id = str(uuid4())
    user_id = str(uuid4())
    giver_id = str(uuid4())
    receiver_id = str(uuid4())

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    giver = Member(
        id=giver_id, group_id=group_id, name="Giver", email=None, is_active=True, created_at=None
    )
    receiver = Member(
        id=receiver_id,
        group_id=group_id,
        name="Receiver",
        email=None,
        is_active=True,
        created_at=None,
    )
    member_repo.get_by_group_and_id.side_effect = [giver, receiver]

    conflicts = [
        {"giver_member_id": giver_id, "receiver_member_id": receiver_id, "reason": "already_exists"}
    ]
    exclusion_repo.check_conflicts_bulk.return_value = conflicts

    use_case = CreateExclusionsBulkUseCase(
        group_repository=group_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
    )
    command = CreateExclusionsBulkCommand(
        group_id=group_id,
        requesting_user_id=user_id,
        items=[
            ExclusionItem(giver_member_id=giver_id, receiver_member_id=receiver_id, is_mutual=False)
        ],
    )

    with pytest.raises(ExclusionConflictsError) as exc_info:
        await use_case.execute(command)

    assert exc_info.value.conflicts == conflicts


@pytest.mark.anyio
async def test_create_exclusions_bulk_self_exclusion():
    group_repo = AsyncMock()
    member_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    group_id = str(uuid4())
    user_id = str(uuid4())
    member_id = str(uuid4())

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    member = Member(
        id=member_id, group_id=group_id, name="Member", email=None, is_active=True, created_at=None
    )
    member_repo.get_by_group_and_id.return_value = member

    use_case = CreateExclusionsBulkUseCase(
        group_repository=group_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
    )
    command = CreateExclusionsBulkCommand(
        group_id=group_id,
        requesting_user_id=user_id,
        items=[
            ExclusionItem(giver_member_id=member_id, receiver_member_id=member_id, is_mutual=False)
        ],
    )

    with pytest.raises(SelfExclusionNotAllowedError):
        await use_case.execute(command)
