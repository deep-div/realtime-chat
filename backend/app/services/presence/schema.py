from enum import Enum
from pydantic import BaseModel, Field

CONNECTION_TTL_SECONDS = 45
LASTSEEN_CACHE_TTL_SECONDS = 60 * 60 * 24  


class PresenceStatus(str, Enum):
    """Whether a user currently has any live connection."""

    ONLINE = "online"
    OFFLINE = "offline"


class SyncState(str, Enum):
    """Whether a connection has finished syncing missed messages."""

    SYNCING = "syncing"
    READY = "ready"


class DeviceType(str, Enum):
    """Platform a client connection is running on."""

    WEB = "web"
    IOS = "ios"
    ANDROID = "android"
    DESKTOP = "desktop"


class ClientHandshake(BaseModel):
    """Everything the client provides when opening a connection, before the server adds its own fields."""

    user_id: str
    device_id: str
    session_id: str
    device_type: DeviceType
    app_version: str
    protocol_version: str


class ConnectionRegistry(BaseModel):
    """One live WebSocket connection, stored in Redis as a hash at presence:conn:{connection_id}."""

    server_id: str
    connection_id: str
    handshake: ClientHandshake
    sync_state: SyncState = SyncState.SYNCING
    connected_at: int
    last_heartbeat_at: int
    ttl_seconds: int = Field(default=CONNECTION_TTL_SECONDS, ge=1)

    @classmethod
    def from_handshake(
        cls,
        handshake: ClientHandshake,
        server_id: str,
        connection_id: str,
        connected_at: int,
    ) -> "ConnectionRegistry":
        """Build a server-side registry record from a client handshake."""
        return cls(
            server_id=server_id,
            connection_id=connection_id,
            connected_at=connected_at,
            last_heartbeat_at=connected_at,
            handshake=handshake,
        )


class LastSeenCache(BaseModel):
    """Cached last-seen fact for an offline user, stored in Redis as a hash at presence:lastseen:{user_id}."""

    last_seen_at: int
    updated_at: int


class UserPresence(BaseModel):
    """Presence state for one user, as returned to clients by get_presence."""

    user_id: str
    status: PresenceStatus
    last_seen: int | None = None
    updated_at: int
