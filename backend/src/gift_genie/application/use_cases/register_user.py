from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from gift_genie.application.dto.register_user_command import RegisterUserCommand
from gift_genie.application.errors import EmailConflictError
from gift_genie.domain.entities.user import User
from gift_genie.domain.interfaces.repositories import UserRepository
from gift_genie.domain.interfaces.security import PasswordHasher


@dataclass(slots=True)
class RegisterUserUseCase:
    user_repository: UserRepository
    password_hasher: PasswordHasher

    async def execute(self, command: RegisterUserCommand) -> User:
        email_norm = command.email.strip()
        # Pre-check duplicate email (case-insensitive)
        if await self.user_repository.email_exists_ci(email_norm):
            raise EmailConflictError()

        # Hash password
        password_hash = await self.password_hasher.hash(command.password)

        # Build domain entity
        now = datetime.now(tz=UTC)
        user = User(
            id=str(uuid4()),
            email=email_norm,
            password_hash=password_hash,
            name=command.name.strip(),
            created_at=now,
            updated_at=now,
        )

        # Persist
        created = await self.user_repository.create(user)
        return created
