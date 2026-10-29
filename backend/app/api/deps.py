from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=not settings.DISABLE_AUTH)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Verify the Firebase ID token from the Authorization header and return the caller's uid."""
    if settings.DISABLE_AUTH:
        return settings.DEV_USER_ID

    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid or expired token")

    if not decoded.get("email_verified", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="email not verified")

    return decoded["uid"]
