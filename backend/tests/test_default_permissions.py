"""Unit tests for default permissions configuration."""

from gift_genie.infrastructure.permissions.default_permissions import (
    USER_BASIC_PERMISSIONS,
    ADMIN_PERMISSIONS,
)
from gift_genie.infrastructure.permissions.permission_registry import (
    PermissionRegistry,
)


class TestDefaultPermissions:
    """Tests for default permission sets."""

    def test_user_basic_permissions_is_list(self):
        """USER_BASIC_PERMISSIONS should be an empty list."""
        assert isinstance(USER_BASIC_PERMISSIONS, list)
        assert len(USER_BASIC_PERMISSIONS) == 0

    def test_user_basic_permissions_are_valid_codes(self):
        """All USER_BASIC_PERMISSIONS should be valid permission codes."""
        all_codes = PermissionRegistry.get_permission_codes()

        for permission in USER_BASIC_PERMISSIONS:
            assert permission in all_codes

    def test_user_basic_excludes_group_permissions(self):
        """USER_BASIC_PERMISSIONS should exclude group permissions."""
        assert PermissionRegistry.GROUPS_CREATE not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.GROUPS_READ not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.GROUPS_UPDATE not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.GROUPS_DELETE not in USER_BASIC_PERMISSIONS

    def test_user_basic_excludes_admin_groups_permissions(self):
        """USER_BASIC_PERMISSIONS should exclude admin-level group permissions."""
        assert PermissionRegistry.GROUPS_READ_ALL not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.GROUPS_UPDATE_ALL not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.GROUPS_DELETE_ALL not in USER_BASIC_PERMISSIONS

    def test_user_basic_excludes_members_permissions(self):
        """USER_BASIC_PERMISSIONS should exclude member permissions."""
        assert PermissionRegistry.MEMBERS_CREATE not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.MEMBERS_READ not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.MEMBERS_UPDATE not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.MEMBERS_DELETE not in USER_BASIC_PERMISSIONS

    def test_user_basic_excludes_draws_permissions(self):
        """USER_BASIC_PERMISSIONS should exclude draws permissions."""
        assert PermissionRegistry.DRAWS_CREATE not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.DRAWS_READ not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.DRAWS_FINALIZE not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.DRAWS_VIEW_ASSIGNMENTS not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.DRAWS_NOTIFY not in USER_BASIC_PERMISSIONS

    def test_user_basic_excludes_exclusions_permissions(self):
        """USER_BASIC_PERMISSIONS should exclude exclusion permissions."""
        assert PermissionRegistry.EXCLUSIONS_CREATE not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.EXCLUSIONS_READ not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.EXCLUSIONS_DELETE not in USER_BASIC_PERMISSIONS

    def test_user_basic_excludes_admin_permissions(self):
        """USER_BASIC_PERMISSIONS should exclude all admin permissions."""
        admin_codes = PermissionRegistry.get_permissions_by_category("admin")

        for admin_perm in admin_codes:
            assert admin_perm not in USER_BASIC_PERMISSIONS

    def test_admin_permissions_is_list(self):
        """ADMIN_PERMISSIONS should be a list of strings."""
        assert isinstance(ADMIN_PERMISSIONS, list)
        assert len(ADMIN_PERMISSIONS) > 0
        assert all(isinstance(p, str) for p in ADMIN_PERMISSIONS)

    def test_admin_permissions_includes_all_codes(self):
        """ADMIN_PERMISSIONS should include all permission codes."""
        all_codes = PermissionRegistry.get_permission_codes()

        assert set(ADMIN_PERMISSIONS) == set(all_codes)

    def test_admin_permissions_includes_draws_notify(self):
        """ADMIN_PERMISSIONS should include draws:notify."""
        assert PermissionRegistry.DRAWS_NOTIFY in ADMIN_PERMISSIONS

    def test_admin_permissions_includes_admin_perms(self):
        """ADMIN_PERMISSIONS should include all admin permissions."""
        admin_codes = PermissionRegistry.get_permissions_by_category("admin")

        for admin_perm in admin_codes:
            assert admin_perm in ADMIN_PERMISSIONS

    def test_draws_notify_not_in_user_basic_but_in_admin(self):
        """draws:notify should be in ADMIN but not USER_BASIC."""
        assert PermissionRegistry.DRAWS_NOTIFY not in USER_BASIC_PERMISSIONS
        assert PermissionRegistry.DRAWS_NOTIFY in ADMIN_PERMISSIONS
