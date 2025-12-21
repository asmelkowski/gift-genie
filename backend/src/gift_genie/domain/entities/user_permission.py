from dataclasses import dataclass
from datetime import datetime


@dataclass
class UserPermission:
    """Represents the association between a user and a permission.

    This is a many-to-many junction entity that tracks which permissions
    are granted to which users, including audit information.
    """

    user_id: str
    permission_code: str
    granted_at: datetime
    granted_by: str | None

    def validate(self) -> bool:
        """Validate the user permission association."""
        return len(self.user_id.strip()) > 0 and len(self.permission_code.strip()) > 0
