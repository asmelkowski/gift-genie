"""Exception logging middleware for capturing and logging unexpected exceptions."""

import traceback
from typing import Any, Awaitable, Callable

from fastapi import Request, Response
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware

from gift_genie.infrastructure.logging import generate_request_id, set_request_context


class ExceptionLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log unexpected exceptions with full context."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Process the request and log any unexpected exceptions."""
        # Generate and set request context
        request_id = generate_request_id()
        set_request_context(
            request_id=request_id,
            path=str(request.url.path),
            method=request.method,
        )

        try:
            # Process the request
            response = await call_next(request)

            # Add request_id to response headers for tracing
            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as exc:
            # Log the unexpected exception with full context
            logger.error(
                "Unexpected exception occurred",
                extra={
                    "exception_type": type(exc).__name__,
                    "exception_message": str(exc),
                    "stacktrace": traceback.format_exc(),
                    "request_id": request_id,
                    "path": str(request.url.path),
                    "method": request.method,
                    "query_params": str(request.url.query),
                    "user_agent": request.headers.get("user-agent", ""),
                    "client_ip": request.client.host if request.client else "",
                },
            )

            # Re-raise the exception to let FastAPI's exception handlers process it
            raise


def setup_exception_logging_middleware(app: Any) -> None:
    """Add exception logging middleware to the FastAPI application."""
    app.add_middleware(ExceptionLoggingMiddleware)
