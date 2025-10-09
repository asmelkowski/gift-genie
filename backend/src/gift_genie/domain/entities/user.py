from dataclasses import dataclass
from datetime import datetime


@dataclass
class User:
    id: str
    email: str
    password_hash: str
    name: str
    created_at: datetime
    updated_at: datetime

    def validate_email(self) -> bool:
        return len(self.email.strip()) > 0 and "@" in self.email

    def validate_name(self) -> bool:
        return len(self.name.strip()) > 0
