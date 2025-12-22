from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.delete_group_command import DeleteGroupCommand
from gift_genie.application.errors import GroupNotFoundError
from gift_genie.domain.interfaces.repositories import GroupRepository


@dataclass(slots=True)
class DeleteGroupUseCase:
    group_repository: GroupRepository

    async def execute(self, command: DeleteGroupCommand) -> None:
        # Permission check removed (now at presentation layer via require_permission)
        # Fetch group by ID
        group = await self.group_repository.get_by_id(command.group_id)
        if group is None:
            raise GroupNotFoundError()

        # Authorization is now handled at presentation layer via require_permission

        # Delete the group (cascade handled by database)
        await self.group_repository.delete(command.group_id)
