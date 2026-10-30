from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=not settings.DISABLE_AUTH)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """Verify the Firebase ID token from the Authorization header and return the caller's uid and email."""
    if settings.DISABLE_AUTH:
        return {"uid": settings.DEV_USER_ID, "email": settings.DEV_USER_EMAIL}

    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid or expired token")

    if not decoded.get("email_verified", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="email not verified")

    return {"uid": decoded["uid"], "email": decoded.get("email")}


def get_current_user_id(user: dict = Depends(get_current_user)) -> str:
    """Return just the caller's uid, for endpoints that don't need the email."""
    return user["uid"]
