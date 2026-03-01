"""
CI ERP — Observability: Structured Logging + Metrics
Provides structured JSON logging, request tracing, and basic metrics.
"""
import time
import logging
import json
import uuid
from datetime import datetime, timezone
from typing import Callable
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# ─── Structured JSON Logger ───────────────────────────────────────────────────
class StructuredFormatter(logging.Formatter):
    """Emits JSON log lines for easy ingestion by Datadog/Loki/CloudWatch."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_dict = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        # Add extra fields
        for key in ("trace_id", "tenant_id", "user_id", "duration_ms", "path", "method", "status_code"):
            if hasattr(record, key):
                log_dict[key] = getattr(record, key)
        if record.exc_info:
            log_dict["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_dict)


def setup_logging(level: str = "INFO"):
    """Configure structured JSON logging for the application."""
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())
    
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.handlers.clear()
    root.addHandler(handler)

    # Quieten noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


# ─── In-Memory Metrics (lightweight, no external deps) ────────────────────────
_metrics: dict = {
    "requests_total": 0,
    "requests_by_path": {},
    "errors_total": 0,
    "response_times_ms": [],
    "slow_requests": [],   # requests > 1000ms
    "active_requests": 0,
    "started_at": datetime.now(timezone.utc).isoformat(),
}


def get_metrics() -> dict:
    """Return current metrics snapshot."""
    times = _metrics["response_times_ms"]
    return {
        **_metrics,
        "avg_response_ms": round(sum(times) / len(times), 2) if times else 0,
        "p95_response_ms": _percentile(times, 95),
        "p99_response_ms": _percentile(times, 99),
        "response_times_ms": times[-100:],  # last 100 only
    }


def _percentile(data: list, p: int) -> float:
    if not data:
        return 0
    sorted_data = sorted(data)
    idx = int(len(sorted_data) * p / 100)
    return sorted_data[min(idx, len(sorted_data) - 1)]


# ─── Request Tracing Middleware ────────────────────────────────────────────────
class ObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Adds per-request:
    - X-Trace-ID header (for distributed tracing)
    - Structured access log
    - Metrics tracking
    - Performance monitoring
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        trace_id = str(uuid.uuid4())[:8]
        request.state.trace_id = trace_id
        
        _metrics["requests_total"] += 1
        _metrics["active_requests"] += 1
        
        start = time.time()
        logger = logging.getLogger("cierp.http")
        
        try:
            response = await call_next(request)
        except Exception as e:
            _metrics["errors_total"] += 1
            _metrics["active_requests"] -= 1
            duration_ms = round((time.time() - start) * 1000, 2)
            logger.error(
                "Request failed",
                extra={
                    "trace_id": trace_id,
                    "path": request.url.path,
                    "method": request.method,
                    "duration_ms": duration_ms,
                }
            )
            raise
        
        duration_ms = round((time.time() - start) * 1000, 2)
        _metrics["active_requests"] -= 1
        _metrics["response_times_ms"].append(duration_ms)
        
        path = request.url.path
        _metrics["requests_by_path"][path] = _metrics["requests_by_path"].get(path, 0) + 1
        
        if response.status_code >= 400:
            _metrics["errors_total"] += 1
        
        if duration_ms > 1000:
            _metrics["slow_requests"].append({
                "path": path,
                "duration_ms": duration_ms,
                "trace_id": trace_id,
            })
            if len(_metrics["slow_requests"]) > 50:
                _metrics["slow_requests"] = _metrics["slow_requests"][-50:]
        
        # Keep last 1000 timing samples
        if len(_metrics["response_times_ms"]) > 1000:
            _metrics["response_times_ms"] = _metrics["response_times_ms"][-1000:]
        
        # Add trace headers
        response.headers["X-Trace-ID"] = trace_id
        response.headers["X-Response-Time"] = f"{duration_ms}ms"
        
        # Log access (skip health checks to reduce noise)
        if path not in ("/api/v1/health", "/favicon.ico"):
            tenant = request.headers.get("X-Tenant-ID", "-")
            logger.info(
                f"{request.method} {path} {response.status_code} {duration_ms}ms",
                extra={
                    "trace_id": trace_id,
                    "path": path,
                    "method": request.method,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "tenant_id": tenant,
                }
            )
        
        return response


def setup_observability(app: FastAPI):
    """Attach observability middleware to FastAPI app."""
    app.add_middleware(ObservabilityMiddleware)
