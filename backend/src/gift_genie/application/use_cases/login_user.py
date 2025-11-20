from __future__ import annotations

from dataclasses import dataclass

from loguru import logger

from gift_genie.application.dto.login_command import LoginCommand
from gift_genie.application.errors import InvalidCredentialsError
from gift_genie.domain.entities.user import User
from gift_genie.domain.interfaces.repositories import UserRepository
from gift_genie.domain.interfaces.security import PasswordHasher


@dataclass(slots=True)
class LoginUserUseCase:
    user_repository: UserRepository
    password_hasher: PasswordHasher

    async def execute(self, command: LoginCommand) -> User:
        # Fetch user by email (case-insensitive)
        user = await self.user_repository.get_by_email_ci(command.email.strip())
        if not user:
            logger.warning(f"Login failed: User not found for email {command.email}")
            raise InvalidCredentialsError()

        # Verify password
        if not await self.password_hasher.verify(command.password, user.password_hash):
            logger.warning(f"Login failed: Password mismatch for user {user.id} ({command.email})")
            logger.debug(f"Password length: {len(command.password)}")
            logger.debug(f"Hash length: {len(user.password_hash)}")
            raise InvalidCredentialsError()

        return user
