import logging
import os
import time
from uuid import uuid4

from fastapi import FastAPI, Request


logger = logging.getLogger("app.api_access")


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first_hop = forwarded_for.split(",")[0].strip()
        if first_hop:
            return first_hop
    if request.client and request.client.host:
        return request.client.host
    return "-"


def _compact(value: str, limit: int = 300) -> str:
    text = (value or "").replace("\n", " ").strip()
    if len(text) <= limit:
        return text
    return text[:limit] + "..."


def _parse_log_level(value: str | None) -> int:
    level_name = (value or "").strip().upper() or "INFO"
    return logging._nameToLevel.get(level_name, logging.INFO)


def _parse_slow_threshold_ms(value: str | None) -> float:
    raw = (value or "").strip()
    if not raw:
        return 1000.0
    try:
        threshold = float(raw)
    except ValueError:
        return 1000.0
    return max(threshold, 0.0)


def setup_request_logging_middleware(app: FastAPI) -> None:
    logger.setLevel(_parse_log_level(os.getenv("API_ACCESS_LOG_LEVEL")))
    slow_threshold_ms = _parse_slow_threshold_ms(os.getenv("API_SLOW_MS_THRESHOLD"))

    @app.middleware("http")
    async def api_access_log(request: Request, call_next):
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        request_id = request.headers.get("x-request-id") or uuid4().hex[:12]
        request.state.request_id = request_id

        started = time.perf_counter()
        method = request.method
        path = request.url.path
        query = _compact(request.url.query, 500)
        ip = _client_ip(request)
        user_agent = _compact(request.headers.get("user-agent", "-"), 180)

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - started) * 1000
            logger.exception(
                "api_call_error request_id=%s method=%s path=%s query=%s duration_ms=%.2f ip=%s user_agent=%s",
                request_id,
                method,
                path,
                query or "-",
                duration_ms,
                ip,
                user_agent,
            )
            raise

        duration_ms = (time.perf_counter() - started) * 1000
        response.headers["X-Request-ID"] = request_id
        if duration_ms >= slow_threshold_ms:
            logger.warning(
                "api_call_slow request_id=%s method=%s path=%s query=%s status=%s duration_ms=%.2f threshold_ms=%.2f ip=%s user_agent=%s",
                request_id,
                method,
                path,
                query or "-",
                response.status_code,
                duration_ms,
                slow_threshold_ms,
                ip,
                user_agent,
            )
        else:
            logger.info(
                "api_call request_id=%s method=%s path=%s query=%s status=%s duration_ms=%.2f ip=%s user_agent=%s",
                request_id,
                method,
                path,
                query or "-",
                response.status_code,
                duration_ms,
                ip,
                user_agent,
            )
        return response
