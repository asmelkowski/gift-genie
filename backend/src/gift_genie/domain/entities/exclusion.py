from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from gift_genie.domain.entities.enums import ExclusionType


@dataclass
class Exclusion:
    id: str
    group_id: str
    giver_member_id: str
    receiver_member_id: str
    exclusion_type: ExclusionType
    is_mutual: bool
    created_at: datetime
    created_by_user_id: str | None

    def is_manual(self) -> bool:
        return self.exclusion_type == ExclusionType.MANUAL

    def is_historical(self) -> bool:
        return self.exclusion_type == ExclusionType.HISTORICAL

    def applies_to_pairing(self, giver_id: str, receiver_id: str) -> bool:
        if self.giver_member_id == giver_id and self.receiver_member_id == receiver_id:
            return True
        if self.is_mutual and self.giver_member_id == receiver_id and self.receiver_member_id == giver_id:
            return True
        return False

    def validate_no_self_exclusion(self) -> bool:
        return self.giver_member_id != self.receiver_member_id