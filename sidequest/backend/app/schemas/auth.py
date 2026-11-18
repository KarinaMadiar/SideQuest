from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.schemas.user import UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(..., min_length=2, max_length=100)
    role: Optional[str] = Field("student", pattern="^(student|organizer)$")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class CognitoExchangeRequest(BaseModel):
    code: str = Field(..., min_length=1, description="OAuth 2.0 Authorization Code отриманий від Cognito Hosted UI")
    redirect_uri: str = Field(..., min_length=1, description="Callback URI, використаний під час авторизації")
    code_verifier: Optional[str] = Field(None, description="PKCE code_verifier для верифікації коду")
