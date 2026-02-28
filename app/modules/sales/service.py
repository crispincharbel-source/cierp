"""
Sales workflow: Quote → Confirm → Delivery → Invoice → Post
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
import uuid

from app.modules.sales.models import SaleOrder, SaleOrderLine
from app.modules.accounting.models import AccountMove, InvoiceLine
from app.modules.inventory.service import create_delivery_picking, validate_picking


async def confirm_sale_order(db: AsyncSession, order: SaleOrder, tenant_id: str) -> SaleOrder:
    """
    Confirm a sale order:
    1. Validate lines
    2. Create delivery picking (outgoing stock moves)
    3. Move state to 'confirmed'
    """
    if order.state != "draft":
        raise ValueError(f"Cannot confirm order in state '{order.state}'")

    lines = (await db.execute(
        select(SaleOrderLine).where(SaleOrderLine.order_id == order.id)
    )).scalars().all()

    if not lines:
        raise ValueError("Cannot confirm order with no lines")

    # Recalculate totals
    subtotal = 0.0
    tax_total = 0.0
    for line in lines:
        qty = float(line.quantity or 1)
        price = float(line.unit_price or 0)
        disc = float(line.discount or 0)
        tax_pct = float(line.tax_percent or 0)
        line_sub = qty * price * (1 - disc / 100)
        line_tax = line_sub * tax_pct / 100
        line.subtotal = line_sub
        line.tax_amount = line_tax
        line.total = line_sub + line_tax
        subtotal += line_sub
        tax_total += line_tax

    order.subtotal = subtotal
    order.tax_amount = tax_total
    order.total = subtotal + tax_total

    # Create delivery picking for lines that have a product_id
    product_lines = [l for l in lines if l.product_id]
    if product_lines:
        picking = await create_delivery_picking(
            db, tenant_id,
            source_id=order.id,
            source_type="sale_order",
            partner_id=order.customer_id,
            partner_name=order.customer_name,
            lines=[{
                "product_id": l.product_id,
                "product_name": l.product_name,
                "quantity": float(l.quantity or 1),
            } for l in product_lines]
        )
        order.picking_id = picking.id

    order.state = "confirmed"
    await db.flush()
    return order


async def validate_delivery(db: AsyncSession, order: SaleOrder, tenant_id: str) -> SaleOrder:
    """
    Validate the delivery:
    1. Validate the picking (updates stock)
    2. Update delivered quantities on order lines
    3. Move order to 'done'
    """
    if order.state not in ("confirmed",):
        raise ValueError(f"Order must be confirmed to validate delivery, not '{order.state}'")

    if order.picking_id:
        from app.modules.inventory.models import StockPicking
        picking = (await db.execute(
            select(StockPicking).where(StockPicking.id == order.picking_id)
        )).scalar_one_or_none()
        if picking and picking.state not in ("done", "cancelled"):
            await validate_picking(db, picking, tenant_id)

    # Mark lines as delivered
    lines = (await db.execute(
        select(SaleOrderLine).where(SaleOrderLine.order_id == order.id)
    )).scalars().all()
    for line in lines:
        line.qty_delivered = float(line.quantity or 0)

    order.state = "done"
    await db.flush()
    return order


async def create_invoice_from_order(db: AsyncSession, order: SaleOrder, tenant_id: str) -> AccountMove:
    """
    Create customer invoice from a confirmed/done sale order.
    Returns the draft AccountMove (not yet posted).
    """
    if order.state not in ("confirmed", "done"):
        raise ValueError("Can only invoice confirmed or done orders")

    lines = (await db.execute(
        select(SaleOrderLine).where(SaleOrderLine.order_id == order.id)
    )).scalars().all()

    # Create invoice move
    move = AccountMove(
        tenant_id=tenant_id,
        move_type="out_invoice",
        state="draft",
        partner_id=order.customer_id,
        partner_name=order.customer_name,
        move_date=datetime.now(timezone.utc),
        currency=order.currency or "USD",
        source_type="sale_order",
        source_id=order.id,
        ref=f"Invoice for {order.number}",
    )
    db.add(move)
    await db.flush()

    for line in lines:
        il = InvoiceLine(
            tenant_id=tenant_id,
            move_id=move.id,
            product_id=line.product_id,
            product_name=line.product_name,
            quantity=line.quantity,
            unit_price=line.unit_price,
            discount=line.discount,
            tax_percent=line.tax_percent,
            subtotal=line.subtotal,
            tax_amount=line.tax_amount,
            total=line.total,
        )
        db.add(il)
        line.qty_invoiced = float(line.quantity or 0)

    move.amount_untaxed = order.subtotal
    move.amount_tax = order.tax_amount
    move.amount_total = order.total
    move.amount_residual = order.total

    order.invoice_id = move.id
    await db.flush()
    return move
