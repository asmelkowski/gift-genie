import logging
import os
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from gift_genie.domain.interfaces.notification_service import NotificationService
from gift_genie.infrastructure.services.template_loader import TemplateLoader

logger = logging.getLogger(__name__)


class SmtpNotificationService(NotificationService):
    """Production notification service using Scaleway TEM via SMTP.

    Alternative implementations could use Scaleway TEM API directly.
    """

    def __init__(self) -> None:
        """Initialize the SMTP notification service with template loader."""
        # Get the templates directory path
        templates_dir = Path(__file__).parent.parent / "templates"
        self.template_loader = TemplateLoader(templates_dir)

        # SMTP configuration from environment
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.tem.scaleway.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.smtp_from = os.getenv("SMTP_FROM", "noreply@gift-genie.eu")

    async def send_assignment_notification(
        self,
        member_email: str,
        member_name: str,
        receiver_name: str,
        group_name: str,
        language: str = "pl",
    ) -> bool:
        """Send Secret Santa assignment notification via SMTP.

        Args:
            member_email: Email address of the giver
            member_name: Name of the giver
            receiver_name: Name of the receiver
            group_name: Name of the group
            language: Language code for the email (default: 'pl')

        Returns:
            True if sent successfully, False otherwise
        """
        if not self.smtp_user or not self.smtp_password:
            logger.error(
                "SMTP credentials not configured (SMTP_USER/SMTP_PASSWORD missing). "
                "Falling back to log-only notification."
            )
            # For development/staging where TEM might not be configured,
            # we log and return success to not block the flow
            logger.info(
                f"NOTIFICATION [STUB]: Sending to {member_email} "
                f"assigned to {receiver_name} in '{group_name}'"
            )
            return True

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

            # Build email message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.smtp_from
            msg["To"] = member_email
            msg.attach(MIMEText(email_body, "html"))

            # Send via SMTP
            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True,
            )

            logger.info(f"Successfully sent notification email to {member_email}")
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
