import pytest
from datetime import UTC, datetime
from uuid import uuid4
from unittest.mock import AsyncMock

from gift_genie.application.dto.update_group_command import UpdateGroupCommand
from gift_genie.application.errors import ForbiddenError, GroupNotFoundError, InvalidGroupNameError
from gift_genie.application.use_cases.update_group import UpdateGroupUseCase
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
async def test_execute_partial_update_name_only():
    # Arrange
    group = _make_group("admin-123", "Original Name")
    updated_group = _make_group("admin-123", "Updated Name")
    updated_group.id = group.id
    updated_group.updated_at = datetime.now(tz=UTC)

    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = group
    mock_repo.update.return_value = updated_group

    use_case = UpdateGroupUseCase(mock_repo)
    command = UpdateGroupCommand(
        group_id=group.id,
        requesting_user_id="admin-123",
        name="Updated Name",
        historical_exclusions_enabled=None,
        historical_exclusions_lookback=None,
    )

    # Act
    result = await use_case.execute(command)

    # Assert
    assert result.name == "Updated Name"
    assert result.historical_exclusions_enabled == group.historical_exclusions_enabled  # Unchanged
    mock_repo.get_by_id.assert_called_once_with(group.id)
    mock_repo.update.assert_called_once()
    updated_group_arg = mock_repo.update.call_args[0][0]
    assert updated_group_arg.name == "Updated Name"
    # Check that updated_at was set (should be different from original)
    assert updated_group_arg.updated_at >= group.updated_at


@pytest.mark.anyio
async def test_execute_partial_update_settings_only():
    # Arrange
    group = _make_group("admin-123")
    updated_group = _make_group("admin-123")
    updated_group.id = group.id
    updated_group.historical_exclusions_enabled = False
    updated_group.historical_exclusions_lookback = 3
    updated_group.updated_at = datetime.now(tz=UTC)

    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = group
    mock_repo.update.return_value = updated_group

    use_case = UpdateGroupUseCase(mock_repo)
    command = UpdateGroupCommand(
        group_id=group.id,
        requesting_user_id="admin-123",
        name=None,
        historical_exclusions_enabled=False,
        historical_exclusions_lookback=3,
    )

    # Act
    result = await use_case.execute(command)

    # Assert
    assert result.historical_exclusions_enabled is False
    assert result.historical_exclusions_lookback == 3
    assert result.name == group.name  # Unchanged


@pytest.mark.anyio
async def test_execute_forbidden_when_not_owner():
    # Arrange
    group = _make_group("admin-456")  # Different owner
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = group

    use_case = UpdateGroupUseCase(mock_repo)
    command = UpdateGroupCommand(
        group_id=group.id,
        requesting_user_id="user-123",  # Wrong user
        name="New Name",
        historical_exclusions_enabled=None,
        historical_exclusions_lookback=None,
    )

    # Act & Assert
    with pytest.raises(ForbiddenError):
        await use_case.execute(command)

    mock_repo.update.assert_not_called()


@pytest.mark.anyio
async def test_execute_invalid_name_raises_error():
    # Arrange
    group = _make_group("admin-123")
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = group

    use_case = UpdateGroupUseCase(mock_repo)
    command = UpdateGroupCommand(
        group_id=group.id,
        requesting_user_id="admin-123",
        name="",  # Invalid empty name
        historical_exclusions_enabled=None,
        historical_exclusions_lookback=None,
    )

    # Act & Assert
    with pytest.raises(InvalidGroupNameError):
        await use_case.execute(command)

    mock_repo.update.assert_not_called()


@pytest.mark.anyio
async def test_execute_invalid_lookback_raises_error():
    # Arrange
    group = _make_group("admin-123")
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = group

    use_case = UpdateGroupUseCase(mock_repo)
    command = UpdateGroupCommand(
        group_id=group.id,
        requesting_user_id="admin-123",
        name=None,
        historical_exclusions_enabled=None,
        historical_exclusions_lookback=0,  # Invalid
    )

    # Act & Assert
    with pytest.raises(ValueError, match="historical_exclusions_lookback must be >= 1"):
        await use_case.execute(command)

    mock_repo.update.assert_not_called()


@pytest.mark.anyio
async def test_execute_group_not_found():
    # Arrange
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = None

    use_case = UpdateGroupUseCase(mock_repo)
    command = UpdateGroupCommand(
        group_id="nonexistent",
        requesting_user_id="user-123",
        name="New Name",
        historical_exclusions_enabled=None,
        historical_exclusions_lookback=None,
    )

    # Act & Assert
    with pytest.raises(GroupNotFoundError):
        await use_case.execute(command)

    mock_repo.update.assert_not_called()
