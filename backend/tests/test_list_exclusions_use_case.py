import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from gift_genie.application.dto.list_exclusions_query import ListExclusionsQuery
from gift_genie.application.errors import GroupNotFoundError
from gift_genie.application.use_cases.list_exclusions import ListExclusionsUseCase
from gift_genie.domain.entities.enums import ExclusionType
from gift_genie.domain.entities.exclusion import Exclusion
from gift_genie.domain.entities.group import Group


@pytest.mark.anyio
async def test_list_exclusions_success():
    # Mock repositories
    group_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    # Setup test data
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

    exclusions = [
        Exclusion(
            id=str(uuid4()),
            group_id=group_id,
            giver_member_id=str(uuid4()),
            receiver_member_id=str(uuid4()),
            exclusion_type=ExclusionType.MANUAL,
            is_mutual=False,
            created_at=None,
            created_by_user_id=user_id,
        )
    ]
    exclusion_repo.list_by_group.return_value = (exclusions, 1)

    # Execute use case
    use_case = ListExclusionsUseCase(
        group_repository=group_repo,
        exclusion_repository=exclusion_repo,
    )
    query = ListExclusionsQuery(
        group_id=group_id,
        requesting_user_id=user_id,
        exclusion_type=None,
        giver_member_id=None,
        receiver_member_id=None,
        page=1,
        page_size=10,
        sort="created_at",
    )

    result_exclusions, total = await use_case.execute(query)

    assert len(result_exclusions) == 1
    assert total == 1
    assert result_exclusions[0].id == exclusions[0].id


@pytest.mark.anyio
async def test_list_exclusions_group_not_found():
    group_repo = AsyncMock()
    exclusion_repo = AsyncMock()

    group_repo.get_by_id.return_value = None

    use_case = ListExclusionsUseCase(
        group_repository=group_repo,
        exclusion_repository=exclusion_repo,
    )
    query = ListExclusionsQuery(
        group_id=str(uuid4()),
        requesting_user_id=str(uuid4()),
        exclusion_type=None,
        giver_member_id=None,
        receiver_member_id=None,
        page=1,
        page_size=10,
        sort="created_at",
    )

    with pytest.raises(GroupNotFoundError):
        await use_case.execute(query)
