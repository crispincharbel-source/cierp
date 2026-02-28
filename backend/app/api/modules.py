"""
All module routers — auth enforced, tenant from JWT, real workflow endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel as Schema
from typing import Optional, List
from datetime import datetime
from app.core.database import get_db
from app.core.deps import require_auth
from app.modules.identity.models import User

# ─── Models ──────────────────────────────────────────────────────
from app.modules.accounting.models import (
    Account, Journal, AccountMove, AccountMoveLine, InvoiceLine, Payment, Tax
)
from app.modules.accounting.service import post_invoice, post_payment, get_trial_balance

from app.modules.sales.models import Customer, SaleOrder, SaleOrderLine, Lead
from app.modules.sales.service import confirm_sale_order, validate_delivery, create_invoice_from_order

from app.modules.purchasing.models import Supplier, PurchaseOrder, PurchaseOrderLine
from app.modules.purchasing.service import confirm_purchase_order, validate_receipt, create_vendor_bill

from app.modules.inventory.models import Product, Warehouse, StockMove, StockPicking, StockLocation, StockQuant
from app.modules.inventory.service import get_stock_on_hand, validate_picking as validate_transfer

from app.modules.manufacturing.models import BOM, BOMLine, ProductionOrder, ProductionOrderLine
from app.modules.manufacturing.service import confirm_production_order, produce_order

from app.modules.hr.models import Department, Employee, LeaveRequest, Payslip
from app.modules.projects.models import Project, Task
from app.modules.helpdesk.models import HelpdeskTicket, TicketReply
from app.modules.crm.models import Activity


def row_to_dict(obj):
    """Convert SQLAlchemy model to dict."""
    d = {}
    for c in obj.__table__.columns:
        v = getattr(obj, c.name)
        if hasattr(v, 'isoformat'):
            v = v.isoformat()
        elif hasattr(v, '__float__'):
            try:
                v = float(v)
            except Exception:
                pass
        d[c.name] = v
    return d


def get_tenant(user: User = Depends(require_auth)) -> str:
    return user.tenant_id


# ═══════════════════════════════════════════════════════════════════
#  SCHEMAS
# ═══════════════════════════════════════════════════════════════════

class CustomerCreate(Schema):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None

class CustomerUpdate(Schema):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierCreate(Schema):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    payment_terms: Optional[str] = None

class SupplierUpdate(Schema):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class ProductCreate(Schema):
    name: str
    code: Optional[str] = None
    category: Optional[str] = None
    uom: Optional[str] = "pcs"
    cost_price: Optional[float] = 0
    sale_price: Optional[float] = 0
    reorder_point: Optional[float] = 0

class ProductUpdate(Schema):
    name: Optional[str] = None
    sale_price: Optional[float] = None
    cost_price: Optional[float] = None
    is_active: Optional[bool] = None
    reorder_point: Optional[float] = None

class AccountCreate(Schema):
    code: str
    name: str
    account_type: str
    internal_type: Optional[str] = None

class InvoiceCreate(Schema):
    move_type: str = "out_invoice"
    partner_name: Optional[str] = None
    partner_id: Optional[str] = None
    move_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    currency: Optional[str] = "USD"
    ref: Optional[str] = None

class InvoiceLineCreate(Schema):
    product_id: Optional[str] = None
    product_name: str
    description: Optional[str] = None
    quantity: float = 1
    unit_price: float = 0
    discount: float = 0
    tax_percent: float = 0

class PaymentCreate(Schema):
    payment_type: str
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    journal_id: Optional[str] = None
    amount: float
    currency: Optional[str] = "USD"
    payment_date: Optional[datetime] = None
    memo: Optional[str] = None
    invoice_id: Optional[str] = None

class SaleOrderCreate(Schema):
    customer_name: Optional[str] = None
    customer_id: Optional[str] = None
    order_date: Optional[datetime] = None
    currency: Optional[str] = "USD"
    notes: Optional[str] = None
    salesperson: Optional[str] = None

class SaleOrderLineCreate(Schema):
    product_id: Optional[str] = None
    product_name: str
    quantity: float = 1
    unit_price: float = 0
    discount: float = 0
    tax_percent: float = 0

class SaleOrderLineUpdate(Schema):
    product_name: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    discount: Optional[float] = None
    tax_percent: Optional[float] = None

class SaleOrderUpdate(Schema):
    notes: Optional[str] = None
    salesperson: Optional[str] = None
    delivery_date: Optional[datetime] = None

class LeadCreate(Schema):
    title: str
    customer_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    expected_revenue: Optional[float] = 0
    probability: Optional[int] = 20
    source: Optional[str] = None
    assigned_to: Optional[str] = None

class LeadUpdate(Schema):
    title: Optional[str] = None
    state: Optional[str] = None
    probability: Optional[int] = None
    expected_revenue: Optional[float] = None
    assigned_to: Optional[str] = None

class PurchaseOrderCreate(Schema):
    supplier_name: Optional[str] = None
    supplier_id: Optional[str] = None
    order_date: Optional[datetime] = None
    expected_date: Optional[datetime] = None
    currency: Optional[str] = "USD"
    notes: Optional[str] = None

class PurchaseOrderLineCreate(Schema):
    product_id: Optional[str] = None
    product_name: str
    quantity: float = 1
    unit_price: float = 0
    tax_percent: float = 0

class EmployeeCreate(Schema):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    department_id: Optional[str] = None
    salary: Optional[float] = 0
    currency: Optional[str] = "USD"
    hire_date: Optional[datetime] = None

class EmployeeUpdate(Schema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    salary: Optional[float] = None
    status: Optional[str] = None

class DepartmentCreate(Schema):
    name: str
    code: Optional[str] = None
    manager_name: Optional[str] = None

class ProductionOrderCreate(Schema):
    product_name: str
    product_id: Optional[str] = None
    bom_id: Optional[str] = None
    qty_planned: Optional[float] = 1
    scheduled_date: Optional[datetime] = None
    notes: Optional[str] = None

class BOMCreate(Schema):
    product_id: Optional[str] = None
    product_name: str
    product_qty: float = 1
    uom: Optional[str] = "pcs"

class BOMLineCreate(Schema):
    bom_id: str
    product_id: Optional[str] = None
    product_name: str
    quantity: float = 1
    uom: Optional[str] = "pcs"

class ProjectCreate(Schema):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    customer_name: Optional[str] = None
    manager_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = 0

class ProjectUpdate(Schema):
    name: Optional[str] = None
    state: Optional[str] = None
    progress: Optional[int] = None
    manager_name: Optional[str] = None

class TaskCreate(Schema):
    project_id: str
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "normal"
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = 0

class TaskUpdate(Schema):
    title: Optional[str] = None
    state: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    actual_hours: Optional[float] = None

class TicketCreate(Schema):
    subject: str
    description: Optional[str] = None
    priority: Optional[str] = "normal"
    category: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None

class TicketUpdate(Schema):
    state: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

class TicketReplyCreate(Schema):
    body: str
    is_internal: Optional[bool] = False

class StockMoveCreate(Schema):
    move_type: str
    product_id: str
    product_name: Optional[str] = None
    warehouse_id: Optional[str] = None
    quantity: float
    uom: Optional[str] = "pcs"
    reference: Optional[str] = None
    notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════
#  ROUTERS
# ═══════════════════════════════════════════════════════════════════

accounting_router = APIRouter(prefix="/accounting", tags=["Accounting"])
sales_router = APIRouter(prefix="/sales", tags=["Sales"])
crm_router = APIRouter(prefix="/crm", tags=["CRM"])
purchasing_router = APIRouter(prefix="/purchasing", tags=["Purchasing"])
inventory_router = APIRouter(prefix="/inventory", tags=["Inventory"])
hr_router = APIRouter(prefix="/hr", tags=["HR"])
manufacturing_router = APIRouter(prefix="/manufacturing", tags=["Manufacturing"])
projects_router = APIRouter(prefix="/projects", tags=["Projects"])
helpdesk_router = APIRouter(prefix="/helpdesk", tags=["Helpdesk"])


# ═══════════════════════════════════════════════════════════════════
#  ACCOUNTING
# ═══════════════════════════════════════════════════════════════════

@accounting_router.get("/accounts")
async def list_accounts(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Account).where(Account.tenant_id == tenant_id, Account.is_deleted == False).order_by(Account.code))
    return [row_to_dict(x) for x in r.scalars().all()]

@accounting_router.post("/accounts", status_code=201)
async def create_account(data: AccountCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    a = Account(**data.model_dump(), tenant_id=tenant_id)
    db.add(a); await db.commit(); await db.refresh(a)
    return row_to_dict(a)

@accounting_router.get("/journals")
async def list_journals(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Journal).where(Journal.tenant_id == tenant_id, Journal.is_deleted == False))
    return [row_to_dict(x) for x in r.scalars().all()]

@accounting_router.get("/invoices")
async def list_invoices(
    page: int = 1, limit: int = 20,
    move_type: Optional[str] = None,
    state: Optional[str] = None,
    tenant_id: str = Depends(get_tenant),
    db: AsyncSession = Depends(get_db)
):
    q = select(AccountMove).where(
        AccountMove.tenant_id == tenant_id,
        AccountMove.is_deleted == False,
        AccountMove.move_type.in_(["out_invoice", "in_invoice", "out_refund", "in_refund"])
    )
    if move_type: q = q.where(AccountMove.move_type == move_type)
    if state: q = q.where(AccountMove.state == state)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(AccountMove.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total, "page": page}

@accounting_router.post("/invoices", status_code=201)
async def create_invoice(data: InvoiceCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    import uuid as _uuid
    move = AccountMove(**data.model_dump(exclude_none=True), tenant_id=tenant_id, state="draft")
    db.add(move); await db.commit(); await db.refresh(move)
    return row_to_dict(move)

@accounting_router.get("/invoices/{inv_id}")
async def get_invoice(inv_id: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(AccountMove).where(AccountMove.id == inv_id, AccountMove.tenant_id == tenant_id))
    inv = r.scalar_one_or_none()
    if not inv: raise HTTPException(404, "Not found")
    result = row_to_dict(inv)
    lines = (await db.execute(select(InvoiceLine).where(InvoiceLine.move_id == inv_id))).scalars().all()
    result["lines"] = [row_to_dict(l) for l in lines]
    move_lines = (await db.execute(select(AccountMoveLine).where(AccountMoveLine.move_id == inv_id))).scalars().all()
    result["move_lines"] = [row_to_dict(ml) for ml in move_lines]
    return result

@accounting_router.post("/invoices/{inv_id}/lines", status_code=201)
async def add_invoice_line(inv_id: str, data: InvoiceLineCreate,
                            tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    inv = (await db.execute(select(AccountMove).where(AccountMove.id == inv_id, AccountMove.tenant_id == tenant_id))).scalar_one_or_none()
    if not inv: raise HTTPException(404, "Invoice not found")
    if inv.state != "draft": raise HTTPException(400, "Cannot add lines to posted invoice")
    line = InvoiceLine(**data.model_dump(exclude_none=True), move_id=inv_id, tenant_id=tenant_id)
    db.add(line); await db.commit(); await db.refresh(line)
    return row_to_dict(line)

@accounting_router.post("/invoices/{inv_id}/post")
async def post_invoice_endpoint(inv_id: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    inv = (await db.execute(select(AccountMove).where(AccountMove.id == inv_id, AccountMove.tenant_id == tenant_id))).scalar_one_or_none()
    if not inv: raise HTTPException(404, "Invoice not found")
    try:
        inv = await post_invoice(db, inv, tenant_id)
        await db.commit()
        return row_to_dict(inv)
    except ValueError as e:
        raise HTTPException(400, str(e))

@accounting_router.post("/invoices/{inv_id}/cancel")
async def cancel_invoice(inv_id: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    inv = (await db.execute(select(AccountMove).where(AccountMove.id == inv_id, AccountMove.tenant_id == tenant_id))).scalar_one_or_none()
    if not inv: raise HTTPException(404, "Not found")
    if inv.state == "posted": raise HTTPException(400, "Cannot cancel posted invoice — create a credit note instead")
    inv.state = "cancelled"; await db.commit()
    return {"ok": True}

@accounting_router.get("/payments")
async def list_payments(page: int = 1, limit: int = 20,
                         tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(Payment).where(Payment.tenant_id == tenant_id, Payment.is_deleted == False)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(Payment.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total}

@accounting_router.post("/payments", status_code=201)
async def create_payment(data: PaymentCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    payment = Payment(**data.model_dump(exclude_none=True), tenant_id=tenant_id)
    db.add(payment); await db.commit(); await db.refresh(payment)
    return row_to_dict(payment)

@accounting_router.post("/payments/{pid}/post")
async def post_payment_endpoint(pid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    payment = (await db.execute(select(Payment).where(Payment.id == pid, Payment.tenant_id == tenant_id))).scalar_one_or_none()
    if not payment: raise HTTPException(404, "Not found")
    invoice = None
    if payment.invoice_id:
        invoice = (await db.execute(select(AccountMove).where(AccountMove.id == payment.invoice_id))).scalar_one_or_none()
    try:
        payment = await post_payment(db, payment, tenant_id, invoice)
        await db.commit()
        return row_to_dict(payment)
    except ValueError as e:
        raise HTTPException(400, str(e))

@accounting_router.get("/trial-balance")
async def trial_balance(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    return await get_trial_balance(db, tenant_id)

@accounting_router.get("/journal-entries")
async def list_journal_entries(page: int = 1, limit: int = 20,
                                tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(AccountMove).where(
        AccountMove.tenant_id == tenant_id,
        AccountMove.is_deleted == False,
        AccountMove.state == "posted"
    )
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(AccountMove.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total}

@accounting_router.get("/dashboard")
async def accounting_dashboard(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    total_ar = float((await db.execute(
        select(func.coalesce(func.sum(AccountMove.amount_residual), 0))
        .where(AccountMove.tenant_id == tenant_id, AccountMove.move_type == "out_invoice",
               AccountMove.state == "posted", AccountMove.payment_state != "paid",
               AccountMove.is_deleted == False)
    )).scalar())
    total_ap = float((await db.execute(
        select(func.coalesce(func.sum(AccountMove.amount_residual), 0))
        .where(AccountMove.tenant_id == tenant_id, AccountMove.move_type == "in_invoice",
               AccountMove.state == "posted", AccountMove.payment_state != "paid",
               AccountMove.is_deleted == False)
    )).scalar())
    total_revenue = float((await db.execute(
        select(func.coalesce(func.sum(AccountMove.amount_total), 0))
        .where(AccountMove.tenant_id == tenant_id, AccountMove.move_type == "out_invoice",
               AccountMove.state == "posted", AccountMove.is_deleted == False)
    )).scalar())
    total_expenses = float((await db.execute(
        select(func.coalesce(func.sum(AccountMove.amount_total), 0))
        .where(AccountMove.tenant_id == tenant_id, AccountMove.move_type == "in_invoice",
               AccountMove.state == "posted", AccountMove.is_deleted == False)
    )).scalar())
    inv_count = (await db.execute(
        select(func.count()).where(AccountMove.tenant_id == tenant_id,
                                    AccountMove.move_type.in_(["out_invoice","in_invoice"]),
                                    AccountMove.is_deleted == False)
    )).scalar()
    return {
        "accounts_receivable": total_ar,
        "accounts_payable": total_ap,
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net_income": total_revenue - total_expenses,
        "invoice_count": inv_count,
    }


# ═══════════════════════════════════════════════════════════════════
#  SALES
# ═══════════════════════════════════════════════════════════════════

@sales_router.get("/customers")
async def list_customers(page: int = 1, limit: int = 20, search: Optional[str] = None,
                          tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(Customer).where(Customer.tenant_id == tenant_id, Customer.is_deleted == False)
    if search: q = q.where(Customer.name.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(Customer.name).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total, "page": page}

@sales_router.post("/customers", status_code=201)
async def create_customer(data: CustomerCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    c = Customer(**data.model_dump(), tenant_id=tenant_id)
    db.add(c); await db.commit(); await db.refresh(c)
    return row_to_dict(c)

@sales_router.put("/customers/{cid}")
async def update_customer(cid: str, data: CustomerUpdate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Customer).where(Customer.id == cid, Customer.tenant_id == tenant_id))).scalar_one_or_none()
    if not c: raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True, exclude_unset=True).items(): setattr(c, k, v)
    await db.commit(); return row_to_dict(c)

@sales_router.get("/orders")
async def list_orders(page: int = 1, limit: int = 20, state: Optional[str] = None,
                       tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(SaleOrder).where(SaleOrder.tenant_id == tenant_id, SaleOrder.is_deleted == False)
    if state: q = q.where(SaleOrder.state == state)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(SaleOrder.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total, "page": page}

@sales_router.post("/orders", status_code=201)
async def create_order(data: SaleOrderCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    import uuid
    o = SaleOrder(**data.model_dump(exclude_none=True), tenant_id=tenant_id)
    o.number = f"SO-{datetime.now().year}-{str((await db.execute(select(func.count()).where(SaleOrder.tenant_id == tenant_id))).scalar() + 1).zfill(4)}"
    db.add(o); await db.commit(); await db.refresh(o)
    return row_to_dict(o)

@sales_router.get("/orders/{oid}")
async def get_order(oid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    o = (await db.execute(select(SaleOrder).where(SaleOrder.id == oid, SaleOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not o: raise HTTPException(404, "Not found")
    result = row_to_dict(o)
    lines = (await db.execute(select(SaleOrderLine).where(SaleOrderLine.order_id == oid))).scalars().all()
    result["lines"] = [row_to_dict(l) for l in lines]
    return result

@sales_router.put("/orders/{oid}")
async def update_order(oid: str, data: SaleOrderUpdate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    o = (await db.execute(select(SaleOrder).where(SaleOrder.id == oid, SaleOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not o: raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True, exclude_unset=True).items(): setattr(o, k, v)
    await db.commit(); return row_to_dict(o)

@sales_router.post("/orders/{oid}/lines", status_code=201)
async def add_order_line(oid: str, data: SaleOrderLineCreate,
                          tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    o = (await db.execute(select(SaleOrder).where(SaleOrder.id == oid, SaleOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not o: raise HTTPException(404, "Not found")
    if o.state != "draft": raise HTTPException(400, "Cannot add lines to confirmed order")
    line = SaleOrderLine(**data.model_dump(exclude_none=True), order_id=oid, tenant_id=tenant_id)
    db.add(line); await db.commit(); await db.refresh(line)
    return row_to_dict(line)

@sales_router.put("/orders/lines/{line_id}")
async def update_order_line(line_id: str, data: SaleOrderLineUpdate,
                           tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    line = (await db.execute(select(SaleOrderLine).where(SaleOrderLine.id == line_id, SaleOrderLine.tenant_id == tenant_id))).scalar_one_or_none()
    if not line: raise HTTPException(404, "Not found")
    
    order = (await db.execute(select(SaleOrder).where(SaleOrder.id == line.order_id, SaleOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if order.state != "draft": raise HTTPException(400, "Cannot update lines of a confirmed order")

    for k, v in data.model_dump(exclude_none=True, exclude_unset=True).items(): 
        setattr(line, k, v)
    
    await db.commit()
    return row_to_dict(line)

@sales_router.delete("/orders/lines/{line_id}", status_code=204)
async def delete_order_line(line_id: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    line = (await db.execute(select(SaleOrderLine).where(SaleOrderLine.id == line_id, SaleOrderLine.tenant_id == tenant_id))).scalar_one_or_none()
    if not line: raise HTTPException(404, "Not found")

    order = (await db.execute(select(SaleOrder).where(SaleOrder.id == line.order_id, SaleOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if order.state != "draft": raise HTTPException(400, "Cannot delete lines from a confirmed order")

    await db.delete(line)
    await db.commit()
    return 

@sales_router.post("/orders/{oid}/confirm")
async def confirm_order(oid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    o = (await db.execute(select(SaleOrder).where(SaleOrder.id == oid, SaleOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not o: raise HTTPException(404, "Not found")
    try:
        o = await confirm_sale_order(db, o, tenant_id)
        await db.commit()
        return row_to_dict(o)
    except ValueError as e:
        raise HTTPException(400, str(e))

@sales_router.post("/orders/{oid}/validate-delivery")
async def validate_order_delivery(oid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    o = (await db.execute(select(SaleOrder).where(SaleOrder.id == oid, SaleOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not o: raise HTTPException(404, "Not found")
    try:
        o = await validate_delivery(db, o, tenant_id)
        await db.commit()
        return row_to_dict(o)
    except ValueError as e:
        raise HTTPException(400, str(e))

@sales_router.post("/orders/{oid}/create-invoice")
async def create_order_invoice(oid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    o = (await db.execute(select(SaleOrder).where(SaleOrder.id == oid, SaleOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not o: raise HTTPException(404, "Not found")
    try:
        inv = await create_invoice_from_order(db, o, tenant_id)
        await db.commit()
        return row_to_dict(inv)
    except ValueError as e:
        raise HTTPException(400, str(e))

@sales_router.post("/orders/{oid}/cancel")
async def cancel_order(oid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    o = (await db.execute(select(SaleOrder).where(SaleOrder.id == oid, SaleOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not o: raise HTTPException(404, "Not found")
    if o.state in ("done",): raise HTTPException(400, "Cannot cancel a done order")
    o.state = "cancelled"; await db.commit()
    return {"ok": True}

@sales_router.get("/leads")
async def list_leads(page: int = 1, limit: int = 20, state: Optional[str] = None,
                      tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(Lead).where(Lead.tenant_id == tenant_id, Lead.is_deleted == False)
    if state: q = q.where(Lead.state == state)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(Lead.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total, "page": page}

@sales_router.post("/leads", status_code=201)
async def create_lead(data: LeadCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    l = Lead(**data.model_dump(exclude_none=True), tenant_id=tenant_id)
    db.add(l); await db.commit(); await db.refresh(l)
    return row_to_dict(l)

@sales_router.put("/leads/{lid}")
async def update_lead(lid: str, data: LeadUpdate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    l = (await db.execute(select(Lead).where(Lead.id == lid, Lead.tenant_id == tenant_id))).scalar_one_or_none()
    if not l: raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True, exclude_unset=True).items(): setattr(l, k, v)
    await db.commit(); return row_to_dict(l)

@sales_router.get("/dashboard")
async def sales_dashboard(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    total_orders = (await db.execute(select(func.count()).where(SaleOrder.tenant_id == tenant_id, SaleOrder.is_deleted == False))).scalar()
    confirmed = (await db.execute(select(func.count()).where(SaleOrder.tenant_id == tenant_id, SaleOrder.state == "confirmed", SaleOrder.is_deleted == False))).scalar()
    revenue = float((await db.execute(select(func.coalesce(func.sum(SaleOrder.total), 0)).where(SaleOrder.tenant_id == tenant_id, SaleOrder.state.in_(["confirmed","done"]), SaleOrder.is_deleted == False))).scalar())
    pipeline = float((await db.execute(select(func.coalesce(func.sum(Lead.expected_revenue), 0)).where(Lead.tenant_id == tenant_id, Lead.state.not_in(["won","lost"]), Lead.is_deleted == False))).scalar())
    return {"total_orders": total_orders, "confirmed_orders": confirmed, "revenue": revenue, "pipeline_value": pipeline}


# ═══════════════════════════════════════════════════════════════════
#  PURCHASING
# ═══════════════════════════════════════════════════════════════════

@purchasing_router.get("/suppliers")
async def list_suppliers(page: int = 1, limit: int = 20, search: Optional[str] = None,
                          tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(Supplier).where(Supplier.tenant_id == tenant_id, Supplier.is_deleted == False)
    if search: q = q.where(Supplier.name.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(Supplier.name).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total, "page": page}

@purchasing_router.post("/suppliers", status_code=201)
async def create_supplier(data: SupplierCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    s = Supplier(**data.model_dump(), tenant_id=tenant_id)
    db.add(s); await db.commit(); await db.refresh(s)
    return row_to_dict(s)

@purchasing_router.put("/suppliers/{sid}")
async def update_supplier(sid: str, data: SupplierUpdate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    s = (await db.execute(select(Supplier).where(Supplier.id == sid, Supplier.tenant_id == tenant_id))).scalar_one_or_none()
    if not s: raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True, exclude_unset=True).items(): setattr(s, k, v)
    await db.commit(); return row_to_dict(s)

@purchasing_router.get("/orders")
async def list_po(page: int = 1, limit: int = 20, state: Optional[str] = None,
                   tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(PurchaseOrder).where(PurchaseOrder.tenant_id == tenant_id, PurchaseOrder.is_deleted == False)
    if state: q = q.where(PurchaseOrder.state == state)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(PurchaseOrder.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total, "page": page}

@purchasing_router.post("/orders", status_code=201)
async def create_po(data: PurchaseOrderCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    po = PurchaseOrder(**data.model_dump(exclude_none=True), tenant_id=tenant_id)
    count = (await db.execute(select(func.count()).where(PurchaseOrder.tenant_id == tenant_id))).scalar()
    po.number = f"PO-{datetime.now().year}-{str(count + 1).zfill(4)}"
    db.add(po); await db.commit(); await db.refresh(po)
    return row_to_dict(po)

@purchasing_router.get("/orders/{oid}")
async def get_po(oid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == oid, PurchaseOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not po: raise HTTPException(404, "Not found")
    result = row_to_dict(po)
    lines = (await db.execute(select(PurchaseOrderLine).where(PurchaseOrderLine.order_id == oid))).scalars().all()
    result["lines"] = [row_to_dict(l) for l in lines]
    return result

@purchasing_router.post("/orders/{oid}/lines", status_code=201)
async def add_po_line(oid: str, data: PurchaseOrderLineCreate,
                       tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == oid, PurchaseOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not po: raise HTTPException(404, "Not found")
    if po.state != "draft": raise HTTPException(400, "Cannot add lines to confirmed PO")
    line = PurchaseOrderLine(**data.model_dump(exclude_none=True), order_id=oid, tenant_id=tenant_id)
    db.add(line); await db.commit(); await db.refresh(line)
    return row_to_dict(line)

@purchasing_router.post("/orders/{oid}/confirm")
async def confirm_po(oid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == oid, PurchaseOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not po: raise HTTPException(404, "Not found")
    try:
        po = await confirm_purchase_order(db, po, tenant_id)
        await db.commit()
        return row_to_dict(po)
    except ValueError as e:
        raise HTTPException(400, str(e))

@purchasing_router.post("/orders/{oid}/receive")
async def receive_po(oid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == oid, PurchaseOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not po: raise HTTPException(404, "Not found")
    try:
        po = await validate_receipt(db, po, tenant_id)
        await db.commit()
        return row_to_dict(po)
    except ValueError as e:
        raise HTTPException(400, str(e))

@purchasing_router.post("/orders/{oid}/create-bill")
async def create_bill(oid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == oid, PurchaseOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not po: raise HTTPException(404, "Not found")
    try:
        bill = await create_vendor_bill(db, po, tenant_id)
        await db.commit()
        return row_to_dict(bill)
    except ValueError as e:
        raise HTTPException(400, str(e))

@purchasing_router.get("/dashboard")
async def purchasing_dashboard(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).where(PurchaseOrder.tenant_id == tenant_id, PurchaseOrder.is_deleted == False))).scalar()
    pending = (await db.execute(select(func.count()).where(PurchaseOrder.tenant_id == tenant_id, PurchaseOrder.state.in_(["draft","sent"]), PurchaseOrder.is_deleted == False))).scalar()
    total_spend = float((await db.execute(select(func.coalesce(func.sum(PurchaseOrder.total), 0)).where(PurchaseOrder.tenant_id == tenant_id, PurchaseOrder.state.in_(["confirmed","received","billed"]), PurchaseOrder.is_deleted == False))).scalar())
    return {"total_orders": total, "pending_orders": pending, "total_spend": total_spend}


# ═══════════════════════════════════════════════════════════════════
#  INVENTORY
# ═══════════════════════════════════════════════════════════════════

@inventory_router.get("/products")
async def list_products(page: int = 1, limit: int = 20, search: Optional[str] = None,
                         tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(Product).where(Product.tenant_id == tenant_id, Product.is_deleted == False)
    if search: q = q.where(Product.name.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(Product.name).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total, "page": page}

@inventory_router.post("/products", status_code=201)
async def create_product(data: ProductCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    p = Product(**data.model_dump(), tenant_id=tenant_id)
    db.add(p); await db.commit(); await db.refresh(p)
    return row_to_dict(p)

@inventory_router.put("/products/{pid}")
async def update_product(pid: str, data: ProductUpdate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    p = (await db.execute(select(Product).where(Product.id == pid, Product.tenant_id == tenant_id))).scalar_one_or_none()
    if not p: raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True, exclude_unset=True).items(): setattr(p, k, v)
    await db.commit(); return row_to_dict(p)

@inventory_router.get("/products/{pid}")
async def get_product(pid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    p = (await db.execute(select(Product).where(Product.id == pid, Product.tenant_id == tenant_id))).scalar_one_or_none()
    if not p: raise HTTPException(404, "Not found")
    result = row_to_dict(p)
    # History of moves for this product
    moves = (await db.execute(
        select(StockMove).where(StockMove.product_id == pid, StockMove.tenant_id == tenant_id, StockMove.state == "done")
        .order_by(StockMove.created_at.desc()).limit(20)
    )).scalars().all()
    result["move_history"] = [row_to_dict(m) for m in moves]
    return result

@inventory_router.get("/stock-on-hand")
async def stock_on_hand(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    return await get_stock_on_hand(db, tenant_id)

@inventory_router.get("/movements")
async def list_moves(page: int = 1, limit: int = 20, move_type: Optional[str] = None,
                      tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(StockMove).where(StockMove.tenant_id == tenant_id, StockMove.is_deleted == False)
    if move_type: q = q.where(StockMove.move_type == move_type)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(StockMove.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total}

@inventory_router.post("/movements", status_code=201)
async def create_move(data: StockMoveCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    from app.modules.inventory.service import get_or_create_location, update_quant
    # Manual adjustment
    m = StockMove(
        **data.model_dump(exclude_none=True),
        tenant_id=tenant_id,
        state="done",
        qty_done=data.quantity,
        move_date=datetime.now(timezone.utc) if True else None,
    )
    db.add(m)
    await db.flush()
    # Find or create stock location for adjustment
    stock_loc = await get_or_create_location(db, tenant_id, "WH/Stock", "internal")
    if data.move_type == "in":
        await update_quant(db, tenant_id, data.product_id, stock_loc.id, data.quantity)
    elif data.move_type == "out":
        await update_quant(db, tenant_id, data.product_id, stock_loc.id, -data.quantity)
    await db.commit()
    return row_to_dict(m)

@inventory_router.get("/pickings")
async def list_pickings(page: int = 1, limit: int = 20, picking_type: Optional[str] = None, state: Optional[str] = None,
                         tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(StockPicking).where(StockPicking.tenant_id == tenant_id, StockPicking.is_deleted == False)
    if picking_type: q = q.where(StockPicking.picking_type == picking_type)
    if state: q = q.where(StockPicking.state == state)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(StockPicking.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total}

@inventory_router.post("/pickings/{pid}/validate")
async def validate_picking_endpoint(pid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    picking = (await db.execute(select(StockPicking).where(StockPicking.id == pid, StockPicking.tenant_id == tenant_id))).scalar_one_or_none()
    if not picking: raise HTTPException(404, "Not found")
    try:
        picking = await validate_transfer(db, picking, tenant_id)
        await db.commit()
        return row_to_dict(picking)
    except ValueError as e:
        raise HTTPException(400, str(e))

@inventory_router.get("/warehouses")
async def list_warehouses(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Warehouse).where(Warehouse.tenant_id == tenant_id, Warehouse.is_deleted == False))
    return [row_to_dict(x) for x in r.scalars().all()]

@inventory_router.get("/dashboard")
async def inventory_dashboard(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    product_count = (await db.execute(select(func.count()).where(Product.tenant_id == tenant_id, Product.is_deleted == False))).scalar()
    low_stock = (await db.execute(select(func.count()).where(
        Product.tenant_id == tenant_id, Product.qty_on_hand <= Product.reorder_point,
        Product.reorder_point > 0, Product.is_deleted == False))).scalar()
    total_value = float((await db.execute(
        select(func.coalesce(func.sum(Product.qty_on_hand * Product.cost_price), 0))
        .where(Product.tenant_id == tenant_id, Product.is_deleted == False)
    )).scalar())
    pending_receipts = (await db.execute(select(func.count()).where(
        StockPicking.tenant_id == tenant_id, StockPicking.picking_type == "incoming",
        StockPicking.state.in_(["confirmed", "assigned"]), StockPicking.is_deleted == False
    ))).scalar()
    return {"product_count": product_count, "low_stock_count": low_stock,
            "total_inventory_value": total_value, "pending_receipts": pending_receipts}


# ═══════════════════════════════════════════════════════════════════
#  HR
# ═══════════════════════════════════════════════════════════════════

@hr_router.get("/departments")
async def list_departments(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Department).where(Department.tenant_id == tenant_id, Department.is_deleted == False))
    return [row_to_dict(x) for x in r.scalars().all()]

@hr_router.post("/departments", status_code=201)
async def create_department(data: DepartmentCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    d = Department(**data.model_dump(), tenant_id=tenant_id)
    db.add(d); await db.commit(); await db.refresh(d)
    return row_to_dict(d)

@hr_router.get("/employees")
async def list_employees(page: int = 1, limit: int = 20, search: Optional[str] = None,
                          tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(Employee).where(Employee.tenant_id == tenant_id, Employee.is_deleted == False)
    if search: q = q.where(Employee.first_name.ilike(f"%{search}%") | Employee.last_name.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(Employee.first_name).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total, "page": page}

@hr_router.post("/employees", status_code=201)
async def create_employee(data: EmployeeCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count()).where(Employee.tenant_id == tenant_id))).scalar()
    e = Employee(**data.model_dump(exclude_none=True), tenant_id=tenant_id)
    e.employee_number = f"EMP-{str(count + 1).zfill(4)}"
    db.add(e); await db.commit(); await db.refresh(e)
    return row_to_dict(e)

@hr_router.put("/employees/{eid}")
async def update_employee(eid: str, data: EmployeeUpdate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    e = (await db.execute(select(Employee).where(Employee.id == eid, Employee.tenant_id == tenant_id))).scalar_one_or_none()
    if not e: raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True, exclude_unset=True).items(): setattr(e, k, v)
    await db.commit(); return row_to_dict(e)

@hr_router.get("/leaves")
async def list_leaves(page: int = 1, limit: int = 20, state: Optional[str] = None,
                       tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(LeaveRequest).where(LeaveRequest.tenant_id == tenant_id, LeaveRequest.is_deleted == False)
    if state: q = q.where(LeaveRequest.state == state)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(LeaveRequest.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total}

@hr_router.get("/payslips")
async def list_payslips(page: int = 1, limit: int = 20,
                         tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(Payslip).where(Payslip.tenant_id == tenant_id, Payslip.is_deleted == False)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(Payslip.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total}

@hr_router.get("/dashboard")
async def hr_dashboard(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    total_emp = (await db.execute(select(func.count()).where(Employee.tenant_id == tenant_id, Employee.is_deleted == False))).scalar()
    active_emp = (await db.execute(select(func.count()).where(Employee.tenant_id == tenant_id, Employee.status == "active", Employee.is_deleted == False))).scalar()
    pending_leaves = (await db.execute(select(func.count()).where(LeaveRequest.tenant_id == tenant_id, LeaveRequest.state == "pending", LeaveRequest.is_deleted == False))).scalar()
    payroll = float((await db.execute(select(func.coalesce(func.sum(Employee.salary), 0)).where(Employee.tenant_id == tenant_id, Employee.status == "active", Employee.is_deleted == False))).scalar())
    return {"total_employees": total_emp, "active_employees": active_emp,
            "pending_leaves": pending_leaves, "monthly_payroll": payroll}


# ═══════════════════════════════════════════════════════════════════
#  MANUFACTURING
# ═══════════════════════════════════════════════════════════════════

@manufacturing_router.get("/boms")
async def list_boms(page: int = 1, limit: int = 20,
                     tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(BOM).where(BOM.tenant_id == tenant_id, BOM.is_deleted == False)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(BOM.product_name).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total}

@manufacturing_router.post("/boms", status_code=201)
async def create_bom(data: BOMCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    b = BOM(**data.model_dump(exclude_none=True), tenant_id=tenant_id)
    db.add(b); await db.commit(); await db.refresh(b)
    return row_to_dict(b)

@manufacturing_router.get("/boms/{bid}")
async def get_bom(bid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    b = (await db.execute(select(BOM).where(BOM.id == bid, BOM.tenant_id == tenant_id))).scalar_one_or_none()
    if not b: raise HTTPException(404, "Not found")
    result = row_to_dict(b)
    lines = (await db.execute(select(BOMLine).where(BOMLine.bom_id == bid))).scalars().all()
    result["lines"] = [row_to_dict(l) for l in lines]
    return result

@manufacturing_router.post("/boms/{bid}/lines", status_code=201)
async def add_bom_line(bid: str, data: BOMLineCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    line = BOMLine(**data.model_dump(exclude_none=True), bom_id=bid, tenant_id=tenant_id)
    db.add(line); await db.commit(); await db.refresh(line)
    return row_to_dict(line)

@manufacturing_router.get("/orders")
async def list_production(page: int = 1, limit: int = 20, state: Optional[str] = None,
                           tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(ProductionOrder).where(ProductionOrder.tenant_id == tenant_id, ProductionOrder.is_deleted == False)
    if state: q = q.where(ProductionOrder.state == state)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(ProductionOrder.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total, "page": page}

@manufacturing_router.post("/orders", status_code=201)
async def create_production(data: ProductionOrderCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count()).where(ProductionOrder.tenant_id == tenant_id))).scalar()
    po = ProductionOrder(**data.model_dump(exclude_none=True), tenant_id=tenant_id)
    po.number = f"MO-{datetime.now().year}-{str(count + 1).zfill(4)}"
    db.add(po); await db.commit(); await db.refresh(po)
    return row_to_dict(po)

@manufacturing_router.get("/orders/{oid}")
async def get_production(oid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    po = (await db.execute(select(ProductionOrder).where(ProductionOrder.id == oid, ProductionOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not po: raise HTTPException(404, "Not found")
    result = row_to_dict(po)
    lines = (await db.execute(select(ProductionOrderLine).where(ProductionOrderLine.order_id == oid))).scalars().all()
    result["lines"] = [row_to_dict(l) for l in lines]
    return result

@manufacturing_router.post("/orders/{oid}/confirm")
async def confirm_production(oid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    po = (await db.execute(select(ProductionOrder).where(ProductionOrder.id == oid, ProductionOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not po: raise HTTPException(404, "Not found")
    try:
        po = await confirm_production_order(db, po, tenant_id)
        await db.commit()
        return row_to_dict(po)
    except ValueError as e:
        raise HTTPException(400, str(e))

@manufacturing_router.post("/orders/{oid}/produce")
async def produce(oid: str, qty: Optional[float] = None,
                   tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    po = (await db.execute(select(ProductionOrder).where(ProductionOrder.id == oid, ProductionOrder.tenant_id == tenant_id))).scalar_one_or_none()
    if not po: raise HTTPException(404, "Not found")
    try:
        po = await produce_order(db, po, tenant_id, qty)
        await db.commit()
        return row_to_dict(po)
    except ValueError as e:
        raise HTTPException(400, str(e))

@manufacturing_router.get("/dashboard")
async def mfg_dashboard(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).where(ProductionOrder.tenant_id == tenant_id, ProductionOrder.is_deleted == False))).scalar()
    in_progress = (await db.execute(select(func.count()).where(ProductionOrder.tenant_id == tenant_id, ProductionOrder.state.in_(["confirmed","in_progress"]), ProductionOrder.is_deleted == False))).scalar()
    done = (await db.execute(select(func.count()).where(ProductionOrder.tenant_id == tenant_id, ProductionOrder.state == "done", ProductionOrder.is_deleted == False))).scalar()
    return {"total_orders": total, "in_progress": in_progress, "done": done}


# ═══════════════════════════════════════════════════════════════════
#  CRM
# ═══════════════════════════════════════════════════════════════════

@crm_router.get("/activities")
async def list_activities(page: int = 1, limit: int = 20,
                           tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(Activity).where(Activity.tenant_id == tenant_id, Activity.is_deleted == False)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(Activity.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total}


# ═══════════════════════════════════════════════════════════════════
#  PROJECTS
# ═══════════════════════════════════════════════════════════════════

@projects_router.get("/projects")
async def list_projects(page: int = 1, limit: int = 20, state: Optional[str] = None,
                         tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(Project).where(Project.tenant_id == tenant_id, Project.is_deleted == False)
    if state: q = q.where(Project.state == state)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(Project.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total, "page": page}

@projects_router.post("/projects", status_code=201)
async def create_project(data: ProjectCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    p = Project(**data.model_dump(exclude_none=True), tenant_id=tenant_id)
    db.add(p); await db.commit(); await db.refresh(p)
    return row_to_dict(p)

@projects_router.put("/projects/{pid}")
async def update_project(pid: str, data: ProjectUpdate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    p = (await db.execute(select(Project).where(Project.id == pid, Project.tenant_id == tenant_id))).scalar_one_or_none()
    if not p: raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True, exclude_unset=True).items(): setattr(p, k, v)
    await db.commit(); return row_to_dict(p)

@projects_router.get("/tasks")
async def list_tasks(project_id: Optional[str] = None, page: int = 1, limit: int = 20,
                      tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(Task).where(Task.tenant_id == tenant_id, Task.is_deleted == False)
    if project_id: q = q.where(Task.project_id == project_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(Task.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total}

@projects_router.post("/tasks", status_code=201)
async def create_task(data: TaskCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    t = Task(**data.model_dump(exclude_none=True), tenant_id=tenant_id)
    db.add(t); await db.commit(); await db.refresh(t)
    return row_to_dict(t)

@projects_router.put("/tasks/{tid}")
async def update_task(tid: str, data: TaskUpdate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    t = (await db.execute(select(Task).where(Task.id == tid, Task.tenant_id == tenant_id))).scalar_one_or_none()
    if not t: raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True, exclude_unset=True).items(): setattr(t, k, v)
    await db.commit(); return row_to_dict(t)

@projects_router.get("/dashboard")
async def projects_dashboard(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).where(Project.tenant_id == tenant_id, Project.is_deleted == False))).scalar()
    active = (await db.execute(select(func.count()).where(Project.tenant_id == tenant_id, Project.state == "active", Project.is_deleted == False))).scalar()
    tasks_open = (await db.execute(select(func.count()).where(Task.tenant_id == tenant_id, Task.state.in_(["new","in_progress"]), Task.is_deleted == False))).scalar()
    return {"total_projects": total, "active_projects": active, "open_tasks": tasks_open}


# ═══════════════════════════════════════════════════════════════════
#  HELPDESK
# ═══════════════════════════════════════════════════════════════════

@helpdesk_router.get("/tickets")
async def list_tickets(page: int = 1, limit: int = 20, state: Optional[str] = None,
                        priority: Optional[str] = None,
                        tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    q = select(HelpdeskTicket).where(HelpdeskTicket.tenant_id == tenant_id, HelpdeskTicket.is_deleted == False)
    if state: q = q.where(HelpdeskTicket.state == state)
    if priority: q = q.where(HelpdeskTicket.priority == priority)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    items = (await db.execute(q.order_by(HelpdeskTicket.created_at.desc()).offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": [row_to_dict(x) for x in items], "total": total, "page": page}

@helpdesk_router.post("/tickets", status_code=201)
async def create_ticket(data: TicketCreate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count()).where(HelpdeskTicket.tenant_id == tenant_id))).scalar()
    t = HelpdeskTicket(**data.model_dump(exclude_none=True), tenant_id=tenant_id)
    t.number = f"TKT-{datetime.now().year}-{str(count + 1).zfill(4)}"
    db.add(t); await db.commit(); await db.refresh(t)
    return row_to_dict(t)

@helpdesk_router.get("/tickets/{tid}")
async def get_ticket(tid: str, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    t = (await db.execute(select(HelpdeskTicket).where(HelpdeskTicket.id == tid, HelpdeskTicket.tenant_id == tenant_id))).scalar_one_or_none()
    if not t: raise HTTPException(404, "Not found")
    result = row_to_dict(t)
    replies = (await db.execute(select(TicketReply).where(TicketReply.ticket_id == tid).order_by(TicketReply.created_at.asc()))).scalars().all()
    result["replies"] = [row_to_dict(r) for r in replies]
    return result

@helpdesk_router.put("/tickets/{tid}")
async def update_ticket(tid: str, data: TicketUpdate, tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    t = (await db.execute(select(HelpdeskTicket).where(HelpdeskTicket.id == tid, HelpdeskTicket.tenant_id == tenant_id))).scalar_one_or_none()
    if not t: raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_none=True, exclude_unset=True).items(): setattr(t, k, v)
    await db.commit(); return row_to_dict(t)


@helpdesk_router.post("/tickets/{tid}/replies", status_code=201)
async def add_ticket_reply(tid: str, data: TicketReplyCreate, user: User = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    # user comes from require_auth dependency
    tenant_id = user.tenant_id
    t = (await db.execute(select(HelpdeskTicket).where(HelpdeskTicket.id == tid, HelpdeskTicket.tenant_id == tenant_id))).scalar_one_or_none()
    if not t: raise HTTPException(404, "Not found")
    
    reply = TicketReply(
        **data.model_dump(exclude_none=True),
        ticket_id=tid,
        tenant_id=tenant_id,
        author=user.full_name or user.email
    )
    db.add(reply)
    
    # If agent replies, move from new to open
    if t.state == 'new':
        t.state = 'open'

    await db.commit()
    await db.refresh(reply)
    return row_to_dict(reply)

@helpdesk_router.get("/dashboard")
async def helpdesk_dashboard(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).where(HelpdeskTicket.tenant_id == tenant_id, HelpdeskTicket.is_deleted == False))).scalar()
    open_ = (await db.execute(select(func.count()).where(HelpdeskTicket.tenant_id == tenant_id, HelpdeskTicket.state.in_(["new","open"]), HelpdeskTicket.is_deleted == False))).scalar()
    urgent = (await db.execute(select(func.count()).where(HelpdeskTicket.tenant_id == tenant_id, HelpdeskTicket.priority == "urgent", HelpdeskTicket.is_deleted == False))).scalar()
    return {"total_tickets": total, "open_tickets": open_, "urgent_tickets": urgent}
