"""Unit tests for ListUserPermissionsUseCase."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from gift_genie.application.dto.list_user_permissions_query import ListUserPermissionsQuery
from gift_genie.application.errors import ForbiddenError, NotFoundError
from gift_genie.application.use_cases.list_user_permissions import (
    ListUserPermissionsUseCase,
)
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.entities.permission import Permission
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


@pytest.mark.anyio
async def test_list_user_permissions_success():
    """Test successful listing of user permissions."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)
    permissions = [
        _make_permission("draws:notify"),
        _make_permission("groups:delete"),
    ]

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_user_perm_repo = AsyncMock()
    mock_user_perm_repo.list_permissions_for_user.return_value = permissions

    use_case = ListUserPermissionsUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
    )

    query = ListUserPermissionsQuery(
        requesting_user_id="admin-123",
        target_user_id="user-456",
    )

    # Act
    result = await use_case.execute(query)

    # Assert
    assert result == permissions
    mock_user_repo.get_by_id.assert_any_call("admin-123")
    mock_user_repo.get_by_id.assert_any_call("user-456")
    mock_user_perm_repo.list_permissions_for_user.assert_called_once_with("user-456")


@pytest.mark.anyio
async def test_list_user_permissions_empty_list():
    """Test listing permissions when user has none."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    target_user = _make_user("user-456", UserRole.USER)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else target_user
    )

    mock_user_perm_repo = AsyncMock()
    mock_user_perm_repo.list_permissions_for_user.return_value = []

    use_case = ListUserPermissionsUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
    )

    query = ListUserPermissionsQuery(
        requesting_user_id="admin-123",
        target_user_id="user-456",
    )

    # Act
    result = await use_case.execute(query)

    # Assert
    assert result == []
    mock_user_perm_repo.list_permissions_for_user.assert_called_once()


@pytest.mark.anyio
async def test_list_user_permissions_non_admin_forbidden():
    """Test that non-admin cannot list user permissions."""
    # Arrange
    non_admin = _make_user("user-123", UserRole.USER)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = non_admin

    mock_user_perm_repo = AsyncMock()

    use_case = ListUserPermissionsUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
    )

    query = ListUserPermissionsQuery(
        requesting_user_id="user-123",
        target_user_id="user-456",
    )

    # Act & Assert
    with pytest.raises(ForbiddenError) as exc_info:
        await use_case.execute(query)

    assert "administrators" in str(exc_info.value).lower()
    mock_user_perm_repo.list_permissions_for_user.assert_not_called()


@pytest.mark.anyio
async def test_list_user_permissions_requesting_user_not_found():
    """Test that non-existent requesting user gets ForbiddenError."""
    # Arrange
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = None

    mock_user_perm_repo = AsyncMock()

    use_case = ListUserPermissionsUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
    )

    query = ListUserPermissionsQuery(
        requesting_user_id="nonexistent-123",
        target_user_id="user-456",
    )

    # Act & Assert
    with pytest.raises(ForbiddenError):
        await use_case.execute(query)


@pytest.mark.anyio
async def test_list_user_permissions_target_user_not_found():
    """Test that listing permissions for non-existent user raises NotFoundError."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.side_effect = lambda user_id: (
        admin if user_id == "admin-123" else None
    )

    mock_user_perm_repo = AsyncMock()

    use_case = ListUserPermissionsUseCase(
        user_repository=mock_user_repo,
        user_permission_repository=mock_user_perm_repo,
    )

    query = ListUserPermissionsQuery(
        requesting_user_id="admin-123",
        target_user_id="nonexistent-456",
    )

    # Act & Assert
    with pytest.raises(NotFoundError) as exc_info:
        await use_case.execute(query)

    assert "nonexistent-456" in str(exc_info.value)
    mock_user_perm_repo.list_permissions_for_user.assert_not_called()
