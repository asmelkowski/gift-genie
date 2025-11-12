import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from gift_genie.application.dto.delete_exclusion_command import DeleteExclusionCommand
from gift_genie.application.errors import ExclusionNotFoundError, ForbiddenError
from gift_genie.application.use_cases.delete_exclusion import DeleteExclusionUseCase
from gift_genie.domain.entities.enums import ExclusionType
from gift_genie.domain.entities.exclusion import Exclusion
from gift_genie.domain.entities.group import Group


@pytest.mark.anyio
async def test_delete_exclusion_success():
    group_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    group_id = str(uuid4())
    user_id = str(uuid4())
    exclusion_id = str(uuid4())

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

    exclusion = Exclusion(
        id=exclusion_id,
        group_id=group_id,
        giver_member_id=str(uuid4()),
        receiver_member_id=str(uuid4()),
        exclusion_type=ExclusionType.MANUAL,
        is_mutual=False,
        created_at=None,
        created_by_user_id=user_id,
    )
    exclusion_repo.get_by_group_and_id.return_value = exclusion

    use_case = DeleteExclusionUseCase(
        group_repository=group_repo,
        exclusion_repository=exclusion_repo,
    )
    command = DeleteExclusionCommand(
        group_id=group_id,
        exclusion_id=exclusion_id,
        requesting_user_id=user_id,
    )

    await use_case.execute(command)

    exclusion_repo.delete.assert_called_once_with(exclusion_id)


@pytest.mark.anyio
async def test_delete_exclusion_not_found():
    group_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    group_id = str(uuid4())
    user_id = str(uuid4())
    exclusion_id = str(uuid4())

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

    exclusion_repo.get_by_group_and_id.return_value = None  # Not found

    use_case = DeleteExclusionUseCase(
        group_repository=group_repo,
        exclusion_repository=exclusion_repo,
    )
    command = DeleteExclusionCommand(
        group_id=group_id,
        exclusion_id=exclusion_id,
        requesting_user_id=user_id,
    )

    with pytest.raises(ExclusionNotFoundError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_delete_exclusion_forbidden():
    group_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    group_id = str(uuid4())
    admin_id = str(uuid4())
    user_id = str(uuid4())
    exclusion_id = str(uuid4())

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

    exclusion = Exclusion(
        id=exclusion_id,
        group_id=group_id,
        giver_member_id=str(uuid4()),
        receiver_member_id=str(uuid4()),
        exclusion_type=ExclusionType.MANUAL,
        is_mutual=False,
        created_at=None,
        created_by_user_id=admin_id,
    )
    exclusion_repo.get_by_group_and_id.return_value = exclusion

    use_case = DeleteExclusionUseCase(
        group_repository=group_repo,
        exclusion_repository=exclusion_repo,
    )
    command = DeleteExclusionCommand(
        group_id=group_id,
        exclusion_id=exclusion_id,
        requesting_user_id=user_id,  # Not admin
    )

    with pytest.raises(ForbiddenError):
        await use_case.execute(command)
