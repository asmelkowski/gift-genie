"""Test-only endpoint guard middleware.

This middleware protects test endpoints by:
- Checking if the request path starts with /api/v1/test/
- Verifying that ENVIRONMENT is NOT "production"
- Returning 404 if test endpoints are accessed in production
- Logging a warning if test endpoints are used in non-production environments
"""

from typing import Any, Awaitable, Callable

from fastapi import Request, Response, HTTPException
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware

from gift_genie.infrastructure.config.settings import get_settings


class TestGuardMiddleware(BaseHTTPMiddleware):
    """Middleware to protect test-only endpoints from production access."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Check if this is a test endpoint and verify environment.

        Args:
            request: The incoming HTTP request
            call_next: The next middleware/handler in the chain

        Returns:
            The response from the next handler, or 404 if test endpoint in production

        Raises:
            HTTPException: 404 if test endpoint is accessed in production
        """
        # Check if this is a test endpoint
        if request.url.path.startswith("/api/v1/test/"):
            settings = get_settings()

            # Reject test endpoints in production
            if settings.ENV == "production":
                logger.warning(
                    "Test endpoint access attempt in production",
                    extra={
                        "path": request.url.path,
                        "method": request.method,
                        "client_ip": request.client.host if request.client else "",
                    },
                )
                raise HTTPException(status_code=404, detail="Not Found")

            # Log warning for test endpoints in non-production
            logger.warning(
                "Test endpoint accessed in non-production environment",
                extra={
                    "environment": settings.ENV,
                    "path": request.url.path,
                    "method": request.method,
                },
            )

        # Continue to the next handler
        return await call_next(request)


def setup_test_guard_middleware(app: Any) -> None:
    """Add test guard middleware to the FastAPI application.

    This middleware should be added early in the middleware chain to ensure
    test endpoints are protected before any other processing.

    Args:
        app: The FastAPI application instance
    """
    app.add_middleware(TestGuardMiddleware)
