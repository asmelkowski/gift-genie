from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.get_current_user_query import GetCurrentUserQuery
from gift_genie.application.errors import InvalidCredentialsError
from gift_genie.domain.entities.user import User
from gift_genie.domain.interfaces.repositories import UserRepository


@dataclass(slots=True)
class GetCurrentUserUseCase:
    user_repository: UserRepository

    async def execute(self, query: GetCurrentUserQuery) -> User:
        user = await self.user_repository.get_by_id(query.user_id)
        if not user:
            raise InvalidCredentialsError()
        return user
