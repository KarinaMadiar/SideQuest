from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.event import Event, Speaker, EventAttendee


class EventRepository:
    @staticmethod
    async def get_by_id(db: AsyncSession, event_id: str) -> Optional[Event]:
        query = (
            select(Event)
            .where(Event.id == event_id)
            .options(
                selectinload(Event.organization),
                selectinload(Event.creator),
                selectinload(Event.speakers),
                selectinload(Event.attendees).selectinload(EventAttendee.user)
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def list(
        db: AsyncSession,
        search: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        organization_id: Optional[str] = None,
        attendee_user_id: Optional[str] = None,
        creator_id: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[Event], int]:
        conditions = []

        if search:
            search_term = f"%{search.strip().lower()}%"
            conditions.append(or_(
                func.lower(Event.title).like(search_term),
                func.lower(Event.description).like(search_term),
                func.lower(Event.location).like(search_term)
            ))

        if category:
            conditions.append(Event.category == category.lower().strip())

        if status:
            conditions.append(Event.status == status)

        if organization_id:
            conditions.append(Event.organization_id == organization_id)

        if creator_id:
            conditions.append(Event.creator_id == creator_id)

        if attendee_user_id:
            conditions.append(
                Event.id.in_(
                    select(EventAttendee.event_id).where(
                        EventAttendee.user_id == attendee_user_id
                    )
                )
            )

        base_query = select(Event)
        count_query = select(func.count(Event.id))

        if conditions:
            base_query = base_query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * size
        query = (
            base_query.options(
                selectinload(Event.organization),
                selectinload(Event.creator),
                selectinload(Event.speakers),
                selectinload(Event.attendees).selectinload(EventAttendee.user)
            )
            .order_by(Event.starts_at.asc())
            .offset(offset)
            .limit(size)
        )

        result = await db.execute(query)
        items = list(result.scalars().all())
        return items, total

    @staticmethod
    async def create(db: AsyncSession, event: Event, speakers: Optional[List[Speaker]] = None) -> Event:
        if speakers:
            event.speakers = speakers

        db.add(event)
        await db.commit()
        db.expunge_all()
        return await EventRepository.get_by_id(db, event.id)

    @staticmethod
    async def update(db: AsyncSession, event: Event) -> Event:
        await db.commit()
        return await EventRepository.get_by_id(db, event.id)

    @staticmethod
    async def delete(db: AsyncSession, event: Event) -> None:
        await db.delete(event)
        await db.commit()

    @staticmethod
    async def get_attendee(db: AsyncSession, event_id: str, user_id: str) -> Optional[EventAttendee]:
        query = select(EventAttendee).where(
            EventAttendee.event_id == event_id,
            EventAttendee.user_id == user_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def count_attendees(db: AsyncSession, event_id: str) -> int:
        query = select(func.count(EventAttendee.id)).where(
            EventAttendee.event_id == event_id
        )
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def add_attendee(db: AsyncSession, event_id: str, user_id: str) -> EventAttendee:
        attendee = EventAttendee(
            event_id=event_id,
            user_id=user_id
        )
        db.add(attendee)
        await db.commit()
        return attendee

    @staticmethod
    async def remove_attendee(db: AsyncSession, event_id: str, user_id: str) -> None:
        attendee = await EventRepository.get_attendee(db, event_id, user_id)
        if attendee:
            await db.delete(attendee)
            await db.commit()
