import pytest
from unittest.mock import AsyncMock, MagicMock
from gift_genie.application.use_cases.create_group import CreateGroupUseCase
from gift_genie.application.dto.create_group_command import CreateGroupCommand
from gift_genie.domain.entities.group import Group
from gift_genie.infrastructure.permissions.permission_registry import PermissionRegistry


@pytest.mark.anyio
async def test_create_group_auto_grants_permissions():
    # Arrange
    group_repo = AsyncMock()
    perm_repo = AsyncMock()

    # Mock group creation
    group_id = "test-group-id"
    user_id = "test-user-id"
    group_name = "Test Group"

    created_group = MagicMock(spec=Group)
    created_group.id = group_id
    created_group.admin_user_id = user_id
    created_group.name = group_name

    group_repo.create.return_value = created_group

    use_case = CreateGroupUseCase(group_repository=group_repo, user_permission_repository=perm_repo)

    command = CreateGroupCommand(
        admin_user_id=user_id,
        name=group_name,
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=2,
    )

    # Act
    result = await use_case.execute(command)

    # Assert
    assert result == created_group
    group_repo.create.assert_called_once()

    # Verify auto-grant permissions
    perm_repo.grant_permissions_bulk.assert_called_once()
    args, kwargs = perm_repo.grant_permissions_bulk.call_args

    assert kwargs["user_id"] == user_id
    permission_codes = kwargs["permission_codes"]

    # Verify number of permissions (14)
    assert len(permission_codes) == 14

    # Verify format "permission:group_id"
    for code in permission_codes:
        assert code.endswith(f":{group_id}")
        assert ":" in code

    # Verify draws:notify is NOT granted
    assert not any(code.startswith(PermissionRegistry.DRAWS_NOTIFY) for code in permission_codes)

    # Verify some specific expected permissions
    expected_prefixes = [
        PermissionRegistry.GROUPS_READ,
        PermissionRegistry.GROUPS_UPDATE,
        PermissionRegistry.GROUPS_DELETE,
        PermissionRegistry.MEMBERS_READ,
        PermissionRegistry.DRAWS_FINALIZE,
        PermissionRegistry.EXCLUSIONS_CREATE,
    ]
    for prefix in expected_prefixes:
        assert any(code.startswith(prefix) for code in permission_codes)


@pytest.mark.anyio
async def test_create_group_stores_correct_data():
    # Arrange
    group_repo = AsyncMock()
    perm_repo = AsyncMock()

    # We want to capture the group passed to create
    captured_group = None

    async def mock_create(group):
        nonlocal captured_group
        captured_group = group
        return group

    group_repo.create.side_effect = mock_create

    use_case = CreateGroupUseCase(group_repository=group_repo, user_permission_repository=perm_repo)

    user_id = "test-user-id"
    command = CreateGroupCommand(
        admin_user_id=user_id,
        name="Stored Group",
        historical_exclusions_enabled=False,
        historical_exclusions_lookback=0,
    )

    # Act
    await use_case.execute(command)

    # Assert
    assert captured_group is not None
    assert captured_group.admin_user_id == user_id
    assert captured_group.name == "Stored Group"
    assert captured_group.historical_exclusions_enabled is False
    assert captured_group.historical_exclusions_lookback == 0
    assert captured_group.id is not None
    assert captured_group.created_at is not None
    assert captured_group.updated_at is not None
