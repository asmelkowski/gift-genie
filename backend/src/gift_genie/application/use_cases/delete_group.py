from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.delete_group_command import DeleteGroupCommand
from gift_genie.application.errors import ForbiddenError, GroupNotFoundError
from gift_genie.domain.interfaces.repositories import GroupRepository


@dataclass(slots=True)
class DeleteGroupUseCase:
    group_repository: GroupRepository

    async def execute(self, command: DeleteGroupCommand) -> None:
        # Fetch group by ID
        group = await self.group_repository.get_by_id(command.group_id)
        if group is None:
            raise GroupNotFoundError()

        # Verify authorization: user must be the group admin
        if group.admin_user_id != command.requesting_user_id:
            raise ForbiddenError()

        # Delete the group (cascade handled by database)
        await self.group_repository.delete(command.group_id)
