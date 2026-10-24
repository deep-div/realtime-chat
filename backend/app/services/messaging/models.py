from sqlalchemy import BigInteger, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.clients.postgre import Base


class MessageModel(Base):
    """Durable record of one encrypted text message sent into a chat."""

    __tablename__ = "messages"

    message_id: Mapped[str] = mapped_column(String, primary_key=True)
    chat_id: Mapped[str] = mapped_column(String, ForeignKey("chats.chat_id"))
    sender_id: Mapped[str] = mapped_column(String)
    client_message_id: Mapped[str | None] = mapped_column(String, nullable=True)
    scheme: Mapped[str] = mapped_column(String)
    ciphertext: Mapped[str] = mapped_column(String)
    sent_at: Mapped[int] = mapped_column(BigInteger)
    edited_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    __table_args__ = (
        Index("ix_messages_chat_id_sent_at", "chat_id", "sent_at"),
        UniqueConstraint(
            "chat_id", "sender_id", "client_message_id", name="uq_messages_client_dedup"
        ),
    )
