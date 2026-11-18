from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBrief(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatar_url: Optional[str] = None
    visibility_settings: str = "public"

    model_config = ConfigDict(from_attributes=True)


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    auth_provider: str = "local"
    cognito_sub: Optional[str] = None
    avatar_url: Optional[str] = None
    profile_description: Optional[str] = None
    visibility_settings: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=512)
    profile_description: Optional[str] = Field(None, max_length=1000)
    visibility_settings: Optional[str] = Field(None, pattern="^(public|campus_only|hidden)$")
