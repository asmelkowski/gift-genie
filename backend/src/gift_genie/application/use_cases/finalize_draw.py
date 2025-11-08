from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from gift_genie.application.dto.finalize_draw_command import FinalizeDrawCommand
from gift_genie.application.errors import (
    DrawAlreadyFinalizedError,
    DrawNotFoundError,
    ForbiddenError,
    NoAssignmentsToFinalizeError,
)
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.entities.enums import DrawStatus
from gift_genie.domain.interfaces.repositories import (
    AssignmentRepository,
    DrawRepository,
    GroupRepository,
)


@dataclass(slots=True)
class FinalizeDrawUseCase:
    draw_repository: DrawRepository
    group_repository: GroupRepository
    assignment_repository: AssignmentRepository

    async def execute(self, command: FinalizeDrawCommand) -> Draw:
        # Fetch draw and verify existence
        draw = await self.draw_repository.get_by_id(command.draw_id)
        if draw is None:
            raise DrawNotFoundError()

        # Fetch parent group to verify authorization
        group = await self.group_repository.get_by_id(draw.group_id)
        if group is None:
            raise DrawNotFoundError()

        # Verify authorization: user must be the group admin
        if group.admin_user_id != command.requesting_user_id:
            raise ForbiddenError()

        # Validate draw is pending
        if not draw.can_be_modified():
            raise DrawAlreadyFinalizedError()

        # Check that assignments exist
        assignment_count = await self.assignment_repository.count_by_draw(command.draw_id)
        if assignment_count == 0:
            raise NoAssignmentsToFinalizeError()

        # Update draw status and timestamp
        now = datetime.now(tz=UTC)
        updated_draw = Draw(
            id=draw.id,
            group_id=draw.group_id,
            status=DrawStatus.FINALIZED,
            created_at=draw.created_at,
            finalized_at=now,
            notification_sent_at=draw.notification_sent_at,
        )

        # Persist changes
        return await self.draw_repository.update(updated_draw)
