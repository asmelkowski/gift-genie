"""Middleware module for the presentation layer."""

from gift_genie.presentation.middleware.exception_logging import setup_exception_logging_middleware
from gift_genie.presentation.middleware.test_guard import setup_test_guard_middleware

__all__ = ["setup_exception_logging_middleware", "setup_test_guard_middleware"]
