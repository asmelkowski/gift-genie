from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.get_group_details_query import GetGroupDetailsQuery
from gift_genie.application.errors import GroupNotFoundError
from gift_genie.domain.entities.group import Group
from gift_genie.domain.interfaces.repositories import GroupRepository


@dataclass(slots=True)
class GetGroupDetailsUseCase:
    group_repository: GroupRepository

    async def execute(self, query: GetGroupDetailsQuery) -> tuple[Group, tuple[int, int]]:
        # Fetch group by ID
        group = await self.group_repository.get_by_id(query.group_id)
        if group is None:
            raise GroupNotFoundError()

        # Authorization is now handled at presentation layer via require_permission

        # Fetch member statistics
        stats = await self.group_repository.get_member_stats(query.group_id)

        return (group, stats)
