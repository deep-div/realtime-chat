import uuid

from storage3.exceptions import StorageApiError
from supabase import create_client, Client

from app.core.config import settings

storage_client: Client = create_client(settings.STORAGE_URL, settings.STORAGE_KEY)
storage_admin_client: Client = create_client(settings.STORAGE_URL, settings.STORAGE_SERVICE_KEY)


def ensure_avatar_bucket_exists() -> None:
    """Create the avatar storage bucket if it doesn't already exist. Safe to call on every startup."""
    try:
        storage_admin_client.storage.get_bucket(settings.STORAGE_AVATAR_BUCKET)
    except StorageApiError:
        storage_admin_client.storage.create_bucket(
            settings.STORAGE_AVATAR_BUCKET,
            options={"public": True},
        )


async def upload_avatar(user_id: str, file_bytes: bytes, content_type: str) -> str:
    """Upload a user's avatar to object storage and return its public URL."""
    extension = content_type.split("/")[-1]
    path = f"{user_id}/{uuid.uuid4()}.{extension}"

    storage_client.storage.from_(settings.STORAGE_AVATAR_BUCKET).upload(
        path,
        file_bytes,
        {"content-type": content_type, "upsert": "true"},
    )

    return storage_client.storage.from_(settings.STORAGE_AVATAR_BUCKET).get_public_url(path)
