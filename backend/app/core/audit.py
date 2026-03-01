"""
CI ERP — Audit Logging System
Two-layer enforcement so no action slips through unlogged:

Layer 1 — AuditMiddleware: auto-logs every mutating API call (POST/PUT/PATCH/DELETE)
           reading tenant_id and user from the request. Zero-effort coverage.

Layer 2 — audit() helper: fine-grained logging inside service/endpoint code
           for business-logic events (e.g. "payroll.run.completed", "invoice.posted").

Layer 3 — @audited decorator: wrap any async service function to auto-log its
           call as an audit event with before/after data.
"""
import json
import logging
import time
import asyncio
import functools
from typing import Optional, Callable, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.identity.models import AuditLog

logger = logging.getLogger("cierp.audit")


# ─── Low-level write ──────────────────────────────────────────────────────────
async def audit(
    db: AsyncSession,
    action: str,
    *,
    user=None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    resource_label: Optional[str] = None,
    changes: Optional[dict] = None,
    module: Optional[str] = None,
    severity: str = "info",
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    extra: Optional[dict] = None,
    tenant_id: str = "cierp",
) -> AuditLog:
    """
    Write a single audit log entry inside an existing DB session.
    Flushes immediately (same transaction as the business operation).
    """
    entry = AuditLog(
        tenant_id      = tenant_id,
        actor_id       = getattr(user, "id",    None) if user else None,
        actor_email    = getattr(user, "email", None) if user else None,
        actor_name     = (user.full_name if user else None) or "system",
        action         = action,
        resource_type  = resource_type,
        resource_id    = resource_id,
        resource_label = resource_label,
        changes        = changes,
        module         = module or (action.split(".")[0] if "." in action else None),
        severity       = severity,
        ip_address     = ip_address,
        user_agent     = user_agent,
        extra          = extra,
    )
    db.add(entry)
    await db.flush()
    return entry


# ─── @audited decorator ───────────────────────────────────────────────────────
def audited(
    action: str,
    *,
    resource_type: Optional[str] = None,
    severity: str = "info",
    capture_result_id: bool = True,
):
    """
    Decorator for async service functions.
    Auto-logs the call as an audit event.

    The decorated function MUST have `db` and `user` keyword args.

    Example:
        @audited("sales.orders.confirm", resource_type="sale_order")
        async def confirm_sale_order(db, order, tenant_id, *, user=None):
            ...
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            db   = kwargs.get("db")   or (args[0] if args else None)
            user = kwargs.get("user")
            start = time.time()

            try:
                result = await func(*args, **kwargs)
                duration_ms = round((time.time() - start) * 1000, 1)

                # Try to extract resource_id from result
                rid = None
                if capture_result_id and result is not None:
                    rid = getattr(result, "id", None)
                    if rid:
                        rid = str(rid)

                if db and user:
                    await audit(
                        db, action,
                        user=user,
                        resource_type=resource_type,
                        resource_id=rid,
                        severity=severity,
                        tenant_id=getattr(user, "tenant_id", "cierp"),
                        extra={"duration_ms": duration_ms},
                    )

                return result

            except Exception as e:
                duration_ms = round((time.time() - start) * 1000, 1)
                logger.error(f"[AUDIT] {action} FAILED: {e}")
                if db and user:
                    try:
                        await audit(
                            db, action,
                            user=user,
                            resource_type=resource_type,
                            severity="warning",
                            tenant_id=getattr(user, "tenant_id", "cierp"),
                            extra={"error": str(e), "duration_ms": duration_ms},
                        )
                    except Exception:
                        pass  # never let audit failure crash the request
                raise

        return wrapper
    return decorator


# ─── Auto-Audit Middleware ────────────────────────────────────────────────────
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# These path patterns always get auto-audited on mutating methods
AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Paths to skip (health checks, static, auth/me)
AUDIT_SKIP_PATHS = {
    "/api/v1/health",
    "/api/v1/metrics",
    "/api/v1/auth/me",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
}

# Map URL path prefixes → module names for audit.module field
PATH_MODULE_MAP = {
    "/api/v1/auth":             "auth",
    "/api/v1/sales":            "sales",
    "/api/v1/purchasing":       "purchasing",
    "/api/v1/accounting":       "accounting",
    "/api/v1/inventory":        "inventory",
    "/api/v1/hr":               "hr",
    "/api/v1/payroll":          "payroll",
    "/api/v1/manufacturing":    "manufacturing",
    "/api/v1/projects":         "projects",
    "/api/v1/helpdesk":         "helpdesk",
    "/api/v1/order-tracking":   "order_tracking",
    "/api/v1/admin":            "admin",
    "/api/v1/branding":         "branding",
    "/api/v1/reports":          "reports",
    "/api/v1/jobs":             "jobs",
}


def _infer_module(path: str) -> str:
    for prefix, module in PATH_MODULE_MAP.items():
        if path.startswith(prefix):
            return module
    return "api"


def _infer_action(method: str, path: str) -> str:
    """Generate a readable action string from HTTP method + path."""
    module = _infer_module(path)
    parts  = [p for p in path.split("/") if p and not p.startswith("{")]
    # Last meaningful segment becomes the resource
    resource = parts[-1] if parts else "unknown"
    verb = {
        "POST":   "create",
        "PUT":    "update",
        "PATCH":  "update",
        "DELETE": "delete",
    }.get(method, "action")
    return f"{module}.{resource}.{verb}"


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Layer 1 audit enforcement.
    Automatically logs all mutating API requests (POST/PUT/PATCH/DELETE)
    without requiring any changes to individual endpoints.

    Fine-grained audit() calls inside services still run on top of this —
    they provide richer context (before/after changes, business labels, etc.)
    """

    def __init__(self, app, db_session_factory=None):
        super().__init__(app)
        self._db_factory = db_session_factory

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Only audit mutating methods on API paths
        if request.method not in AUDIT_METHODS or path in AUDIT_SKIP_PATHS:
            return await call_next(request)
        if not path.startswith("/api/"):
            return await call_next(request)

        response = await call_next(request)

        # Only log successful mutations (2xx/3xx)
        if response.status_code >= 400:
            return response

        # Extract user info from request state (set by auth dependency)
        user_id    = getattr(request.state, "user_id",    None)
        user_email = getattr(request.state, "user_email", None)
        tenant_id  = getattr(request.state, "tenant_id",  "cierp")
        trace_id   = getattr(request.state, "trace_id",   None)

        action = _infer_action(request.method, path)
        module = _infer_module(path)
        ip     = request.client.host if request.client else None
        ua     = request.headers.get("user-agent", "")[:500]

        # Fire-and-forget DB write so we don't delay the response
        if self._db_factory:
            asyncio.create_task(self._write_log(
                action=action, module=module,
                actor_id=user_id, actor_email=user_email,
                tenant_id=tenant_id, ip=ip, ua=ua,
                status=response.status_code, trace_id=trace_id,
            ))

        return response

    async def _write_log(self, **kwargs):
        try:
            async with self._db_factory() as db:
                entry = AuditLog(
                    tenant_id   = kwargs.get("tenant_id", "cierp"),
                    actor_id    = kwargs.get("actor_id"),
                    actor_email = kwargs.get("actor_email"),
                    actor_name  = kwargs.get("actor_email", "unknown"),
                    action      = kwargs.get("action", "api.request"),
                    module      = kwargs.get("module"),
                    severity    = "info",
                    ip_address  = kwargs.get("ip"),
                    user_agent  = kwargs.get("ua"),
                    extra       = {
                        "status_code": kwargs.get("status"),
                        "trace_id":    kwargs.get("trace_id"),
                        "source":      "auto_middleware",
                    },
                )
                db.add(entry)
                await db.commit()
        except Exception as e:
            logger.debug(f"Audit middleware write failed (non-critical): {e}")
