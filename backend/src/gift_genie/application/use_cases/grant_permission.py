"""Use case for granting a permission to a user."""

from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.grant_permission_command import GrantPermissionCommand
from gift_genie.application.errors import ForbiddenError, NotFoundError
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.entities.user_permission import UserPermission
from gift_genie.domain.interfaces.repositories import (
    UserPermissionRepository,
    UserRepository,
)
from gift_genie.domain.services.permission_validator import PermissionValidator


@dataclass(slots=True)
class GrantPermissionUseCase:
    """Use case for granting a permission to a user.

    This use case ensures:
    1. Only admins can grant permissions
    2. The target user exists
    3. The permission exists
    4. The permission grant is idempotent (granting twice is safe)
    """

    user_repository: UserRepository
    user_permission_repository: UserPermissionRepository
    permission_validator: PermissionValidator

    async def execute(self, command: GrantPermissionCommand) -> UserPermission:
        """Grant a permission to a user.

        Args:
            command: The grant permission command with requesting_user_id,
                     target_user_id, and permission_code

        Returns:
            The created or existing UserPermission

        Raises:
            ForbiddenError: If the requesting user is not an admin
            NotFoundError: If the target user or permission doesn't exist
        """
        # 1. Verify requesting user is ADMIN
        requesting_user = await self.user_repository.get_by_id(command.requesting_user_id)
        if not requesting_user or requesting_user.role != UserRole.ADMIN:
            raise ForbiddenError("Only administrators can grant permissions")

        # 2. Verify target user exists
        target_user = await self.user_repository.get_by_id(command.target_user_id)
        if not target_user:
            raise NotFoundError(f"User '{command.target_user_id}' not found")

        # 3. Validate permission code
        validation_result = await self.permission_validator.validate_permission_code(
            command.permission_code
        )
        if not validation_result.is_valid:
            raise NotFoundError(
                f"Permission '{command.permission_code}' not found: {validation_result.error_message}"
            )

        # 4. Grant permission (idempotent via repository logic)
        user_permission = await self.user_permission_repository.grant_permission(
            user_id=command.target_user_id,
            permission_code=command.permission_code,
            granted_by=command.requesting_user_id,
        )

        return user_permission
