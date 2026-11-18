from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut
from app.services.auth_service import AuthService
from app.utils.security import create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Автентифікація"])


@router.post("/register", response_model=TokenResponse, status_code=201, summary="Реєстрація нового користувача")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthService.register(db, req)
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse, summary="Вхід у систему")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthService.authenticate(db, req.email, req.password)
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


@router.post("/logout", summary="Вихід із системи")
async def logout(_: UserOut = Depends(get_current_user)):
    return {"message": "Успішний вихід із системи"}
