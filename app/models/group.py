"""UserGroup SQLAlchemy ORM model."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Integer, String, DateTime, Table, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.postgres import Base

user_group_members = Table(
    "user_group_members",
    Base.metadata,
    Column("user_group_id", ForeignKey("user_groups.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("joined_at", DateTime(timezone=True), nullable=False, server_default="NOW()"),
)

user_group_roles = Table(
    "user_group_roles",
    Base.metadata,
    Column("user_group_id", ForeignKey("user_groups.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("assigned_at", DateTime(timezone=True), nullable=False, server_default="NOW()"),
)


class UserGroup(Base):
    """UserGroup model for grouping users and assigning roles to groups."""

    __tablename__ = "user_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="NOW()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="NOW()",
        onupdate=lambda: datetime.now(timezone.utc),
    )

    members: Mapped[list["User"]] = relationship(
        "User",
        secondary=user_group_members,
        back_populates="groups",
        lazy="selectin",
    )
    roles: Mapped[list["Role"]] = relationship(
        "Role",
        secondary=user_group_roles,
        lazy="selectin",
    )
