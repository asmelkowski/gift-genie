from __future__ import annotations

from enum import Enum


class DrawStatus(str, Enum):
    PENDING = "pending"
    FINALIZED = "finalized"


class ExclusionType(str, Enum):
    MANUAL = "manual"
    HISTORICAL = "historical"
