"""Unit tests for GrantPermissionUseCase."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from gift_genie.application.dto.grant_permission_command import GrantPermissionCommand
from gift_genie.application.errors import ForbiddenError, NotFoundError
from gift_genie.application.use_cases.grant_permission import GrantPermissionUseCase
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.user_permission import UserPermission
from gift_genie.domain.services.permission_validator import PermissionValidationResult


def _make_user(
    user_id: str, role: UserRole = UserRole.USER, email: str = "test@example.com"
) -> User:
    """Helper to create a User entity for testing."""
    now = datetime.now(tz=UTC)
    return User(
        id=user_id,
        email=email,
        password_hash="hashed_password",
        name="Test User",
        role=role,
        created_at=now,
        updated_at=now,
    )


def _make_validation_result(
    is_valid: bool,
    base_permission_code: str | None = None,
    resource_id: str | None = None,
    error_message: str | None = None,
) -> PermissionValidationResult:
    """Helper to create a PermissionValidationResult for testing."""
    return PermissionValidationResult(
        is_valid=is_valid,
        base_permission_code=base_permission_code,
        resource_id=resource_id,
        error_message=error_message,
    )


def _make_user_permission(
    user_id: str, permission_code: str, granted_by: str | None = None
) -> UserPermission:
    """Helper to create a UserPermission entity for testing."""
    now = datetime.now(tz=UTC)
    return UserPermission(
        user_id=user_id,
        permission_code=permission_code,
        granted_at=now,
        granted_by=granted_by,
    )


@pytest.mark.anyio
async def test_grant_permission_success():
    """Test successful permission grant."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)
    granted_permission = _make_user_permission("user-456", "draws:notify", "admin-123")

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_validator = AsyncMock()
    mock_validator.validate_permission_code.return_value = _make_validation_result(
        is_valid=True,
        base_permission_code="draws:notify",
    )

    mock_user_perm_repo = AsyncMock()
    mock_user_perm_repo.grant_permission.return_value = granted_permission

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
        permission_validator=mock_validator,
    )

    command = GrantPermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="user-456",
        permission_code="draws:notify",
    )

    # Act
    result = await use_case.execute(command)

    # Assert
    assert result == granted_permission
    mock_user_repo.get_by_id.assert_any_call("admin-123")
    mock_user_repo.get_by_id.assert_any_call("user-456")
    mock_validator.validate_permission_code.assert_called_once_with("draws:notify")
    mock_user_perm_repo.grant_permission.assert_called_once_with(
        user_id="user-456",
        permission_code="draws:notify",
        granted_by="admin-123",
    )


@pytest.mark.anyio
async def test_grant_permission_non_admin_forbidden():
    """Test that non-admin cannot grant permissions."""
    # Arrange
    non_admin = _make_user("user-123", UserRole.USER)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = non_admin

    mock_validator = AsyncMock()
    mock_user_perm_repo = AsyncMock()

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
        permission_validator=mock_validator,
    )

    command = GrantPermissionCommand(
        requesting_user_id="user-123",
        target_user_id="user-456",
        permission_code="draws:notify",
    )

    # Act & Assert
    with pytest.raises(ForbiddenError) as exc_info:
        await use_case.execute(command)

    assert "administrators" in str(exc_info.value).lower()
    mock_user_repo.get_by_id.assert_called_once_with("user-123")
    mock_validator.validate_permission_code.assert_not_called()
    mock_user_perm_repo.grant_permission.assert_not_called()


@pytest.mark.anyio
async def test_grant_permission_requesting_user_not_found():
    """Test that non-existent requesting user gets ForbiddenError."""
    # Arrange
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = None

    mock_validator = AsyncMock()
    mock_user_perm_repo = AsyncMock()

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
        permission_validator=mock_validator,
    )

    command = GrantPermissionCommand(
        requesting_user_id="nonexistent-123",
        target_user_id="user-456",
        permission_code="draws:notify",
    )

    # Act & Assert
    with pytest.raises(ForbiddenError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_grant_permission_target_user_not_found():
    """Test that granting to non-existent user raises NotFoundError."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else None
    )

    mock_validator = AsyncMock()
    mock_user_perm_repo = AsyncMock()

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
        permission_validator=mock_validator,
    )

    command = GrantPermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="nonexistent-456",
        permission_code="draws:notify",
    )

    # Act & Assert
    with pytest.raises(NotFoundError) as exc_info:
        await use_case.execute(command)

    assert "nonexistent-456" in str(exc_info.value)
    mock_validator.validate_permission_code.assert_not_called()
    mock_user_perm_repo.grant_permission.assert_not_called()


@pytest.mark.anyio
async def test_grant_permission_permission_not_found():
    """Test that granting non-existent permission raises NotFoundError."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_validator = AsyncMock()
    mock_validator.validate_permission_code.return_value = _make_validation_result(
        is_valid=False,
        base_permission_code="nonexistent:permission",
        error_message="Base permission 'nonexistent:permission' does not exist",
    )

    mock_user_perm_repo = AsyncMock()

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
        permission_validator=mock_validator,
    )

    command = GrantPermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="user-456",
        permission_code="nonexistent:permission",
    )

    # Act & Assert
    with pytest.raises(NotFoundError) as exc_info:
        await use_case.execute(command)

    assert "nonexistent:permission" in str(exc_info.value)
    assert "does not exist" in str(exc_info.value)
    mock_user_perm_repo.grant_permission.assert_not_called()


@pytest.mark.anyio
async def test_grant_permission_idempotent():
    """Test that granting the same permission twice is idempotent."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)
    granted_permission = _make_user_permission("user-456", "draws:notify", "admin-123")

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_validator = AsyncMock()
    mock_validator.validate_permission_code.return_value = _make_validation_result(
        is_valid=True,
        base_permission_code="draws:notify",
    )

    mock_user_perm_repo = AsyncMock()
    # Both calls return the same permission (idempotent)
    mock_user_perm_repo.grant_permission.return_value = granted_permission

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
        permission_validator=mock_validator,
    )

    command = GrantPermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="user-456",
        permission_code="draws:notify",
    )

    # Act - Grant twice
    result1 = await use_case.execute(command)
    result2 = await use_case.execute(command)

    # Assert - Both return the same result
    assert result1 == result2 == granted_permission
    # Grant called twice (repository handles deduplication)
    assert mock_user_perm_repo.grant_permission.call_count == 2


@pytest.mark.anyio
async def test_grant_resource_scoped_permission_success():
    """Test successful grant of resource-scoped permission (e.g., 'groups:read:UUID')."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)
    resource_id = str(uuid4())
    permission_code = f"groups:read:{resource_id}"
    granted_permission = _make_user_permission("user-456", permission_code, "admin-123")

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_validator = AsyncMock()
    mock_validator.validate_permission_code.return_value = _make_validation_result(
        is_valid=True,
        base_permission_code="groups:read",
        resource_id=resource_id,
    )

    mock_user_perm_repo = AsyncMock()
    mock_user_perm_repo.grant_permission.return_value = granted_permission

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
        permission_validator=mock_validator,
    )

    command = GrantPermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="user-456",
        permission_code=permission_code,
    )

    # Act
    result = await use_case.execute(command)

    # Assert
    assert result == granted_permission
    mock_validator.validate_permission_code.assert_called_once_with(permission_code)
    mock_user_perm_repo.grant_permission.assert_called_once_with(
        user_id="user-456",
        permission_code=permission_code,
        granted_by="admin-123",
    )


@pytest.mark.anyio
async def test_grant_resource_scoped_permission_invalid_uuid():
    """Test that granting resource-scoped permission with malformed UUID raises error."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)
    invalid_uuid = "not-a-uuid"
    permission_code = f"groups:read:{invalid_uuid}"

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_validator = AsyncMock()
    mock_validator.validate_permission_code.return_value = _make_validation_result(
        is_valid=False,
        base_permission_code="groups:read",
        resource_id=None,
        error_message="Invalid resource ID format",
    )

    mock_user_perm_repo = AsyncMock()

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
        permission_validator=mock_validator,
    )

    command = GrantPermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="user-456",
        permission_code=permission_code,
    )

    # Act & Assert
    with pytest.raises(NotFoundError) as exc_info:
        await use_case.execute(command)

    assert "Invalid resource ID format" in str(exc_info.value)
    mock_user_perm_repo.grant_permission.assert_not_called()


@pytest.mark.anyio
async def test_grant_resource_scoped_permission_resource_not_found():
    """Test that granting permission for non-existent resource raises error."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)
    resource_id = str(uuid4())
    permission_code = f"groups:read:{resource_id}"

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_validator = AsyncMock()
    mock_validator.validate_permission_code.return_value = _make_validation_result(
        is_valid=False,
        base_permission_code="groups:read",
        resource_id=resource_id,
        error_message="Group not found",
    )

    mock_user_perm_repo = AsyncMock()

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
        permission_validator=mock_validator,
    )

    command = GrantPermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="user-456",
        permission_code=permission_code,
    )

    # Act & Assert
    with pytest.raises(NotFoundError) as exc_info:
        await use_case.execute(command)

    assert "Group not found" in str(exc_info.value)
    mock_user_perm_repo.grant_permission.assert_not_called()


@pytest.mark.anyio
async def test_grant_resource_scoped_permission_base_not_found():
    """Test that granting permission where base permission doesn't exist raises error."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)
    resource_id = str(uuid4())
    permission_code = f"nonexistent:action:{resource_id}"

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_validator = AsyncMock()
    mock_validator.validate_permission_code.return_value = _make_validation_result(
        is_valid=False,
        base_permission_code="nonexistent:action",
        resource_id=resource_id,
        error_message="Base permission 'nonexistent:action' does not exist",
    )

    mock_user_perm_repo = AsyncMock()

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
        permission_validator=mock_validator,
    )

    command = GrantPermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="user-456",
        permission_code=permission_code,
    )

    # Act & Assert
    with pytest.raises(NotFoundError) as exc_info:
        await use_case.execute(command)

    assert "does not exist" in str(exc_info.value)
    mock_user_perm_repo.grant_permission.assert_not_called()


@pytest.mark.anyio
async def test_grant_resource_scoped_permission_idempotent():
    """Test that granting the same resource-scoped permission twice is idempotent."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)
    resource_id = str(uuid4())
    permission_code = f"groups:read:{resource_id}"
    granted_permission = _make_user_permission("user-456", permission_code, "admin-123")

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_validator = AsyncMock()
    mock_validator.validate_permission_code.return_value = _make_validation_result(
        is_valid=True,
        base_permission_code="groups:read",
        resource_id=resource_id,
    )

    mock_user_perm_repo = AsyncMock()
    mock_user_perm_repo.grant_permission.return_value = granted_permission

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
        permission_validator=mock_validator,
    )

    command = GrantPermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="user-456",
        permission_code=permission_code,
    )

    # Act - Grant the same resource-scoped permission twice
    result1 = await use_case.execute(command)
    result2 = await use_case.execute(command)

    # Assert - Both return the same result
    assert result1 == result2 == granted_permission
    # Grant called twice (repository handles deduplication)
    assert mock_user_perm_repo.grant_permission.call_count == 2
