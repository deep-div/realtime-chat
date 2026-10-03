from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.clients.postgre import Base


class LastSeen(Base):
    """Durable last-seen record for an offline user, backing the Redis cache."""

    __tablename__ = "last_seen"

    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    last_seen_at: Mapped[int] = mapped_column(BigInteger)
    updated_at: Mapped[int] = mapped_column(BigInteger)
