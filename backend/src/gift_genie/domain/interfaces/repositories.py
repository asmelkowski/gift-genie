from typing import Protocol, runtime_checkable
from gift_genie.domain.entities.user import User


@runtime_checkable
class UserRepository(Protocol):
    """Repository interface for User entities with case-insensitive email operations"""

    async def create(self, user: User) -> User: ...

    async def get_by_email_ci(self, email: str) -> User | None: ...

    async def email_exists_ci(self, email: str) -> bool: ...
