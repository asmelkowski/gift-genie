from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.delete_exclusion_command import DeleteExclusionCommand
from gift_genie.application.errors import ExclusionNotFoundError
from gift_genie.domain.interfaces.repositories import ExclusionRepository, GroupRepository


@dataclass(slots=True)
class DeleteExclusionUseCase:
    group_repository: GroupRepository
    exclusion_repository: ExclusionRepository

    async def execute(self, command: DeleteExclusionCommand) -> None:
        # Validate exclusion exists and belongs to group
        exclusion = await self.exclusion_repository.get_by_group_and_id(
            command.group_id, command.exclusion_id
        )
        if not exclusion:
            raise ExclusionNotFoundError()

        # Authorization is now handled at presentation layer via require_permission (on group_id)

        # Delete exclusion
        await self.exclusion_repository.delete(command.exclusion_id)
