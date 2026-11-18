import secrets
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.auth import RegisterRequest
from app.schemas.user import UserUpdate
from app.repositories.user_repository import UserRepository
from app.utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    fetch_cognito_userinfo,
)


class AuthService:
    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> User:
        user = await UserRepository.get_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Невірний email або пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if user.auth_provider == "google" and not user.password_hash.startswith("$2"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Цей обліковий запис створено через Google. Будь ласка, скористайтеся кнопкою «Продовжити з Google».",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not verify_password(password, user.password_hash):
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
            if existing.auth_provider in ("google", "cognito"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Користувач із цією електронною адресою вже зареєстрований через Google (Cognito). Скористайтеся кнопкою «Продовжити з Google»."
                )
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
            auth_provider="local",
            visibility_settings="public"
        )
        return await UserRepository.create(db, user)

    @staticmethod
    async def sync_cognito_user(
        db: AsyncSession,
        token: str,
        payload: dict,
        profile_claims: Optional[dict] = None,
    ) -> User:
        """
        Synchronizes or creates a SideQuest user profile from a verified Amazon Cognito token.
        Uses only verified token / Cognito UserInfo claims (`sub` as stable external identity).
        Does NOT silently merge with pre-existing local email/password accounts.
        """
        cognito_sub = payload.get("sub")
        if not cognito_sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Токен Cognito не містить ідентифікатора користувача (sub)",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 1. Check if a user is already linked to this stable cognito_sub
        existing_by_sub = await UserRepository.get_by_cognito_sub(db, cognito_sub)
        if existing_by_sub:
            return existing_by_sub

        # 2. Gather verified profile attributes from Cognito /oauth2/userInfo or token claims
        userinfo = profile_claims or {}
        email = userinfo.get("email") or payload.get("email")
        name = (
            userinfo.get("name")
            or payload.get("name")
            or (
                f"{userinfo.get('given_name', '')} {userinfo.get('family_name', '')}".strip()
            )
        )
        picture = userinfo.get("picture") or payload.get("picture")

        if not email:
            # Fetch from Cognito Hosted UI /oauth2/userInfo using the validated access token
            fetched = await fetch_cognito_userinfo(token)
            if fetched:
                email = fetched.get("email") or email
                name = (
                    name
                    or fetched.get("name")
                    or f"{fetched.get('given_name', '')} {fetched.get('family_name', '')}".strip()
                )
                picture = picture or fetched.get("picture")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не вдалося отримати email користувача з профілю Cognito/Google. Перевірте наявність scope 'email'.",
            )

        normalized_email = email.lower().strip()

        # 3. Account-linking safety rule:
        # Do NOT silently merge accounts based only on matching email addresses.
        existing_by_email = await UserRepository.get_by_email(db, normalized_email)
        if existing_by_email and existing_by_email.cognito_sub != cognito_sub:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Обліковий запис з електронною поштою {normalized_email} вже зареєстрований через пароль. "
                    "Автоматичне об'єднання акаунтів вимкнено з міркувань безпеки. "
                    "Будь ласка, увійдіть за допомогою email та пароля."
                ),
            )

        # Determine display name fallback
        if not name:
            name = normalized_email.split("@")[0]

        # Determine auth provider from Cognito username / identities claim
        cognito_username = str(payload.get("username") or userinfo.get("username") or "")
        provider = "google" if "google" in cognito_username.lower() else "cognito"

        # 4. Create new SideQuest user profile with default 'student' role
        # Role is strictly determined on the backend, never from frontend parameters.
        new_user = User(
            cognito_sub=cognito_sub,
            auth_provider=provider,
            email=normalized_email,
            password_hash=f"!cognito_federated!{secrets.token_hex(16)}",
            name=name.strip(),
            avatar_url=picture,
            role="student",
            visibility_settings="public",
        )
        return await UserRepository.create(db, new_user)

    @staticmethod
    async def update_profile(db: AsyncSession, user: User, update_data: UserUpdate) -> User:
        data = update_data.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(user, key, value)
        return await UserRepository.update(db, user)
