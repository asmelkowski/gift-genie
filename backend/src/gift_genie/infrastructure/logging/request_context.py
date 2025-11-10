"""Request context management for structured logging."""

import contextvars
import uuid

# Context variables for storing request information
_request_id: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")
_user_id: contextvars.ContextVar[str] = contextvars.ContextVar("user_id", default="")
_request_path: contextvars.ContextVar[str] = contextvars.ContextVar("request_path", default="")
_request_method: contextvars.ContextVar[str] = contextvars.ContextVar("request_method", default="")


def generate_request_id() -> str:
    """Generate a unique request ID."""
    return str(uuid.uuid4())


def set_request_context(
    request_id: str, user_id: str = "", path: str = "", method: str = ""
) -> None:
    """Set the request context variables."""
    _request_id.set(request_id)
    _user_id.set(user_id)
    _request_path.set(path)
    _request_method.set(method)


def get_request_context() -> dict[str, str]:
    """Get the current request context as a dictionary."""
    return {
        "request_id": _request_id.get(),
        "user_id": _user_id.get(),
        "path": _request_path.get(),
        "method": _request_method.get(),
    }
