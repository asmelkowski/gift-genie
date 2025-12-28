import json
from gettext import NullTranslations
from pathlib import Path


class JsonTranslations(NullTranslations):
    """Translations backed by JSON files (compatible with Jinja2 i18n extension)."""

    def __init__(self, translations: dict):
        super().__init__()
        self._catalog = self._flatten(translations)

    def _flatten(self, d: dict, parent_key: str = "") -> dict:
        """Flatten nested dict: {"a": {"b": "c"}} -> {"a.b": "c"}"""
        items = {}
        for k, v in d.items():
            key = f"{parent_key}.{k}" if parent_key else k
            if isinstance(v, dict):
                items.update(self._flatten(v, key))
            else:
                items[key] = v
        return items

    def gettext(self, message: str) -> str:
        return self._catalog.get(message, message)

    def ngettext(self, singular: str, plural: str, n: int) -> str:
        return self.gettext(plural if n != 1 else singular)


def load_translations(language: str, locales_dir: Path) -> JsonTranslations:
    """Load translations for a given language from a JSON file."""
    path = locales_dir / language / "emails.json"
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return JsonTranslations(json.load(f))
        except (json.JSONDecodeError, OSError):
            pass
    return JsonTranslations({})
