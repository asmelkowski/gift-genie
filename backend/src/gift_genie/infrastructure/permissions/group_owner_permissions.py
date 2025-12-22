"""Group owner auto-grant permissions configuration."""

from gift_genie.infrastructure.permissions.permission_registry import PermissionRegistry


# Permissions automatically granted when a user creates a group.
# These are resource-scoped permissions in the format "permission:resource_id".
#
# Note: draws:notify is explicitly excluded as it's a privileged permission
# with cost implications (sending emails/SMS).
GROUP_OWNER_AUTO_GRANT_PERMISSIONS: list[str] = [
    # Group management
    PermissionRegistry.GROUPS_READ,
    PermissionRegistry.GROUPS_UPDATE,
    PermissionRegistry.GROUPS_DELETE,
    # Member management
    PermissionRegistry.MEMBERS_READ,
    PermissionRegistry.MEMBERS_CREATE,
    PermissionRegistry.MEMBERS_UPDATE,
    PermissionRegistry.MEMBERS_DELETE,
    # Draw management
    PermissionRegistry.DRAWS_READ,
    PermissionRegistry.DRAWS_CREATE,
    PermissionRegistry.DRAWS_FINALIZE,
    PermissionRegistry.DRAWS_VIEW_ASSIGNMENTS,
    # Exclusion management
    PermissionRegistry.EXCLUSIONS_READ,
    PermissionRegistry.EXCLUSIONS_CREATE,
    PermissionRegistry.EXCLUSIONS_DELETE,
]


def build_group_owner_permissions(group_id: str) -> list[str]:
    """Build resource-scoped permissions for a group owner.

    Args:
        group_id: UUID of the group as a string.

    Returns:
        List of permission codes in format "{permission}:{group_id}".
        Example: ["groups:read:550e8400-...", "members:create:550e8400-...", ...]

    Note:
        The owner receives 14 resource-scoped permissions covering group,
        member, draw, and exclusion management. The 'draws:notify' permission
        is excluded as it is considered a privileged action.
    """
    return [f"{perm}:{group_id}" for perm in GROUP_OWNER_AUTO_GRANT_PERMISSIONS]
