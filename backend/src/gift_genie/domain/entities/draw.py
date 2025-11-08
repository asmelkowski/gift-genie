from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from gift_genie.domain.entities.enums import DrawStatus


@dataclass
class Draw:
    id: str
    group_id: str
    status: DrawStatus
    created_at: datetime
    finalized_at: datetime | None
    notification_sent_at: datetime | None
    assignments_count: int = 0

    def is_finalized(self) -> bool:
        return self.status == DrawStatus.FINALIZED

    def can_be_modified(self) -> bool:
        return self.status == DrawStatus.PENDING

    def can_be_deleted(self) -> bool:
        return self.status == DrawStatus.PENDING

    def validate_finalization(self) -> bool:
        return self.status == DrawStatus.PENDING
