"""Permission registry defining all application permissions.

Permissions follow the naming convention: resource:action[:modifier]
Examples: groups:create, draws:notify, admin:manage_users
"""


class PermissionRegistry:
    """Registry of all application permissions organized by category."""

    # ========== GROUPS PERMISSIONS ==========
    GROUPS_CREATE = "groups:create"
    GROUPS_READ = "groups:read"
    GROUPS_UPDATE = "groups:update"
    GROUPS_DELETE = "groups:delete"
    GROUPS_READ_ALL = "groups:read:all"
    GROUPS_UPDATE_ALL = "groups:update:all"
    GROUPS_DELETE_ALL = "groups:delete:all"

    # ========== MEMBERS PERMISSIONS ==========
    MEMBERS_CREATE = "members:create"
    MEMBERS_READ = "members:read"
    MEMBERS_UPDATE = "members:update"
    MEMBERS_DELETE = "members:delete"

    # ========== DRAWS PERMISSIONS ==========
    DRAWS_CREATE = "draws:create"
    DRAWS_READ = "draws:read"
    DRAWS_FINALIZE = "draws:finalize"
    DRAWS_NOTIFY = "draws:notify"
    DRAWS_VIEW_ASSIGNMENTS = "draws:view_assignments"

    # ========== EXCLUSIONS PERMISSIONS ==========
    EXCLUSIONS_CREATE = "exclusions:create"
    EXCLUSIONS_READ = "exclusions:read"
    EXCLUSIONS_DELETE = "exclusions:delete"

    # ========== ADMIN PERMISSIONS ==========
    ADMIN_VIEW_DASHBOARD = "admin:view_dashboard"
    ADMIN_MANAGE_USERS = "admin:manage_users"
    ADMIN_MANAGE_PERMISSIONS = "admin:manage_permissions"
    ADMIN_VIEW_ALL_GROUPS = "admin:view_all_groups"

    @classmethod
    def all_permissions(cls) -> list[tuple[str, str, str, str]]:
        """Return list of all permissions with metadata.

        Returns:
            List of tuples: (code, name, description, category)
        """
        return [
            # Groups
            (
                cls.GROUPS_CREATE,
                "Create Groups",
                "Create new gift exchange groups",
                "groups",
            ),
            (
                cls.GROUPS_READ,
                "Read Own Groups",
                "View details of owned groups",
                "groups",
            ),
            (
                cls.GROUPS_UPDATE,
                "Update Own Groups",
                "Modify details of owned groups",
                "groups",
            ),
            (
                cls.GROUPS_DELETE,
                "Delete Own Groups",
                "Delete owned groups permanently",
                "groups",
            ),
            (
                cls.GROUPS_READ_ALL,
                "Read Any Group",
                "View details of any group (admin only)",
                "groups",
            ),
            (
                cls.GROUPS_UPDATE_ALL,
                "Update Any Group",
                "Modify details of any group (admin only)",
                "groups",
            ),
            (
                cls.GROUPS_DELETE_ALL,
                "Delete Any Group",
                "Delete any group permanently (admin only)",
                "groups",
            ),
            # Members
            (
                cls.MEMBERS_CREATE,
                "Add Members",
                "Add members to groups",
                "members",
            ),
            (
                cls.MEMBERS_READ,
                "View Members",
                "View group members and their details",
                "members",
            ),
            (
                cls.MEMBERS_UPDATE,
                "Update Members",
                "Modify member information",
                "members",
            ),
            (
                cls.MEMBERS_DELETE,
                "Remove Members",
                "Remove members from groups",
                "members",
            ),
            # Draws
            (
                cls.DRAWS_CREATE,
                "Create Draws",
                "Create new gift exchange draws",
                "draws",
            ),
            (
                cls.DRAWS_READ,
                "View Draws",
                "View draw information and details",
                "draws",
            ),
            (
                cls.DRAWS_FINALIZE,
                "Finalize Draws",
                "Lock and finalize draws to prevent changes",
                "draws",
            ),
            (
                cls.DRAWS_NOTIFY,
                "Send Notifications",
                "Send email notifications to draw participants",
                "draws",
            ),
            (
                cls.DRAWS_VIEW_ASSIGNMENTS,
                "View Assignments",
                "View draw assignments and pairings",
                "draws",
            ),
            # Exclusions
            (
                cls.EXCLUSIONS_CREATE,
                "Create Exclusions",
                "Create gift exclusion rules",
                "exclusions",
            ),
            (
                cls.EXCLUSIONS_READ,
                "View Exclusions",
                "View exclusion rules",
                "exclusions",
            ),
            (
                cls.EXCLUSIONS_DELETE,
                "Delete Exclusions",
                "Remove exclusion rules",
                "exclusions",
            ),
            # Admin
            (
                cls.ADMIN_VIEW_DASHBOARD,
                "View Admin Dashboard",
                "Access the admin dashboard",
                "admin",
            ),
            (
                cls.ADMIN_MANAGE_USERS,
                "Manage Users",
                "View and manage user accounts",
                "admin",
            ),
            (
                cls.ADMIN_MANAGE_PERMISSIONS,
                "Manage Permissions",
                "Grant and revoke user permissions",
                "admin",
            ),
            (
                cls.ADMIN_VIEW_ALL_GROUPS,
                "View All Groups",
                "View all groups in the system",
                "admin",
            ),
        ]

    @classmethod
    def get_permission_codes(cls) -> list[str]:
        """Return list of all permission codes.

        Returns:
            List of permission codes (strings)
        """
        return [code for code, _, _, _ in cls.all_permissions()]

    @classmethod
    def get_permissions_by_category(cls, category: str) -> list[str]:
        """Return permission codes for a specific category.

        Args:
            category: The category to filter by (e.g., "groups", "draws", "admin")

        Returns:
            List of permission codes in the category
        """
        return [code for code, _, _, cat in cls.all_permissions() if cat == category]
