import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from email.mime.multipart import MIMEMultipart

from gift_genie.infrastructure.services.smtp_notification_service import SmtpNotificationService


@pytest.fixture
def smtp_service():
    with patch("gift_genie.infrastructure.services.smtp_notification_service.TemplateLoader"):
        service = SmtpNotificationService()
        service.smtp_user = "test-user"
        service.smtp_password = "test-password"
        return service


@pytest.mark.anyio
async def test_send_notification_success(smtp_service):
    # Mock template rendering
    mock_template = MagicMock()
    mock_template.render.return_value = "<html>Email Body</html>"
    smtp_service.template_loader.get_template.return_value = mock_template

    # Mock aiosmtplib.send
    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        success = await smtp_service.send_assignment_notification(
            member_email="giver@example.com",
            member_name="Giver",
            receiver_name="Receiver",
            group_name="Test Group",
            language="pl",
        )

        assert success is True
        mock_send.assert_called_once()

        # Verify message structure
        call_args = mock_send.call_args[0]
        msg = call_args[0]
        assert isinstance(msg, MIMEMultipart)
        assert msg["To"] == "giver@example.com"
        assert msg["Subject"] == "Wynik losowania Tajemniczego Gwiazdora - Test Group"


@pytest.mark.anyio
async def test_send_notification_no_credentials(smtp_service):
    # Clear credentials
    smtp_service.smtp_user = None
    smtp_service.smtp_password = None

    success = await smtp_service.send_assignment_notification(
        member_email="giver@example.com",
        member_name="Giver",
        receiver_name="Receiver",
        group_name="Test Group",
    )

    # Success should be True because it falls back to log-only stub behavior
    # for development/staging environments where credentials might be missing.
    assert success is True


@pytest.mark.anyio
async def test_send_notification_smtp_error(smtp_service):
    # Mock template rendering
    mock_template = MagicMock()
    mock_template.render.return_value = "<html>Email Body</html>"
    smtp_service.template_loader.get_template.return_value = mock_template

    # Mock aiosmtplib.send to raise an exception
    with patch("aiosmtplib.send", side_effect=Exception("SMTP Connection Error")):
        success = await smtp_service.send_assignment_notification(
            member_email="giver@example.com",
            member_name="Giver",
            receiver_name="Receiver",
            group_name="Test Group",
        )

        assert success is False


def test_get_subject_languages(smtp_service):
    assert smtp_service._get_subject("Group", "en") == "Secret Santa Draw Result - Group"
    assert (
        smtp_service._get_subject("Group", "pl") == "Wynik losowania Tajemniczego Gwiazdora - Group"
    )
    assert smtp_service._get_subject("Group", "fr") == "Secret Santa Draw Result - Group"
