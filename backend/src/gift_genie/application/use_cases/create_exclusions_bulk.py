from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from gift_genie.application.dto.create_exclusions_bulk_command import CreateExclusionsBulkCommand
from gift_genie.application.errors import (
    ExclusionConflictsError,
    GroupNotFoundError,
    MemberNotFoundError,
    SelfExclusionNotAllowedError,
)
from gift_genie.domain.entities.enums import ExclusionType
from gift_genie.domain.entities.exclusion import Exclusion
from gift_genie.domain.interfaces.repositories import (
    ExclusionRepository,
    GroupRepository,
    MemberRepository,
)
from gift_genie.libs.utils import utc_datetime_now


@dataclass(slots=True)
class CreateExclusionsBulkUseCase:
    group_repository: GroupRepository
    member_repository: MemberRepository
    exclusion_repository: ExclusionRepository

    async def execute(self, command: CreateExclusionsBulkCommand) -> list[Exclusion]:
        # Validate group exists and user is owner
        group = await self.group_repository.get_by_id(command.group_id)
        if not group:
            raise GroupNotFoundError()

        # Authorization is now handled at presentation layer via require_permission (on group_id)

        # Validate all members exist in group
        member_ids = set()
        for item in command.items:
            member_ids.add(item.giver_member_id)
            member_ids.add(item.receiver_member_id)

        for member_id in member_ids:
            member = await self.member_repository.get_by_group_and_id(command.group_id, member_id)
            if not member:
                raise MemberNotFoundError()

        # Check no self-exclusions
        for item in command.items:
            if item.giver_member_id == item.receiver_member_id:
                raise SelfExclusionNotAllowedError()

        # Check for conflicts (duplicates within batch and existing)
        pairs = [(item.giver_member_id, item.receiver_member_id) for item in command.items]
        conflicts = await self.exclusion_repository.check_conflicts_bulk(command.group_id, pairs)

        if conflicts:
            raise ExclusionConflictsError(conflicts)

        # Generate timestamp
        now = utc_datetime_now()

        # Expand mutual exclusions and create exclusion entities
        exclusions = []
        for item in command.items:
            exclusion_id_1 = str(uuid4())
            exclusion_1 = Exclusion(
                id=exclusion_id_1,
                group_id=command.group_id,
                giver_member_id=item.giver_member_id,
                receiver_member_id=item.receiver_member_id,
                exclusion_type=ExclusionType.MANUAL,
                is_mutual=item.is_mutual,
                created_at=now,
                created_by_user_id=command.requesting_user_id,
            )
            exclusions.append(exclusion_1)

            if item.is_mutual:
                # Create the reverse exclusion
                exclusion_id_2 = str(uuid4())
                exclusion_2 = Exclusion(
                    id=exclusion_id_2,
                    group_id=command.group_id,
                    giver_member_id=item.receiver_member_id,
                    receiver_member_id=item.giver_member_id,
                    exclusion_type=ExclusionType.MANUAL,
                    is_mutual=True,
                    created_at=now,
                    created_by_user_id=command.requesting_user_id,
                )
                exclusions.append(exclusion_2)

        # Persist all exclusions in transaction
        return await self.exclusion_repository.create_many(exclusions)
