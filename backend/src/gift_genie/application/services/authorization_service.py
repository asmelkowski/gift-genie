"""Authorization service implementation for permission checking."""

from dataclasses import dataclass

from gift_genie.application.errors import ForbiddenError
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.interfaces.repositories import (
    UserPermissionRepository,
    UserRepository,
)


@dataclass(slots=True)
class AuthorizationServiceImpl:
    """Implementation of the AuthorizationService protocol.

    Provides centralized permission checking logic with admin bypass support.
    """

    user_repository: UserRepository
    user_permission_repository: UserPermissionRepository

    async def has_permission(self, user_id: str, permission_code: str) -> bool:
        """Check if a user has a specific permission.

        Uses a layered approach:
        1. Admin bypass: Users with ADMIN role have all permissions
        2. Permission check: Check if user has explicit permission via repository

        Args:
            user_id: The ID of the user to check
            permission_code: The permission code to check (e.g., "draws:notify")

        Returns:
            True if the user has the permission or is an admin, False otherwise.
        """
        # Layer 1: Admin bypass - admins have all permissions
        user = await self.user_repository.get_by_id(user_id)
        if user and user.role == UserRole.ADMIN:
            return True

        # Layer 2: Permission check via repository
        return await self.user_permission_repository.has_permission(user_id, permission_code)

    async def require_permission(self, user_id: str, permission_code: str) -> None:
        """Require a user to have a specific permission.

        Args:
            user_id: The ID of the user to check
            permission_code: The permission code to require

        Raises:
            ForbiddenError: If the user lacks the required permission
        """
        has_perm = await self.has_permission(user_id, permission_code)
        if not has_perm:
            raise ForbiddenError(f"Permission '{permission_code}' required")

    async def check_resource_ownership(self, user_id: str, resource_owner_id: str) -> bool:
        """Check if a user owns a resource.

        Admin users are considered to own all resources.

        Args:
            user_id: The ID of the user to check
            resource_owner_id: The ID of the resource owner

        Returns:
            True if the user owns the resource or is an admin, False otherwise.
        """
        # Admin bypass - admins own all resources
        user = await self.user_repository.get_by_id(user_id)
        if user and user.role == UserRole.ADMIN:
            return True

        # Ownership check - simple equality
        return user_id == resource_owner_id
