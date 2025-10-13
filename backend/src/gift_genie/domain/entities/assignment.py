from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING

from gift_genie.domain.entities.exclusion import Exclusion

if TYPE_CHECKING:
    pass


@dataclass
class Assignment:
    id: str
    draw_id: str
    giver_member_id: str
    receiver_member_id: str
    encrypted_receiver_id: str | None
    created_at: datetime

    def validate_no_self_assignment(self) -> bool:
        return self.giver_member_id != self.receiver_member_id

    def is_valid_pairing(self, exclusions: list[Exclusion]) -> bool:
        for exclusion in exclusions:
            if (exclusion.giver_member_id == self.giver_member_id and
                exclusion.receiver_member_id == self.receiver_member_id):
                return False
        return True