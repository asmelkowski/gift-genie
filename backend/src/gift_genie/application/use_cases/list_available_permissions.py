"""Use case for listing all available permissions in the system."""

from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.list_available_permissions_query import (
    ListAvailablePermissionsQuery,
)
from gift_genie.application.errors import ForbiddenError
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.interfaces.repositories import (
    PermissionRepository,
    UserRepository,
)


@dataclass(slots=True)
class ListAvailablePermissionsUseCase:
    """Use case for listing all available permissions in the system.

    This use case ensures:
    1. Only admins can list available permissions
    2. Optional filtering by category
    """

    user_repository: UserRepository
    permission_repository: PermissionRepository

    async def execute(self, query: ListAvailablePermissionsQuery) -> list[Permission]:
        """List all available permissions in the system.

        Args:
            query: The list available permissions query with requesting_user_id
                   and optional category filter

        Returns:
            List of Permission entities, optionally filtered by category

        Raises:
            ForbiddenError: If the requesting user is not an admin
        """
        # 1. Verify requesting user is ADMIN
        requesting_user = await self.user_repository.get_by_id(query.requesting_user_id)
        if not requesting_user or requesting_user.role != UserRole.ADMIN:
            raise ForbiddenError("Only administrators can list available permissions")

        # 2. Fetch permissions, optionally filtered by category
        if query.category:
            permissions = await self.permission_repository.list_by_category(query.category)
        else:
            permissions = await self.permission_repository.list_all()

        return permissions
