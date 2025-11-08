from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.application.errors import EmailConflictError
from gift_genie.domain.entities.user import User
from gift_genie.domain.interfaces.repositories import UserRepository
from gift_genie.infrastructure.database.models.user import UserModel


class UserRepositorySqlAlchemy(UserRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, user: User) -> User:
        model = UserModel(
            id=UUID(user.id),
            email=user.email,
            password_hash=user.password_hash,
            name=user.name,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
        self._session.add(model)
        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            # Likely unique lower(email) violation
            raise EmailConflictError() from e

        # Refresh to ensure DB defaults
        await self._session.refresh(model)
        return self._to_domain(model)

    async def get_by_id(self, user_id: str) -> Optional[User]:
        stmt = select(UserModel).where(UserModel.id == UUID(user_id))
        res = await self._session.execute(stmt)
        row = res.scalar_one_or_none()
        return self._to_domain(row) if row else None

    async def get_by_email_ci(self, email: str) -> Optional[User]:
        stmt = select(UserModel).where(func.lower(UserModel.email) == func.lower(email))
        res = await self._session.execute(stmt)
        row = res.scalar_one_or_none()
        return self._to_domain(row) if row else None

    async def email_exists_ci(self, email: str) -> bool:
        stmt = (
            select(func.count())
            .select_from(UserModel)
            .where(func.lower(UserModel.email) == func.lower(email))
        )
        res = await self._session.execute(stmt)
        count = res.scalar_one() or 0
        return count > 0

    def _to_domain(self, model: UserModel) -> User:
        return User(
            id=str(model.id),
            email=model.email,
            password_hash=model.password_hash,
            name=model.name,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
