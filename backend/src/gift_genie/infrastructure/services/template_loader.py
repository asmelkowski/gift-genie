from pathlib import Path
from jinja2 import Environment, FileSystemLoader, Template, TemplateNotFound
from gift_genie.infrastructure.services.i18n import load_translations


class TemplateLoader:
    """Load email templates with language support using Jinja2 i18n extension."""

    def __init__(self, templates_dir: Path | str) -> None:
        self.templates_dir = Path(templates_dir)
        # Locales are expected to be in a directory parallel to templates/emails
        self.locales_dir = self.templates_dir.parent / "locales"
        self.env = Environment(
            loader=FileSystemLoader(self.templates_dir),
            extensions=["jinja2.ext.i18n"],
            autoescape=True,
        )

    def get_template(self, template_name: str, language: str = "pl") -> Template:
        """Get template for specified language using translations.

        Args:
            template_name: Template file name (e.g., 'assignment_notification.html')
            language: Language code (e.g., 'pl', 'en')

        Returns:
            Jinja2 Template instance

        Raises:
            TemplateNotFound: If template doesn't exist
        """
        # Load translations for the requested language
        translations = load_translations(language, self.locales_dir)

        # If language is not Polish and no translations found, try fallback to Polish
        if not translations._catalog and language != "pl":
            translations = load_translations("pl", self.locales_dir)
            language = "pl"

        # Install transitions into the environment
        self.env.install_gettext_translations(translations, newstyle=True)  # type: ignore[attr-defined]

        # With newstyle=True, the variables in trans blocks are passed as keyword arguments
        # and the translation strings should use %(var)s syntax.

        # Simplified path: now templates are directly in the emails/ directory or subfolders
        # We try 'emails/' prefix first for consistency with existing code
        try:
            template = self.env.get_template(f"emails/{template_name}")
        except TemplateNotFound:
            # Fallback to direct name if not found with prefix
            template = self.env.get_template(template_name)

        # Inject language into template globals
        template.globals["language"] = language

        return template
