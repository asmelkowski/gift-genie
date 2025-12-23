"""Permission validation service for parsing and validating permission codes.

Supports both base permissions (e.g., 'groups:read') and resource-scoped
permissions (e.g., 'groups:read:uuid').
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from gift_genie.domain.interfaces.repositories import (
    DrawRepository,
    ExclusionRepository,
    GroupRepository,
    MemberRepository,
    PermissionRepository,
)


@dataclass(slots=True)
class PermissionValidationResult:
    """Result of permission code validation.

    Attributes:
        is_valid: Whether the permission code is valid
        base_permission_code: The base permission code (e.g., "groups:read"), or None if malformed
        resource_id: The resource ID if this is a resource-scoped permission, or None if invalid
        error_message: Error message if validation failed
    """

    is_valid: bool
    base_permission_code: str | None = None
    resource_id: str | None = None
    error_message: str | None = None


@dataclass(slots=True)
class PermissionValidator:
    """Validates permission codes and checks if they exist in the system.

    Supports two formats:
    1. Base permissions: "resource:action" (e.g., "groups:read")
    2. Resource-scoped permissions: "resource:action:uuid" (e.g., "groups:read:550e8400-...")

    Dependencies are injected for repository access to verify permissions and resources.
    """

    permission_repository: PermissionRepository
    group_repository: GroupRepository
    member_repository: MemberRepository
    draw_repository: DrawRepository
    exclusion_repository: ExclusionRepository

    async def validate_permission_code(self, permission_code: str) -> PermissionValidationResult:
        """Validate a permission code.

        Parses the permission code and verifies:
        1. Format is valid (2 or 3 parts separated by colons)
        2. Base permission exists in the permissions table
        3. For resource-scoped permissions: UUID format is valid and resource exists

        Args:
            permission_code: The permission code to validate

        Returns:
            PermissionValidationResult with validation status and details

        Example:
            # Base permission
            result = await validator.validate_permission_code("groups:read")
            assert result.is_valid is True
            assert result.base_permission_code == "groups:read"

            # Resource-scoped permission
            result = await validator.validate_permission_code(
                "groups:read:550e8400-e29b-41d4-a716-446655440000"
            )
            assert result.is_valid is True
            assert result.resource_id == "550e8400-e29b-41d4-a716-446655440000"
        """
        # Validate input
        if not permission_code or not permission_code.strip():
            return PermissionValidationResult(
                is_valid=False,
                base_permission_code=None,
                resource_id=None,
                error_message="Permission code cannot be empty",
            )

        # Parse permission code
        parts = permission_code.split(":")
        if len(parts) == 2:
            return await self._validate_base_permission(parts[0], parts[1])
        elif len(parts) == 3:
            return await self._validate_resource_scoped_permission(parts[0], parts[1], parts[2])
        else:
            return PermissionValidationResult(
                is_valid=False,
                base_permission_code=None,
                resource_id=None,
                error_message="Invalid permission format",
            )

    async def _validate_base_permission(
        self, resource: str, action: str
    ) -> PermissionValidationResult:
        """Validate a base permission (2 parts: resource:action).

        Args:
            resource: The resource type (e.g., "groups")
            action: The action (e.g., "read")

        Returns:
            PermissionValidationResult with validation status
        """
        base_code = f"{resource}:{action}"

        # Check if base permission exists
        permission = await self.permission_repository.get_by_code(base_code)
        if permission is None:
            return PermissionValidationResult(
                is_valid=False,
                base_permission_code=base_code,
                resource_id=None,
                error_message=f"Base permission '{base_code}' does not exist",
            )

        return PermissionValidationResult(
            is_valid=True,
            base_permission_code=base_code,
            resource_id=None,
            error_message=None,
        )

    async def _validate_resource_scoped_permission(
        self, resource: str, action: str, resource_id: str
    ) -> PermissionValidationResult:
        """Validate a resource-scoped permission (3 parts: resource:action:uuid).

        Args:
            resource: The resource type (e.g., "groups")
            action: The action (e.g., "read")
            resource_id: The resource ID (must be a valid UUID)

        Returns:
            PermissionValidationResult with validation status
        """
        base_code = f"{resource}:{action}"

        # Validate UUID format
        try:
            UUID(resource_id)
        except (ValueError, AttributeError):
            return PermissionValidationResult(
                is_valid=False,
                base_permission_code=base_code,
                resource_id=None,
                error_message="Invalid resource ID format",
            )

        # Check if base permission exists
        permission = await self.permission_repository.get_by_code(base_code)
        if permission is None:
            return PermissionValidationResult(
                is_valid=False,
                base_permission_code=base_code,
                resource_id=resource_id,
                error_message=f"Base permission '{base_code}' does not exist",
            )

        # Validate resource exists
        resource_exists = await self._check_resource_exists(resource, resource_id)
        if not resource_exists:
            resource_name = resource.capitalize()
            return PermissionValidationResult(
                is_valid=False,
                base_permission_code=base_code,
                resource_id=resource_id,
                error_message=f"{resource_name} not found",
            )

        return PermissionValidationResult(
            is_valid=True,
            base_permission_code=base_code,
            resource_id=resource_id,
            error_message=None,
        )

    async def _check_resource_exists(self, resource: str, resource_id: str) -> bool:
        """Check if a resource exists in the database.

        Maps resource types to their respective repositories.

        Args:
            resource: The resource type (e.g., "groups", "members", "draws", "exclusions")
            resource_id: The resource ID to check

        Returns:
            True if the resource exists, False otherwise
        """
        match resource.lower():
            case "groups":
                return (await self.group_repository.get_by_id(resource_id)) is not None
            case "members":
                return (await self.member_repository.get_by_id(resource_id)) is not None
            case "draws":
                return (await self.draw_repository.get_by_id(resource_id)) is not None
            case "exclusions":
                return (await self.exclusion_repository.get_by_id(resource_id)) is not None
            case _:
                return False
