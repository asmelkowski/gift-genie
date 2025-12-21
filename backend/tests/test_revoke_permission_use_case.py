"""Unit tests for RevokePermissionUseCase."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from gift_genie.application.dto.revoke_permission_command import RevokePermissionCommand
from gift_genie.application.errors import ForbiddenError, NotFoundError
from gift_genie.application.use_cases.revoke_permission import RevokePermissionUseCase
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.entities.user import User


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


@pytest.mark.anyio
async def test_revoke_permission_success():
    """Test successful permission revocation."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_user_perm_repo = AsyncMock()
    mock_user_perm_repo.revoke_permission.return_value = True

    use_case = RevokePermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
    )

    command = RevokePermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="user-456",
        permission_code="draws:notify",
    )

    # Act
    result = await use_case.execute(command)

    # Assert
    assert result is True
    mock_user_repo.get_by_id.assert_any_call("admin-123")
    mock_user_repo.get_by_id.assert_any_call("user-456")
    mock_user_perm_repo.revoke_permission.assert_called_once_with(
        user_id="user-456",
        permission_code="draws:notify",
    )


@pytest.mark.anyio
async def test_revoke_permission_not_granted():
    """Test revoking a permission that wasn't granted (idempotent)."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_user_perm_repo = AsyncMock()
    mock_user_perm_repo.revoke_permission.return_value = False

    use_case = RevokePermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
    )

    command = RevokePermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="user-456",
        permission_code="draws:notify",
    )

    # Act
    result = await use_case.execute(command)

    # Assert - Should return False but not raise error (graceful)
    assert result is False
    mock_user_perm_repo.revoke_permission.assert_called_once()


@pytest.mark.anyio
async def test_revoke_permission_non_admin_forbidden():
    """Test that non-admin cannot revoke permissions."""
    # Arrange
    non_admin = _make_user("user-123", UserRole.USER)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = non_admin

    mock_user_perm_repo = AsyncMock()

    use_case = RevokePermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
    )

    command = RevokePermissionCommand(
        requesting_user_id="user-123",
        target_user_id="user-456",
        permission_code="draws:notify",
    )

    # Act & Assert
    with pytest.raises(ForbiddenError) as exc_info:
        await use_case.execute(command)

    assert "administrators" in str(exc_info.value).lower()
    mock_user_perm_repo.revoke_permission.assert_not_called()


@pytest.mark.anyio
async def test_revoke_permission_requesting_user_not_found():
    """Test that non-existent requesting user gets ForbiddenError."""
    # Arrange
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = None

    mock_user_perm_repo = AsyncMock()

    use_case = RevokePermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
    )

    command = RevokePermissionCommand(
        requesting_user_id="nonexistent-123",
        target_user_id="user-456",
        permission_code="draws:notify",
    )

    # Act & Assert
    with pytest.raises(ForbiddenError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_revoke_permission_target_user_not_found():
    """Test that revoking from non-existent user raises NotFoundError."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else None
    )

    mock_user_perm_repo = AsyncMock()

    use_case = RevokePermissionUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
    )

    command = RevokePermissionCommand(
        requesting_user_id="admin-123",
        target_user_id="nonexistent-456",
        permission_code="draws:notify",
    )

    # Act & Assert
    with pytest.raises(NotFoundError) as exc_info:
        await use_case.execute(command)

    assert "nonexistent-456" in str(exc_info.value)
    mock_user_perm_repo.revoke_permission.assert_not_called()
