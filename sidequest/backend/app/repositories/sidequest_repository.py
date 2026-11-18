from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.sidequest import SideQuest, SideQuestParticipant
from app.models.user import User


class SideQuestRepository:
    @staticmethod
    async def get_by_id(db: AsyncSession, sidequest_id: str, for_update: bool = False) -> Optional[SideQuest]:
        query = (
            select(SideQuest)
            .where(SideQuest.id == sidequest_id)
            .options(
                selectinload(SideQuest.creator),
                selectinload(SideQuest.participants).selectinload(SideQuestParticipant.user)
            )
        )
        if for_update and db.bind and db.bind.dialect.name == "postgresql":
            query = query.with_for_update()
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def list(
        db: AsyncSession,
        search: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        creator_id: Optional[str] = None,
        participant_user_id: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[SideQuest], int]:
        conditions = []

        if search:
            search_term = f"%{search.strip().lower()}%"
            conditions.append(or_(
                func.lower(SideQuest.title).like(search_term),
                func.lower(SideQuest.description).like(search_term),
                func.lower(SideQuest.location).like(search_term)
            ))

        if category:
            conditions.append(SideQuest.category == category.lower().strip())

        if status:
            conditions.append(SideQuest.status == status)

        if creator_id:
            conditions.append(SideQuest.creator_id == creator_id)

        if participant_user_id:
            conditions.append(
                SideQuest.id.in_(
                    select(SideQuestParticipant.sidequest_id).where(
                        SideQuestParticipant.user_id == participant_user_id
                    )
                )
            )

        base_query = select(SideQuest)
        count_query = select(func.count(SideQuest.id))

        if conditions:
            base_query = base_query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * size
        query = (
            base_query.options(
                selectinload(SideQuest.creator),
                selectinload(SideQuest.participants).selectinload(SideQuestParticipant.user)
            )
            .order_by(SideQuest.starts_at.asc())
            .offset(offset)
            .limit(size)
        )

        result = await db.execute(query)
        items = list(result.scalars().all())
        return items, total

    @staticmethod
    async def create(db: AsyncSession, sidequest: SideQuest, creator_joins: bool = True) -> SideQuest:
        if creator_joins:
            participant = SideQuestParticipant(
                sidequest_id=sidequest.id,
                user_id=sidequest.creator_id
            )
            sidequest.participants = [participant]

        db.add(sidequest)
        await db.commit()
        return await SideQuestRepository.get_by_id(db, sidequest.id)

    @staticmethod
    async def update(db: AsyncSession, sidequest: SideQuest) -> SideQuest:
        await db.commit()
        return await SideQuestRepository.get_by_id(db, sidequest.id)

    @staticmethod
    async def delete(db: AsyncSession, sidequest: SideQuest) -> None:
        await db.delete(sidequest)
        await db.commit()

    @staticmethod
    async def get_participant(db: AsyncSession, sidequest_id: str, user_id: str) -> Optional[SideQuestParticipant]:
        query = select(SideQuestParticipant).where(
            SideQuestParticipant.sidequest_id == sidequest_id,
            SideQuestParticipant.user_id == user_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def count_participants(db: AsyncSession, sidequest_id: str) -> int:
        query = select(func.count(SideQuestParticipant.id)).where(
            SideQuestParticipant.sidequest_id == sidequest_id
        )
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def add_participant(db: AsyncSession, sidequest_id: str, user_id: str) -> SideQuestParticipant:
        participant = SideQuestParticipant(
            sidequest_id=sidequest_id,
            user_id=user_id
        )
        db.add(participant)
        await db.commit()
        return participant

    @staticmethod
    async def remove_participant(db: AsyncSession, sidequest_id: str, user_id: str) -> None:
        participant = await SideQuestRepository.get_participant(db, sidequest_id, user_id)
        if participant:
            await db.delete(participant)
            await db.commit()
