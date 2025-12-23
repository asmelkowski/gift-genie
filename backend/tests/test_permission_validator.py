"""Unit tests for PermissionValidator service.

Tests cover all permission validation scenarios including:
- Base permission validation (2-part format: resource:action)
- Resource-scoped permission validation (3-part format: resource:action:uuid)
- UUID format validation
- Edge cases and malformed inputs
"""

import pytest
from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.services.permission_validator import (
    PermissionValidator,
    PermissionValidationResult,
)


def _make_permission(code: str) -> Permission:
    """Helper to create a Permission entity for testing."""
    return Permission(
        code=code,
        name=f"{code.upper()}",
        description=f"Permission for {code}",
        category="resource",
        created_at=datetime.now(tz=UTC),
    )


class TestBasePermissionValidation:
    """Tests for validating base permissions (resource:action format)."""

    @pytest.mark.anyio
    async def test_validate_base_permission_success(self):
        """Valid base permission that exists in DB should return valid result."""
        # Arrange
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = _make_permission("groups:read")
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        # Act
        result = await validator.validate_permission_code("groups:read")

        # Assert
        assert result.is_valid is True
        assert result.base_permission_code == "groups:read"
        assert result.resource_id is None
        assert result.error_message is None
        mock_permission_repo.get_by_code.assert_called_once_with("groups:read")

    @pytest.mark.anyio
    async def test_validate_base_permission_not_found(self):
        """Base permission that doesn't exist should return invalid result."""
        # Arrange
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = None
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        # Act
        result = await validator.validate_permission_code("groups:read")

        # Assert
        assert result.is_valid is False
        assert result.base_permission_code == "groups:read"
        assert result.resource_id is None
        assert "does not exist" in result.error_message
        mock_permission_repo.get_by_code.assert_called_once_with("groups:read")


class TestResourceScopedPermissionValidation:
    """Tests for validating resource-scoped permissions (resource:action:uuid format)."""

    @pytest.mark.anyio
    async def test_validate_resource_scoped_permission_group_success(self):
        """Valid resource-scoped permission with existing group should return valid result."""
        # Arrange
        group_id = str(uuid4())
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = _make_permission("groups:read")
        mock_group_repo = AsyncMock()
        mock_group_repo.get_by_id.return_value = {"id": group_id, "name": "Test Group"}
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = f"groups:read:{group_id}"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is True
        assert result.base_permission_code == "groups:read"
        assert result.resource_id == group_id
        assert result.error_message is None
        mock_permission_repo.get_by_code.assert_called_once_with("groups:read")
        mock_group_repo.get_by_id.assert_called_once_with(group_id)

    @pytest.mark.anyio
    async def test_validate_resource_scoped_permission_group_not_found(self):
        """Valid UUID but group doesn't exist should return invalid result."""
        # Arrange
        group_id = str(uuid4())
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = _make_permission("groups:read")
        mock_group_repo = AsyncMock()
        mock_group_repo.get_by_id.return_value = None
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = f"groups:read:{group_id}"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is False
        assert result.base_permission_code == "groups:read"
        assert result.resource_id == group_id
        assert "Groups not found" in result.error_message
        mock_group_repo.get_by_id.assert_called_once_with(group_id)

    @pytest.mark.anyio
    async def test_validate_resource_scoped_permission_member_success(self):
        """Valid resource-scoped permission with existing member should return valid result."""
        # Arrange
        member_id = str(uuid4())
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = _make_permission("members:update")
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_member_repo.get_by_id.return_value = {"id": member_id, "name": "Test Member"}
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = f"members:update:{member_id}"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is True
        assert result.base_permission_code == "members:update"
        assert result.resource_id == member_id
        assert result.error_message is None
        mock_member_repo.get_by_id.assert_called_once_with(member_id)

    @pytest.mark.anyio
    async def test_validate_resource_scoped_permission_draw_success(self):
        """Valid resource-scoped permission with existing draw should return valid result."""
        # Arrange
        draw_id = str(uuid4())
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = _make_permission("draws:read")
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_draw_repo.get_by_id.return_value = {"id": draw_id, "group_id": str(uuid4())}
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = f"draws:read:{draw_id}"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is True
        assert result.base_permission_code == "draws:read"
        assert result.resource_id == draw_id
        assert result.error_message is None
        mock_draw_repo.get_by_id.assert_called_once_with(draw_id)

    @pytest.mark.anyio
    async def test_validate_resource_scoped_permission_exclusion_success(self):
        """Valid resource-scoped permission with existing exclusion should return valid result."""
        # Arrange
        exclusion_id = str(uuid4())
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = _make_permission("exclusions:delete")
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()
        mock_exclusion_repo.get_by_id.return_value = {
            "id": exclusion_id,
            "group_id": str(uuid4()),
        }

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = f"exclusions:delete:{exclusion_id}"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is True
        assert result.base_permission_code == "exclusions:delete"
        assert result.resource_id == exclusion_id
        assert result.error_message is None
        mock_exclusion_repo.get_by_id.assert_called_once_with(exclusion_id)

    @pytest.mark.anyio
    async def test_validate_resource_scoped_permission_base_not_found(self):
        """Resource-scoped permission but base permission doesn't exist should return invalid result."""
        # Arrange
        group_id = str(uuid4())
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = None
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = f"groups:read:{group_id}"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is False
        assert result.base_permission_code == "groups:read"
        assert result.resource_id == group_id
        assert "does not exist" in result.error_message
        mock_permission_repo.get_by_code.assert_called_once_with("groups:read")
        # Should not check group repo if base permission doesn't exist
        mock_group_repo.get_by_id.assert_not_called()


class TestUUIDValidation:
    """Tests for UUID format validation in resource-scoped permissions."""

    @pytest.mark.anyio
    async def test_validate_resource_scoped_permission_invalid_uuid(self):
        """Invalid UUID format should return error without checking resources."""
        # Arrange
        mock_permission_repo = AsyncMock()
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = "groups:read:not-a-valid-uuid"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is False
        assert result.base_permission_code == "groups:read"
        assert result.resource_id is None
        assert "Invalid resource ID format" in result.error_message
        # Should not check repositories if UUID is invalid
        mock_permission_repo.get_by_code.assert_not_called()
        mock_group_repo.get_by_id.assert_not_called()

    @pytest.mark.anyio
    async def test_validate_resource_scoped_permission_malformed_uuid(self):
        """Completely invalid UUID string should return error."""
        # Arrange
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = _make_permission("groups:read")
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = "groups:read:this-is-not-a-uuid-at-all-123456"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is False
        assert result.base_permission_code == "groups:read"
        assert result.resource_id is None
        assert "Invalid resource ID format" in result.error_message


class TestEdgeCases:
    """Tests for edge cases and malformed inputs."""

    @pytest.mark.anyio
    async def test_validate_empty_permission_code(self):
        """Empty string should return invalid result."""
        # Arrange
        mock_permission_repo = AsyncMock()
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        # Act
        result = await validator.validate_permission_code("")

        # Assert
        assert result.is_valid is False
        assert result.base_permission_code is None
        assert result.resource_id is None
        assert "empty" in result.error_message.lower()
        mock_permission_repo.get_by_code.assert_not_called()

    @pytest.mark.anyio
    async def test_validate_whitespace_only_permission_code(self):
        """Whitespace-only string should return invalid result."""
        # Arrange
        mock_permission_repo = AsyncMock()
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        # Act
        result = await validator.validate_permission_code("   ")

        # Assert
        assert result.is_valid is False
        assert result.base_permission_code is None
        assert result.resource_id is None
        assert "empty" in result.error_message.lower()

    @pytest.mark.anyio
    async def test_validate_malformed_permission_one_part(self):
        """Permission with only one part should return invalid format error."""
        # Arrange
        mock_permission_repo = AsyncMock()
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        # Act
        result = await validator.validate_permission_code("groups")

        # Assert
        assert result.is_valid is False
        assert result.base_permission_code is None
        assert result.resource_id is None
        assert "Invalid permission format" in result.error_message
        mock_permission_repo.get_by_code.assert_not_called()

    @pytest.mark.anyio
    async def test_validate_malformed_permission_four_parts(self):
        """Permission with too many parts should return invalid format error."""
        # Arrange
        mock_permission_repo = AsyncMock()
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        group_id = str(uuid4())
        permission_code = f"groups:read:{group_id}:extra"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is False
        assert result.base_permission_code is None
        assert result.resource_id is None
        assert "Invalid permission format" in result.error_message
        mock_permission_repo.get_by_code.assert_not_called()

    @pytest.mark.anyio
    async def test_validate_permission_with_multiple_colons_in_part(self):
        """Permission with multiple colons creating many parts should fail."""
        # Arrange
        mock_permission_repo = AsyncMock()
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        # Act
        result = await validator.validate_permission_code("groups:read:id:extra:more")

        # Assert
        assert result.is_valid is False
        assert "Invalid permission format" in result.error_message


class TestResourceExistenceChecks:
    """Tests for resource existence validation across different resource types."""

    @pytest.mark.anyio
    async def test_validate_member_resource_not_found(self):
        """Member resource that doesn't exist should return appropriate error."""
        # Arrange
        member_id = str(uuid4())
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = _make_permission("members:read")
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_member_repo.get_by_id.return_value = None
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = f"members:read:{member_id}"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is False
        assert "Members not found" in result.error_message

    @pytest.mark.anyio
    async def test_validate_draw_resource_not_found(self):
        """Draw resource that doesn't exist should return appropriate error."""
        # Arrange
        draw_id = str(uuid4())
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = _make_permission("draws:read")
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_draw_repo.get_by_id.return_value = None
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = f"draws:read:{draw_id}"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is False
        assert "Draws not found" in result.error_message

    @pytest.mark.anyio
    async def test_validate_exclusion_resource_not_found(self):
        """Exclusion resource that doesn't exist should return appropriate error."""
        # Arrange
        exclusion_id = str(uuid4())
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = _make_permission("exclusions:read")
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()
        mock_exclusion_repo.get_by_id.return_value = None

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = f"exclusions:read:{exclusion_id}"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is False
        assert "Exclusions not found" in result.error_message

    @pytest.mark.anyio
    async def test_validate_unknown_resource_type(self):
        """Unknown resource type should return invalid result."""
        # Arrange
        unknown_id = str(uuid4())
        mock_permission_repo = AsyncMock()
        mock_permission_repo.get_by_code.return_value = _make_permission("unknown:read")
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = f"unknown:read:{unknown_id}"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        assert result.is_valid is False
        assert result.base_permission_code == "unknown:read"
        assert result.resource_id == unknown_id
        assert "Unknown not found" in result.error_message


class TestCaseSensitivity:
    """Tests for case sensitivity in resource type handling."""

    @pytest.mark.anyio
    async def test_validate_uppercase_resource_type(self):
        """Uppercase resource type in permission code - base permission lookup is case-sensitive."""
        # Arrange
        group_id = str(uuid4())
        mock_permission_repo = AsyncMock()
        # Note: We return None because the code is "GROUPS:read" not "groups:read"
        mock_permission_repo.get_by_code.return_value = None
        mock_group_repo = AsyncMock()
        mock_member_repo = AsyncMock()
        mock_draw_repo = AsyncMock()
        mock_exclusion_repo = AsyncMock()

        validator = PermissionValidator(
            permission_repository=mock_permission_repo,
            group_repository=mock_group_repo,
            member_repository=mock_member_repo,
            draw_repository=mock_draw_repo,
            exclusion_repository=mock_exclusion_repo,
        )

        permission_code = f"GROUPS:read:{group_id}"

        # Act
        result = await validator.validate_permission_code(permission_code)

        # Assert
        # The permission code won't be found because base permission lookup is case-sensitive
        # It looks for "GROUPS:read" but only "groups:read" exists in the database
        assert result.is_valid is False
        assert "does not exist" in result.error_message
        mock_permission_repo.get_by_code.assert_called_once_with("GROUPS:read")


class TestPermissionValidationResult:
    """Tests for PermissionValidationResult dataclass properties."""

    def test_permission_validation_result_all_fields(self):
        """Result should have all required fields properly initialized."""
        # Arrange & Act
        result = PermissionValidationResult(
            is_valid=True,
            base_permission_code="groups:read",
            resource_id="123",
            error_message=None,
        )

        # Assert
        assert result.is_valid is True
        assert result.base_permission_code == "groups:read"
        assert result.resource_id == "123"
        assert result.error_message is None

    def test_permission_validation_result_with_error(self):
        """Result with error should have proper error message."""
        # Arrange & Act
        result = PermissionValidationResult(
            is_valid=False,
            base_permission_code="groups:read",
            resource_id=None,
            error_message="Permission not found",
        )

        # Assert
        assert result.is_valid is False
        assert result.error_message == "Permission not found"

    def test_permission_validation_result_defaults(self):
        """Result should have sensible defaults for optional fields."""
        # Arrange & Act
        result = PermissionValidationResult(is_valid=False)

        # Assert
        assert result.is_valid is False
        assert result.base_permission_code is None
        assert result.resource_id is None
        assert result.error_message is None
