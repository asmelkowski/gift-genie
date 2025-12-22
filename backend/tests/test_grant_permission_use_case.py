"""Unit tests for GrantPermissionUseCase."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from gift_genie.application.dto.grant_permission_command import GrantPermissionCommand
from gift_genie.application.errors import ForbiddenError, NotFoundError
from gift_genie.application.use_cases.grant_permission import GrantPermissionUseCase
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.user_permission import UserPermission


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


def _make_permission(code: str) -> Permission:
    """Helper to create a Permission entity for testing."""
    now = datetime.now(tz=UTC)
    return Permission(
        code=code,
        name=f"Permission {code}",
        description=f"Description for {code}",
        category=code.split(":")[0],
        created_at=now,
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
    permission = _make_permission("draws:notify")
    granted_permission = _make_user_permission("user-456", "draws:notify", "admin-123")

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_perm_repo = AsyncMock()
    mock_perm_repo.get_by_code.return_value = permission

    mock_user_perm_repo = AsyncMock()
    mock_user_perm_repo.grant_permission.return_value = granted_permission

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        permission_repository=mock_perm_repo,
        user_permission_repository=mock_user_perm_repo,
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
    mock_perm_repo.get_by_code.assert_called_once_with("draws:notify")
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

    mock_perm_repo = AsyncMock()
    mock_user_perm_repo = AsyncMock()

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        permission_repository=mock_perm_repo,
        user_permission_repository=mock_user_perm_repo,
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
    mock_perm_repo.get_by_code.assert_not_called()
    mock_user_perm_repo.grant_permission.assert_not_called()


@pytest.mark.anyio
async def test_grant_permission_requesting_user_not_found():
    """Test that non-existent requesting user gets ForbiddenError."""
    # Arrange
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = None

    mock_perm_repo = AsyncMock()
    mock_user_perm_repo = AsyncMock()

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        permission_repository=mock_perm_repo,
        user_permission_repository=mock_user_perm_repo,
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

    mock_perm_repo = AsyncMock()
    mock_user_perm_repo = AsyncMock()

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        permission_repository=mock_perm_repo,
        user_permission_repository=mock_user_perm_repo,
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
    mock_perm_repo.get_by_code.assert_not_called()
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

    mock_perm_repo = AsyncMock()
    mock_perm_repo.get_by_code.return_value = None

    mock_user_perm_repo = AsyncMock()

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        permission_repository=mock_perm_repo,
        user_permission_repository=mock_user_perm_repo,
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
    mock_user_perm_repo.grant_permission.assert_not_called()


@pytest.mark.anyio
async def test_grant_permission_idempotent():
    """Test that granting the same permission twice is idempotent."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)
    permission = _make_permission("draws:notify")
    granted_permission = _make_user_permission("user-456", "draws:notify", "admin-123")

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_perm_repo = AsyncMock()
    mock_perm_repo.get_by_code.return_value = permission

    mock_user_perm_repo = AsyncMock()
    # Both calls return the same permission (idempotent)
    mock_user_perm_repo.grant_permission.return_value = granted_permission

    use_case = GrantPermissionUseCase(
        user_repository=mock_user_repo,
        permission_repository=mock_perm_repo,
        user_permission_repository=mock_user_perm_repo,
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
