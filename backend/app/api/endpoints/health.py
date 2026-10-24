from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter

router = APIRouter(prefix="/health")

_IST = ZoneInfo("Asia/Kolkata")
_DATETIME_FORMAT = "%d %b %Y %I:%M %p"
_started_at = datetime.now(_IST)


@router.get("")
async def health_check() -> dict:
    """Report app uptime and the current date/time in Asia/Kolkata."""
    now = datetime.now(_IST)
    uptime = now - _started_at

    total_seconds = int(uptime.total_seconds())
    days, remainder = divmod(total_seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, seconds = divmod(remainder, 60)
    uptime_readable = f"{days:02d}d {hours:02d}h {minutes:02d}m {seconds:02d}s"

    return {
        "status": "ok",
        "app_started": _started_at.strftime(_DATETIME_FORMAT),
        "current_day": now.strftime(_DATETIME_FORMAT),
        "uptime": uptime_readable,
    }
