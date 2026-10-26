from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.postgre import get_db
from app.services.users.schema import CreateProfile, User
from app.services.users.store import (
    ProfileAlreadyExistsError,
    UsernameTakenError,
    user_store,
)

router = APIRouter(prefix="/users")


def get_current_user_id(x_user_id: str = Header(alias="X-User-Id")) -> str:
    """Resolve the requesting user's id. Stand-in until real Firebase token auth exists."""
    return x_user_id


@router.post("/me", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_my_profile(
    request: CreateProfile,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Create the requesting user's profile with a username and display name."""
    try:
        return await user_store.create_profile(db, user_id, request)
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


@router.get("/search", response_model=list[User])
async def search_users(
    q: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    """Search other users by username prefix."""
    return await user_store.search_users(db, q, exclude_user_id=user_id)
