"""Unit tests for permissions seed function."""

import pytest
from datetime import UTC, datetime
from unittest.mock import AsyncMock

from gift_genie.domain.entities.permission import Permission
from gift_genie.infrastructure.database.seeds.permissions_seed import (
    seed_permissions,
)
from gift_genie.infrastructure.permissions.permission_registry import (
    PermissionRegistry,
)


@pytest.mark.anyio
async def test_seed_permissions_creates_all_permissions():
    """seed_permissions should create all permissions from registry."""
    # Arrange
    mock_repo = AsyncMock()
    mock_repo.get_by_code.return_value = None  # No permissions exist yet
    mock_repo.create.return_value = Permission(
        code="test:code",
        name="Test",
        description="Test",
        category="test",
        created_at=datetime.now(tz=UTC),
    )

    # Act
    await seed_permissions(mock_repo)

    # Assert
    expected_count = len(PermissionRegistry.all_permissions())
    assert mock_repo.create.call_count == expected_count


@pytest.mark.anyio
async def test_seed_permissions_idempotent():
    """seed_permissions should skip existing permissions."""
    # Arrange
    existing_permission = Permission(
        code="groups:create",
        name="Create Groups",
        description="Create new groups",
        category="groups",
        created_at=datetime.now(tz=UTC),
    )

    mock_repo = AsyncMock()

    def get_by_code_side_effect(code):
        if code == "groups:create":
            return existing_permission
        return None

    mock_repo.get_by_code.side_effect = get_by_code_side_effect
    mock_repo.create.return_value = Permission(
        code="test",
        name="Test",
        description="Test",
        category="test",
        created_at=datetime.now(tz=UTC),
    )

    # Act
    await seed_permissions(mock_repo)

    # Assert
    # Should have called get_by_code for each permission
    assert mock_repo.get_by_code.call_count == len(PermissionRegistry.all_permissions())
    # Should create only the non-existing permissions
    expected_create_count = len(PermissionRegistry.all_permissions()) - 1
    assert mock_repo.create.call_count == expected_create_count


@pytest.mark.anyio
async def test_seed_permissions_all_existing():
    """seed_permissions should skip all if all already exist."""
    # Arrange
    mock_repo = AsyncMock()
    mock_repo.get_by_code.return_value = Permission(
        code="existing",
        name="Existing",
        description="Already exists",
        category="test",
        created_at=datetime.now(tz=UTC),
    )

    # Act
    await seed_permissions(mock_repo)

    # Assert
    # Should not create anything
    mock_repo.create.assert_not_called()


@pytest.mark.anyio
async def test_seed_permissions_checks_all_permission_codes():
    """seed_permissions should check all permission codes."""
    # Arrange
    mock_repo = AsyncMock()
    mock_repo.get_by_code.return_value = None  # All don't exist
    mock_repo.create.return_value = Permission(
        code="test",
        name="Test",
        description="Test",
        category="test",
        created_at=datetime.now(tz=UTC),
    )

    # Act
    await seed_permissions(mock_repo)

    # Assert
    # Should have checked all permission codes
    checked_codes = [call[0][0] for call in mock_repo.get_by_code.call_args_list]
    all_codes = PermissionRegistry.get_permission_codes()

    assert len(checked_codes) == len(all_codes)
    assert set(checked_codes) == set(all_codes)
