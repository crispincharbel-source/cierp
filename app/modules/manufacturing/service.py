"""
Manufacturing workflow: Draft → Confirm (reserve components) → Produce → Done (stock moves)
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.modules.manufacturing.models import (
    ProductionOrder, ProductionOrderLine, BOM, BOMLine
)
from app.modules.inventory.models import StockMove, StockPicking
from app.modules.inventory.service import (
    get_or_create_location, validate_picking, update_quant
)


async def confirm_production_order(db: AsyncSession, order: ProductionOrder, tenant_id: str) -> ProductionOrder:
    """
    Confirm MO:
    1. Load BOM lines → create ProductionOrderLines
    2. Create component consumption picking (outgoing from stock)
    """
    if order.state != "draft":
        raise ValueError(f"Cannot confirm MO in state '{order.state}'")

    # Load BOM if set
    bom_lines = []
    if order.bom_id:
        bom = (await db.execute(select(BOM).where(BOM.id == order.bom_id))).scalar_one_or_none()
        if bom:
            bl = (await db.execute(
                select(BOMLine).where(BOMLine.bom_id == bom.id)
            )).scalars().all()
            factor = float(order.qty_planned or 1) / float(bom.product_qty or 1)
            bom_lines = [
                {"product_id": b.product_id, "product_name": b.product_name,
                 "quantity": float(b.quantity or 1) * factor}
                for b in bl if b.product_id
            ]

    # Create/refresh production order lines
    existing = (await db.execute(
        select(ProductionOrderLine).where(ProductionOrderLine.order_id == order.id)
    )).scalars().all()
    for e in existing:
        await db.delete(e)
    await db.flush()

    if bom_lines:
        for bl in bom_lines:
            pol = ProductionOrderLine(
                tenant_id=tenant_id,
                order_id=order.id,
                product_id=bl["product_id"],
                product_name=bl["product_name"],
                quantity_planned=bl["quantity"],
            )
            db.add(pol)
        await db.flush()

        # Create component picking (outgoing: stock → production)
        stock_loc = await get_or_create_location(db, tenant_id, "WH/Stock", "internal")
        prod_loc = await get_or_create_location(db, tenant_id, "Production", "internal")

        from sqlalchemy import func as sqlfunc
        seq = (await db.execute(
            select(sqlfunc.count()).where(
                StockPicking.tenant_id == tenant_id,
                StockPicking.picking_type == "internal"
            )
        )).scalar() or 0

        comp_picking = StockPicking(
            tenant_id=tenant_id,
            name=f"COMP/{datetime.now().year}/{str(seq + 1).zfill(5)}",
            picking_type="internal",
            state="confirmed",
            source_type="production_order",
            source_id=order.id,
            location_id=stock_loc.id,
            location_dest_id=prod_loc.id,
        )
        db.add(comp_picking)
        await db.flush()

        for bl in bom_lines:
            db.add(StockMove(
                tenant_id=tenant_id,
                picking_id=comp_picking.id,
                move_type="out",
                state="confirmed",
                product_id=bl["product_id"],
                product_name=bl["product_name"],
                location_id=stock_loc.id,
                location_dest_id=prod_loc.id,
                quantity=bl["quantity"],
                qty_done=bl["quantity"],
                source_type="production_order",
                source_id=order.id,
            ))
        await db.flush()
        order.component_picking_id = comp_picking.id

    order.state = "confirmed"
    await db.flush()
    return order


async def produce_order(db: AsyncSession, order: ProductionOrder, tenant_id: str,
                         qty_produced: float = None) -> ProductionOrder:
    """
    Mark production as done:
    1. Consume components (validate component picking)
    2. Produce finished goods (incoming stock move)
    """
    if order.state not in ("confirmed", "in_progress"):
        raise ValueError(f"Cannot produce MO in state '{order.state}'")

    qty = qty_produced or float(order.qty_planned or 1)

    # Consume components
    if order.component_picking_id:
        picking = (await db.execute(
            select(StockPicking).where(StockPicking.id == order.component_picking_id)
        )).scalar_one_or_none()
        if picking and picking.state not in ("done", "cancelled"):
            await validate_picking(db, picking, tenant_id)

        # Track consumed quantities on MO lines
        pol_list = (await db.execute(
            select(ProductionOrderLine).where(ProductionOrderLine.order_id == order.id)
        )).scalars().all()
        for pol in pol_list:
            pol.quantity_consumed = pol.quantity_planned

    # Produce finished goods: move into stock
    stock_loc = await get_or_create_location(db, tenant_id, "WH/Stock", "internal")
    prod_loc = await get_or_create_location(db, tenant_id, "Production", "internal")

    # Create finished goods receipt
    if order.product_id:
        fg_move = StockMove(
            tenant_id=tenant_id,
            move_type="in",
            state="done",
            product_id=order.product_id,
            product_name=order.product_name,
            location_id=prod_loc.id,
            location_dest_id=stock_loc.id,
            quantity=qty,
            qty_done=qty,
            source_type="production_order",
            source_id=order.id,
            move_date=datetime.now(timezone.utc),
        )
        db.add(fg_move)
        await db.flush()

        # Update finished product stock
        await update_quant(db, tenant_id, order.product_id, stock_loc.id, qty)
        await update_quant(db, tenant_id, order.product_id, prod_loc.id, -qty)

    order.qty_produced = qty
    order.state = "done"
    order.date_finish = datetime.now(timezone.utc)
    await db.flush()
    return order
