from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.interfaces.repositories import PermissionRepository
from gift_genie.infrastructure.database.models.permission import PermissionModel


class PermissionRepositorySqlAlchemy(PermissionRepository):
    """SQLAlchemy implementation of the PermissionRepository interface."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_code(self, code: str) -> Permission | None:
        """Fetch a permission by its code."""
        stmt = select(PermissionModel).where(PermissionModel.code == code)
        res = await self._session.execute(stmt)
        row = res.scalar_one_or_none()
        return self._to_domain(row) if row else None

    async def list_all(self) -> list[Permission]:
        """List all permissions in the system."""
        stmt = select(PermissionModel)
        res = await self._session.execute(stmt)
        models = res.scalars().all()
        return [perm for model in models if (perm := self._to_domain(model)) is not None]

    async def list_by_category(self, category: str) -> list[Permission]:
        """List all permissions in a specific category."""
        stmt = select(PermissionModel).where(PermissionModel.category == category)
        res = await self._session.execute(stmt)
        models = res.scalars().all()
        return [perm for model in models if (perm := self._to_domain(model)) is not None]

    async def create(self, permission: Permission) -> Permission:
        """Create a new permission."""
        model = PermissionModel(
            code=permission.code,
            name=permission.name,
            description=permission.description,
            category=permission.category,
            created_at=permission.created_at,
        )
        self._session.add(model)
        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError(f"Failed to create permission {permission.code}") from e

        # Refresh to ensure DB defaults
        await self._session.refresh(model)
        domain = self._to_domain(model)
        assert domain is not None
        return domain

    @staticmethod
    def _to_domain(model: PermissionModel | None) -> Permission | None:
        """Convert database model to domain entity."""
        if not model:
            return None
        return Permission(
            code=model.code,
            name=model.name,
            description=model.description,
            category=model.category,
            created_at=model.created_at,
        )
