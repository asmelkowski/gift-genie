from dataclasses import dataclass


@dataclass
class ListAssignmentsQuery:
    """Query to list assignments for a draw with optional name enrichment"""
    draw_id: str
    requesting_user_id: str
    include_names: bool