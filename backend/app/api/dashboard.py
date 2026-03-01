from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import require_auth
from app.modules.identity.models import User
from app.modules.accounting.models import AccountMove
from app.modules.sales.models import SaleOrder, Lead
from app.modules.purchasing.models import PurchaseOrder
from app.modules.inventory.models import Product, StockPicking
from app.modules.hr.models import Employee
from app.modules.manufacturing.models import ProductionOrder
from app.modules.projects.models import Project, Task
from app.modules.helpdesk.models import HelpdeskTicket

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_tenant(user: User = Depends(require_auth)) -> str:
    return user.tenant_id


@router.get("")
async def global_dashboard(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    async def cnt(model, *filters):
        return (await db.execute(select(func.count()).where(*filters, model.tenant_id == tenant_id, model.is_deleted == False))).scalar()

    async def sm(model, col, *filters):
        return float((await db.execute(select(func.coalesce(func.sum(col), 0)).where(*filters, model.tenant_id == tenant_id, model.is_deleted == False))).scalar())

    return {
        "accounting": {
            "accounts_receivable": await sm(AccountMove, AccountMove.amount_residual,
                                             AccountMove.move_type == "out_invoice",
                                             AccountMove.state == "posted",
                                             AccountMove.payment_state != "paid"),
            "accounts_payable": await sm(AccountMove, AccountMove.amount_residual,
                                          AccountMove.move_type == "in_invoice",
                                          AccountMove.state == "posted",
                                          AccountMove.payment_state != "paid"),
            "revenue_this_month": await sm(AccountMove, AccountMove.amount_total,
                                            AccountMove.move_type == "out_invoice",
                                            AccountMove.state == "posted"),
            "invoices": await cnt(AccountMove,
                                   AccountMove.move_type.in_(["out_invoice","in_invoice"])),
        },
        "sales": {
            "orders": await cnt(SaleOrder),
            "confirmed": await cnt(SaleOrder, SaleOrder.state == "confirmed"),
            "revenue": await sm(SaleOrder, SaleOrder.total,
                                 SaleOrder.state.in_(["confirmed","done"])),
            "pipeline": await sm(Lead, Lead.expected_revenue,
                                  Lead.state.not_in(["won","lost"])),
        },
        "purchasing": {
            "orders": await cnt(PurchaseOrder),
            "pending": await cnt(PurchaseOrder, PurchaseOrder.state.in_(["draft","sent"])),
            "spend": await sm(PurchaseOrder, PurchaseOrder.total,
                               PurchaseOrder.state.in_(["confirmed","received","billed"])),
        },
        "inventory": {
            "products": await cnt(Product),
            "low_stock": await cnt(Product,
                                    Product.qty_on_hand <= Product.reorder_point,
                                    Product.reorder_point > 0),
            "total_value": await sm(Product, Product.qty_on_hand * Product.cost_price),
            "pending_receipts": await cnt(StockPicking,
                                           StockPicking.picking_type == "incoming",
                                           StockPicking.state.in_(["confirmed","assigned"])),
        },
        "hr": {
            "employees": await cnt(Employee),
            "active": await cnt(Employee, Employee.status == "active"),
            "monthly_payroll": await sm(Employee, Employee.salary,
                                         Employee.status == "active"),
        },
        "manufacturing": {
            "orders": await cnt(ProductionOrder),
            "in_progress": await cnt(ProductionOrder, ProductionOrder.state.in_(["confirmed","in_progress"])),
            "done": await cnt(ProductionOrder, ProductionOrder.state == "done"),
        },
        "projects": {
            "active": await cnt(Project, Project.state == "active"),
            "open_tasks": await cnt(Task, Task.state.in_(["new","in_progress"])),
        },
        "helpdesk": {
            "open_tickets": await cnt(HelpdeskTicket, HelpdeskTicket.state.in_(["new","open"])),
            "urgent": await cnt(HelpdeskTicket, HelpdeskTicket.priority == "urgent"),
        },
    }


@router.get("/kpis")
async def dashboard_kpis(tenant_id: str = Depends(get_tenant), db: AsyncSession = Depends(get_db)):
    """Lightweight KPI endpoint for the dashboard overview widgets."""
    from sqlalchemy import select, func
    from app.modules.sales.models import SaleOrder, Customer
    from app.modules.helpdesk.models import HelpdeskTicket

    async def cnt(model, *filters):
        q = select(func.count()).select_from(model).where(
            model.tenant_id == tenant_id,
            model.is_deleted == False,
            *filters,
        )
        return (await db.execute(q)).scalar() or 0

    return {
        "total_orders":    await cnt(SaleOrder),
        "active_orders":   await cnt(SaleOrder, SaleOrder.state.in_(["draft", "confirmed"])),
        "total_customers": await cnt(Customer),
        "open_tickets":    await cnt(HelpdeskTicket, HelpdeskTicket.state.in_(["new", "open"])),
    }
