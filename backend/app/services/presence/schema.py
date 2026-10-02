from enum import Enum
from pydantic import BaseModel, Field

CONNECTION_TTL_SECONDS = 45


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
