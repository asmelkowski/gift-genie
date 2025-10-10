from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from gift_genie.application.dto.update_group_command import UpdateGroupCommand
from gift_genie.application.errors import ForbiddenError, GroupNotFoundError, InvalidGroupNameError
from gift_genie.domain.entities.group import Group
from gift_genie.domain.interfaces.repositories import GroupRepository


@dataclass(slots=True)
class UpdateGroupUseCase:
    group_repository: GroupRepository

    async def execute(self, command: UpdateGroupCommand) -> Group:
        # Fetch group by ID
        group = await self.group_repository.get_by_id(command.group_id)
        if group is None:
            raise GroupNotFoundError()

        # Verify authorization: user must be the group admin
        if group.admin_user_id != command.requesting_user_id:
            raise ForbiddenError()

        # Apply partial updates
        updated = False

        if command.name is not None:
            group.name = command.name.strip()
            if not group.validate_name():
                raise InvalidGroupNameError()
            updated = True

        if command.historical_exclusions_enabled is not None:
            group.historical_exclusions_enabled = command.historical_exclusions_enabled
            updated = True

        if command.historical_exclusions_lookback is not None:
            if command.historical_exclusions_lookback < 1:
                raise ValueError("historical_exclusions_lookback must be >= 1")
            group.historical_exclusions_lookback = command.historical_exclusions_lookback
            updated = True

        # Update timestamp if any changes were made
        if updated:
            group.updated_at = datetime.now(tz=UTC)

        # Persist and return updated group
        return await self.group_repository.update(group)