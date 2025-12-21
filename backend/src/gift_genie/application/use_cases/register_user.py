from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from gift_genie.application.dto.register_user_command import RegisterUserCommand
from gift_genie.application.errors import EmailConflictError
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.interfaces.repositories import (
    UserRepository,
    UserPermissionRepository,
)
from gift_genie.domain.interfaces.security import PasswordHasher
from gift_genie.infrastructure.permissions.default_permissions import (
    USER_BASIC_PERMISSIONS,
)


@dataclass(slots=True)
class RegisterUserUseCase:
    user_repository: UserRepository
    password_hasher: PasswordHasher
    user_permission_repository: UserPermissionRepository

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
            role=UserRole.USER,
            created_at=now,
            updated_at=now,
        )

        # Persist user
        created = await self.user_repository.create(user)

        # Grant default permissions based on role
        if created.role == UserRole.USER:
            for permission_code in USER_BASIC_PERMISSIONS:
                try:
                    await self.user_permission_repository.grant_permission(
                        user_id=created.id,
                        permission_code=permission_code,
                        granted_by=None,
                    )
                except ValueError:
                    # Permission might not exist yet - skip
                    pass

        return created
