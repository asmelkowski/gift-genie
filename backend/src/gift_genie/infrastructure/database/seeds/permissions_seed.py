"""Seed script to populate the permissions table with all defined permissions.

This script is idempotent - it can be run multiple times safely.
It will skip permissions that already exist.
"""

from datetime import UTC, datetime

from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.interfaces.repositories import PermissionRepository
from gift_genie.infrastructure.permissions.permission_registry import (
    PermissionRegistry,
)


async def seed_permissions(permission_repository: PermissionRepository) -> None:
    """Populate the permissions table with all defined permissions.

    This function is idempotent - it can be run multiple times without
    causing issues. It will skip permissions that already exist.

    Args:
        permission_repository: Repository for persisting permissions
    """
    permissions_to_create = PermissionRegistry.all_permissions()
    created_count = 0
    skipped_count = 0

    for code, name, description, category in permissions_to_create:
        # Check if permission already exists
        existing = await permission_repository.get_by_code(code)
        if existing:
            skipped_count += 1
            continue

        # Create new permission
        permission = Permission(
            code=code,
            name=name,
            description=description,
            category=category,
            created_at=datetime.now(tz=UTC),
        )

        await permission_repository.create(permission)
        created_count += 1

    print(f"Permission seeding complete: {created_count} created, {skipped_count} skipped")
