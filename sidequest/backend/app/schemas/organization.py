from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class OrganizationBrief(BaseModel):
    id: str
    name: str
    type: str
    logo_url: Optional[str] = None
    verification_status: str

    model_config = ConfigDict(from_attributes=True)


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=10)
    type: str = Field("student_organization", pattern="^(student_organization|university_unit|student_council)$")
    logo_url: Optional[str] = None


class OrganizationOut(BaseModel):
    id: str
    name: str
    description: str
    type: str
    logo_url: Optional[str] = None
    verification_status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
