"""
CI ERP — RBAC/ABAC Permissions System  (v2 — DB-backed with in-memory cache)

Two layers
----------
Layer 1  In-memory fast path (sync)
         has_permission(user, code) — uses ROLE_PERMISSIONS dict + User.roles.
         Zero DB round-trips.  Used in low-stakes checks and tests.

Layer 2  DB-backed authoritative path (async)
         require_permission(code) FastAPI dependency → calls permission_service
         which queries permission + role_permission tables with a TTL cache.

Seeding
-------
PERMISSIONS  dict  →  seeded as Permission rows on first boot (see seed.py)
ROLE_PERMISSIONS dict  →  seeded as role_permission rows on first boot

Both dicts remain the canonical reference for what the system *supports*;
the DB tracks what's *assigned* and allows runtime mutation via Admin API.
"""
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_auth
from app.core.database import get_db
from app.modules.identity.models import User


# ─── Permission Registry ──────────────────────────────────────────────────────
# Format: "module.resource.action" → human description
PERMISSIONS: dict[str, str] = {
    # Admin
    "admin.users.view":              "View users",
    "admin.users.create":            "Create users",
    "admin.users.edit":              "Edit users",
    "admin.users.delete":            "Delete users",
    "admin.roles.manage":            "Manage roles & permissions",
    "admin.audit.view":              "View audit logs",
    "admin.settings.manage":         "Manage company settings",

    # Sales
    "sales.orders.view":             "View sales orders",
    "sales.orders.create":           "Create sales orders",
    "sales.orders.edit":             "Edit sales orders",
    "sales.orders.confirm":          "Confirm sales orders",
    "sales.orders.cancel":           "Cancel sales orders",
    "sales.customers.view":          "View customers",
    "sales.customers.create":        "Create customers",
    "sales.customers.edit":          "Edit customers",
    "sales.invoices.view":           "View sales invoices",
    "sales.invoices.create":         "Create invoices from orders",

    # Purchasing
    "purchasing.orders.view":        "View purchase orders",
    "purchasing.orders.create":      "Create purchase orders",
    "purchasing.orders.approve":     "Approve purchase orders",
    "purchasing.vendors.view":       "View vendors/suppliers",
    "purchasing.vendors.create":     "Create vendors/suppliers",

    # Inventory
    "inventory.products.view":       "View products & stock",
    "inventory.products.create":     "Create products",
    "inventory.products.edit":       "Edit products",
    "inventory.adjustments.create":  "Create inventory adjustments",
    "inventory.transfers.create":    "Create stock transfers",

    # Accounting
    "accounting.journals.view":      "View journal entries",
    "accounting.journals.create":    "Create journal entries",
    "accounting.invoices.view":      "View all invoices",
    "accounting.invoices.post":      "Post/finalise invoices",
    "accounting.payments.create":    "Record payments",
    "accounting.payments.post":      "Post payments",
    "accounting.reports.view":       "View financial reports & trial balance",

    # HR
    "hr.employees.view":             "View employees",
    "hr.employees.create":           "Create employees",
    "hr.employees.edit":             "Edit employees",
    "hr.leaves.view":                "View leave requests",
    "hr.leaves.approve":             "Approve / reject leave requests",

    # Payroll
    "payroll.view":                  "View payroll & payslips",
    "payroll.process":               "Process payroll runs",
    "payroll.reports":               "Export payroll reports",

    # Manufacturing
    "manufacturing.orders.view":     "View work/production orders",
    "manufacturing.orders.create":   "Create production orders",
    "manufacturing.orders.confirm":  "Confirm production orders",
    "manufacturing.orders.produce":  "Record production completions",
    "manufacturing.bom.manage":      "Manage Bills of Materials",

    # Projects
    "projects.view":                 "View projects & tasks",
    "projects.create":               "Create projects",
    "projects.edit":                 "Edit projects & tasks",

    # Helpdesk
    "helpdesk.tickets.view":         "View helpdesk tickets",
    "helpdesk.tickets.create":       "Create helpdesk tickets",
    "helpdesk.tickets.assign":       "Assign tickets to agents",
    "helpdesk.tickets.resolve":      "Resolve / close tickets",

    # Order Tracking
    "order_tracking.view":           "View order tracking production data",
    "order_tracking.edit":           "Edit order tracking stage records",
    "order_tracking.admin":          "Administer order tracking settings",

    # Reports
    "reports.view":                  "View reports",
    "reports.export":                "Export reports",

    # Branding
    "branding.logo.manage":          "Manage company logo & branding",
}

# ─── Role → Permission Mapping (seed data + fast-path) ───────────────────────
ROLE_PERMISSIONS: dict[str, list[str]] = {
    "admin": ["*"],  # wildcard = all permissions

    "manager": [
        "sales.orders.view", "sales.orders.create", "sales.orders.edit",
        "sales.orders.confirm", "sales.orders.cancel",
        "sales.customers.view", "sales.customers.create", "sales.customers.edit",
        "sales.invoices.view", "sales.invoices.create",
        "purchasing.orders.view", "purchasing.orders.create", "purchasing.orders.approve",
        "purchasing.vendors.view", "purchasing.vendors.create",
        "inventory.products.view", "inventory.products.create", "inventory.products.edit",
        "inventory.transfers.create",
        "accounting.invoices.view", "accounting.reports.view", "accounting.journals.view",
        "hr.employees.view", "hr.leaves.view", "hr.leaves.approve",
        "manufacturing.orders.view", "manufacturing.orders.create", "manufacturing.orders.confirm",
        "projects.view", "projects.create", "projects.edit",
        "helpdesk.tickets.view", "helpdesk.tickets.assign",
        "reports.view", "reports.export",
        "order_tracking.view", "order_tracking.edit",
        "payroll.view",
    ],

    "accountant": [
        "accounting.journals.view", "accounting.journals.create",
        "accounting.invoices.view", "accounting.invoices.post",
        "accounting.payments.create", "accounting.payments.post",
        "accounting.reports.view",
        "sales.invoices.view", "sales.invoices.create",
        "purchasing.orders.view",
        "reports.view", "reports.export",
        "payroll.view", "payroll.reports",
    ],

    "warehouse": [
        "inventory.products.view", "inventory.products.edit",
        "inventory.adjustments.create", "inventory.transfers.create",
        "purchasing.orders.view",
        "order_tracking.view", "order_tracking.edit",
        "reports.view",
        "manufacturing.orders.view",
    ],

    "hr_officer": [
        "hr.employees.view", "hr.employees.create", "hr.employees.edit",
        "hr.leaves.view", "hr.leaves.approve",
        "payroll.view", "payroll.process", "payroll.reports",
        "reports.view",
    ],

    "sales_rep": [
        "sales.orders.view", "sales.orders.create", "sales.orders.edit",
        "sales.customers.view", "sales.customers.create",
        "sales.invoices.view",
        "inventory.products.view",
        "order_tracking.view",
        "helpdesk.tickets.view", "helpdesk.tickets.create",
        "reports.view",
    ],

    "viewer": [
        "sales.orders.view", "sales.customers.view",
        "inventory.products.view",
        "accounting.invoices.view", "accounting.journals.view",
        "purchasing.orders.view",
        "manufacturing.orders.view",
        "projects.view",
        "helpdesk.tickets.view",
        "order_tracking.view",
        "reports.view",
    ],

    "user": [
        "sales.orders.view", "sales.customers.view",
        "inventory.products.view",
        "projects.view",
        "helpdesk.tickets.view", "helpdesk.tickets.create",
        "order_tracking.view",
    ],
}


# ─── Sync fast-path check (no DB) ────────────────────────────────────────────
def has_permission(user: User, permission: str) -> bool:
    """
    In-memory permission check.
    Uses User.roles (already eager-loaded in get_current_user) and
    ROLE_PERMISSIONS dict.  Zero DB queries — ideal for read-path gates.
    """
    if user.is_superadmin:
        return True
    for role in (user.roles or []):
        rp = ROLE_PERMISSIONS.get(role.code, [])
        if "*" in rp or permission in rp:
            return True
    return False


# ─── FastAPI Dependency (DB-backed, cached) ───────────────────────────────────
def require_permission(permission_code: str):
    """
    FastAPI dependency factory — enforces a specific permission code.

    Fast path: uses in-memory ROLE_PERMISSIONS (covers 99 % of cases).
    Slow path: falls back to DB-backed check via permission_service.

    Usage:
        @router.post("/orders")
        async def create_order(..., _: User = Depends(require_permission("sales.orders.create"))):
            ...
    """
    async def _check(
        user: User = Depends(require_auth),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        # Fast path: in-memory
        if has_permission(user, permission_code):
            return user

        # Slow path: authoritative DB check (covers runtime DB mutations)
        from app.modules.identity.permission_service import check_permission
        if await check_permission(db, user, permission_code):
            return user

        raise HTTPException(
            status_code=403,
            detail=f"Permission denied: {permission_code}",
        )

    return _check


def require_any_permission(*permissions: str):
    """
    Dependency — user must hold at least one of the given permission codes.
    Uses fast-path check only (sufficient for most multi-permission gates).
    """
    async def _check(user: User = Depends(require_auth)) -> User:
        for perm in permissions:
            if has_permission(user, perm):
                return user
        raise HTTPException(
            status_code=403,
            detail=f"Permission denied. Requires one of: {', '.join(permissions)}",
        )
    return _check
