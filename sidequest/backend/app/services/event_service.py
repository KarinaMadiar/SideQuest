from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.event import Event, Speaker, EventAttendee
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate, EventOut, SpeakerOut, AttendeeOut
from app.schemas.user import UserBrief
from app.schemas.organization import OrganizationBrief
from app.repositories.event_repository import EventRepository


class EventService:
    @staticmethod
    def _format_event(event: Event, current_user: Optional[User] = None) -> EventOut:
        attendee_count = len(event.attendees)
        is_attending = False
        attendees_out: List[AttendeeOut] = []

        for a in event.attendees:
            if current_user and a.user_id == current_user.id:
                is_attending = True

            user_info = a.user
            if user_info.visibility_settings == "hidden" and (not current_user or (current_user.id != a.user_id and current_user.role != "admin")):
                user_brief = UserBrief(
                    id=user_info.id,
                    name="Анонімний учасник",
                    email="hidden@ucu.edu.ua",
                    role=user_info.role,
                    avatar_url=None,
                    visibility_settings="hidden"
                )
            else:
                user_brief = UserBrief(
                    id=user_info.id,
                    name=user_info.name,
                    email=user_info.email,
                    role=user_info.role,
                    avatar_url=user_info.avatar_url,
                    visibility_settings=user_info.visibility_settings
                )

            attendees_out.append(AttendeeOut(
                id=a.id,
                user=user_brief,
                joined_at=a.joined_at
            ))

        creator_brief = UserBrief(
            id=event.creator.id,
            name=event.creator.name,
            email=event.creator.email,
            role=event.creator.role,
            avatar_url=event.creator.avatar_url,
            visibility_settings=event.creator.visibility_settings
        )

        org_brief = None
        if event.organization:
            org_brief = OrganizationBrief(
                id=event.organization.id,
                name=event.organization.name,
                type=event.organization.type,
                logo_url=event.organization.logo_url,
                verification_status=event.organization.verification_status
            )

        speakers_out = [
            SpeakerOut(
                id=s.id,
                name=s.name,
                short_bio=s.short_bio,
                position=s.position,
                linkedin_url=s.linkedin_url,
                display_order=s.display_order
            )
            for s in event.speakers
        ]

        return EventOut(
            id=event.id,
            organization=org_brief,
            creator=creator_brief,
            title=event.title,
            description=event.description,
            category=event.category,
            starts_at=event.starts_at,
            ends_at=event.ends_at,
            location=event.location,
            registration_url=event.registration_url,
            why_attend=event.why_attend,
            preparation_notes=event.preparation_notes,
            status=event.status,
            speakers=speakers_out,
            attendee_count=attendee_count,
            is_attending=is_attending,
            attendees=attendees_out,
            created_at=event.created_at,
            updated_at=event.updated_at
        )

    @staticmethod
    async def create(db: AsyncSession, user: User, req: EventCreate) -> EventOut:
        # Only organizers and admins can create events
        if user.role not in ["organizer", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Лише організатори та адміністратори можуть створювати події"
            )

        event = Event(
            organization_id=req.organization_id,
            creator_id=user.id,
            title=req.title.strip(),
            description=req.description.strip(),
            category=req.category,
            starts_at=req.starts_at,
            ends_at=req.ends_at,
            location=req.location.strip(),
            registration_url=str(req.registration_url) if req.registration_url else None,
            why_attend=req.why_attend.strip() if req.why_attend else None,
            preparation_notes=req.preparation_notes.strip() if req.preparation_notes else None,
            status="published"
        )

        speakers = []
        if req.speakers:
            for s in req.speakers:
                speakers.append(Speaker(
                    name=s.name.strip(),
                    short_bio=s.short_bio.strip(),
                    position=s.position.strip() if s.position else None,
                    linkedin_url=str(s.linkedin_url) if s.linkedin_url else None,
                    display_order=s.display_order
                ))

        created = await EventRepository.create(db, event, speakers)
        return EventService._format_event(created, current_user=user)

    @staticmethod
    async def get_by_id(db: AsyncSession, event_id: str, current_user: Optional[User] = None) -> EventOut:
        event = await EventRepository.get_by_id(db, event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Подію не знайдено"
            )
        return EventService._format_event(event, current_user=current_user)

    @staticmethod
    async def list(
        db: AsyncSession,
        current_user: Optional[User] = None,
        search: Optional[str] = None,
        category: Optional[str] = None,
        status_filter: Optional[str] = None,
        organization_id: Optional[str] = None,
        attendee_user_id: Optional[str] = None,
        creator_id: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[EventOut], int]:
        items, total = await EventRepository.list(
            db=db,
            search=search,
            category=category,
            status=status_filter,
            organization_id=organization_id,
            attendee_user_id=attendee_user_id,
            creator_id=creator_id,
            page=page,
            size=size
        )
        return [EventService._format_event(e, current_user) for e in items], total

    @staticmethod
    async def update(db: AsyncSession, event_id: str, user: User, req: EventUpdate) -> EventOut:
        event = await EventRepository.get_by_id(db, event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Подію не знайдено"
            )

        if event.creator_id != user.id and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="У вас немає прав редагувати цю подію"
            )

        data = req.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(event, key, value)

        updated = await EventRepository.update(db, event)
        return EventService._format_event(updated, current_user=user)

    @staticmethod
    async def attend(db: AsyncSession, event_id: str, user: User) -> EventOut:
        event = await EventRepository.get_by_id(db, event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Подію не знайдено"
            )

        if event.status == "canceled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Подію скасовано. Реєстрація неможлива."
            )

        existing = await EventRepository.get_attendee(db, event_id, user.id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ви вже плануєте відвідати цю подію"
            )

        await EventRepository.add_attendee(db, event_id, user.id)
        db.expunge_all()
        fresh = await EventRepository.get_by_id(db, event_id)
        return EventService._format_event(fresh, current_user=user)

    @staticmethod
    async def leave(db: AsyncSession, event_id: str, user: User) -> EventOut:
        event = await EventRepository.get_by_id(db, event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Подію не знайдено"
            )

        existing = await EventRepository.get_attendee(db, event_id, user.id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ви ще не реєструвалися на цю подію"
            )

        await EventRepository.remove_attendee(db, event_id, user.id)
        db.expunge_all()
        fresh = await EventRepository.get_by_id(db, event_id)
        return EventService._format_event(fresh, current_user=user)
