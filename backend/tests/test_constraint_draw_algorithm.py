import pytest
from uuid import uuid4

from gift_genie.application.errors import DrawImpossibleError
from gift_genie.infrastructure.algorithms.constraint_draw_algorithm import ConstraintDrawAlgorithm


class TestConstraintDrawAlgorithm:
    def test_generate_assignments_success_three_members(self):
        """Test successful assignment generation with 3 members."""
        algorithm = ConstraintDrawAlgorithm(seed="test-seed")

        member_ids = [str(uuid4()) for _ in range(3)]
        exclusions = set()

        result = algorithm.generate_assignments(member_ids, exclusions)

        # Verify all members are assigned
        assert len(result) == 3
        assert set(result.keys()) == set(member_ids)
        assert set(result.values()) == set(member_ids)

        # Verify no one is assigned to themselves
        for giver, receiver in result.items():
            assert giver != receiver

        # Verify it's a valid permutation (each person gives and receives once)
        receivers = set(result.values())
        assert len(receivers) == 3

    def test_generate_assignments_success_five_members(self):
        """Test successful assignment generation with 5 members."""
        algorithm = ConstraintDrawAlgorithm(seed="test-seed-2")

        member_ids = [str(uuid4()) for _ in range(5)]
        exclusions = set()

        result = algorithm.generate_assignments(member_ids, exclusions)

        assert len(result) == 5
        assert set(result.keys()) == set(member_ids)
        assert set(result.values()) == set(member_ids)

        # Verify no self-assignments
        for giver, receiver in result.items():
            assert giver != receiver

    def test_generate_assignments_with_exclusions(self):
        """Test assignment generation with manual exclusions."""
        algorithm = ConstraintDrawAlgorithm(seed="test-seed-3")

        member_ids = [str(uuid4()) for _ in range(4)]
        # Exclude member 0 from giving to member 1
        exclusions = {(member_ids[0], member_ids[1])}

        result = algorithm.generate_assignments(member_ids, exclusions)

        assert len(result) == 4
        assert set(result.keys()) == set(member_ids)
        assert set(result.values()) == set(member_ids)

        # Verify the exclusion is respected
        assert result[member_ids[0]] != member_ids[1]

        # Verify no self-assignments
        for giver, receiver in result.items():
            assert giver != receiver

    def test_generate_assignments_deterministic_with_seed(self):
        """Test that results are deterministic with the same seed."""
        member_ids = [str(uuid4()) for _ in range(4)]

        algorithm1 = ConstraintDrawAlgorithm(seed="deterministic-seed")
        result1 = algorithm1.generate_assignments(member_ids, set())

        algorithm2 = ConstraintDrawAlgorithm(seed="deterministic-seed")
        result2 = algorithm2.generate_assignments(member_ids, set())

        assert result1 == result2

    def test_generate_assignments_random_without_seed(self):
        """Test that results are random without seed."""
        member_ids = [str(uuid4()) for _ in range(4)]

        # Run multiple times to check for randomness
        results = []
        for _ in range(10):
            algorithm = ConstraintDrawAlgorithm()
            result = algorithm.generate_assignments(member_ids, set())
            results.append(result)

        # At least some results should be different (with high probability)
        assert len(set(tuple(sorted(r.items())) for r in results)) > 1

    def test_generate_assignments_insufficient_members(self):
        """Test error when fewer than 3 members."""
        algorithm = ConstraintDrawAlgorithm()

        # Test with 2 members
        member_ids = [str(uuid4()), str(uuid4())]
        with pytest.raises(ValueError, match="Draw requires at least 3 members"):
            algorithm.generate_assignments(member_ids, set())

        # Test with 1 member
        member_ids = [str(uuid4())]
        with pytest.raises(ValueError, match="Draw requires at least 3 members"):
            algorithm.generate_assignments(member_ids, set())

        # Test with empty list
        with pytest.raises(ValueError, match="Draw requires at least 3 members"):
            algorithm.generate_assignments([], set())

    def test_generate_assignments_duplicate_members(self):
        """Test error when duplicate member IDs provided."""
        algorithm = ConstraintDrawAlgorithm()

        member_id = str(uuid4())
        member_ids = [member_id, member_id, str(uuid4())]

        with pytest.raises(ValueError, match="Duplicate member IDs are not allowed"):
            algorithm.generate_assignments(member_ids, set())

    def test_generate_assignments_impossible_constraints(self):
        """Test error when constraints make assignment impossible."""
        algorithm = ConstraintDrawAlgorithm()

        member_ids = ["A", "B", "C"]
        # Create impossible constraints: A cannot give to anyone
        exclusions = {
            ("A", "B"),  # A cannot give to B
            ("A", "C"),  # A cannot give to C
        }

        with pytest.raises(DrawImpossibleError, match="No valid receivers for member"):
            algorithm.generate_assignments(member_ids, exclusions)

    def test_generate_assignments_no_valid_receivers(self):
        """Test error when a member has no valid receivers."""
        algorithm = ConstraintDrawAlgorithm()

        member_ids = [str(uuid4()) for _ in range(4)]
        # Member 0 cannot give to anyone (exclude all possible receivers)
        exclusions = {
            (member_ids[0], member_ids[1]),
            (member_ids[0], member_ids[2]),
            (member_ids[0], member_ids[3]),
        }

        with pytest.raises(DrawImpossibleError, match="No valid receivers for member"):
            algorithm.generate_assignments(member_ids, exclusions)

    def test_generate_assignments_complex_exclusions(self):
        """Test assignment with complex but solvable exclusion patterns."""
        algorithm = ConstraintDrawAlgorithm(seed="complex-test")

        member_ids = [str(uuid4()) for _ in range(5)]
        # Create a complex exclusion pattern that should still be solvable
        exclusions = {
            (member_ids[0], member_ids[1]),
            (member_ids[1], member_ids[2]),
            (member_ids[2], member_ids[3]),
            (member_ids[3], member_ids[4]),
            (member_ids[4], member_ids[0]),
        }

        result = algorithm.generate_assignments(member_ids, exclusions)

        assert len(result) == 5
        assert set(result.keys()) == set(member_ids)
        assert set(result.values()) == set(member_ids)

        # Verify all exclusions are respected
        for giver, receiver in exclusions:
            assert result[giver] != receiver

        # Verify no self-assignments
        for giver, receiver in result.items():
            assert giver != receiver

    def test_build_constraints_basic(self):
        """Test constraint building with no exclusions."""
        algorithm = ConstraintDrawAlgorithm()

        member_ids = ["A", "B", "C"]
        exclusions = set()

        constraints = algorithm._build_constraints(member_ids, exclusions)

        assert len(constraints) == 3
        for giver in member_ids:
            valid_receivers = constraints[giver]
            assert len(valid_receivers) == 2  # Can give to 2 others
            assert giver not in valid_receivers  # Cannot give to self

    def test_build_constraints_with_exclusions(self):
        """Test constraint building with exclusions."""
        algorithm = ConstraintDrawAlgorithm()

        member_ids = ["A", "B", "C", "D"]
        exclusions = {("A", "B"), ("B", "C")}

        constraints = algorithm._build_constraints(member_ids, exclusions)

        assert constraints["A"] == {"C", "D"}  # A cannot give to B
        assert constraints["B"] == {"A", "D"}  # B cannot give to C
        assert constraints["C"] == {"A", "B", "D"}  # C has no exclusions
        assert constraints["D"] == {"A", "B", "C"}  # D has no exclusions

    def test_backtrack_success(self):
        """Test successful backtracking."""
        algorithm = ConstraintDrawAlgorithm(seed="backtrack-test")

        ordered_givers = ["A", "B", "C"]
        constraints = {"A": {"B", "C"}, "B": {"A", "C"}, "C": {"A", "B"}}
        assignment = {}
        used_receivers = set()

        success = algorithm._backtrack(ordered_givers, constraints, assignment, used_receivers, 0)

        assert success
        assert len(assignment) == 3
        assert set(assignment.keys()) == {"A", "B", "C"}
        assert set(assignment.values()) == {"A", "B", "C"}

        # Verify validity
        for giver, receiver in assignment.items():
            assert giver != receiver
            assert receiver in constraints[giver]

    def test_backtrack_failure(self):
        """Test backtracking failure with impossible constraints."""
        algorithm = ConstraintDrawAlgorithm()

        ordered_givers = ["A", "B", "C"]
        constraints = {
            "A": set(),  # A has no valid receivers
            "B": {"C"},
            "C": {"B"},
        }
        assignment = {}
        used_receivers = set()

        # A has no valid receivers, so this should fail
        success = algorithm._backtrack(ordered_givers, constraints, assignment, used_receivers, 0)

        assert not success
