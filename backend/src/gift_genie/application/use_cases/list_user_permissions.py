"""Use case for listing all permissions for a specific user."""

from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.list_user_permissions_query import ListUserPermissionsQuery
from gift_genie.application.errors import ForbiddenError, NotFoundError
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.interfaces.repositories import (
    UserPermissionRepository,
    UserRepository,
)


@dataclass(slots=True)
class ListUserPermissionsUseCase:
    """Use case for listing all permissions for a specific user.

    This use case ensures:
    1. Only admins can list user permissions
    2. The target user exists
    """

    user_repository: UserRepository
    user_permission_repository: UserPermissionRepository

    async def execute(self, query: ListUserPermissionsQuery) -> list[Permission]:
        """List all permissions for a specific user.

        Args:
            query: The list user permissions query with requesting_user_id
                   and target_user_id

        Returns:
            List of Permission entities the user has

        Raises:
            ForbiddenError: If the requesting user is not an admin
            NotFoundError: If the target user doesn't exist
        """
        # 1. Verify requesting user is ADMIN
        requesting_user = await self.user_repository.get_by_id(query.requesting_user_id)
        if not requesting_user or requesting_user.role != UserRole.ADMIN:
            raise ForbiddenError("Only administrators can list user permissions")

        # 2. Verify target user exists
        target_user = await self.user_repository.get_by_id(query.target_user_id)
        if not target_user:
            raise NotFoundError(f"User '{query.target_user_id}' not found")

        # 3. Fetch all permissions for target user
        permissions = await self.user_permission_repository.list_permissions_for_user(
            query.target_user_id
        )

        return permissions
