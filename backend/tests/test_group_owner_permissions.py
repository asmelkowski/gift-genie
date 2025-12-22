"""Unit tests for group owner auto-grant permissions."""

from uuid import uuid4
from gift_genie.infrastructure.permissions.group_owner_permissions import (
    GROUP_OWNER_AUTO_GRANT_PERMISSIONS,
    build_group_owner_permissions,
)
from gift_genie.infrastructure.permissions.permission_registry import PermissionRegistry


class TestGroupOwnerPermissions:
    """Tests for group owner auto-grant permissions."""

    def test_build_group_owner_permissions_count(self):
        """Test that build_group_owner_permissions returns the correct number of permissions.

        Note: Based on the requirements, there are 14 permissions:
        - Groups: read, update, delete (3)
        - Members: read, create, update, delete (4)
        - Draws: read, create, finalize, view_assignments (4)
        - Exclusions: read, create, delete (3)
        Total = 14
        """
        group_id = str(uuid4())
        permissions = build_group_owner_permissions(group_id)

        # We expect 14 permissions as listed in the requirements
        assert len(permissions) == 14
        assert len(GROUP_OWNER_AUTO_GRANT_PERMISSIONS) == 14

    def test_build_group_owner_permissions_format(self):
        """Test that returned permissions have correct format {permission}:{group_id}."""
        group_id = str(uuid4())
        permissions = build_group_owner_permissions(group_id)

        for perm in permissions:
            assert perm.endswith(f":{group_id}")
            # Format should be resource:action:group_id
            assert perm.count(":") == 2

    def test_draws_notify_not_included(self):
        """Test that draws:notify is NOT included in auto-granted permissions."""
        group_id = str(uuid4())
        permissions = build_group_owner_permissions(group_id)

        # Check that no permission starts with "draws:notify"
        notify_perm_prefix = f"{PermissionRegistry.DRAWS_NOTIFY}:"
        assert not any(p.startswith(notify_perm_prefix) for p in permissions)
        # Also check the raw permission list
        assert PermissionRegistry.DRAWS_NOTIFY not in GROUP_OWNER_AUTO_GRANT_PERMISSIONS

    def test_specific_permissions_included(self):
        """Test that specific required permissions are included."""
        group_id = str(uuid4())
        permissions = build_group_owner_permissions(group_id)

        expected_permissions = [
            f"{PermissionRegistry.GROUPS_READ}:{group_id}",
            f"{PermissionRegistry.GROUPS_UPDATE}:{group_id}",
            f"{PermissionRegistry.GROUPS_DELETE}:{group_id}",
            f"{PermissionRegistry.MEMBERS_READ}:{group_id}",
            f"{PermissionRegistry.MEMBERS_CREATE}:{group_id}",
            f"{PermissionRegistry.MEMBERS_UPDATE}:{group_id}",
            f"{PermissionRegistry.MEMBERS_DELETE}:{group_id}",
            f"{PermissionRegistry.DRAWS_READ}:{group_id}",
            f"{PermissionRegistry.DRAWS_CREATE}:{group_id}",
            f"{PermissionRegistry.DRAWS_FINALIZE}:{group_id}",
            f"{PermissionRegistry.DRAWS_VIEW_ASSIGNMENTS}:{group_id}",
            f"{PermissionRegistry.EXCLUSIONS_READ}:{group_id}",
            f"{PermissionRegistry.EXCLUSIONS_CREATE}:{group_id}",
            f"{PermissionRegistry.EXCLUSIONS_DELETE}:{group_id}",
        ]

        for expected in expected_permissions:
            assert expected in permissions

    def test_with_real_uuid(self):
        """Test with a real UUID string."""
        group_id = "550e8400-e29b-41d4-a716-446655440000"
        permissions = build_group_owner_permissions(group_id)

        assert f"groups:read:{group_id}" in permissions
        assert f"members:create:{group_id}" in permissions
        assert f"draws:finalize:{group_id}" in permissions
        assert f"exclusions:delete:{group_id}" in permissions
