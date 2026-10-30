from __future__ import annotations

import asyncio
from typing import Awaitable, Callable

from app.core.logging import logger

TYPING_TIMEOUT_SECONDS = 6
OnTypingTimeout = Callable[[str, str], Awaitable[None]]


class TypingTracker:
    """Tracks active typing signals and auto-expires one if a client never sends typing_stop
    (e.g. the tab crashes or the connection drops mid-type)."""

    def __init__(self) -> None:
        self._tasks: dict[tuple[str, str], asyncio.Task] = {}

    def start(self, chat_id: str, user_id: str, on_timeout: OnTypingTimeout) -> None:
        """(Re)start the auto-expire timer for a user's typing state in a chat."""
        self.stop(chat_id, user_id)
        key = (chat_id, user_id)
        self._tasks[key] = asyncio.create_task(self._expire_after(key, on_timeout))

    def stop(self, chat_id: str, user_id: str) -> None:
        """Cancel a user's typing timer in a chat, e.g. on an explicit typing_stop."""
        task = self._tasks.pop((chat_id, user_id), None)
        if task is not None:
            task.cancel()

    def stop_all_for_user(self, user_id: str) -> list[str]:
        """Cancel every active typing timer for a user (e.g. on disconnect) and return the chat_ids."""
        keys = [key for key in self._tasks if key[1] == user_id]
        for key in keys:
            self._tasks.pop(key).cancel()
        return [chat_id for chat_id, _ in keys]

    async def _expire_after(self, key: tuple[str, str], on_timeout: OnTypingTimeout) -> None:
        try:
            await asyncio.sleep(TYPING_TIMEOUT_SECONDS)
        except asyncio.CancelledError:
            return

        self._tasks.pop(key, None)
        chat_id, user_id = key
        try:
            await on_timeout(chat_id, user_id)
        except Exception:
            logger.warning("typing auto-expire callback failed", exc_info=True)


typing_tracker = TypingTracker()
