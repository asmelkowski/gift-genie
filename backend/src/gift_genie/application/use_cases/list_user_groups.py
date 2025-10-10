from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.list_groups_query import ListGroupsQuery
from gift_genie.domain.entities.group import Group
from gift_genie.domain.interfaces.repositories import GroupRepository


@dataclass(slots=True)
class ListUserGroupsUseCase:
    group_repository: GroupRepository

    async def execute(self, query: ListGroupsQuery) -> tuple[list[Group], int]:
        # Validate pagination parameters
        if query.page < 1:
            raise ValueError("page must be >= 1")
        if not (1 <= query.page_size <= 100):
            raise ValueError("page_size must be 1-100")

        # Parse sort parameter (validation handled in repo or here if needed)
        # For now, assume repo handles it

        # Call repository
        return await self.group_repository.list_by_admin_user(
            query.user_id,
            query.search,
            query.page,
            query.page_size,
            query.sort,
        )