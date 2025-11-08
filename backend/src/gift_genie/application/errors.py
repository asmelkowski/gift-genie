class EmailConflictError(Exception):
    """Raised when attempting to register a user with a duplicate email (case-insensitive)."""

    def __init__(self, message: str = "Email already in use"):
        super().__init__(message)


class InvalidCredentialsError(Exception):
    """Raised when login credentials are invalid."""

    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message)


class InvalidGroupNameError(Exception):
    """Raised when group name validation fails."""

    def __init__(self, message: str = "Group name must be 1-100 characters"):
        super().__init__(message)


class GroupNotFoundError(Exception):
    """Raised when a group is not found."""

    pass


class ForbiddenError(Exception):
    """Raised when user lacks permission for an operation."""

    pass


class MemberNotFoundError(Exception):
    pass


class MemberNameConflictError(Exception):
    def __init__(self, message: str = "Member name already exists in this group"):
        super().__init__(message)


class MemberEmailConflictError(Exception):
    def __init__(self, message: str = "Member email already exists in this group"):
        super().__init__(message)


class CannotDeactivateMemberError(Exception):
    def __init__(self, message: str = "Cannot deactivate member with pending draw assignments"):
        super().__init__(message)


class InvalidMemberNameError(Exception):
    def __init__(self, message: str = "Member name must be 1-100 characters"):
        super().__init__(message)


class ExclusionNotFoundError(Exception):
    pass


class DuplicateExclusionError(Exception):
    def __init__(self, message: str = "Exclusion already exists for this pairing"):
        super().__init__(message)


class SelfExclusionNotAllowedError(Exception):
    def __init__(
        self, message: str = "Cannot create exclusion where giver and receiver are the same"
    ):
        super().__init__(message)


class ExclusionConflictsError(Exception):
    def __init__(self, conflicts: list[dict[str, str]]):
        self.conflicts = conflicts
        super().__init__("Multiple conflicts detected in bulk exclusion creation")


class ValidationError(Exception):
    """Business rule validation failed"""

    pass


class AuthorizationError(Exception):
    """User not authorized for operation"""

    pass


class ConflictError(Exception):
    """Operation conflicts with current state"""

    pass


class DrawNotFoundError(Exception):
    """Raised when a draw is not found."""

    pass


class CannotDeleteFinalizedDrawError(Exception):
    """Raised when attempting to delete a finalized draw."""

    def __init__(self, message: str = "Cannot delete a finalized draw"):
        super().__init__(message)


class AssignmentsAlreadyExistError(Exception):
    """Raised when attempting to execute a draw that already has assignments."""

    def __init__(self, message: str = "Assignments already exist for this draw"):
        super().__init__(message)


class DrawAlreadyFinalizedError(Exception):
    """Raised when attempting to finalize an already finalized draw."""

    def __init__(self, message: str = "Draw is already finalized"):
        super().__init__(message)


class NoValidDrawConfigurationError(Exception):
    """Raised when no valid draw configuration can be found."""

    def __init__(self, message: str = "No valid draw configuration found"):
        super().__init__(message)


class NoAssignmentsToFinalizeError(Exception):
    """Raised when attempting to finalize a draw with no assignments."""

    def __init__(self, message: str = "No assignments to finalize"):
        super().__init__(message)


class DrawNotFinalizedError(Exception):
    """Raised when attempting to notify for a draw that is not finalized."""

    def __init__(self, message: str = "Draw is not finalized"):
        super().__init__(message)


class DrawImpossibleError(Exception):
    """Raised when the draw algorithm cannot find a valid assignment configuration."""

    def __init__(self, message: str = "No valid draw configuration possible"):
        super().__init__(message)
