from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.get_draw_query import GetDrawQuery
from gift_genie.application.errors import DrawNotFoundError, ForbiddenError
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.interfaces.repositories import DrawRepository, GroupRepository


@dataclass(slots=True)
class GetDrawUseCase:
    draw_repository: DrawRepository
    group_repository: GroupRepository

    async def execute(self, query: GetDrawQuery) -> Draw:
        # Fetch draw by ID
        draw = await self.draw_repository.get_by_id(query.draw_id)
        if draw is None:
            raise DrawNotFoundError()

        # Fetch parent group to verify authorization
        group = await self.group_repository.get_by_id(draw.group_id)
        if group is None:
            # This shouldn't happen if DB is consistent, but handle it
            raise DrawNotFoundError()

        # Verify authorization: user must be the group admin
        if group.admin_user_id != query.requesting_user_id:
            raise ForbiddenError()

        return draw