from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate, EventOut, EventListResponse
from app.services.event_service import EventService
from app.api.deps import get_current_user, get_optional_current_user, require_role

router = APIRouter(tags=["Події"])


@router.get("/events", response_model=EventListResponse, summary="Список університетських подій")
async def list_events(
    search: Optional[str] = Query(None, description="Пошук за назвою або описом"),
    category: Optional[str] = Query(None, description="Фільтр за категорією"),
    status: Optional[str] = Query(None, description="Фільтр за статусом (published, canceled, completed)"),
    organization_id: Optional[str] = Query(None, description="Фільтр за організацією"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    items, total = await EventService.list(
        db=db,
        current_user=current_user,
        search=search,
        category=category,
        status_filter=status,
        organization_id=organization_id,
        page=page,
        size=size
    )
    return EventListResponse(items=items, total=total, page=page, size=size)


@router.post("/events", response_model=EventOut, status_code=status.HTTP_201_CREATED, summary="Створити подію (лише організатор або адмін)")
async def create_event(
    req: EventCreate,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: AsyncSession = Depends(get_db)
):
    return await EventService.create(db, current_user, req)


@router.get("/me/events", response_model=EventListResponse, summary="Події, які планує відвідати поточний користувач")
async def get_my_events(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    items, total = await EventService.list(
        db=db,
        current_user=current_user,
        attendee_user_id=current_user.id,
        page=page,
        size=size
    )
    return EventListResponse(items=items, total=total, page=page, size=size)


@router.get("/events/{id}", response_model=EventOut, summary="Деталі університетської події")
async def get_event(
    id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EventService.get_by_id(db, id, current_user=current_user)


@router.patch("/events/{id}", response_model=EventOut, summary="Редагувати подію")
async def update_event(
    id: str,
    req: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EventService.update(db, id, current_user, req)


@router.post("/events/{id}/attend", response_model=EventOut, summary="Позначити плани відвідати подію")
async def attend_event(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EventService.attend(db, id, current_user)


@router.delete("/events/{id}/attend", response_model=EventOut, summary="Скасувати участь у події")
async def leave_event(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EventService.leave(db, id, current_user)
