"""Migration script to grant default permissions to existing users.

This script assigns default permissions to all existing users based on their role:
- ADMIN users: No explicit permissions needed (admin bypass in AuthorizationService)
- USER users: Granted USER_BASIC_PERMISSIONS

This script is idempotent - it can be run multiple times safely.
It will skip users that already have permissions.
"""

from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.interfaces.repositories import (
    UserRepository,
    UserPermissionRepository,
)
from gift_genie.infrastructure.permissions.default_permissions import (
    USER_BASIC_PERMISSIONS,
)


async def migrate_user_permissions(
    user_repository: UserRepository,
    user_permission_repository: UserPermissionRepository,
) -> None:
    """Grant default permissions to all existing users.

    This function is idempotent - it can be run multiple times without
    causing issues. It will skip users that already have permissions.

    Args:
        user_repository: Repository for fetching users
        user_permission_repository: Repository for granting permissions
    """
    # Fetch all users
    users, _ = await user_repository.list_all(
        search=None, page=1, page_size=10000, sort="created_at"
    )

    migrated_count = 0
    skipped_count = 0

    for user in users:
        # Check if user already has permissions
        existing_perms = await user_permission_repository.list_by_user(user.id)

        if existing_perms:
            skipped_count += 1
            continue

        # Skip admin users - they don't need explicit permissions
        if user.role == UserRole.ADMIN:
            skipped_count += 1
            continue

        # Grant USER_BASIC_PERMISSIONS to regular users
        for permission_code in USER_BASIC_PERMISSIONS:
            try:
                await user_permission_repository.grant_permission(
                    user_id=user.id,
                    permission_code=permission_code,
                    granted_by=None,  # System migration, no admin
                )
            except ValueError:
                # Permission might already be granted or permission code doesn't exist
                pass

        migrated_count += 1

    print(
        f"User permissions migration complete: {migrated_count} users migrated, {skipped_count} skipped"
    )
