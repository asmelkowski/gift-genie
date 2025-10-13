from typing import Protocol


class NotificationService(Protocol):
    async def send_assignment_notification(
        self,
        member_email: str,
        member_name: str,
        receiver_name: str,
        group_name: str
    ) -> bool:
        """
        Send Secret Santa assignment notification email.

        Returns:
            True if sent successfully, False otherwise
        """
        ...
