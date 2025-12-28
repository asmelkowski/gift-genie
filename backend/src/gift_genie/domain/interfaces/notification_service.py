from typing import Protocol


class NotificationService(Protocol):
    async def send_assignment_notification(
        self,
        member_email: str,
        member_name: str,
        receiver_name: str,
        group_name: str,
        language: str = "en",
    ) -> bool:
        """
        Send Secret Santa assignment notification email.

        Args:
            member_email: Email address of the giver
            member_name: Name of the giver
            receiver_name: Name of the receiver
            group_name: Name of the group
            language: Language code for the email (default: 'pl')

        Returns:
            True if sent successfully, False otherwise
        """
        ...
