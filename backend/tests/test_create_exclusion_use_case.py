import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from gift_genie.application.dto.create_exclusion_command import CreateExclusionCommand
from gift_genie.application.errors import (
    DuplicateExclusionError,
    ForbiddenError,
    GroupNotFoundError,
    MemberNotFoundError,
    SelfExclusionNotAllowedError,
)
from gift_genie.application.use_cases.create_exclusion import CreateExclusionUseCase
from gift_genie.domain.entities.enums import ExclusionType
from gift_genie.domain.entities.exclusion import Exclusion
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.member import Member


@pytest.mark.anyio
async def test_create_exclusion_success():
    # Mock repositories
    group_repo = AsyncMock()
    member_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    # Setup test data
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
        id=giver_id,
        group_id=group_id,
        name="Giver",
        email="giver@example.com",
        is_active=True,
        created_at=None,
    )
    receiver = Member(
        id=receiver_id,
        group_id=group_id,
        name="Receiver",
        email="receiver@example.com",
        is_active=True,
        created_at=None,
    )
    member_repo.get_by_group_and_id.side_effect = [giver, receiver]

    exclusion_repo.exists_for_pair.return_value = False

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

    # Execute use case
    use_case = CreateExclusionUseCase(
        group_repository=group_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
    )
    command = CreateExclusionCommand(
        group_id=group_id,
        requesting_user_id=user_id,
        giver_member_id=giver_id,
        receiver_member_id=receiver_id,
        is_mutual=False,
    )

    result = await use_case.execute(command)

    assert len(result) == 1
    assert result[0].id == created_exclusion.id


@pytest.mark.anyio
async def test_create_exclusion_mutual():
    group_repo = AsyncMock()
    member_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    # Setup test data
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

    exclusion_repo.exists_for_pair.return_value = False

    exclusions = [
        Exclusion(
            id=str(uuid4()),
            group_id=group_id,
            giver_member_id=giver_id,
            receiver_member_id=receiver_id,
            exclusion_type=ExclusionType.MANUAL,
            is_mutual=True,
            created_at=None,
            created_by_user_id=user_id,
        ),
        Exclusion(
            id=str(uuid4()),
            group_id=group_id,
            giver_member_id=receiver_id,
            receiver_member_id=giver_id,
            exclusion_type=ExclusionType.MANUAL,
            is_mutual=True,
            created_at=None,
            created_by_user_id=user_id,
        ),
    ]
    exclusion_repo.create_many.return_value = exclusions

    use_case = CreateExclusionUseCase(
        group_repository=group_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
    )
    command = CreateExclusionCommand(
        group_id=group_id,
        requesting_user_id=user_id,
        giver_member_id=giver_id,
        receiver_member_id=receiver_id,
        is_mutual=True,
    )

    result = await use_case.execute(command)

    assert len(result) == 2
    assert exclusion_repo.create_many.call_count == 1


@pytest.mark.anyio
async def test_create_exclusion_group_not_found():
    group_repo = AsyncMock()
    member_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    group_repo.get_by_id.return_value = None

    use_case = CreateExclusionUseCase(
        group_repository=group_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
    )
    command = CreateExclusionCommand(
        group_id=str(uuid4()),
        requesting_user_id=str(uuid4()),
        giver_member_id=str(uuid4()),
        receiver_member_id=str(uuid4()),
        is_mutual=False,
    )

    with pytest.raises(GroupNotFoundError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_create_exclusion_forbidden():
    group_repo = AsyncMock()
    member_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    group_id = str(uuid4())
    admin_id = str(uuid4())
    user_id = str(uuid4())
    group = Group(
        id=group_id,
        admin_user_id=admin_id,  # Different admin
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    use_case = CreateExclusionUseCase(
        group_repository=group_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
    )
    command = CreateExclusionCommand(
        group_id=group_id,
        requesting_user_id=user_id,  # Not admin
        giver_member_id=str(uuid4()),
        receiver_member_id=str(uuid4()),
        is_mutual=False,
    )

    with pytest.raises(ForbiddenError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_create_exclusion_member_not_found():
    group_repo = AsyncMock()
    member_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    group_id = str(uuid4())
    user_id = str(uuid4())
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

    member_repo.get_by_group_and_id.return_value = None  # Member not found

    use_case = CreateExclusionUseCase(
        group_repository=group_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
    )
    command = CreateExclusionCommand(
        group_id=group_id,
        requesting_user_id=user_id,
        giver_member_id=str(uuid4()),
        receiver_member_id=str(uuid4()),
        is_mutual=False,
    )

    with pytest.raises(MemberNotFoundError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_create_exclusion_self_exclusion():
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

    use_case = CreateExclusionUseCase(
        group_repository=group_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
    )
    command = CreateExclusionCommand(
        group_id=group_id,
        requesting_user_id=user_id,
        giver_member_id=member_id,
        receiver_member_id=member_id,  # Same as giver
        is_mutual=False,
    )

    with pytest.raises(SelfExclusionNotAllowedError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_create_exclusion_duplicate():
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

    exclusion_repo.exists_for_pair.return_value = True  # Duplicate exists

    use_case = CreateExclusionUseCase(
        group_repository=group_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
    )
    command = CreateExclusionCommand(
        group_id=group_id,
        requesting_user_id=user_id,
        giver_member_id=giver_id,
        receiver_member_id=receiver_id,
        is_mutual=False,
    )

    with pytest.raises(DuplicateExclusionError):
        await use_case.execute(command)
