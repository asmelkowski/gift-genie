from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from gift_genie.application.dto.create_draw_command import CreateDrawCommand
from gift_genie.application.errors import ForbiddenError, GroupNotFoundError
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.entities.enums import DrawStatus
from gift_genie.domain.interfaces.repositories import DrawRepository, GroupRepository


@dataclass(slots=True)
class CreateDrawUseCase:
    group_repository: GroupRepository
    draw_repository: DrawRepository

    async def execute(self, command: CreateDrawCommand) -> Draw:
        # Verify group exists
        group = await self.group_repository.get_by_id(command.group_id)
        if group is None:
            raise GroupNotFoundError()

        # Verify authorization: user must be the group admin
        if group.admin_user_id != command.requesting_user_id:
            raise ForbiddenError()

        # Generate draw ID and timestamp
        draw_id = str(uuid4())
        now = datetime.now(tz=UTC)

        # Construct domain entity
        draw = Draw(
            id=draw_id,
            group_id=command.group_id,
            status=DrawStatus.PENDING,
            created_at=now,
            finalized_at=None,
            notification_sent_at=None,
        )

        # Persist
        return await self.draw_repository.create(draw)
