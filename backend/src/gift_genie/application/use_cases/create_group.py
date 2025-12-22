from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from loguru import logger

from gift_genie.application.dto.create_group_command import CreateGroupCommand
from gift_genie.domain.entities.group import Group
from gift_genie.domain.interfaces.repositories import (
    GroupRepository,
    UserPermissionRepository,
)
from gift_genie.infrastructure.permissions.group_owner_permissions import (
    build_group_owner_permissions,
)


@dataclass(slots=True)
class CreateGroupUseCase:
    group_repository: GroupRepository
    user_permission_repository: UserPermissionRepository

    async def execute(self, command: CreateGroupCommand) -> Group:
        # Permission check removed (now at presentation layer via require_permission)
        # Format validation handled at presentation layer
        # Business validation: check for duplicate names if needed (not currently implemented)

        # Generate group ID and timestamps
        group_id = str(uuid4())
        now = datetime.now(tz=UTC)

        # Construct domain entity
        group = Group(
            id=group_id,
            admin_user_id=command.admin_user_id,
            name=command.name,  # Already validated and stripped at presentation layer
            historical_exclusions_enabled=command.historical_exclusions_enabled,
            historical_exclusions_lookback=command.historical_exclusions_lookback,  # Already validated at presentation layer
            created_at=now,
            updated_at=now,
        )

        # Persist
        created_group = await self.group_repository.create(group)

        # Auto-grant owner permissions
        permission_codes = build_group_owner_permissions(created_group.id)
        await self.user_permission_repository.grant_permissions_bulk(
            user_id=command.admin_user_id,
            permission_codes=permission_codes,
            granted_by=None,  # System granted
        )
        logger.info(
            "Auto-granted group owner permissions",
            user_id=command.admin_user_id,
            group_id=created_group.id,
            count=len(permission_codes),
        )

        return created_group
