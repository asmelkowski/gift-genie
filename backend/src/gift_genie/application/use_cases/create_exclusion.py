from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from gift_genie.application.dto.create_exclusion_command import CreateExclusionCommand
from gift_genie.application.errors import (
    DuplicateExclusionError,
    ForbiddenError,
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
class CreateExclusionUseCase:
    group_repository: GroupRepository
    member_repository: MemberRepository
    exclusion_repository: ExclusionRepository

    async def execute(self, command: CreateExclusionCommand) -> list[Exclusion]:
        # Validate group exists and user is admin
        group = await self.group_repository.get_by_id(command.group_id)
        if not group:
            raise GroupNotFoundError()

        if group.admin_user_id != command.requesting_user_id:
            raise ForbiddenError()

        # Validate both members exist in group
        giver = await self.member_repository.get_by_group_and_id(
            command.group_id, command.giver_member_id
        )
        if not giver:
            raise MemberNotFoundError()

        receiver = await self.member_repository.get_by_group_and_id(
            command.group_id, command.receiver_member_id
        )
        if not receiver:
            raise MemberNotFoundError()

        # Check no self-exclusion
        if command.giver_member_id == command.receiver_member_id:
            raise SelfExclusionNotAllowedError()

        # Check no duplicate exclusion
        if await self.exclusion_repository.exists_for_pair(
            command.group_id, command.giver_member_id, command.receiver_member_id
        ):
            raise DuplicateExclusionError()

        # Generate timestamp
        now = utc_datetime_now()

        # Create exclusions
        exclusions = []
        exclusion_id_1 = str(uuid4())
        exclusion_1 = Exclusion(
            id=exclusion_id_1,
            group_id=command.group_id,
            giver_member_id=command.giver_member_id,
            receiver_member_id=command.receiver_member_id,
            exclusion_type=ExclusionType.MANUAL,
            is_mutual=command.is_mutual,
            created_at=now,
            created_by_user_id=command.requesting_user_id,
        )
        exclusions.append(exclusion_1)

        if command.is_mutual:
            # Create the reverse exclusion
            exclusion_id_2 = str(uuid4())
            exclusion_2 = Exclusion(
                id=exclusion_id_2,
                group_id=command.group_id,
                giver_member_id=command.receiver_member_id,
                receiver_member_id=command.giver_member_id,
                exclusion_type=ExclusionType.MANUAL,
                is_mutual=True,
                created_at=now,
                created_by_user_id=command.requesting_user_id,
            )
            exclusions.append(exclusion_2)

        # Persist exclusions
        return await self.exclusion_repository.create_many(exclusions)
