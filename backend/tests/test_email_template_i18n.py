import pytest
from pathlib import Path
from gift_genie.infrastructure.services.template_loader import TemplateLoader


@pytest.fixture
def template_loader():
    # Path to templates directory: backend/src/gift_genie/infrastructure/templates
    templates_dir = Path(__file__).parent.parent / "src/gift_genie/infrastructure/templates"
    return TemplateLoader(templates_dir)


def test_polish_template_renders_correctly(template_loader):
    template = template_loader.get_template("assignment_notification.html", language="pl")
    html = template.render(member_name="Jan", receiver_name="Anna", group_name="Rodzina")

    assert "Cześć Jan!" in html
    assert "Anna" in html
    assert "Rodzina" in html
    assert "Tajemniczego Gwiazdora" in html  # Polish-specific text
    assert "Zespół Gift-Genie" in html
    assert "<br>" in html  # Verify signature HTML is preserved


def test_english_template_renders_correctly(template_loader):
    template = template_loader.get_template("assignment_notification.html", language="en")
    html = template.render(member_name="John", receiver_name="Anna", group_name="Family")

    assert "Hi John!" in html
    assert "Anna" in html
    assert "Family" in html
    assert "Secret Santa" in html  # English-specific text
    assert "The Gift-Genie Team" in html


def test_missing_language_falls_back_to_polish(template_loader):
    # 'de' is not supported, should fallback to 'pl'
    template = template_loader.get_template("assignment_notification.html", language="de")
    html = template.render(member_name="Hans", receiver_name="Anna", group_name="Familie")

    # Should fall back to Polish content
    assert "Cześć Hans!" in html
    assert "Tajemniczego Gwiazdora" in html
