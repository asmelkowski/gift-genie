"""Default permission sets for different user roles.

This module defines which permissions are granted by default to new users
based on their role.
"""

from gift_genie.infrastructure.permissions.permission_registry import (
    PermissionRegistry,
)

# ========== USER_BASIC_PERMISSIONS ==========
# Default permissions granted to new regular users (UserRole.USER)
# Includes all functionality that was available before the permission system
# EXCLUDES: draws:notify (must be explicitly granted by admin)
# EXCLUDES: admin:* (admin-only permissions)
# EXCLUDES: *:*:all (global admin permissions)
USER_BASIC_PERMISSIONS = [
    # Groups - user can manage own groups
    PermissionRegistry.GROUPS_CREATE,
    PermissionRegistry.GROUPS_READ,
    PermissionRegistry.GROUPS_UPDATE,
    PermissionRegistry.GROUPS_DELETE,
    # Members - user can manage members in own groups
    PermissionRegistry.MEMBERS_CREATE,
    PermissionRegistry.MEMBERS_READ,
    PermissionRegistry.MEMBERS_UPDATE,
    PermissionRegistry.MEMBERS_DELETE,
    # Draws - user can create, read, finalize draws but NOT notify
    PermissionRegistry.DRAWS_CREATE,
    PermissionRegistry.DRAWS_READ,
    PermissionRegistry.DRAWS_FINALIZE,
    PermissionRegistry.DRAWS_VIEW_ASSIGNMENTS,
    # NOTE: DRAWS_NOTIFY is NOT included - must be explicitly granted
    # Exclusions - user can manage exclusions
    PermissionRegistry.EXCLUSIONS_CREATE,
    PermissionRegistry.EXCLUSIONS_READ,
    PermissionRegistry.EXCLUSIONS_DELETE,
]

# ========== ADMIN_PERMISSIONS ==========
# Permissions for admin users
# NOTE: Admins don't need explicit permission grants due to admin bypass logic
# in AuthorizationService. This list is for reference and future use.
# All permissions can be obtained via UserRole.ADMIN role check.
ADMIN_PERMISSIONS = PermissionRegistry.get_permission_codes()
