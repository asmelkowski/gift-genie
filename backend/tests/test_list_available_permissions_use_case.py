"""Unit tests for ListAvailablePermissionsUseCase."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from gift_genie.application.dto.list_available_permissions_query import (
    ListAvailablePermissionsQuery,
)
from gift_genie.application.errors import ForbiddenError
from gift_genie.application.use_cases.list_available_permissions import (
    ListAvailablePermissionsUseCase,
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


def _make_permission(code: str, category: str) -> Permission:
    """Helper to create a Permission entity for testing."""
    now = datetime.now(tz=UTC)
    return Permission(
        code=code,
        name=f"Permission {code}",
        description=f"Description for {code}",
        category=category,
        created_at=now,
    )


@pytest.mark.anyio
async def test_list_available_permissions_all():
    """Test listing all available permissions."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    permissions = [
        _make_permission("groups:create", "groups"),
        _make_permission("groups:delete", "groups"),
        _make_permission("draws:notify", "draws"),
        _make_permission("admin:manage_permissions", "admin"),
    ]

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = admin

    mock_perm_repo = AsyncMock()
    mock_perm_repo.list_all.return_value = permissions

    use_case = ListAvailablePermissionsUseCase(
        user_repository=mock_user_repo,
        permission_repository=mock_perm_repo,
    )

    query = ListAvailablePermissionsQuery(
        requesting_user_id="admin-123",
        category=None,
    )

    # Act
    result = await use_case.execute(query)

    # Assert
    assert result == permissions
    mock_user_repo.get_by_id.assert_called_once_with("admin-123")
    mock_perm_repo.list_all.assert_called_once()
    mock_perm_repo.list_by_category.assert_not_called()


@pytest.mark.anyio
async def test_list_available_permissions_by_category():
    """Test listing permissions filtered by category."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)
    draws_permissions = [
        _make_permission("draws:create", "draws"),
        _make_permission("draws:finalize", "draws"),
        _make_permission("draws:notify", "draws"),
    ]

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = admin

    mock_perm_repo = AsyncMock()
    mock_perm_repo.list_by_category.return_value = draws_permissions

    use_case = ListAvailablePermissionsUseCase(
        user_repository=mock_user_repo,
        permission_repository=mock_perm_repo,
    )

    query = ListAvailablePermissionsQuery(
        requesting_user_id="admin-123",
        category="draws",
    )

    # Act
    result = await use_case.execute(query)

    # Assert
    assert result == draws_permissions
    mock_user_repo.get_by_id.assert_called_once_with("admin-123")
    mock_perm_repo.list_by_category.assert_called_once_with("draws")
    mock_perm_repo.list_all.assert_not_called()


@pytest.mark.anyio
async def test_list_available_permissions_empty_category():
    """Test listing permissions for category with no permissions."""
    # Arrange
    admin = _make_user("admin-123", UserRole.ADMIN)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = admin

    mock_perm_repo = AsyncMock()
    mock_perm_repo.list_by_category.return_value = []

    use_case = ListAvailablePermissionsUseCase(
        user_repository=mock_user_repo,
        permission_repository=mock_perm_repo,
    )

    query = ListAvailablePermissionsQuery(
        requesting_user_id="admin-123",
        category="nonexistent_category",
    )

    # Act
    result = await use_case.execute(query)

    # Assert
    assert result == []
    mock_perm_repo.list_by_category.assert_called_once_with("nonexistent_category")


@pytest.mark.anyio
async def test_list_available_permissions_non_admin_forbidden():
    """Test that non-admin cannot list available permissions."""
    # Arrange
    non_admin = _make_user("user-123", UserRole.USER)

    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = non_admin

    mock_perm_repo = AsyncMock()

    use_case = ListAvailablePermissionsUseCase(
        user_repository=mock_user_repo,
        permission_repository=mock_perm_repo,
    )

    query = ListAvailablePermissionsQuery(
        requesting_user_id="user-123",
        category=None,
    )

    # Act & Assert
    with pytest.raises(ForbiddenError) as exc_info:
        await use_case.execute(query)

    assert "administrators" in str(exc_info.value).lower()
    mock_perm_repo.list_all.assert_not_called()
    mock_perm_repo.list_by_category.assert_not_called()


@pytest.mark.anyio
async def test_list_available_permissions_requesting_user_not_found():
    """Test that non-existent requesting user gets ForbiddenError."""
    # Arrange
    mock_user_repo = AsyncMock()
    mock_user_repo.get_by_id.return_value = None

    mock_perm_repo = AsyncMock()

    use_case = ListAvailablePermissionsUseCase(
        user_repository=mock_user_repo,
        permission_repository=mock_perm_repo,
    )

    query = ListAvailablePermissionsQuery(
        requesting_user_id="nonexistent-123",
        category=None,
    )

    # Act & Assert
    with pytest.raises(ForbiddenError):
        await use_case.execute(query)

    mock_perm_repo.list_all.assert_not_called()
