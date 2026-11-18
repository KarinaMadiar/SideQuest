from datetime import datetime, timezone, timedelta
from typing import Optional, List
from zoneinfo import ZoneInfo
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from app.schemas.user import UserBrief

VALID_CATEGORIES = {"coffee", "sports", "walks", "study", "culture", "career", "volunteering", "other"}
KYIV_TZ = ZoneInfo("Europe/Kyiv")


class ParticipantOut(BaseModel):
    id: str
    user: UserBrief
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SideQuestBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    category: str
    starts_at: datetime
    ends_at: Optional[datetime] = None
    location: str = Field(..., min_length=2, max_length=255)
    capacity: int = Field(..., ge=2, le=50)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        cat = v.lower().strip()
        if cat not in VALID_CATEGORIES:
            raise ValueError(f"Категорія повинна бути однією з: {', '.join(sorted(VALID_CATEGORIES))}")
        return cat


class SideQuestCreate(SideQuestBase):
    @model_validator(mode="after")
    def validate_dates(self) -> "SideQuestCreate":
        now_kyiv = datetime.now(KYIV_TZ)
        
        # Ensure starts_at has timezone
        starts = self.starts_at
        if starts.tzinfo is None:
            starts = starts.replace(tzinfo=KYIV_TZ)
        else:
            starts = starts.astimezone(KYIV_TZ)

        # Allow 2 minutes grace period for network latency / clock skew
        if starts < (now_kyiv - timedelta(minutes=2)):
            raise ValueError("Час початку SideQuest не може бути в минулому")

        if self.ends_at:
            ends = self.ends_at
            if ends.tzinfo is None:
                ends = ends.replace(tzinfo=KYIV_TZ)
            else:
                ends = ends.astimezone(KYIV_TZ)
            if ends <= starts:
                raise ValueError("Час завершення повинен бути пізніше за час початку")

        return self


class SideQuestUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    category: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    location: Optional[str] = Field(None, min_length=2, max_length=255)
    capacity: Optional[int] = Field(None, ge=2, le=50)
    status: Optional[str] = Field(None, pattern="^(open|full|canceled|completed)$")

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cat = v.lower().strip()
        if cat not in VALID_CATEGORIES:
            raise ValueError(f"Категорія повинна бути однією з: {', '.join(sorted(VALID_CATEGORIES))}")
        return cat


class SideQuestOut(BaseModel):
    id: str
    creator: UserBrief
    title: str
    description: str
    category: str
    starts_at: datetime
    ends_at: Optional[datetime] = None
    location: str
    capacity: int
    status: str
    participant_count: int = 0
    is_joined: bool = False
    participants: List[ParticipantOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SideQuestListResponse(BaseModel):
    items: List[SideQuestOut]
    total: int
    page: int
    size: int
