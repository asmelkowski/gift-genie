from typing import Protocol


class DrawAlgorithm(Protocol):
    def generate_assignments(
        self,
        member_ids: list[str],
        exclusions: set[tuple[str, str]],
    ) -> dict[str, str]:
        """
        Generate Secret Santa assignments.

        Args:
            member_ids: List of member UUIDs
            exclusions: Set of (giver_id, receiver_id) tuples that are forbidden

        Returns:
            Dict mapping giver_id -> receiver_id

        Raises:
            DrawImpossibleError: If no valid assignment exists
            ValueError: If inputs are invalid (< 3 members, duplicates, etc.)
        """
        ...
