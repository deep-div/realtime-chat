from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_id
from app.clients.postgre import get_db
from app.clients.storage import upload_avatar
from app.services.users.schema import CreateProfile, UpdateProfile, User
from app.services.users.store import (
    ProfileAlreadyExistsError,
    ProfileNotFoundError,
    UsernameTakenError,
    user_store,
)

router = APIRouter(prefix="/users")

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024


@router.post("/me", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_my_profile(
    request: CreateProfile,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Create the requesting user's profile with a username and display name."""
    try:
        return await user_store.create_profile(db, user["uid"], request, email=user["email"])
    except ProfileAlreadyExistsError:
        raise HTTPException(status_code=409, detail="profile already exists")
    except UsernameTakenError:
        raise HTTPException(status_code=409, detail="username is already taken")


@router.get("/me", response_model=User)
async def get_my_profile(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Fetch the requesting user's own profile."""
    profile = await user_store.get_profile(db, user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="profile not found")
    return profile


@router.patch("/me", response_model=User)
async def update_my_profile(
    request: UpdateProfile,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Update whichever profile fields are provided, leaving the rest unchanged."""
    try:
        return await user_store.update_profile(db, user_id, request)
    except ProfileNotFoundError:
        raise HTTPException(status_code=404, detail="profile not found")
    except UsernameTakenError:
        raise HTTPException(status_code=409, detail="username is already taken")


@router.get("/search", response_model=list[User])
async def search_users(
    q: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    """Search other users by username prefix."""
    return await user_store.search_users(db, q, exclude_user_id=user_id)


@router.post("/me/avatar", response_model=User)
async def upload_my_avatar(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Upload the requesting user's avatar image and save its URL on their profile."""
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="avatar must be a JPEG, PNG, or WEBP image")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_AVATAR_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="avatar must be under 5MB")

    avatar_url = await upload_avatar(user_id, file_bytes, file.content_type)

    try:
        return await user_store.update_avatar(db, user_id, avatar_url)
    except ProfileNotFoundError:
        raise HTTPException(status_code=404, detail="profile not found")


@router.delete("/me/avatar", response_model=User)
async def remove_my_avatar(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Clear the requesting user's avatar, falling back to the initials placeholder."""
    try:
        return await user_store.update_avatar(db, user_id, None)
    except ProfileNotFoundError:
        raise HTTPException(status_code=404, detail="profile not found")
