from redis.asyncio import Redis, BlockingConnectionPool
from redis.asyncio.connection import Connection

from ..core.config import settings

redis_pool = BlockingConnectionPool(
    connection_class=Connection,
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_KEY,
    decode_responses=True,
    max_connections=20,  
    timeout=None,  
)
redis_client = Redis(connection_pool=redis_pool)
