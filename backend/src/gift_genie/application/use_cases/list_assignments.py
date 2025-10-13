from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from gift_genie.application.dto.list_assignments_query import ListAssignmentsQuery
from gift_genie.application.errors import DrawNotFoundError, ForbiddenError
from gift_genie.domain.entities.assignment import Assignment
from gift_genie.domain.interfaces.repositories import (
    AssignmentRepository,
    DrawRepository,
    GroupRepository,
    MemberRepository,
)
from loguru import logger


@dataclass(slots=True)
class AssignmentWithNames:
    """Assignment enriched with member names"""
    id: str
    draw_id: str
    giver_member_id: str
    receiver_member_id: str
    created_at: datetime
    giver_name: str | None
    receiver_name: str | None


@dataclass(slots=True)
class ListAssignmentsUseCase:
    draw_repository: DrawRepository
    group_repository: GroupRepository
    assignment_repository: AssignmentRepository
    member_repository: MemberRepository

    async def execute(
        self, query: ListAssignmentsQuery
    ) -> list[Assignment] | list[AssignmentWithNames]:
        logger.info(
            f"Listing assignments for draw {query.draw_id} "
            f"by user {query.requesting_user_id}, include_names={query.include_names}"
        )

        # Fetch draw and verify existence
        draw = await self.draw_repository.get_by_id(query.draw_id)
        if draw is None:
            logger.warning(f"Draw {query.draw_id} not found")
            raise DrawNotFoundError()

        # Fetch parent group to verify authorization
        group = await self.group_repository.get_by_id(draw.group_id)
        if group is None:
            logger.error(f"Group {draw.group_id} not found for draw {query.draw_id}")
            raise DrawNotFoundError()

        # Verify authorization: user must be the group admin
        if group.admin_user_id != query.requesting_user_id:
            logger.warning(
                f"User {query.requesting_user_id} forbidden from accessing "
                f"draw {query.draw_id} (group {group.id})"
            )
            raise ForbiddenError()

        # Fetch all assignments for the draw
        assignments = await self.assignment_repository.list_by_draw(query.draw_id)
        logger.info(f"Found {len(assignments)} assignments for draw {query.draw_id}")

        # If names not requested, return basic assignments
        if not query.include_names:
            return assignments

        # Enrich with member names
        # Collect unique member IDs
        member_ids = set()
        for assignment in assignments:
            member_ids.add(assignment.giver_member_id)
            member_ids.add(assignment.receiver_member_id)

        # Fetch all members (optimization: batch fetch)
        members_dict = await self.member_repository.get_many_by_ids(list(member_ids))
        members_map: dict[str, str] = {mid: member.name for mid, member in members_dict.items()}

        # Build enriched results
        enriched: list[AssignmentWithNames] = []
        for assignment in assignments:
            enriched.append(
                AssignmentWithNames(
                    id=assignment.id,
                    draw_id=assignment.draw_id,
                    giver_member_id=assignment.giver_member_id,
                    receiver_member_id=assignment.receiver_member_id,
                    created_at=assignment.created_at,
                    giver_name=members_map.get(assignment.giver_member_id),
                    receiver_name=members_map.get(assignment.receiver_member_id),
                )
            )

        return enriched