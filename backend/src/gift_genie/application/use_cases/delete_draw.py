from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.delete_draw_command import DeleteDrawCommand
from gift_genie.application.errors import (
    CannotDeleteFinalizedDrawError,
    DrawNotFoundError,
)

from gift_genie.domain.interfaces.repositories import DrawRepository, GroupRepository


@dataclass(slots=True)
class DeleteDrawUseCase:
    draw_repository: DrawRepository
    group_repository: GroupRepository

    async def execute(self, command: DeleteDrawCommand) -> None:
        # Fetch draw by ID
        draw = await self.draw_repository.get_by_id(command.draw_id)
        if draw is None:
            raise DrawNotFoundError()

        # Fetch parent group to verify authorization
        group = await self.group_repository.get_by_id(draw.group_id)
        if group is None:
            raise DrawNotFoundError()

        # Authorization is now handled at presentation layer via require_permission (on draw_id)

        # Validate draw can be deleted (must be pending)
        if not draw.can_be_deleted():
            raise CannotDeleteFinalizedDrawError()

        # Delete the draw (cascades to assignments)
        await self.draw_repository.delete(command.draw_id)
