from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.list_draws_query import ListDrawsQuery
from gift_genie.application.errors import ForbiddenError, GroupNotFoundError
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.interfaces.repositories import DrawRepository, GroupRepository


@dataclass(slots=True)
class ListDrawsUseCase:
    group_repository: GroupRepository
    draw_repository: DrawRepository

    async def execute(self, query: ListDrawsQuery) -> tuple[list[Draw], int]:
        # Verify group exists
        group = await self.group_repository.get_by_id(query.group_id)
        if group is None:
            raise GroupNotFoundError()

        # Verify authorization: user must be the group admin
        if group.admin_user_id != query.requesting_user_id:
            raise ForbiddenError()

        # List draws with filters
        return await self.draw_repository.list_by_group(
            group_id=query.group_id,
            status=query.status,
            page=query.page,
            page_size=query.page_size,
            sort=query.sort,
        )
