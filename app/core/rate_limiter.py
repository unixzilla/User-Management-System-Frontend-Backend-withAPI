"""Simple in-memory rate limiter middleware."""
import time
import asyncio
from collections import defaultdict
from typing import Callable

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimiter(BaseHTTPMiddleware):
    """In-memory rate limiter using a sliding-window approach.

    In production, replace with Redis-backed rate limiting (e.g. slowapi + Redis).
    """

    def __init__(self, app, max_requests: int = 30, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        async with self._lock:
            # Remove expired entries
            window_start = now - self.window_seconds
            self._requests[client_ip] = [
                ts for ts in self._requests[client_ip] if ts > window_start
            ]

            if len(self._requests[client_ip]) >= self.max_requests:
                raise HTTPException(status_code=429, detail="Too many requests")

            self._requests[client_ip].append(now)

        return await call_next(request)
