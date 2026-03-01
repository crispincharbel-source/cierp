"""
Inventory workflow service — move-driven stock, no stored qty drift.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from decimal import Decimal
import uuid

from app.core.audit import audited
from app.modules.inventory.models import (
    Product, StockMove, StockPicking, StockLocation, StockQuant, Warehouse
)


async def get_or_create_location(db: AsyncSession, tenant_id: str,
                                   name: str, location_type: str) -> StockLocation:
    r = await db.execute(
        select(StockLocation).where(
            StockLocation.tenant_id == tenant_id,
            StockLocation.name == name,
            StockLocation.location_type == location_type
        )
    )
    loc = r.scalar_one_or_none()
    if not loc:
        loc = StockLocation(tenant_id=tenant_id, name=name,
                             complete_name=name, location_type=location_type)
        db.add(loc)
        await db.flush()
    return loc


async def update_quant(db: AsyncSession, tenant_id: str,
                        product_id: str, location_id: str, qty_delta: float):
    """Update stock quant for a product at a location."""
    r = await db.execute(
        select(StockQuant).where(
            StockQuant.tenant_id == tenant_id,
            StockQuant.product_id == product_id,
            StockQuant.location_id == location_id,
        )
    )
    quant = r.scalar_one_or_none()
    if quant:
        quant.quantity = float(Decimal(str(quant.quantity or 0)) + Decimal(str(qty_delta)))
    else:
        quant = StockQuant(
            tenant_id=tenant_id,
            product_id=product_id,
            location_id=location_id,
            quantity=qty_delta,
        )
        db.add(quant)
    await db.flush()

    # Also update product.qty_on_hand (sum of internal locations)
    total_qty = (await db.execute(
        select(func.coalesce(func.sum(StockQuant.quantity), 0))
        .join(StockLocation, StockLocation.id == StockQuant.location_id)
        .where(
            StockQuant.tenant_id == tenant_id,
            StockQuant.product_id == product_id,
            StockLocation.location_type == "internal",
        )
    )).scalar()
    prod = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if prod:
        prod.qty_on_hand = float(total_qty or 0)
    await db.flush()


@audited("inventory.transfers.validate", resource_type="stock_picking", severity="info")
async def validate_picking(db: AsyncSession, picking: StockPicking, tenant_id: str, *, user=None) -> StockPicking:
    """Validate a transfer: set all moves to done and update quants."""
    if picking.state in ("done", "cancelled"):
        raise ValueError(f"Picking already {picking.state}")

    moves = (await db.execute(
        select(StockMove).where(StockMove.picking_id == picking.id)
    )).scalars().all()

    for move in moves:
        if move.state == "cancelled":
            continue
        qty = float(move.qty_done or move.quantity or 0)

        # Decrease from source location
        if move.location_id:
            await update_quant(db, tenant_id, move.product_id, move.location_id, -qty)

        # Increase at destination location
        if move.location_dest_id:
            await update_quant(db, tenant_id, move.product_id, move.location_dest_id, qty)

        move.qty_done = qty
        move.state = "done"
        move.move_date = datetime.now(timezone.utc)

    picking.state = "done"
    picking.date_done = datetime.now(timezone.utc)
    await db.flush()
    return picking


async def create_delivery_picking(db: AsyncSession, tenant_id: str,
                                    source_id: str, source_type: str,
                                    partner_id: str, partner_name: str,
                                    lines: list) -> StockPicking:
    """
    Create outgoing delivery picking from SO lines.
    lines: list of {product_id, product_name, quantity}
    """
    stock_loc = await get_or_create_location(db, tenant_id, "WH/Stock", "internal")
    customer_loc = await get_or_create_location(db, tenant_id, "Customers", "customer")

    seq = (await db.execute(
        select(func.count()).where(
            StockPicking.tenant_id == tenant_id,
            StockPicking.picking_type == "outgoing"
        )
    )).scalar() or 0

    picking = StockPicking(
        tenant_id=tenant_id,
        name=f"OUT/{datetime.now().year}/{str(seq + 1).zfill(5)}",
        picking_type="outgoing",
        state="confirmed",
        source_type=source_type,
        source_id=source_id,
        partner_id=partner_id,
        partner_name=partner_name,
        location_id=stock_loc.id,
        location_dest_id=customer_loc.id,
    )
    db.add(picking)
    await db.flush()

    for line in lines:
        move = StockMove(
            tenant_id=tenant_id,
            picking_id=picking.id,
            move_type="out",
            state="confirmed",
            product_id=line["product_id"],
            product_name=line["product_name"],
            location_id=stock_loc.id,
            location_dest_id=customer_loc.id,
            quantity=line["quantity"],
            qty_done=line["quantity"],
            origin=source_id,
            source_type=source_type,
            source_id=source_id,
        )
        db.add(move)

    await db.flush()
    return picking


async def create_receipt_picking(db: AsyncSession, tenant_id: str,
                                   source_id: str, source_type: str,
                                   partner_id: str, partner_name: str,
                                   lines: list) -> StockPicking:
    """
    Create incoming receipt picking from PO lines.
    lines: list of {product_id, product_name, quantity}
    """
    vendor_loc = await get_or_create_location(db, tenant_id, "Vendors", "vendor")
    stock_loc = await get_or_create_location(db, tenant_id, "WH/Stock", "internal")

    seq = (await db.execute(
        select(func.count()).where(
            StockPicking.tenant_id == tenant_id,
            StockPicking.picking_type == "incoming"
        )
    )).scalar() or 0

    picking = StockPicking(
        tenant_id=tenant_id,
        name=f"IN/{datetime.now().year}/{str(seq + 1).zfill(5)}",
        picking_type="incoming",
        state="confirmed",
        source_type=source_type,
        source_id=source_id,
        partner_id=partner_id,
        partner_name=partner_name,
        location_id=vendor_loc.id,
        location_dest_id=stock_loc.id,
    )
    db.add(picking)
    await db.flush()

    for line in lines:
        move = StockMove(
            tenant_id=tenant_id,
            picking_id=picking.id,
            move_type="in",
            state="confirmed",
            product_id=line["product_id"],
            product_name=line["product_name"],
            location_id=vendor_loc.id,
            location_dest_id=stock_loc.id,
            quantity=line["quantity"],
            qty_done=line["quantity"],
            origin=source_id,
            source_type=source_type,
            source_id=source_id,
        )
        db.add(move)

    await db.flush()
    return picking


async def get_stock_on_hand(db: AsyncSession, tenant_id: str) -> list:
    """Get all products with their on-hand quantity."""
    result = await db.execute(
        select(
            Product.id,
            Product.code,
            Product.name,
            Product.uom,
            Product.cost_price,
            Product.sale_price,
            Product.qty_on_hand,
            Product.reorder_point,
        ).where(Product.tenant_id == tenant_id, Product.is_deleted == False)
        .order_by(Product.name)
    )
    rows = result.all()
    return [
        {
            "id": r.id, "code": r.code, "name": r.name, "uom": r.uom,
            "cost_price": float(r.cost_price or 0),
            "sale_price": float(r.sale_price or 0),
            "qty_on_hand": float(r.qty_on_hand or 0),
            "reorder_point": float(r.reorder_point or 0),
            "value": float(r.qty_on_hand or 0) * float(r.cost_price or 0),
            "low_stock": float(r.qty_on_hand or 0) <= float(r.reorder_point or 0),
        }
        for r in rows
    ]
