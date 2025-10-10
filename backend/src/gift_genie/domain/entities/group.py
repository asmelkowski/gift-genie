from dataclasses import dataclass
from datetime import datetime


@dataclass
class Group:
    id: str
    admin_user_id: str
    name: str
    historical_exclusions_enabled: bool
    historical_exclusions_lookback: int
    created_at: datetime
    updated_at: datetime

    def can_execute_draw(self, active_member_count: int) -> bool:
        return active_member_count >= 3

    def validate_name(self) -> bool:
        return 1 <= len(self.name.strip()) <= 100
