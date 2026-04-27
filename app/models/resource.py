"""Resource ORM model."""
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.postgres import Base

if TYPE_CHECKING:
    from app.models.permission import Permission


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    permissions: Mapped[list["Permission"]] = relationship(
        "Permission", back_populates="resource_obj", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Resource(id={self.id}, name='{self.name}')>"
