"""
CI ERP — Order Tracking API
All queries are TENANT-SCOPED: every production-stage table filters by
tenant_id so one tenant can never see another tenant's orders.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, and_
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import require_auth
from app.modules.identity.models import User
from app.modules.identity.permissions import require_permission
from app.modules.order_tracking.models import (
    Cutting, Lamination, Printing,
    WarehouseToDispatch, DispatchToProduction,
    Extruder, RawSlitting, PVC, Slitting,
    OTInk, OTSolvent, OTComplex, OTActivityLog, OTAdminSettings,
)

router = APIRouter(tags=["Order Tracking"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _row(obj) -> dict:
    """Convert SQLAlchemy row to dict, serialising dates."""
    d = {}
    for c in obj.__table__.columns:
        v = getattr(obj, c.name)
        if hasattr(v, "isoformat"):
            v = v.isoformat()
        d[c.name] = v
    return d


def _tenant_filter(model, tenant_id: str):
    """
    Standard tenant + soft-delete filter for OTBase tables.
    Returns a SQLAlchemy clause.
    """
    return and_(
        model.tenant_id == tenant_id,
        model.is_deleted == False,
    )


# ─── Stage model map ─────────────────────────────────────────────────────────
STAGE_MAP = {
    "cutting":              Cutting,
    "lamination":           Lamination,
    "printing":             Printing,
    "warehouseToDispatch":  WarehouseToDispatch,
    "dispatchToProduction": DispatchToProduction,
    "extruder":             Extruder,
    "rawSlitting":          RawSlitting,
    "pvc":                  PVC,
    "slitting":             Slitting,
}


# ─── Core tracking endpoints ─────────────────────────────────────────────────

@router.get("/track/{order_number}")
async def track_order(
    order_number: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    """Return all production records for a given order number — tenant-scoped."""
    tid = user.tenant_id
    result: dict = {"orderNumber": order_number, "orderData": {}}
    found_any = False

    for key, model in STAGE_MAP.items():
        rows = (await db.execute(
            select(model).where(
                and_(_tenant_filter(model, tid), model.order_number == order_number)
            )
        )).scalars().all()
        result["orderData"][key] = [_row(r) for r in rows]
        if rows:
            found_any = True

    if not found_any:
        raise HTTPException(404, f"No production data found for order: {order_number}")

    return result


@router.get("/search")
async def search_orders(
    query: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    """Autocomplete search across all stage tables — tenant-scoped."""
    tid = user.tenant_id
    pat = f"%{query}%"
    seen: dict[str, set] = {}

    for key, model in STAGE_MAP.items():
        rows = (await db.execute(
            select(model.order_number)
            .where(and_(
                _tenant_filter(model, tid),
                model.order_number.ilike(pat),
            ))
            .distinct()
            .limit(limit)
        )).scalars().all()
        for on in rows:
            if on not in seen:
                seen[on] = set()
            seen[on].add(key)

    results = [
        {"order_number": on, "sources": sorted(srcs)}
        for on, srcs in seen.items()
    ]
    results.sort(key=lambda x: x["order_number"])
    return {"results": results[:limit], "total": len(results)}


@router.get("/stats")
async def order_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    """Record counts per stage table — tenant-scoped."""
    tid = user.tenant_id
    counts = {}
    for key, model in STAGE_MAP.items():
        cnt = (await db.execute(
            select(func.count()).select_from(model).where(_tenant_filter(model, tid))
        )).scalar()
        counts[key] = cnt or 0
    return {"stats": counts, "total": sum(counts.values())}


@router.get("/orders")
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    """List distinct order numbers for this tenant."""
    tid = user.tenant_id
    # Query across all stages to get all known order numbers
    all_orders: set[str] = set()
    for model in STAGE_MAP.values():
        rows = (await db.execute(
            select(model.order_number)
            .where(_tenant_filter(model, tid))
            .distinct()
        )).scalars().all()
        all_orders.update(rows)

    sorted_orders = sorted(all_orders)
    total = len(sorted_orders)
    start = (page - 1) * page_size
    page_items = sorted_orders[start: start + page_size]

    return {
        "items": [{"order_number": on} for on in page_items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ─── Reference data (shared, no tenant filter needed) ────────────────────────

@router.get("/ink")
async def list_ink(
    search: Optional[str] = None,
    finished: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    q = select(OTInk)
    if search:
        q = q.where(or_(
            OTInk.code_number.ilike(f"%{search}%"),
            OTInk.supplier.ilike(f"%{search}%"),
            OTInk.color.ilike(f"%{search}%"),
        ))
    if finished is not None:
        q = q.where(OTInk.is_finished == finished)
    rows = (await db.execute(q.limit(200))).scalars().all()
    return {"items": [_row(r) for r in rows], "total": len(rows)}


@router.get("/solvent")
async def list_solvent(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    q = select(OTSolvent)
    if search:
        q = q.where(or_(
            OTSolvent.code_number.ilike(f"%{search}%"),
            OTSolvent.supplier.ilike(f"%{search}%"),
            OTSolvent.product.ilike(f"%{search}%"),
        ))
    rows = (await db.execute(q.limit(200))).scalars().all()
    return {"items": [_row(r) for r in rows], "total": len(rows)}


@router.get("/complex")
async def list_complex(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    rows = (await db.execute(select(OTComplex))).scalars().all()
    return {"items": [{"id": r.id, "desc": r.desc} for r in rows]}


# ─── Admin settings (tenant-scoped) ──────────────────────────────────────────

@router.get("/admin/settings")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    tid = user.tenant_id
    rows = (await db.execute(
        select(OTAdminSettings).where(_tenant_filter(OTAdminSettings, tid))
    )).scalars().all()
    return {"settings": {r.setting_key: r.setting_value for r in rows}}


@router.put("/admin/settings/{key}")
async def update_setting(
    key: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
    _p: User = Depends(require_permission("order_tracking.admin")),
):
    tid = user.tenant_id
    row = (await db.execute(
        select(OTAdminSettings).where(
            and_(_tenant_filter(OTAdminSettings, tid), OTAdminSettings.setting_key == key)
        )
    )).scalar_one_or_none()

    if row:
        row.setting_value   = body.get("value")
        row.last_updated_by = user.email
    else:
        db.add(OTAdminSettings(
            tenant_id           = tid,
            setting_key         = key,
            setting_value       = body.get("value"),
            setting_description = body.get("description"),
            last_updated_by     = user.email,
        ))
    await db.commit()
    return {"key": key, "value": body.get("value")}


# ─── Activity log (tenant-scoped) ────────────────────────────────────────────

@router.get("/activity-log")
async def activity_log(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    tid = user.tenant_id
    rows = (await db.execute(
        select(OTActivityLog)
        .where(_tenant_filter(OTActivityLog, tid))
        .order_by(OTActivityLog.timestamp.desc())
        .limit(limit)
    )).scalars().all()
    return {"logs": [_row(r) for r in rows]}


@router.post("/activity-log")
async def log_activity(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    """Record an order tracking action in the per-tenant activity log."""
    entry = OTActivityLog(
        tenant_id  = user.tenant_id,
        user_email = user.email,
        action     = body.get("action", "unknown"),
        table_name = body.get("table_name", ""),
        record_id  = str(body.get("record_id", "")),
        details    = body.get("details"),
    )
    db.add(entry)
    await db.commit()
    return {"status": "logged"}
