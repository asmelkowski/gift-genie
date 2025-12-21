from dataclasses import dataclass
from datetime import datetime


@dataclass
class Permission:
    """Represents a specific permission in the system.

    Permissions follow a naming convention: resource:action[:modifier]
    Examples: draws:notify, groups:create, admin:view_dashboard
    """

    code: str
    name: str
    description: str
    category: str
    created_at: datetime

    def validate_code(self) -> bool:
        """Validate permission code format."""
        return len(self.code.strip()) > 0 and ":" in self.code

    def validate_name(self) -> bool:
        """Validate permission name."""
        return 1 <= len(self.name.strip()) <= 200

    def validate_category(self) -> bool:
        """Validate permission category."""
        return len(self.category.strip()) > 0
