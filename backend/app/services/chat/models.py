from sqlalchemy import BigInteger, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.clients.postgre import Base


class ChatModel(Base):
    """Durable record of a chat: either a 1:1 direct chat or a named group."""

    __tablename__ = "chats"

    chat_id: Mapped[str] = mapped_column(String, primary_key=True)
    chat_type: Mapped[str] = mapped_column(String)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_media_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_by: Mapped[str] = mapped_column(String)
    created_at: Mapped[int] = mapped_column(BigInteger)

    # Direct chats only: the two member ids, normalized (smaller id first) so a
    # unique constraint on this pair makes get-or-create race-safe at the DB
    # level — two concurrent "create chat with B" calls can't both insert.
    # Left NULL for group chats, where Postgres allows unlimited NULL pairs.
    direct_user_min: Mapped[str | None] = mapped_column(String, nullable=True)
    direct_user_max: Mapped[str | None] = mapped_column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("direct_user_min", "direct_user_max", name="uq_chats_direct_pair"),
    )


class ChatMemberModel(Base):
    """Durable record of one user's membership within a chat."""

    __tablename__ = "chat_members"

    chat_id: Mapped[str] = mapped_column(
        String, ForeignKey("chats.chat_id"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    role: Mapped[str] = mapped_column(String, default="member")
    joined_at: Mapped[int] = mapped_column(BigInteger)
    muted_until: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    __table_args__ = (
        Index("ix_chat_members_user_id", "user_id"),
    )
