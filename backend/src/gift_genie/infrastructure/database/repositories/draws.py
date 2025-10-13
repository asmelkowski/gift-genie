from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.entities.enums import DrawStatus
from gift_genie.domain.interfaces.repositories import DrawRepository
from gift_genie.infrastructure.database.models.draw import DrawModel


class DrawRepositorySqlAlchemy(DrawRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, draw: Draw) -> Draw:
        model = DrawModel(
            id=UUID(draw.id),
            group_id=UUID(draw.group_id),
            status=draw.status,
            created_at=draw.created_at,
            finalized_at=draw.finalized_at,
            notification_sent_at=draw.notification_sent_at,
        )
        self._session.add(model)
        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError("Failed to create draw") from e

        await self._session.refresh(model)
        return self._to_domain(model)

    async def list_by_group(
        self,
        group_id: str,
        status: DrawStatus | None,
        page: int,
        page_size: int,
        sort: str
    ) -> tuple[list[Draw], int]:
        # Build base where clause
        base_where = DrawModel.group_id == UUID(group_id)
        if status is not None:
            base_where &= DrawModel.status == status

        # Get total count
        count_stmt = select(func.count()).select_from(DrawModel).where(base_where)
        count_res = await self._session.execute(count_stmt)
        total = count_res.scalar_one() or 0

        # Build query with sorting and pagination
        query = select(DrawModel).where(base_where)
        query = self._apply_sort(query, sort)
        query = query.limit(page_size).offset((page - 1) * page_size)

        # Execute and map
        res = await self._session.execute(query)
        models = res.scalars().all()
        draws = [self._to_domain(model) for model in models]

        return draws, total

    async def get_by_id(self, draw_id: str) -> Draw | None:
        stmt = select(DrawModel).where(DrawModel.id == UUID(draw_id))
        res = await self._session.execute(stmt)
        row = res.scalar_one_or_none()
        return self._to_domain(row) if row else None

    async def get_by_group_and_id(self, group_id: str, draw_id: str) -> Draw | None:
        stmt = select(DrawModel).where(
            DrawModel.id == UUID(draw_id),
            DrawModel.group_id == UUID(group_id)
        )
        res = await self._session.execute(stmt)
        row = res.scalar_one_or_none()
        return self._to_domain(row) if row else None

    async def update(self, draw: Draw) -> Draw:
        stmt = select(DrawModel).where(DrawModel.id == UUID(draw.id))
        res = await self._session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            raise ValueError("Draw not found")

        # Update fields
        model.status = draw.status
        model.finalized_at = draw.finalized_at
        model.notification_sent_at = draw.notification_sent_at

        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError("Failed to update draw") from e

        await self._session.refresh(model)
        return self._to_domain(model)

    async def delete(self, draw_id: str) -> None:
        stmt = delete(DrawModel).where(DrawModel.id == UUID(draw_id))
        await self._session.execute(stmt)
        try:
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError("Failed to delete draw") from e

    def _apply_sort(self, query, sort: str):
        if sort.startswith("-"):
            field = sort[1:]
            desc = True
        else:
            field = sort
            desc = False

        col: Any
        if field == "created_at":
            col = DrawModel.created_at
        else:
            raise ValueError("Invalid sort field")

        if desc:
            return query.order_by(col.desc())
        else:
            return query.order_by(col.asc())

    def _to_domain(self, model: DrawModel) -> Draw:
        return Draw(
            id=str(model.id),
            group_id=str(model.group_id),
            status=model.status,
            created_at=model.created_at,
            finalized_at=model.finalized_at,
            notification_sent_at=model.notification_sent_at,
        )