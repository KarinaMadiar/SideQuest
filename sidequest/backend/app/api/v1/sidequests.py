from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.sidequest import SideQuestCreate, SideQuestUpdate, SideQuestOut, SideQuestListResponse
from app.services.sidequest_service import SideQuestService
from app.api.deps import get_current_user, get_optional_current_user

router = APIRouter(tags=["SideQuests"])


@router.get("/sidequests", response_model=SideQuestListResponse, summary="Список SideQuests із фільтрами та пошуком")
async def list_sidequests(
    search: Optional[str] = Query(None, description="Текстовий пошук за назвою, описом або локацією"),
    category: Optional[str] = Query(None, description="Фільтр за категорією"),
    status: Optional[str] = Query(None, description="Фільтр за статусом (open, full, canceled, completed)"),
    creator_id: Optional[str] = Query(None, description="Фільтр за автором"),
    page: int = Query(1, ge=1, description="Номер сторінки"),
    size: int = Query(20, ge=1, le=100, description="Розмір сторінки"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    items, total = await SideQuestService.list(
        db=db,
        current_user=current_user,
        search=search,
        category=category,
        status_filter=status,
        creator_id=creator_id,
        page=page,
        size=size
    )
    return SideQuestListResponse(items=items, total=total, page=page, size=size)


@router.post("/sidequests", response_model=SideQuestOut, status_code=status.HTTP_201_CREATED, summary="Створити новий SideQuest")
async def create_sidequest(
    req: SideQuestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SideQuestService.create(db, current_user, req)


@router.get("/me/sidequests", response_model=SideQuestListResponse, summary="SideQuests поточного користувача (створені або де бере участь)")
async def get_my_sidequests(
    filter_type: str = Query("all", pattern="^(created|joined|all)$", description="Тип: created, joined або all"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if filter_type == "created":
        items, total = await SideQuestService.list(
            db=db,
            current_user=current_user,
            creator_id=current_user.id,
            page=page,
            size=size
        )
    elif filter_type == "joined":
        items, total = await SideQuestService.list(
            db=db,
            current_user=current_user,
            participant_user_id=current_user.id,
            page=page,
            size=size
        )
    else:
        # All: created or joined
        items, total = await SideQuestService.list(
            db=db,
            current_user=current_user,
            participant_user_id=current_user.id,
            page=page,
            size=size
        )
    return SideQuestListResponse(items=items, total=total, page=page, size=size)


@router.get("/sidequests/{id}", response_model=SideQuestOut, summary="Отримати деталі SideQuest")
async def get_sidequest(
    id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SideQuestService.get_by_id(db, id, current_user=current_user)


@router.patch("/sidequests/{id}", response_model=SideQuestOut, summary="Оновити SideQuest")
async def update_sidequest(
    id: str,
    req: SideQuestUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SideQuestService.update(db, id, current_user, req)


@router.delete("/sidequests/{id}", response_model=SideQuestOut, summary="Скасувати SideQuest")
async def cancel_sidequest(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SideQuestService.cancel(db, id, current_user)


@router.post("/sidequests/{id}/join", response_model=SideQuestOut, summary="Приєднатися до SideQuest")
async def join_sidequest(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SideQuestService.join(db, id, current_user)


@router.delete("/sidequests/{id}/join", response_model=SideQuestOut, summary="Покинути SideQuest")
async def leave_sidequest(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SideQuestService.leave(db, id, current_user)
