from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.list_exclusions_query import ListExclusionsQuery
from gift_genie.application.errors import GroupNotFoundError
from gift_genie.domain.entities.exclusion import Exclusion
from gift_genie.domain.interfaces.repositories import ExclusionRepository, GroupRepository


@dataclass(slots=True)
class ListExclusionsUseCase:
    group_repository: GroupRepository
    exclusion_repository: ExclusionRepository

    async def execute(self, query: ListExclusionsQuery) -> tuple[list[Exclusion], int]:
        # Validate group exists
        group = await self.group_repository.get_by_id(query.group_id)
        if not group:
            raise GroupNotFoundError()

        # Authorization is now handled at presentation layer via require_permission (on group_id)

        # Query exclusions with filters
        return await self.exclusion_repository.list_by_group(
            group_id=query.group_id,
            exclusion_type=query.exclusion_type,
            giver_member_id=query.giver_member_id,
            receiver_member_id=query.receiver_member_id,
            page=query.page,
            page_size=query.page_size,
            sort=query.sort,
        )
