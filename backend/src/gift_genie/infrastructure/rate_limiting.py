"""Rate limiting configuration for the API.

This module is separated from main.py to avoid circular import issues.
The limiter is instantiated here and can be imported by any module without
creating circular dependencies.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize SlowAPI with in-memory storage (default)
# This provides rate limiting without requiring external dependencies like Redis
limiter = Limiter(key_func=get_remote_address)
