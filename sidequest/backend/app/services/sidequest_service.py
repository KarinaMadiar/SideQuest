from typing import Optional, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.sidequest import SideQuest, SideQuestParticipant
from app.models.user import User
from app.schemas.sidequest import SideQuestCreate, SideQuestUpdate, SideQuestOut, ParticipantOut
from app.schemas.user import UserBrief
from app.repositories.sidequest_repository import SideQuestRepository


class SideQuestService:
    @staticmethod
    def _format_sidequest(sq: SideQuest, current_user: Optional[User] = None) -> SideQuestOut:
        participant_count = len(sq.participants)
        is_joined = False
        participants_out: List[ParticipantOut] = []

        for p in sq.participants:
            if current_user and p.user_id == current_user.id:
                is_joined = True

            # Privacy filter for participants
            user_info = p.user
            if user_info.visibility_settings == "hidden" and (not current_user or (current_user.id != p.user_id and current_user.role != "admin")):
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

            participants_out.append(ParticipantOut(
                id=p.id,
                user=user_brief,
                joined_at=p.joined_at
            ))

        creator_brief = UserBrief(
            id=sq.creator.id,
            name=sq.creator.name,
            email=sq.creator.email,
            role=sq.creator.role,
            avatar_url=sq.creator.avatar_url,
            visibility_settings=sq.creator.visibility_settings
        )

        return SideQuestOut(
            id=sq.id,
            creator=creator_brief,
            title=sq.title,
            description=sq.description,
            category=sq.category,
            starts_at=sq.starts_at,
            ends_at=sq.ends_at,
            location=sq.location,
            capacity=sq.capacity,
            status=sq.status,
            participant_count=participant_count,
            is_joined=is_joined,
            participants=participants_out,
            created_at=sq.created_at,
            updated_at=sq.updated_at
        )

    @staticmethod
    async def create(db: AsyncSession, user: User, req: SideQuestCreate) -> SideQuestOut:
        sidequest = SideQuest(
            creator_id=user.id,
            title=req.title.strip(),
            description=req.description.strip(),
            category=req.category,
            starts_at=req.starts_at,
            ends_at=req.ends_at,
            location=req.location.strip(),
            capacity=req.capacity,
            status="open"
        )
        created = await SideQuestRepository.create(db, sidequest, creator_joins=True)
        return SideQuestService._format_sidequest(created, current_user=user)

    @staticmethod
    async def get_by_id(db: AsyncSession, sidequest_id: str, current_user: Optional[User] = None) -> SideQuestOut:
        sq = await SideQuestRepository.get_by_id(db, sidequest_id)
        if not sq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SideQuest не знайдено"
            )
        return SideQuestService._format_sidequest(sq, current_user=current_user)

    @staticmethod
    async def list(
        db: AsyncSession,
        current_user: Optional[User] = None,
        search: Optional[str] = None,
        category: Optional[str] = None,
        status_filter: Optional[str] = None,
        creator_id: Optional[str] = None,
        participant_user_id: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[SideQuestOut], int]:
        items, total = await SideQuestRepository.list(
            db=db,
            search=search,
            category=category,
            status=status_filter,
            creator_id=creator_id,
            participant_user_id=participant_user_id,
            page=page,
            size=size
        )
        return [SideQuestService._format_sidequest(sq, current_user) for sq in items], total

    @staticmethod
    async def update(db: AsyncSession, sidequest_id: str, user: User, req: SideQuestUpdate) -> SideQuestOut:
        sq = await SideQuestRepository.get_by_id(db, sidequest_id)
        if not sq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SideQuest не знайдено"
            )

        # Authorization: only creator or admin
        if sq.creator_id != user.id and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="У вас немає прав редагувати цей SideQuest"
            )

        # Canceled sidequests cannot be edited
        if sq.status == "canceled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Скасований SideQuest не можна редагувати"
            )

        data = req.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(sq, key, value)

        # Re-check capacity vs count
        curr_count = len(sq.participants)
        if sq.capacity < curr_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Новий ліміт ({sq.capacity}) не може бути меншим за поточну кількість учасників ({curr_count})"
            )
        elif sq.capacity == curr_count and sq.status == "open":
            sq.status = "full"
        elif sq.capacity > curr_count and sq.status == "full":
            sq.status = "open"

        updated = await SideQuestRepository.update(db, sq)
        return SideQuestService._format_sidequest(updated, current_user=user)

    @staticmethod
    async def cancel(db: AsyncSession, sidequest_id: str, user: User) -> SideQuestOut:
        sq = await SideQuestRepository.get_by_id(db, sidequest_id)
        if not sq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SideQuest не знайдено"
            )

        if sq.creator_id != user.id and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="У вас немає прав скасувати цей SideQuest"
            )

        sq.status = "canceled"
        updated = await SideQuestRepository.update(db, sq)
        return SideQuestService._format_sidequest(updated, current_user=user)

    @staticmethod
    async def join(db: AsyncSession, sidequest_id: str, user: User) -> SideQuestOut:
        # Fetch with row lock if possible for atomic operation
        sq = await SideQuestRepository.get_by_id(db, sidequest_id, for_update=True)
        if not sq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SideQuest не знайдено"
            )

        if sq.status == "canceled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Цей SideQuest скасовано. Приєднання неможливе."
            )

        # Check duplicate join
        existing = await SideQuestRepository.get_participant(db, sidequest_id, user.id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ви вже приєдналися до цього SideQuest"
            )

        # Atomic check capacity
        current_count = await SideQuestRepository.count_participants(db, sidequest_id)
        if current_count >= sq.capacity:
            if sq.status != "full":
                sq.status = "full"
                await SideQuestRepository.update(db, sq)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Місць більше немає (SideQuest заповнено)"
            )

        # Add participant
        await SideQuestRepository.add_participant(db, sidequest_id, user.id)

        # If now full, update status
        new_count = current_count + 1
        if new_count >= sq.capacity:
            sq.status = "full"
            await SideQuestRepository.update(db, sq)

        db.expunge_all()
        fresh = await SideQuestRepository.get_by_id(db, sidequest_id)
        return SideQuestService._format_sidequest(fresh, current_user=user)

    @staticmethod
    async def leave(db: AsyncSession, sidequest_id: str, user: User) -> SideQuestOut:
        sq = await SideQuestRepository.get_by_id(db, sidequest_id, for_update=True)
        if not sq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SideQuest не знайдено"
            )

        existing = await SideQuestRepository.get_participant(db, sidequest_id, user.id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ви не є учасником цього SideQuest"
            )

        await SideQuestRepository.remove_participant(db, sidequest_id, user.id)

        # Recheck status: if was 'full', make 'open'
        current_count = await SideQuestRepository.count_participants(db, sidequest_id)
        if sq.status == "full" and current_count < sq.capacity:
            sq.status = "open"
            await SideQuestRepository.update(db, sq)

        db.expunge_all()
        fresh = await SideQuestRepository.get_by_id(db, sidequest_id)
        return SideQuestService._format_sidequest(fresh, current_user=user)
