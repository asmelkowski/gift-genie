from dataclasses import dataclass
from datetime import datetime


@dataclass
class Member:
    id: str
    group_id: str
    name: str
    email: str | None
    is_active: bool
    created_at: datetime
    language: str | None = None

    def validate_name(self) -> bool:
        return len(self.name.strip()) > 0

    def can_receive_notification(self) -> bool:
        return self.email is not None and len(self.email.strip()) > 0
