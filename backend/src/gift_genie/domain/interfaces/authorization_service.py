"""Authorization service interface for permission checking."""

from typing import Protocol, runtime_checkable


@runtime_checkable
class AuthorizationService(Protocol):
    """Service interface for checking user permissions and authorization."""

    async def has_permission(
        self, user_id: str, permission_code: str, resource_id: str | None = None
    ) -> bool:
        """Check if a user has a specific permission.

        Args:
            user_id: The ID of the user to check
            permission_code: The permission code to check (e.g., "draws:notify")
            resource_id: Optional ID of the resource to check granular permission for

        Returns:
            True if the user has the permission, False otherwise.
            Admin users automatically return True for all permissions.
        """
        ...

    async def require_permission(
        self, user_id: str, permission_code: str, resource_id: str | None = None
    ) -> None:
        """Require a user to have a specific permission.

        Args:
            user_id: The ID of the user to check
            permission_code: The permission code to require
            resource_id: Optional ID of the resource to check granular permission for

        Raises:
            ForbiddenError: If the user lacks the required permission
        """
        ...

    async def check_resource_ownership(self, user_id: str, resource_owner_id: str) -> bool:
        """Check if a user owns a resource.

        Args:
            user_id: The ID of the user to check
            resource_owner_id: The ID of the resource owner

        Returns:
            True if the user owns the resource, False otherwise.
            Admin users are considered to own all resources.
        """
        ...
