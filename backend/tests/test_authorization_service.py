"""Unit tests for AuthorizationServiceImpl."""

import pytest
from datetime import UTC, datetime
from unittest.mock import AsyncMock

from gift_genie.application.errors import ForbiddenError
from gift_genie.application.services.authorization_service import (
    AuthorizationServiceImpl,
)
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
async def test_has_permission_admin_bypass():
    """Admin users should have all permissions without explicit grant."""
    # Arrange
    admin_user = _make_user("admin-123", UserRole.ADMIN)
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = admin_user
    mock_perm_repo = AsyncMock()

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act
    result = await service.has_permission("admin-123", "draws:notify")

    # Assert
    assert result is True
    mock_user_repo.get_by_id.assert_called_once_with("admin-123")
    # Permission repository should NOT be called for admins
    mock_perm_repo.has_permission.assert_not_called()


@pytest.mark.anyio
async def test_has_permission_user_with_permission():
    """Regular users should have permission if explicitly granted."""
    # Arrange
    regular_user = _make_user("user-123", UserRole.USER)
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = regular_user
    mock_perm_repo = AsyncMock()
    mock_perm_repo.has_permission.return_value = True

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act
    result = await service.has_permission("user-123", "draws:notify")

    # Assert
    assert result is True
    mock_user_repo.get_by_id.assert_called_once_with("user-123")
    mock_perm_repo.has_permission.assert_called_once_with("user-123", "draws:notify")


@pytest.mark.anyio
async def test_has_permission_user_without_permission():
    """Regular users should not have permission if not explicitly granted."""
    # Arrange
    regular_user = _make_user("user-123", UserRole.USER)
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = regular_user
    mock_perm_repo = AsyncMock()
    mock_perm_repo.has_permission.return_value = False

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act
    result = await service.has_permission("user-123", "draws:notify")

    # Assert
    assert result is False
    mock_perm_repo.has_permission.assert_called_once_with("user-123", "draws:notify")


@pytest.mark.anyio
async def test_has_permission_nonexistent_user():
    """Non-existent users should not have permission."""
    # Arrange
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = None
    mock_perm_repo = AsyncMock()
    mock_perm_repo.has_permission.return_value = False

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act
    result = await service.has_permission("nonexistent-user", "groups:create")

    # Assert
    assert result is False
    mock_perm_repo.has_permission.assert_called_once_with("nonexistent-user", "groups:create")


@pytest.mark.anyio
async def test_require_permission_granted():
    """require_permission should not raise if permission is granted."""
    # Arrange
    regular_user = _make_user("user-123", UserRole.USER)
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = regular_user
    mock_perm_repo = AsyncMock()
    mock_perm_repo.has_permission.return_value = True

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act & Assert - should not raise
    await service.require_permission("user-123", "groups:create")


@pytest.mark.anyio
async def test_require_permission_denied():
    """require_permission should raise ForbiddenError if permission is not granted."""
    # Arrange
    regular_user = _make_user("user-123", UserRole.USER)
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = regular_user
    mock_perm_repo = AsyncMock()
    mock_perm_repo.has_permission.return_value = False

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act & Assert
    with pytest.raises(ForbiddenError) as exc_info:
        await service.require_permission("user-123", "draws:notify")

    assert "draws:notify" in str(exc_info.value)


@pytest.mark.anyio
async def test_check_resource_ownership_owner():
    """User should own resource if IDs match."""
    # Arrange
    user = _make_user("user-123", UserRole.USER)
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = user
    mock_perm_repo = AsyncMock()

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act
    result = await service.check_resource_ownership("user-123", "user-123")

    # Assert
    assert result is True


@pytest.mark.anyio
async def test_check_resource_ownership_non_owner():
    """User should not own resource if IDs don't match."""
    # Arrange
    user = _make_user("user-123", UserRole.USER)
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = user
    mock_perm_repo = AsyncMock()

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act
    result = await service.check_resource_ownership("user-123", "user-456")

    # Assert
    assert result is False


@pytest.mark.anyio
async def test_check_resource_ownership_admin_owns_all():
    """Admin users should own all resources."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = admin
    mock_perm_repo = AsyncMock()

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act
    result = await service.check_resource_ownership("admin-123", "user-456")

    # Assert
    assert result is True


@pytest.mark.anyio
async def test_check_resource_ownership_nonexistent_user():
    """Non-existent user should not own resource."""
    # Arrange
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = None
    mock_perm_repo = AsyncMock()

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act
    result = await service.check_resource_ownership("nonexistent", "user-456")

    # Assert
    assert result is False


@pytest.mark.anyio
async def test_has_permission_granular_granted():
    """Regular users should have permission if granularly granted."""
    # Arrange
    regular_user = _make_user("user-123", UserRole.USER)
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = regular_user
    mock_perm_repo = AsyncMock()

    # Mock has_permission to return False for global but True for granular
    def has_permission_mock(user_id, permission_code):
        if permission_code == "groups:update:group-456":
            return True
        return False

    mock_perm_repo.has_permission.side_effect = has_permission_mock

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act
    result = await service.has_permission("user-123", "groups:update", resource_id="group-456")

    # Assert
    assert result is True
    # Should check global first, then granular
    assert mock_perm_repo.has_permission.call_count == 2
    mock_perm_repo.has_permission.assert_any_call("user-123", "groups:update")
    mock_perm_repo.has_permission.assert_any_call("user-123", "groups:update:group-456")


@pytest.mark.anyio
async def test_has_permission_granular_denied():
    """Regular users should not have permission if neither global nor granular is granted."""
    # Arrange
    regular_user = _make_user("user-123", UserRole.USER)
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = regular_user
    mock_perm_repo = AsyncMock()
    mock_perm_repo.has_permission.return_value = False

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act
    result = await service.has_permission("user-123", "groups:update", resource_id="group-456")

    # Assert
    assert result is False
    assert mock_perm_repo.has_permission.call_count == 2


@pytest.mark.anyio
async def test_require_permission_granular_error_message():
    """require_permission should include resource_id in ForbiddenError message if provided."""
    # Arrange
    regular_user = _make_user("user-123", UserRole.USER)
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = regular_user
    mock_perm_repo = AsyncMock()
    mock_perm_repo.has_permission.return_value = False

    service = AuthorizationServiceImpl(mock_user_repo, mock_perm_repo)

    # Act & Assert
    with pytest.raises(ForbiddenError) as exc_info:
        await service.require_permission("user-123", "groups:update", resource_id="group-456")

    assert "groups:update" in str(exc_info.value)
    assert "group-456" in str(exc_info.value)
