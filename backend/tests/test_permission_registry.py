"""Unit tests for PermissionRegistry."""


from gift_genie.infrastructure.permissions.permission_registry import (
    PermissionRegistry,
)


class TestPermissionRegistry:
    """Tests for the permission registry."""

    def test_all_permissions_returns_list(self):
        """all_permissions should return a list of tuples."""
        permissions = PermissionRegistry.all_permissions()

        assert isinstance(permissions, list)
        assert len(permissions) > 0
        # Each item should be a tuple with 4 elements
        assert all(isinstance(p, tuple) and len(p) == 4 for p in permissions)

    def test_all_permissions_have_required_fields(self):
        """Each permission should have code, name, description, and category."""
        permissions = PermissionRegistry.all_permissions()

        for code, name, description, category in permissions:
            assert isinstance(code, str)
            assert isinstance(name, str)
            assert isinstance(description, str)
            assert isinstance(category, str)
            assert len(code) > 0
            assert len(name) > 0
            assert len(description) > 0
            assert len(category) > 0

    def test_all_permissions_unique_codes(self):
        """All permission codes should be unique."""
        permissions = PermissionRegistry.all_permissions()
        codes = [code for code, _, _, _ in permissions]

        assert len(codes) == len(set(codes))

    def test_permission_naming_convention(self):
        """All permission codes should follow resource:action[:modifier] pattern."""
        permissions = PermissionRegistry.all_permissions()

        for code, _, _, _ in permissions:
            parts = code.split(":")
            # Should have at least 2 parts (resource:action)
            assert len(parts) >= 2
            # Each part should be non-empty
            assert all(part for part in parts)

    def test_groups_permissions_exist(self):
        """Groups permissions should be defined."""
        codes = PermissionRegistry.get_permission_codes()

        assert PermissionRegistry.GROUPS_CREATE in codes
        assert PermissionRegistry.GROUPS_READ in codes
        assert PermissionRegistry.GROUPS_UPDATE in codes
        assert PermissionRegistry.GROUPS_DELETE in codes
        assert PermissionRegistry.GROUPS_READ_ALL in codes
        assert PermissionRegistry.GROUPS_UPDATE_ALL in codes
        assert PermissionRegistry.GROUPS_DELETE_ALL in codes

    def test_members_permissions_exist(self):
        """Members permissions should be defined."""
        codes = PermissionRegistry.get_permission_codes()

        assert PermissionRegistry.MEMBERS_CREATE in codes
        assert PermissionRegistry.MEMBERS_READ in codes
        assert PermissionRegistry.MEMBERS_UPDATE in codes
        assert PermissionRegistry.MEMBERS_DELETE in codes

    def test_draws_permissions_exist(self):
        """Draws permissions should be defined."""
        codes = PermissionRegistry.get_permission_codes()

        assert PermissionRegistry.DRAWS_CREATE in codes
        assert PermissionRegistry.DRAWS_READ in codes
        assert PermissionRegistry.DRAWS_FINALIZE in codes
        assert PermissionRegistry.DRAWS_NOTIFY in codes
        assert PermissionRegistry.DRAWS_VIEW_ASSIGNMENTS in codes

    def test_exclusions_permissions_exist(self):
        """Exclusions permissions should be defined."""
        codes = PermissionRegistry.get_permission_codes()

        assert PermissionRegistry.EXCLUSIONS_CREATE in codes
        assert PermissionRegistry.EXCLUSIONS_READ in codes
        assert PermissionRegistry.EXCLUSIONS_DELETE in codes

    def test_admin_permissions_exist(self):
        """Admin permissions should be defined."""
        codes = PermissionRegistry.get_permission_codes()

        assert PermissionRegistry.ADMIN_VIEW_DASHBOARD in codes
        assert PermissionRegistry.ADMIN_MANAGE_USERS in codes
        assert PermissionRegistry.ADMIN_MANAGE_PERMISSIONS in codes
        assert PermissionRegistry.ADMIN_VIEW_ALL_GROUPS in codes

    def test_get_permission_codes(self):
        """get_permission_codes should return list of code strings."""
        codes = PermissionRegistry.get_permission_codes()

        assert isinstance(codes, list)
        assert len(codes) > 0
        assert all(isinstance(code, str) for code in codes)

    def test_get_permissions_by_category(self):
        """get_permissions_by_category should return filtered permissions."""
        groups_perms = PermissionRegistry.get_permissions_by_category("groups")
        draws_perms = PermissionRegistry.get_permissions_by_category("draws")
        admin_perms = PermissionRegistry.get_permissions_by_category("admin")

        # Should have permissions for each category
        assert len(groups_perms) > 0
        assert len(draws_perms) > 0
        assert len(admin_perms) > 0

        # Each should only contain permissions from that category
        assert all(p.startswith("groups:") for p in groups_perms)
        assert all(p.startswith("draws:") for p in draws_perms)
        assert all(p.startswith("admin:") for p in admin_perms)

    def test_specific_permission_codes(self):
        """Verify expected permission code values."""
        assert PermissionRegistry.GROUPS_CREATE == "groups:create"
        assert PermissionRegistry.GROUPS_READ == "groups:read"
        assert PermissionRegistry.DRAWS_NOTIFY == "draws:notify"
        assert PermissionRegistry.DRAWS_FINALIZE == "draws:finalize"
        assert PermissionRegistry.ADMIN_MANAGE_PERMISSIONS == "admin:manage_permissions"

    def test_permission_count(self):
        """Verify we have the expected number of permissions."""
        permissions = PermissionRegistry.all_permissions()

        # Should have permissions in all categories
        # Groups: 7, Members: 4, Draws: 5, Exclusions: 3, Admin: 4 = 23 total
        assert len(permissions) >= 20
