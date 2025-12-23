import logging
from pathlib import Path

from gift_genie.domain.interfaces.notification_service import NotificationService
from gift_genie.infrastructure.services.template_loader import TemplateLoader

logger = logging.getLogger(__name__)


class EmailNotificationService(NotificationService):
    """Stub implementation of NotificationService for MVP.

    Logs assignment notifications to console instead of sending emails.
    Replace with real SMTP implementation for production.
    """

    def __init__(self) -> None:
        """Initialize the email notification service with template loader."""
        # Get the templates directory path
        templates_dir = Path(__file__).parent.parent / "templates"
        self.template_loader = TemplateLoader(templates_dir)

    async def send_assignment_notification(
        self,
        member_email: str,
        member_name: str,
        receiver_name: str,
        group_name: str,
        language: str = "pl",
    ) -> bool:
        """Send Secret Santa assignment notification.

        For MVP, this logs to console. In production, this would send an email.

        Args:
            member_email: Email address of the giver
            member_name: Name of the giver
            receiver_name: Name of the receiver
            group_name: Name of the group
            language: Language code for the email (default: 'pl')

        Returns:
            True if "sent" successfully (always for stub), False otherwise
        """
        try:
            # Load and render email template
            template = self.template_loader.get_template(
                "assignment_notification.html", language=language
            )
            email_body = template.render(
                member_name=member_name,
                receiver_name=receiver_name,
                group_name=group_name,
            )

            subject = self._get_subject(group_name, language)

            # Log the notification (would be email content in production)
            logger.info(
                f"NOTIFICATION [lang={language}]: Sending to {member_email} "
                f"({member_name}) assigned to {receiver_name} in '{group_name}'"
            )
            logger.debug(f"Email Subject: {subject}")
            logger.debug(f"Email Body Preview:\n{email_body[:200]}...")

            # In production, this would:
            # 1. Render email template with member_name, receiver_name, group_name
            # 2. Send via SMTP (e.g., using aiosmtplib or similar)
            # 3. Handle delivery failures gracefully

            return True

        except Exception as e:
            logger.error(
                f"Failed to send notification to {member_email}: {e}",
                exc_info=True,
            )
            return False

    def _get_subject(self, group_name: str, language: str) -> str:
        """Get localized email subject.

        Args:
            group_name: Name of the group
            language: Language code (e.g., 'pl', 'en')

        Returns:
            Localized email subject
        """
        if language == "en":
            return f"Secret Santa Draw Result - {group_name}"
        # Default to Polish for other language codes
        return f"Wynik losowania Tajemniczego Gwiazdora - {group_name}"
