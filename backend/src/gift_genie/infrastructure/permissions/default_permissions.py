"""Default permission sets for different user roles.

This module defines which permissions are granted by default to new users
based on their role.

NOTE: In the resource-level permissions system, regular users start with no
global permissions. They receive permissions automatically when they create groups
or are added to them with specific roles.
"""

from gift_genie.infrastructure.permissions.permission_registry import (
    PermissionRegistry,
)

USER_BASIC_PERMISSIONS: list[str] = []

# ========== ADMIN_PERMISSIONS ==========
# Permissions for admin users
# NOTE: Admins don't need explicit permission grants due to admin bypass logic
# in AuthorizationService. This list is for reference and future use.
# All permissions can be obtained via UserRole.ADMIN role check.
ADMIN_PERMISSIONS = PermissionRegistry.get_permission_codes()
