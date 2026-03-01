"""
Purchasing workflow: RFQ → Confirm → Receive → Vendor Bill → Post
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.modules.purchasing.models import PurchaseOrder, PurchaseOrderLine
from app.modules.accounting.models import AccountMove, InvoiceLine
from app.core.audit import audited
from app.modules.inventory.service import create_receipt_picking, validate_picking


@audited("purchasing.orders.confirm", resource_type="purchase_order")
async def confirm_purchase_order(db: AsyncSession, order: PurchaseOrder, tenant_id: str, *, user=None) -> PurchaseOrder:
    if order.state not in ("draft", "sent"):
        raise ValueError(f"Cannot confirm PO in state '{order.state}'")

    lines = (await db.execute(
        select(PurchaseOrderLine).where(PurchaseOrderLine.order_id == order.id)
    )).scalars().all()

    if not lines:
        raise ValueError("Cannot confirm PO with no lines")

    # Recalculate totals
    subtotal = 0.0
    tax_total = 0.0
    for line in lines:
        qty = float(line.quantity or 1)
        price = float(line.unit_price or 0)
        tax_pct = float(line.tax_percent or 0)
        line_sub = qty * price
        line_tax = line_sub * tax_pct / 100
        line.subtotal = line_sub
        line.tax_amount = line_tax
        line.total = line_sub + line_tax
        subtotal += line_sub
        tax_total += line_tax

    order.subtotal = subtotal
    order.tax_amount = tax_total
    order.total = subtotal + tax_total

    # Create receipt picking
    product_lines = [l for l in lines if l.product_id]
    if product_lines:
        picking = await create_receipt_picking(
            db, tenant_id,
            source_id=order.id,
            source_type="purchase_order",
            partner_id=order.supplier_id,
            partner_name=order.supplier_name,
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


@audited("purchasing.orders.receive", resource_type="purchase_order")
async def validate_receipt(db: AsyncSession, order: PurchaseOrder, tenant_id: str, *, user=None) -> PurchaseOrder:
    if order.state != "confirmed":
        raise ValueError("PO must be confirmed before receiving")

    if order.picking_id:
        from app.modules.inventory.models import StockPicking
        picking = (await db.execute(
            select(StockPicking).where(StockPicking.id == order.picking_id)
        )).scalar_one_or_none()
        if picking and picking.state not in ("done", "cancelled"):
            await validate_picking(db, picking, tenant_id)

    lines = (await db.execute(
        select(PurchaseOrderLine).where(PurchaseOrderLine.order_id == order.id)
    )).scalars().all()
    for line in lines:
        line.qty_received = float(line.quantity or 0)

    order.state = "received"
    await db.flush()
    return order


async def create_vendor_bill(db: AsyncSession, order: PurchaseOrder, tenant_id: str) -> AccountMove:
    """Create vendor bill (in_invoice) from a received PO."""
    if order.state not in ("received", "confirmed"):
        raise ValueError("PO must be received before creating vendor bill")

    lines = (await db.execute(
        select(PurchaseOrderLine).where(PurchaseOrderLine.order_id == order.id)
    )).scalars().all()

    move = AccountMove(
        tenant_id=tenant_id,
        move_type="in_invoice",
        state="draft",
        partner_id=order.supplier_id,
        partner_name=order.supplier_name,
        move_date=datetime.now(timezone.utc),
        currency=order.currency or "USD",
        source_type="purchase_order",
        source_id=order.id,
        ref=f"Bill for {order.number}",
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
            tax_percent=line.tax_percent,
            subtotal=line.subtotal,
            tax_amount=line.tax_amount,
            total=line.total,
        )
        db.add(il)
        line.qty_billed = float(line.quantity or 0)

    move.amount_untaxed = order.subtotal
    move.amount_tax = order.tax_amount
    move.amount_total = order.total
    move.amount_residual = order.total

    order.invoice_id = move.id
    order.state = "billed"
    await db.flush()
    return move
