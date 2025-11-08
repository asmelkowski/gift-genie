from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.domain.entities.group import Group
from gift_genie.domain.interfaces.repositories import GroupRepository
from gift_genie.infrastructure.database.models.group import GroupModel
from gift_genie.infrastructure.database.models.member import MemberModel


class GroupRepositorySqlAlchemy(GroupRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, group: Group) -> Group:
        model = GroupModel(
            id=UUID(group.id),
            admin_user_id=UUID(group.admin_user_id),
            name=group.name,
            historical_exclusions_enabled=group.historical_exclusions_enabled,
            historical_exclusions_lookback=group.historical_exclusions_lookback,
            created_at=group.created_at,
            updated_at=group.updated_at,
        )
        self._session.add(model)
        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            # Likely foreign key violation if user deleted
            raise ValueError("Failed to create group") from e

        # Refresh to ensure DB defaults
        await self._session.refresh(model)
        return self._to_domain(model)

    async def list_by_admin_user(
        self, user_id: str, search: str | None, page: int, page_size: int, sort: str
    ) -> tuple[list[Group], int]:
        # Build base where clause
        base_where = GroupModel.admin_user_id == UUID(user_id)
        if search:
            base_where &= func.lower(GroupModel.name).contains(func.lower(search))

        # Get total count
        count_stmt = select(func.count()).select_from(GroupModel).where(base_where)
        count_res = await self._session.execute(count_stmt)
        total = count_res.scalar_one() or 0

        # Build query with sorting and pagination
        query = select(GroupModel).where(base_where)
        query = self._apply_sort(query, sort)
        query = query.limit(page_size).offset((page - 1) * page_size)

        # Execute and map
        res = await self._session.execute(query)
        models = res.scalars().all()
        groups = [self._to_domain(model) for model in models]

        return groups, total

    async def get_by_id(self, group_id: str) -> Optional[Group]:
        stmt = select(GroupModel).where(GroupModel.id == UUID(group_id))
        res = await self._session.execute(stmt)
        row = res.scalar_one_or_none()
        return self._to_domain(row) if row else None

    async def get_member_stats(self, group_id: str) -> tuple[int, int]:
        group_uuid = UUID(group_id)

        # Total member count
        total_stmt = (
            select(func.count()).select_from(MemberModel).where(MemberModel.group_id == group_uuid)
        )
        total_res = await self._session.execute(total_stmt)
        total_count = total_res.scalar_one() or 0

        # Active member count
        active_stmt = (
            select(func.count())
            .select_from(MemberModel)
            .where(MemberModel.group_id == group_uuid, MemberModel.is_active)
        )
        active_res = await self._session.execute(active_stmt)
        active_count = active_res.scalar_one() or 0

        return (total_count, active_count)

    async def update(self, group: Group) -> Group:
        stmt = select(GroupModel).where(GroupModel.id == UUID(group.id))
        res = await self._session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            raise ValueError("Group not found")

        # Update fields
        model.name = group.name
        model.historical_exclusions_enabled = group.historical_exclusions_enabled
        model.historical_exclusions_lookback = group.historical_exclusions_lookback
        model.updated_at = group.updated_at

        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError("Failed to update group") from e

        await self._session.refresh(model)
        return self._to_domain(model)

    async def delete(self, group_id: str) -> None:
        stmt = delete(GroupModel).where(GroupModel.id == UUID(group_id))
        await self._session.execute(stmt)
        try:
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError("Failed to delete group") from e

    def _apply_sort(self, query: Select, sort: str) -> Select:
        if sort.startswith("-"):
            field = sort[1:]
            desc = True
        else:
            field = sort
            desc = False

        col: Any
        if field == "created_at":
            col = GroupModel.created_at
        elif field == "name":
            col = GroupModel.name
        else:
            raise ValueError("Invalid sort field")

        if desc:
            return query.order_by(col.desc())
        else:
            return query.order_by(col.asc())

    def _to_domain(self, model: GroupModel) -> Group:
        return Group(
            id=str(model.id),
            admin_user_id=str(model.admin_user_id),
            name=model.name,
            historical_exclusions_enabled=model.historical_exclusions_enabled,
            historical_exclusions_lookback=model.historical_exclusions_lookback,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
