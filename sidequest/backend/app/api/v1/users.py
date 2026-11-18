from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserOut, UserUpdate
from app.services.auth_service import AuthService
from app.api.deps import get_current_user

router = APIRouter(tags=["Користувачі"])


@router.get("/me", response_model=UserOut, summary="Отримати профіль поточного користувача")
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut, summary="Оновити профіль поточного користувача")
async def update_me(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    updated = await AuthService.update_profile(db, current_user, req)
    return UserOut.model_validate(updated)
