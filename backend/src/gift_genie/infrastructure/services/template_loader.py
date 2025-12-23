from pathlib import Path

from jinja2 import Environment, FileSystemLoader, Template, TemplateNotFound


class TemplateLoader:
    """Load email templates with language support."""

    def __init__(self, templates_dir: Path | str) -> None:
        self.templates_dir = Path(templates_dir)
        self.env = Environment(
            loader=FileSystemLoader(self.templates_dir),
            autoescape=True,
        )

    def get_template(self, template_name: str, language: str = "pl") -> Template:
        """Get template for specified language with fallback.

        Args:
            template_name: Template file name (e.g., 'assignment_notification.html')
            language: Language code (e.g., 'pl', 'en')

        Returns:
            Jinja2 Template instance

        Raises:
            TemplateNotFound: If template doesn't exist in any language
        """
        # Try requested language first
        lang_path = f"emails/{language}/{template_name}"
        try:
            return self.env.get_template(lang_path)
        except TemplateNotFound:
            pass

        # Fallback to Polish (primary language)
        if language != "pl":
            fallback_path = f"emails/pl/{template_name}"
            try:
                return self.env.get_template(fallback_path)
            except TemplateNotFound:
                pass

        # Last resort: English
        if language != "en":
            fallback_path = f"emails/en/{template_name}"
            try:
                return self.env.get_template(fallback_path)
            except TemplateNotFound:
                pass

        raise TemplateNotFound(f"Template {template_name} not found for any language")
