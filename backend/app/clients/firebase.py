import firebase_admin
from firebase_admin import credentials

from app.core.config import settings

_firebase_app: firebase_admin.App | None = None


def init_firebase() -> None:
    """Initialize the Firebase Admin SDK once, using the service-account credential file."""
    global _firebase_app
    if _firebase_app is None:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_FILE)
        _firebase_app = firebase_admin.initialize_app(cred)
