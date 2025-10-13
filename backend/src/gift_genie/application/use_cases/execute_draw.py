from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from gift_genie.application.dto.execute_draw_command import ExecuteDrawCommand
from gift_genie.application.errors import AssignmentsAlreadyExistError, DrawAlreadyFinalizedError, DrawNotFoundError, ForbiddenError, NoValidDrawConfigurationError
from gift_genie.domain.entities.assignment import Assignment
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.entities.enums import ExclusionType
from gift_genie.domain.interfaces.draw_algorithm import DrawAlgorithm
from gift_genie.domain.interfaces.repositories import AssignmentRepository, DrawRepository, ExclusionRepository, GroupRepository, MemberRepository


@dataclass(slots=True)
class ExecuteDrawUseCase:
    group_repository: GroupRepository
    draw_repository: DrawRepository
    member_repository: MemberRepository
    exclusion_repository: ExclusionRepository
    assignment_repository: AssignmentRepository
    draw_algorithm: DrawAlgorithm

    async def execute(self, command: ExecuteDrawCommand) -> tuple[Draw, list[Assignment]]:
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

        # Idempotency check: ensure no assignments exist yet
        assignment_count = await self.assignment_repository.count_by_draw(command.draw_id)
        if assignment_count > 0:
            raise AssignmentsAlreadyExistError()

        # Fetch active members for the group
        members, _ = await self.member_repository.list_by_group(
            group_id=draw.group_id,
            is_active=True,
            search=None,
            page=1,
            page_size=1000,  # Get all active members
            sort="name"
        )

        # Validate minimum members
        if len(members) < 3:
            raise NoValidDrawConfigurationError("Group must have at least 3 active members to execute a draw")

        member_ids = [member.id for member in members]

        # Fetch manual exclusions
        manual_exclusions, _ = await self.exclusion_repository.list_by_group(
            group_id=draw.group_id,
            exclusion_type=ExclusionType.MANUAL,
            giver_member_id=None,
            receiver_member_id=None,
            page=1,
            page_size=1000,  # Get all manual exclusions
            sort="created_at"
        )

        # Build exclusion set from manual exclusions
        exclusions = {(excl.giver_member_id, excl.receiver_member_id) for excl in manual_exclusions}

        # Add historical exclusions if enabled
        if group.historical_exclusions_enabled and group.historical_exclusions_lookback > 0:
            historical_exclusions = await self.assignment_repository.get_historical_exclusions(
                group_id=draw.group_id,
                lookback_count=group.historical_exclusions_lookback
            )
            exclusions.update(historical_exclusions)

        # Generate assignments using the algorithm
        try:
            assignment_map = self.draw_algorithm.generate_assignments(member_ids, exclusions)
        except Exception as e:
            # Re-raise as application error
            raise NoValidDrawConfigurationError(f"Unable to generate valid assignments: {str(e)}") from e

        # Create Assignment entities
        now = datetime.now(tz=UTC)
        assignments = []
        for giver_id, receiver_id in assignment_map.items():
            assignment = Assignment(
                id=str(uuid4()),
                draw_id=command.draw_id,
                giver_member_id=giver_id,
                receiver_member_id=receiver_id,
                encrypted_receiver_id=None,  # Not encrypted for now
                created_at=now,
            )
            assignments.append(assignment)

        # Bulk create assignments
        created_assignments = await self.assignment_repository.create_many(assignments)

        # Return draw and assignments
        return (draw, created_assignments)