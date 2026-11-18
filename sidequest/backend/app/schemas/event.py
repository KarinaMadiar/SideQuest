from datetime import datetime
from typing import Optional, List
from zoneinfo import ZoneInfo
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.schemas.user import UserBrief
from app.schemas.organization import OrganizationBrief

KYIV_TZ = ZoneInfo("Europe/Kyiv")
VALID_EVENT_CATEGORIES = {"lecture", "workshop", "conference", "career", "social", "culture", "other"}


class SpeakerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    short_bio: str = Field(..., min_length=5)
    position: Optional[str] = Field(None, max_length=255)
    linkedin_url: Optional[str] = Field(None, max_length=512)
    display_order: int = Field(0, ge=0)


class SpeakerCreate(SpeakerBase):
    pass


class SpeakerOut(SpeakerBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class AttendeeOut(BaseModel):
    id: str
    user: UserBrief
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    category: str = Field("lecture")
    starts_at: datetime
    ends_at: datetime
    location: str = Field(..., min_length=2, max_length=255)
    organization_id: Optional[str] = None
    registration_url: Optional[str] = Field(None, max_length=512)
    why_attend: Optional[str] = None
    preparation_notes: Optional[str] = None


class EventCreate(EventBase):
    speakers: Optional[List[SpeakerCreate]] = None

    @model_validator(mode="after")
    def validate_dates(self) -> "EventCreate":
        starts = self.starts_at
        ends = self.ends_at
        if starts.tzinfo is None:
            starts = starts.replace(tzinfo=KYIV_TZ)
        if ends.tzinfo is None:
            ends = ends.replace(tzinfo=KYIV_TZ)

        if ends <= starts:
            raise ValueError("Час завершення події повинен бути пізніше за час початку")
        return self


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    category: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    location: Optional[str] = Field(None, min_length=2, max_length=255)
    organization_id: Optional[str] = None
    registration_url: Optional[str] = None
    why_attend: Optional[str] = None
    preparation_notes: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(published|canceled|completed)$")


class EventOut(BaseModel):
    id: str
    organization: Optional[OrganizationBrief] = None
    creator: UserBrief
    title: str
    description: str
    category: str
    starts_at: datetime
    ends_at: datetime
    location: str
    registration_url: Optional[str] = None
    why_attend: Optional[str] = None
    preparation_notes: Optional[str] = None
    status: str
    speakers: List[SpeakerOut] = []
    attendee_count: int = 0
    is_attending: bool = False
    attendees: List[AttendeeOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventListResponse(BaseModel):
    items: List[EventOut]
    total: int
    page: int
    size: int
