from dataclasses import dataclass

from gift_genie.domain.entities.assignment import Assignment
from gift_genie.domain.entities.draw import Draw


@dataclass
class GetDrawResult:
    draw: Draw
    assignments: list[Assignment]