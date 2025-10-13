from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.domain.entities.draw import DrawStatus
from gift_genie.domain.entities.member import Member
from gift_genie.domain.interfaces.repositories import MemberRepository
from gift_genie.infrastructure.database.models.assignment import AssignmentModel
from gift_genie.infrastructure.database.models.draw import DrawModel
from gift_genie.infrastructure.database.models.member import MemberModel


class MemberRepositorySqlAlchemy(MemberRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, member: Member) -> Member:
        model = MemberModel(
            id=UUID(member.id),
            group_id=UUID(member.group_id),
            name=member.name,
            email=member.email,
            is_active=member.is_active,
            created_at=member.created_at,
        )
        self._session.add(model)
        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            # Likely foreign key violation if group deleted
            raise ValueError("Failed to create member") from e

        # Refresh to ensure DB defaults
        await self._session.refresh(model)
        return self._to_domain(model)

    async def list_by_group(
        self,
        group_id: str,
        is_active: bool | None,
        search: str | None,
        page: int,
        page_size: int,
        sort: str
    ) -> tuple[list[Member], int]:
        # Build base where clause
        base_where = MemberModel.group_id == UUID(group_id)
        if is_active is not None:
            base_where &= MemberModel.is_active == is_active
        if search:
            search_lower = f"%{search.lower()}%"
            base_where &= (
                func.lower(MemberModel.name).like(search_lower) |
                func.lower(MemberModel.email).like(search_lower)
            )

        # Get total count
        count_stmt = select(func.count()).select_from(MemberModel).where(base_where)
        count_res = await self._session.execute(count_stmt)
        total = count_res.scalar_one() or 0

        # Build query with sorting and pagination
        query = select(MemberModel).where(base_where)
        query = self._apply_sort(query, sort)
        query = query.limit(page_size).offset((page - 1) * page_size)

        # Execute and map
        res = await self._session.execute(query)
        models = res.scalars().all()
        members = [self._to_domain(model) for model in models]

        return members, total

    async def get_by_id(self, member_id: str) -> Optional[Member]:
        stmt = select(MemberModel).where(MemberModel.id == UUID(member_id))
        res = await self._session.execute(stmt)
        row = res.scalar_one_or_none()
        return self._to_domain(row) if row else None

    async def get_many_by_ids(self, member_ids: list[str]) -> dict[str, Member]:
        uuids = [UUID(mid) for mid in member_ids]
        stmt = select(MemberModel).where(MemberModel.id.in_(uuids))
        res = await self._session.execute(stmt)
        models = res.scalars().all()
        return {str(model.id): self._to_domain(model) for model in models}

    async def get_by_group_and_id(self, group_id: str, member_id: str) -> Optional[Member]:
        stmt = select(MemberModel).where(
            MemberModel.id == UUID(member_id),
            MemberModel.group_id == UUID(group_id)
        )
        res = await self._session.execute(stmt)
        row = res.scalar_one_or_none()
        return self._to_domain(row) if row else None

    async def name_exists_in_group(self, group_id: str, name: str, exclude_member_id: str | None = None) -> bool:
        stmt = select(func.count()).select_from(MemberModel).where(
            MemberModel.group_id == UUID(group_id),
            func.lower(MemberModel.name) == name.lower()
        )
        if exclude_member_id:
            stmt = stmt.where(MemberModel.id != UUID(exclude_member_id))

        res = await self._session.execute(stmt)
        count = res.scalar_one() or 0
        return count > 0

    async def email_exists_in_group(self, group_id: str, email: str, exclude_member_id: str | None = None) -> bool:
        stmt = select(func.count()).select_from(MemberModel).where(
            MemberModel.group_id == UUID(group_id),
            func.lower(MemberModel.email) == email.lower()
        )
        if exclude_member_id:
            stmt = stmt.where(MemberModel.id != UUID(exclude_member_id))

        res = await self._session.execute(stmt)
        count = res.scalar_one() or 0
        return count > 0

    async def has_pending_draw(self, member_id: str) -> bool:
        # Check if member has any assignments in pending draws
        stmt = select(func.count()).select_from(AssignmentModel).join(
            DrawModel, AssignmentModel.draw_id == DrawModel.id
        ).where(
            (AssignmentModel.giver_member_id == UUID(member_id)) |
            (AssignmentModel.receiver_member_id == UUID(member_id)),
            DrawModel.status == DrawStatus.PENDING
        )

        res = await self._session.execute(stmt)
        count = res.scalar_one() or 0
        return count > 0

    async def update(self, member: Member) -> Member:
        stmt = select(MemberModel).where(MemberModel.id == UUID(member.id))
        res = await self._session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            raise ValueError("Member not found")

        # Update fields
        model.name = member.name
        model.email = member.email
        model.is_active = member.is_active

        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError("Failed to update member") from e

        await self._session.refresh(model)
        return self._to_domain(model)

    async def delete(self, member_id: str) -> None:
        stmt = delete(MemberModel).where(MemberModel.id == UUID(member_id))
        await self._session.execute(stmt)
        try:
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError("Failed to delete member") from e

    def _apply_sort(self, query, sort: str):
        if sort.startswith("-"):
            field = sort[1:]
            desc = True
        else:
            field = sort
            desc = False

        col: Any
        if field == "created_at":
            col = MemberModel.created_at
        elif field == "name":
            col = MemberModel.name
        else:
            raise ValueError("Invalid sort field")

        if desc:
            return query.order_by(col.desc())
        else:
            return query.order_by(col.asc())

    def _to_domain(self, model: MemberModel) -> Member:
        return Member(
            id=str(model.id),
            group_id=str(model.group_id),
            name=model.name,
            email=model.email,
            is_active=model.is_active,
            created_at=model.created_at,
        )