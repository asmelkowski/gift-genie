import pytest
from datetime import UTC, datetime
from uuid import uuid4
from unittest.mock import AsyncMock

from gift_genie.application.dto.delete_group_command import DeleteGroupCommand
from gift_genie.application.errors import ForbiddenError, GroupNotFoundError
from gift_genie.application.use_cases.delete_group import DeleteGroupUseCase
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
async def test_execute_successful_deletion():
    # Arrange
    group = _make_group("admin-123")
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = group

    use_case = DeleteGroupUseCase(mock_repo)
    command = DeleteGroupCommand(group_id=group.id, requesting_user_id="admin-123")

    # Act
    await use_case.execute(command)

    # Assert
    mock_repo.get_by_id.assert_called_once_with(group.id)
    mock_repo.delete.assert_called_once_with(group.id)


@pytest.mark.anyio
async def test_execute_group_not_found():
    # Arrange
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = None

    use_case = DeleteGroupUseCase(mock_repo)
    command = DeleteGroupCommand(group_id="nonexistent", requesting_user_id="user-123")

    # Act & Assert
    with pytest.raises(GroupNotFoundError):
        await use_case.execute(command)

    mock_repo.delete.assert_not_called()


@pytest.mark.anyio
async def test_execute_forbidden_access():
    # Arrange
    group = _make_group("admin-456")  # Different admin
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = group

    use_case = DeleteGroupUseCase(mock_repo)
    command = DeleteGroupCommand(group_id=group.id, requesting_user_id="user-123")  # Wrong user

    # Act & Assert
    with pytest.raises(ForbiddenError):
        await use_case.execute(command)

    mock_repo.delete.assert_not_called()