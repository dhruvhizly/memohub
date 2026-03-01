import uuid
from src.db.sql_alchemy import Base
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, DateTime, Integer, LargeBinary, func

class Media(Base):
    __tablename__ = "media"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    orig_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(255), nullable=False)
    nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    owner_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False
    )
    owner = relationship("User", back_populates="media")  

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc)
    )

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc)
    )
    media = relationship("Media", back_populates="owner")