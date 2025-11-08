from dataclasses import dataclass
from typing import Optional


@dataclass
class UpdateGroupCommand:
    group_id: str
    requesting_user_id: str
    name: Optional[str]
    historical_exclusions_enabled: Optional[bool]
    historical_exclusions_lookback: Optional[int]
