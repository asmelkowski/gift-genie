import logging


from gift_genie.domain.interfaces.notification_service import NotificationService

logger = logging.getLogger(__name__)


class EmailNotificationService(NotificationService):
    """Stub implementation of NotificationService for MVP.

    Logs assignment notifications to console instead of sending emails.
    Replace with real SMTP implementation for production.
    """

    async def send_assignment_notification(
        self,
        member_email: str,
        member_name: str,
        receiver_name: str,
        group_name: str
    ) -> bool:
        """Send Secret Santa assignment notification.

        For MVP, this logs to console. In production, this would send an email.

        Args:
            member_email: Email address of the giver
            member_name: Name of the giver
            receiver_name: Name of the receiver
            group_name: Name of the group

        Returns:
            True if "sent" successfully (always for stub), False otherwise
        """
        try:
            # Log the notification (would be email content in production)
            logger.info(
                f"NOTIFICATION: {member_name} ({member_email}) has been assigned to give to {receiver_name} in group '{group_name}'"
            )

            # In production, this would:
            # 1. Render email template with member_name, receiver_name, group_name
            # 2. Send via SMTP (e.g., using aiosmtplib or similar)
            # 3. Handle delivery failures gracefully

            return True

        except Exception as e:
            logger.error(f"Failed to send notification to {member_email}: {e}")
            return False