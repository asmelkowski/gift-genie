from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from gift_genie.application.dto.notify_draw_command import NotifyDrawCommand
from gift_genie.application.errors import DrawNotFinalizedError, DrawNotFoundError, ForbiddenError
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.interfaces.notification_service import NotificationService
from gift_genie.domain.interfaces.repositories import (
    AssignmentRepository,
    DrawRepository,
    GroupRepository,
    MemberRepository,
)


@dataclass(slots=True)
class NotifyDrawUseCase:
    draw_repository: DrawRepository
    group_repository: GroupRepository
    assignment_repository: AssignmentRepository
    member_repository: MemberRepository
    notification_service: NotificationService

    async def execute(self, command: NotifyDrawCommand) -> tuple[int, int]:
        # Fetch draw and verify existence
        draw = await self.draw_repository.get_by_id(command.draw_id)
        if draw is None:
            raise DrawNotFoundError()

        # Fetch parent group to verify authorization
        group = await self.group_repository.get_by_id(draw.group_id)
        if group is None:
            raise DrawNotFoundError()

        # Verify authorization: user must be the group owner
        if group.admin_user_id != command.requesting_user_id:
            raise ForbiddenError()

        # Validate draw is finalized
        if not draw.is_finalized():
            raise DrawNotFinalizedError()

        # Check if notifications already sent (unless resend is true)
        if not command.resend and draw.notification_sent_at is not None:
            # Count existing assignments to return as "skipped"
            assignment_count = await self.assignment_repository.count_by_draw(command.draw_id)
            return (0, assignment_count)

        # Fetch all assignments for this draw
        assignments = await self.assignment_repository.list_by_draw(command.draw_id)

        # Build member lookup map (id -> member) for efficient access
        member_ids = set()
        for assignment in assignments:
            member_ids.add(assignment.giver_member_id)
            member_ids.add(assignment.receiver_member_id)

        members = []
        for member_id in member_ids:
            member = await self.member_repository.get_by_id(member_id)
            if member:
                members.append(member)

        member_map = {member.id: member for member in members}

        # Send notifications
        sent_count = 0
        skipped_count = 0

        for assignment in assignments:
            giver = member_map.get(assignment.giver_member_id)
            receiver = member_map.get(assignment.receiver_member_id)

            if giver and receiver and giver.email:
                # Send notification
                success = await self.notification_service.send_assignment_notification(
                    member_email=giver.email,
                    member_name=giver.name,
                    receiver_name=receiver.name,
                    group_name=group.name,
                )
                if success:
                    sent_count += 1
                else:
                    skipped_count += 1
            else:
                # Missing member data or email
                skipped_count += 1

        # Update draw with notification timestamp
        now = datetime.now(tz=UTC)
        updated_draw = Draw(
            id=draw.id,
            group_id=draw.group_id,
            status=draw.status,
            created_at=draw.created_at,
            finalized_at=draw.finalized_at,
            notification_sent_at=now,
        )

        await self.draw_repository.update(updated_draw)

        return (sent_count, skipped_count)
