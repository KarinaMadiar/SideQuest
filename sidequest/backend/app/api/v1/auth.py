from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut
from app.services.auth_service import AuthService
from app.utils.security import create_access_token
from app.api.deps import get_current_user
from app.models.user import User
from app.config import settings

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


@router.post("/cognito/sync", response_model=UserOut, summary="Синхронізація профілю після входу через Amazon Cognito / Google")
async def sync_cognito_profile(current_user: User = Depends(get_current_user)):
    """
    Валідує Cognito access token (через стандартний залежний елемент `get_current_user`),
    створює або синхронізує профіль користувача SideQuest за `sub` клеймом токена
    та повертає актуальний профіль. Жодні ідентифікатори чи ролі з тіла запиту клієнта не приймаються.
    """
    return UserOut.model_validate(current_user)


@router.get("/config", summary="Статус конфігурації провайдерів автентифікації")
async def get_auth_config():
    return {
        "cognito_configured": settings.is_cognito_configured,
        "google_signin_enabled": settings.GOOGLE_SIGNIN_ENABLED and settings.is_cognito_configured,
        "aws_region": settings.AWS_REGION,
    }


@router.post("/logout", summary="Вихід із системи")
async def logout(_: UserOut = Depends(get_current_user)):
    return {"message": "Успішний вихід із системи"}
