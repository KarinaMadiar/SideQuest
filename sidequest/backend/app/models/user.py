import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cognito_sub: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(50), default="local", server_default="local", nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="student", nullable=False)  # student, organizer, admin
    profile_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    visibility_settings: Mapped[str] = mapped_column(String(50), default="public", nullable=False)  # public, campus_only, hidden
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    created_sidequests: Mapped[list["SideQuest"]] = relationship("SideQuest", back_populates="creator", foreign_keys="SideQuest.creator_id", cascade="all, delete-orphan")
    sidequest_participations: Mapped[list["SideQuestParticipant"]] = relationship("SideQuestParticipant", back_populates="user", cascade="all, delete-orphan")
    created_events: Mapped[list["Event"]] = relationship("Event", back_populates="creator", foreign_keys="Event.creator_id", cascade="all, delete-orphan")
    event_attendances: Mapped[list["EventAttendee"]] = relationship("EventAttendee", back_populates="user", cascade="all, delete-orphan")
    organization_memberships: Mapped[list["OrganizationMember"]] = relationship("OrganizationMember", back_populates="user", cascade="all, delete-orphan")
