from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.clients.postgre import Base


class UserModel(Base):
    """Durable profile record for a user, keyed by their auth provider uid."""

    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger)
    updated_at: Mapped[int] = mapped_column(BigInteger)
