import asyncio
import json
import logging
from typing import Any, Dict, Set
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
import jwt
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger("websocket.manager")


class ConnectionManager:
    def __init__(self) -> None:
        self._active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._active_connections.add(websocket)
        logger.info(f"Connected client. Total: {len(self._active_connections)}")

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._active_connections.discard(websocket)
        logger.info(f"Disconnected client. Remaining: {len(self._active_connections)}")

    async def broadcast_json(self, data: Dict[str, Any]) -> None:
        if not self._active_connections:
            return
        payload = json.dumps(data).encode("utf-8")
        async with self._lock:
            snapshot = list(self._active_connections)

        async def _send(ws: WebSocket) -> WebSocket | None:
            try:
                await ws.send_bytes(payload)
                return None
            except Exception:
                return ws

        results = await asyncio.gather(*[_send(ws) for ws in snapshot], return_exceptions=True)
        stale = {r for r in results if isinstance(r, WebSocket)}
        if stale:
            async with self._lock:
                for dead in stale:
                    self._active_connections.discard(dead)
            logger.info(f"Purged {len(stale)} dead WebSocket connections.")


ws_manager = ConnectionManager()


class RedisBroadcaster:
    def __init__(self, redis_url: str, channel: str):
        self.redis_url = redis_url
        self.channel = channel
        self._redis: aioredis.Redis | None = None
        self._pubsub = None
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
        self._pubsub = self._redis.pubsub()
        await self._pubsub.subscribe(self.channel)
        self._task = asyncio.create_task(self._listen())

    async def _listen(self) -> None:
        try:
            async for msg in self._pubsub.listen():
                if msg["type"] == "message":
                    payload = json.loads(msg["data"])
                    await ws_manager.broadcast_json(payload)
        except asyncio.CancelledError:
            pass

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
        if self._pubsub:
            await self._pubsub.unsubscribe(self.channel)
            await self._pubsub.close()
        if self._redis:
            await self._redis.close()


router = APIRouter(prefix="/api/ws", tags=["WebSockets"])


@router.websocket("/watchlist")
async def watchlist_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if "sub" not in payload:
            raise ValueError()
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(websocket)
    try:
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
