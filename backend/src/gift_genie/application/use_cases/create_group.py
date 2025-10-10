from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from gift_genie.application.dto.create_group_command import CreateGroupCommand
from gift_genie.application.errors import InvalidGroupNameError
from gift_genie.domain.entities.group import Group
from gift_genie.domain.interfaces.repositories import GroupRepository


@dataclass(slots=True)
class CreateGroupUseCase:
    group_repository: GroupRepository

    async def execute(self, command: CreateGroupCommand) -> Group:
        # Strip and validate name
        name = command.name.strip()
        if not (1 <= len(name) <= 100):
            raise InvalidGroupNameError()

        # Validate historical_exclusions_lookback
        if command.historical_exclusions_lookback < 1:
            raise ValueError("historical_exclusions_lookback must be >= 1")

        # Generate group ID and timestamps
        group_id = str(uuid4())
        now = datetime.now(tz=UTC)

        # Construct domain entity
        group = Group(
            id=group_id,
            admin_user_id=command.admin_user_id,
            name=name,
            historical_exclusions_enabled=command.historical_exclusions_enabled,
            historical_exclusions_lookback=command.historical_exclusions_lookback,
            created_at=now,
            updated_at=now,
        )

        # Persist
        return await self.group_repository.create(group)