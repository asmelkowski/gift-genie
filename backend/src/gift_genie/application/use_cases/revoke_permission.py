"""Use case for revoking a permission from a user."""

from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.revoke_permission_command import RevokePermissionCommand
from gift_genie.application.errors import ForbiddenError, NotFoundError
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.interfaces.repositories import (
    UserPermissionRepository,
    UserRepository,
)


@dataclass(slots=True)
class RevokePermissionUseCase:
    """Use case for revoking a permission from a user.

    This use case ensures:
    1. Only admins can revoke permissions
    2. The target user exists
    3. Revocation is idempotent (revoking non-existent permission is safe)
    """

    user_repository: UserRepository
    user_permission_repository: UserPermissionRepository

    async def execute(self, command: RevokePermissionCommand) -> bool:
        """Revoke a permission from a user.

        Args:
            command: The revoke permission command with requesting_user_id,
                     target_user_id, and permission_code

        Returns:
            True if the permission was revoked, False if it wasn't granted

        Raises:
            ForbiddenError: If the requesting user is not an admin
            NotFoundError: If the target user doesn't exist
        """
        # 1. Verify requesting user is ADMIN
        requesting_user = await self.user_repository.get_by_id(command.requesting_user_id)
        if not requesting_user or requesting_user.role != UserRole.ADMIN:
            raise ForbiddenError("Only administrators can revoke permissions")

        # 2. Verify target user exists
        target_user = await self.user_repository.get_by_id(command.target_user_id)
        if not target_user:
            raise NotFoundError(f"User '{command.target_user_id}' not found")

        # 3. Revoke permission (idempotent - returns False if not granted)
        return await self.user_permission_repository.revoke_permission(
            user_id=command.target_user_id,
            permission_code=command.permission_code,
        )
