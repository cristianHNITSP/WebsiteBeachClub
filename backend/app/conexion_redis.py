"""Cliente de Redis compartido por la API (caché, pub/sub, límites)."""

from redis.asyncio import Redis

from app.config import obtener_config

redis: Redis = Redis.from_url(str(obtener_config().redis_url), socket_timeout=2, socket_connect_timeout=2)
