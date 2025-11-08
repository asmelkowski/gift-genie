import random
from typing import Dict, List, Set, Tuple

from gift_genie.application.errors import DrawImpossibleError
from gift_genie.domain.interfaces.draw_algorithm import DrawAlgorithm


class ConstraintDrawAlgorithm(DrawAlgorithm):
    """Constraint satisfaction algorithm for Secret Santa draws using backtracking.

    This algorithm generates valid assignments by:
    1. Building a constraint graph of valid giver->receiver pairs
    2. Ordering givers by constraint (fewest options first)
    3. Using backtracking to find a valid assignment
    """

    def __init__(self, seed: str | None = None):
        """Initialize algorithm with optional seed for deterministic results.

        Args:
            seed: Optional seed string for reproducible results in testing
        """
        self.seed = seed
        self.random = random.Random(seed) if seed else random.Random()

    def generate_assignments(
        self,
        member_ids: List[str],
        exclusions: Set[Tuple[str, str]],
    ) -> Dict[str, str]:
        """Generate Secret Santa assignments using constraint satisfaction.

        Args:
            member_ids: List of member UUIDs participating in the draw
            exclusions: Set of (giver_id, receiver_id) tuples that are forbidden

        Returns:
            Dict mapping giver_id -> receiver_id

        Raises:
            DrawImpossibleError: If no valid assignment exists
            ValueError: If inputs are invalid (< 3 members, duplicates, etc.)
        """
        # Input validation
        if len(member_ids) < 3:
            raise ValueError("Draw requires at least 3 members")

        if len(set(member_ids)) != len(member_ids):
            raise ValueError("Duplicate member IDs are not allowed")

        # Build constraint graph: giver -> set of valid receivers
        constraints = self._build_constraints(member_ids, exclusions)

        # Check for obvious impossibilities
        for giver, receivers in constraints.items():
            if not receivers:
                raise DrawImpossibleError(f"No valid receivers for member {giver}")

        # Sort givers by constraint (fewest options first)
        ordered_givers = sorted(constraints.keys(), key=lambda g: len(constraints[g]))

        # Initialize tracking
        assignment: Dict[str, str] = {}  # giver -> receiver
        used_receivers: Set[str] = set()  # receivers already assigned

        # Start backtracking
        if self._backtrack(ordered_givers, constraints, assignment, used_receivers, 0):
            return assignment
        else:
            raise DrawImpossibleError(
                "No valid assignment configuration possible with current constraints"
            )

    def _build_constraints(
        self, member_ids: List[str], exclusions: Set[Tuple[str, str]]
    ) -> Dict[str, Set[str]]:
        """Build constraint graph: giver -> set of valid receivers."""
        constraints = {}

        for giver in member_ids:
            valid_receivers = set()
            for receiver in member_ids:
                if giver != receiver and (giver, receiver) not in exclusions:
                    valid_receivers.add(receiver)
            constraints[giver] = valid_receivers

        return constraints

    def _backtrack(
        self,
        ordered_givers: List[str],
        constraints: Dict[str, Set[str]],
        assignment: Dict[str, str],
        used_receivers: Set[str],
        index: int,
    ) -> bool:
        """Recursive backtracking to find valid assignment.

        Args:
            ordered_givers: Givers ordered by constraint (fewest options first)
            constraints: Constraint graph
            assignment: Current partial assignment
            used_receivers: Receivers already assigned
            index: Current giver index to assign

        Returns:
            True if assignment found, False otherwise
        """
        # Base case: all givers assigned
        if index == len(ordered_givers):
            return True

        giver = ordered_givers[index]
        valid_receivers = constraints[giver] - used_receivers

        # Shuffle for randomness (or deterministic with seed)
        valid_receivers_list = list(valid_receivers)
        self.random.shuffle(valid_receivers_list)

        # Try each possible receiver
        for receiver in valid_receivers_list:
            # Assign
            assignment[giver] = receiver
            used_receivers.add(receiver)

            # Recurse
            if self._backtrack(ordered_givers, constraints, assignment, used_receivers, index + 1):
                return True

            # Backtrack
            del assignment[giver]
            used_receivers.remove(receiver)

        # No valid assignment found
        return False
