from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.auth import RegisterRequest
from app.schemas.user import UserUpdate
from app.repositories.user_repository import UserRepository
from app.utils.security import verify_password, get_password_hash, create_access_token


class AuthService:
    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> User:
        user = await UserRepository.get_by_email(db, email)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Невірний email або пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    @staticmethod
    async def register(db: AsyncSession, req: RegisterRequest) -> User:
        existing = await UserRepository.get_by_email(db, req.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Користувач із цією електронною адресою вже зареєстрований"
            )

        # Enforce student or organizer. Public registration cannot grant admin role.
        role = req.role if req.role in ["student", "organizer"] else "student"

        user = User(
            email=req.email.lower().strip(),
            password_hash=get_password_hash(req.password),
            name=req.name.strip(),
            role=role,
            visibility_settings="public"
        )
        return await UserRepository.create(db, user)

    @staticmethod
    async def update_profile(db: AsyncSession, user: User, update_data: UserUpdate) -> User:
        data = update_data.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(user, key, value)
        return await UserRepository.update(db, user)
