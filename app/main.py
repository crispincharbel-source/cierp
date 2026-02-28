from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import create_tables

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.order_tracking import router as order_tracking_router
from app.api.modules import (
    accounting_router, sales_router, crm_router,
    purchasing_router, inventory_router, hr_router,
    manufacturing_router, projects_router, helpdesk_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables on startup
    await create_tables()

    # Seed demo data if needed (idempotent)
    from app.seed import seed_demo_data
    await seed_demo_data()

    yield


app = FastAPI(
    title="CI ERP",
    description="Enterprise Resource Planning Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS (dev defaults to localhost:3000; override with env CORS_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes
app.include_router(auth_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(accounting_router, prefix="/api/v1")
app.include_router(sales_router, prefix="/api/v1")
app.include_router(crm_router, prefix="/api/v1")
app.include_router(purchasing_router, prefix="/api/v1")
app.include_router(inventory_router, prefix="/api/v1")
app.include_router(hr_router, prefix="/api/v1")
app.include_router(manufacturing_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(helpdesk_router, prefix="/api/v1")
app.include_router(order_tracking_router, prefix="/api/v1/order-tracking")
app.include_router(admin_router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "CI ERP API"}
