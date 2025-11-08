from functools import wraps
from typing import Any, Callable, Awaitable
from fastapi import HTTPException
from pydantic import BaseModel


class PaginationMeta(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int


# Exception to HTTP status code mapping
EXCEPTION_STATUS_MAP = {
    # Import all application exceptions
    "EmailConflictError": 409,
    "InvalidCredentialsError": 401,
    "InvalidGroupNameError": 400,
    "GroupNotFoundError": 404,
    "ForbiddenError": 403,
    "MemberNotFoundError": 404,
    "MemberNameConflictError": 409,
    "MemberEmailConflictError": 409,
    "CannotDeactivateMemberError": 409,
    "ExclusionNotFoundError": 404,
    "DuplicateExclusionError": 409,
    "SelfExclusionNotAllowedError": 409,
    "ExclusionConflictsError": 409,
    "ValidationError": 422,  # Business rule validation failed
    "AuthorizationError": 403,  # User not authorized
    "ConflictError": 409,  # Operation conflicts with current state
    "DrawNotFoundError": 404,
    "CannotDeleteFinalizedDrawError": 409,
    "AssignmentsAlreadyExistError": 409,
    "DrawAlreadyFinalizedError": 409,
    "NoValidDrawConfigurationError": 400,
    "NoAssignmentsToFinalizeError": 400,
    "DrawNotFinalizedError": 400,
    "DrawImpossibleError": 400,
}


def get_http_status_for_exception(exception_class_name: str) -> int:
    """Get the appropriate HTTP status code for an application exception."""
    return EXCEPTION_STATUS_MAP.get(exception_class_name, 500)


def handle_application_exceptions(
    func: Callable[..., Awaitable[Any]],
) -> Callable[..., Awaitable[Any]]:
    """Decorator to handle application exceptions and convert them to HTTP exceptions."""

    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            exception_name = type(e).__name__
            status_code = get_http_status_for_exception(exception_name)

            if status_code == 500:
                # Unexpected error - re-raise as 500
                raise HTTPException(status_code=500, detail={"code": "server_error"})
            else:
                # Known application exception - convert to HTTP exception
                raise HTTPException(
                    status_code=status_code,
                    detail={"code": exception_name.lower(), "message": str(e)},
                )

    return wrapper
