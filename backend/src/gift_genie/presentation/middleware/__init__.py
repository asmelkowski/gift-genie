"""Middleware module for the presentation layer."""

from gift_genie.presentation.middleware.exception_logging import setup_exception_logging_middleware

__all__ = ["setup_exception_logging_middleware"]
