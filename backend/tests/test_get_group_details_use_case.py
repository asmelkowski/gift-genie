import pytest
from datetime import UTC, datetime
from uuid import uuid4
from unittest.mock import AsyncMock

from gift_genie.application.dto.get_group_details_query import GetGroupDetailsQuery
from gift_genie.application.errors import ForbiddenError, GroupNotFoundError
from gift_genie.application.use_cases.get_group_details import GetGroupDetailsUseCase
from gift_genie.domain.entities.group import Group


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
async def test_execute_successful_retrieval():
    # Arrange
    group = _make_group("admin-123")
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = group
    mock_repo.get_member_stats.return_value = (10, 8)

    use_case = GetGroupDetailsUseCase(mock_repo)
    query = GetGroupDetailsQuery(group_id=group.id, requesting_user_id="admin-123")

    # Act
    result_group, stats = await use_case.execute(query)

    # Assert
    assert result_group == group
    assert stats == (10, 8)
    mock_repo.get_by_id.assert_called_once_with(group.id)
    mock_repo.get_member_stats.assert_called_once_with(group.id)


@pytest.mark.anyio
async def test_execute_forbidden_when_not_owner():
    # Arrange
    group = _make_group("admin-456")  # Different owner
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = group

    use_case = GetGroupDetailsUseCase(mock_repo)
    query = GetGroupDetailsQuery(group_id=group.id, requesting_user_id="user-123")  # Wrong user

    # Act & Assert
    with pytest.raises(ForbiddenError):
        await use_case.execute(query)

    mock_repo.get_by_id.assert_called_once_with(group.id)
    mock_repo.get_member_stats.assert_not_called()


@pytest.mark.anyio
async def test_execute_group_not_found():
    # Arrange
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = None

    use_case = GetGroupDetailsUseCase(mock_repo)
    query = GetGroupDetailsQuery(group_id="nonexistent", requesting_user_id="user-123")

    # Act & Assert
    with pytest.raises(GroupNotFoundError):
        await use_case.execute(query)

    mock_repo.get_by_id.assert_called_once_with("nonexistent")
    mock_repo.get_member_stats.assert_not_called()
