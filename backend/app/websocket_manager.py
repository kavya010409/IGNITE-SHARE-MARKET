import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger("websocket.manager")

router = APIRouter(prefix="/api/ws", tags=["WebSockets"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections.add(websocket)
        logger.info(f"🟢 Client connected. Active WebSockets: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            self.active_connections.discard(websocket)
        logger.info(f"🔴 Client disconnected. Active WebSockets: {len(self.active_connections)}")

    async def broadcast(self, message_json_str: str):
        async with self.lock:
            if not self.active_connections:
                return
            stale_connections = set()
            for connection in self.active_connections:
                try:
                    await connection.send_text(message_json_str)
                except Exception as e:
                    stale_connections.add(connection)

            for stale in stale_connections:
                self.active_connections.discard(stale)


manager = ConnectionManager()


class RedisBroadcaster:
    def __init__(self, redis_url: str, channel: str):
        self.redis_url = redis_url
        self.channel = channel
        self.pubsub = None
        self.task: asyncio.Task = None

    async def start(self):
        try:
            redis_client = aioredis.from_url(self.redis_url, decode_responses=True)
            self.pubsub = redis_client.pubsub()
            await self.pubsub.subscribe(self.channel)
            self.task = asyncio.create_task(self._listen_loop())
            logger.info(f"📡 Redis PubSub listener subscribed to '{self.channel}'.")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection warning: {e}. Running standalone.")

    async def _listen_loop(self):
        try:
            async for message in self.pubsub.listen():
                if message and message.get("type") == "message":
                    data = message.get("data")
                    if data:
                        await manager.broadcast(data)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in Redis listener loop: {e}")

    async def stop(self):
        if self.task:
            self.task.cancel()
        if self.pubsub:
            await self.pubsub.unsubscribe(self.channel)
            await self.pubsub.close()


@router.websocket("/watchlist")
async def websocket_watchlist_endpoint(
    websocket: WebSocket,
    token: str = Query(default=""),
):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as exc:
        await manager.disconnect(websocket)
