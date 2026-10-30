import re

from pydantic import BaseModel, Field, field_validator

USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_.]+$")


class CreateProfile(BaseModel):
    """Request body for POST /users/me: the username and display name a new user picks."""

    username: str = Field(min_length=3, max_length=20)
    display_name: str = Field(min_length=1, max_length=50)
    bio: str | None = Field(default=None, max_length=150)
    status: str | None = Field(default=None, max_length=50)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        """Reject usernames with characters outside letters, digits, underscore, and dot."""
        if not USERNAME_PATTERN.match(value):
            raise ValueError("username may only contain letters, numbers, '_' and '.'")
        return value.lower()


class UpdateProfile(BaseModel):
    """Request body for PATCH /users/me: only the fields present are updated."""

    username: str | None = Field(default=None, min_length=3, max_length=20)
    display_name: str | None = Field(default=None, min_length=1, max_length=50)
    bio: str | None = Field(default=None, max_length=150)
    status: str | None = Field(default=None, max_length=50)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str | None) -> str | None:
        """Reject usernames with characters outside letters, digits, underscore, and dot."""
        if value is None:
            return value
        if not USERNAME_PATTERN.match(value):
            raise ValueError("username may only contain letters, numbers, '_' and '.'")
        return value.lower()


class User(BaseModel):
    """A user's profile, as returned to clients."""

    user_id: str
    username: str
    display_name: str
    bio: str | None = None
    status: str | None = None
    avatar_url: str | None = None
    email: str | None = None
    public_key: str | None = None
    created_at: int
    updated_at: int


class SetPublicKey(BaseModel):
    """Request body for PUT /users/me/public-key: the client's base64-encoded ECDH public key."""

    public_key: str = Field(min_length=1)
