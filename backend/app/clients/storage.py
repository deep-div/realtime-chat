import uuid

from supabase import create_client, Client

from app.core.config import settings

storage_client: Client = create_client(settings.STORAGE_URL, settings.STORAGE_KEY)


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
