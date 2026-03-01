"""CI ERP — Main Application Entry Point v3.1 (Premium SaaS Grade A+)"""
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import create_tables
from app.core.observability import setup_logging, setup_observability, get_metrics
from app.core.audit import AuditMiddleware

logger = logging.getLogger("cierp")

# Background worker reference (kept alive for shutdown)
_worker_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _worker_task
    setup_logging()
    logger.info(f"CI ERP starting — environment={settings.ENVIRONMENT}")

    # DB tables + seed
    await create_tables()
    from app.seed import seed_demo_data
    await seed_demo_data()

    # Start background job worker
    from app.core.jobs import JobWorker
    worker = JobWorker(tenant_id=settings.TENANT_ID, poll_interval=3.0)
    _worker_task = asyncio.create_task(worker.run())
    logger.info("Background job worker started.")

    logger.info("CI ERP ready ✓")
    yield

    # Graceful shutdown
    if _worker_task and not _worker_task.done():
        _worker_task.cancel()
        try:
            await asyncio.wait_for(_worker_task, timeout=5.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass
    logger.info("CI ERP shut down.")


app = FastAPI(
    title="CI ERP",
    description="Enterprise Resource Planning Platform — Premium SaaS Grade A+",
    version="3.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Observability (must attach before other middleware) ───────────────────────
setup_observability(app)

# ── Audit Middleware (Layer 1: auto-logs all mutating API calls) ──────────────
from app.core.database import AsyncSessionLocal
app.add_middleware(AuditMiddleware, db_session_factory=AsyncSessionLocal)

# ── Standard Middleware ───────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list or ["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Trace-ID", "X-Response-Time"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"

from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.admin import router as admin_router
from app.api.order_tracking import router as order_tracking_router
from app.api.payroll import router as payroll_router
from app.api.reports import router as reports_router
from app.api.branding import router as branding_router
from app.api.jobs import router as jobs_router
from app.api.modules import (
    accounting_router, sales_router, crm_router,
    purchasing_router, inventory_router, hr_router,
    manufacturing_router, projects_router, helpdesk_router,
)

app.include_router(auth_router,             prefix=PREFIX)
app.include_router(dashboard_router,        prefix=PREFIX)
app.include_router(accounting_router,       prefix=PREFIX)
app.include_router(sales_router,            prefix=PREFIX)
app.include_router(crm_router,              prefix=PREFIX)
app.include_router(purchasing_router,       prefix=PREFIX)
app.include_router(inventory_router,        prefix=PREFIX)
app.include_router(hr_router,               prefix=PREFIX)
app.include_router(manufacturing_router,    prefix=PREFIX)
app.include_router(projects_router,         prefix=PREFIX)
app.include_router(helpdesk_router,         prefix=PREFIX)
app.include_router(order_tracking_router,   prefix=f"{PREFIX}/order-tracking")
app.include_router(payroll_router,          prefix=PREFIX)
app.include_router(reports_router,          prefix=PREFIX)
app.include_router(admin_router,            prefix=PREFIX)
app.include_router(branding_router,         prefix=PREFIX)
app.include_router(jobs_router,             prefix=PREFIX)


@app.get(f"{PREFIX}/health")
async def health():
    return {
        "status": "ok",
        "service": "CI ERP API",
        "version": "3.1.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get(f"{PREFIX}/metrics")
async def metrics():
    """Operational metrics (consider restricting in production)."""
    return get_metrics()


@app.get(f"{PREFIX}/permissions")
async def list_permissions():
    """All available RBAC permission codes and role defaults."""
    from app.modules.identity.permissions import PERMISSIONS, ROLE_PERMISSIONS
    return {"permissions": PERMISSIONS, "role_defaults": ROLE_PERMISSIONS}
