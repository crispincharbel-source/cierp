"""Add permission and role_permission tables for DB-backed RBAC

Revision ID: 20250904_004
Revises: 20250903_003
Create Date: 2025-09-04 09:00:00

What this migration does
------------------------
1. Creates `permission` table — canonical permission codes
2. Creates `role_permission` join table — role→permission assignments
3. Seeds all system permissions from the PERMISSIONS registry
4. Seeds all role→permission assignments from ROLE_PERMISSIONS
   (including admin wildcard: all permissions assigned to admin role)

This is fully idempotent: re-running the seed logic skips rows that
already exist.  Safe to run multiple times.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TEXT
import uuid


revision = '20250904_004'
down_revision = '20250903_003'
branch_labels = None
depends_on = None


def upgrade():
    # ── 1. permission table ────────────────────────────────────────────────────
    op.create_table(
        'permission',
        sa.Column('id',          sa.String(36),  primary_key=True),
        sa.Column('code',        sa.String(200), nullable=False),
        sa.Column('description', sa.Text(),      nullable=True),
        sa.Column('module',      sa.String(100), nullable=True),
        sa.Column('is_active',   sa.Boolean(),   nullable=False,
                  server_default=sa.text('true')),
        sa.Column('created_at',  sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_permission_code',   'permission', ['code'],   unique=True)
    op.create_index('ix_permission_module', 'permission', ['module'], unique=False)

    # ── 2. role_permission join table ──────────────────────────────────────────
    op.create_table(
        'role_permission',
        sa.Column('id',            sa.String(36),  primary_key=True),
        sa.Column('role_id',       sa.String(36),  nullable=False),
        sa.Column('permission_id', sa.String(36),  nullable=False),
        sa.Column('tenant_id',     sa.String(100), nullable=False,
                  server_default=sa.text("'cierp'")),
        sa.Column('created_at',    sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['role_id'],       ['role.id'],       ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['permission.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('role_id', 'permission_id', name='uq_role_permission'),
    )
    op.create_index('ix_role_permission_role_id',       'role_permission', ['role_id'])
    op.create_index('ix_role_permission_permission_id', 'role_permission', ['permission_id'])
    op.create_index('ix_role_permission_tenant_id',     'role_permission', ['tenant_id'])

    # ── 3. Seed permissions ────────────────────────────────────────────────────
    # We use raw SQL so the migration is self-contained (no app import at migrate time)
    PERMISSIONS = {
        "admin.users.view":             ("Admin", "View users"),
        "admin.users.create":           ("Admin", "Create users"),
        "admin.users.edit":             ("Admin", "Edit users"),
        "admin.users.delete":           ("Admin", "Delete users"),
        "admin.roles.manage":           ("Admin", "Manage roles & permissions"),
        "admin.audit.view":             ("Admin", "View audit logs"),
        "admin.settings.manage":        ("Admin", "Manage company settings"),
        "sales.orders.view":            ("Sales", "View sales orders"),
        "sales.orders.create":          ("Sales", "Create sales orders"),
        "sales.orders.edit":            ("Sales", "Edit sales orders"),
        "sales.orders.confirm":         ("Sales", "Confirm sales orders"),
        "sales.orders.cancel":          ("Sales", "Cancel sales orders"),
        "sales.customers.view":         ("Sales", "View customers"),
        "sales.customers.create":       ("Sales", "Create customers"),
        "sales.customers.edit":         ("Sales", "Edit customers"),
        "sales.invoices.view":          ("Sales", "View sales invoices"),
        "sales.invoices.create":        ("Sales", "Create invoices from orders"),
        "purchasing.orders.view":       ("Purchasing", "View purchase orders"),
        "purchasing.orders.create":     ("Purchasing", "Create purchase orders"),
        "purchasing.orders.approve":    ("Purchasing", "Approve purchase orders"),
        "purchasing.vendors.view":      ("Purchasing", "View vendors/suppliers"),
        "purchasing.vendors.create":    ("Purchasing", "Create vendors/suppliers"),
        "inventory.products.view":      ("Inventory", "View products & stock"),
        "inventory.products.create":    ("Inventory", "Create products"),
        "inventory.products.edit":      ("Inventory", "Edit products"),
        "inventory.adjustments.create": ("Inventory", "Create inventory adjustments"),
        "inventory.transfers.create":   ("Inventory", "Create stock transfers"),
        "accounting.journals.view":     ("Accounting", "View journal entries"),
        "accounting.journals.create":   ("Accounting", "Create journal entries"),
        "accounting.invoices.view":     ("Accounting", "View all invoices"),
        "accounting.invoices.post":     ("Accounting", "Post/finalise invoices"),
        "accounting.payments.create":   ("Accounting", "Record payments"),
        "accounting.payments.post":     ("Accounting", "Post payments"),
        "accounting.reports.view":      ("Accounting", "View financial reports & trial balance"),
        "hr.employees.view":            ("HR", "View employees"),
        "hr.employees.create":          ("HR", "Create employees"),
        "hr.employees.edit":            ("HR", "Edit employees"),
        "hr.leaves.view":               ("HR", "View leave requests"),
        "hr.leaves.approve":            ("HR", "Approve/reject leave requests"),
        "payroll.view":                 ("Payroll", "View payroll & payslips"),
        "payroll.process":              ("Payroll", "Process payroll runs"),
        "payroll.reports":              ("Payroll", "Export payroll reports"),
        "manufacturing.orders.view":    ("Manufacturing", "View work/production orders"),
        "manufacturing.orders.create":  ("Manufacturing", "Create production orders"),
        "manufacturing.orders.confirm": ("Manufacturing", "Confirm production orders"),
        "manufacturing.orders.produce": ("Manufacturing", "Record production completions"),
        "manufacturing.bom.manage":     ("Manufacturing", "Manage Bills of Materials"),
        "projects.view":                ("Projects", "View projects & tasks"),
        "projects.create":              ("Projects", "Create projects"),
        "projects.edit":                ("Projects", "Edit projects & tasks"),
        "helpdesk.tickets.view":        ("Helpdesk", "View helpdesk tickets"),
        "helpdesk.tickets.create":      ("Helpdesk", "Create helpdesk tickets"),
        "helpdesk.tickets.assign":      ("Helpdesk", "Assign tickets to agents"),
        "helpdesk.tickets.resolve":     ("Helpdesk", "Resolve/close tickets"),
        "order_tracking.view":          ("OrderTracking", "View order tracking data"),
        "order_tracking.edit":          ("OrderTracking", "Edit order tracking stage records"),
        "order_tracking.admin":         ("OrderTracking", "Administer order tracking settings"),
        "reports.view":                 ("Reports", "View reports"),
        "reports.export":               ("Reports", "Export reports"),
        "branding.logo.manage":         ("Branding", "Manage company logo & branding"),
    }

    conn = op.get_bind()

    # Build permission id map for seeding role_permissions below
    perm_ids: dict[str, str] = {}
    for code, (module, description) in PERMISSIONS.items():
        pid = str(uuid.uuid4())
        conn.execute(sa.text(
            "INSERT INTO permission (id, code, description, module) "
            "VALUES (:id, :code, :description, :module) "
            "ON CONFLICT (code) DO UPDATE SET description=EXCLUDED.description"
        ), {"id": pid, "code": code, "description": description, "module": module.lower()})
        # Re-read actual id (may differ if row already existed)
        row = conn.execute(
            sa.text("SELECT id FROM permission WHERE code = :code"), {"code": code}
        ).fetchone()
        perm_ids[code] = row[0]

    # ── 4. Seed role → permission assignments ─────────────────────────────────
    ROLE_PERMISSIONS: dict[str, list[str]] = {
        "admin":      list(PERMISSIONS.keys()),   # all permissions (wildcard resolved)
        "manager": [
            "sales.orders.view","sales.orders.create","sales.orders.edit",
            "sales.orders.confirm","sales.orders.cancel",
            "sales.customers.view","sales.customers.create","sales.customers.edit",
            "sales.invoices.view","sales.invoices.create",
            "purchasing.orders.view","purchasing.orders.create","purchasing.orders.approve",
            "purchasing.vendors.view","purchasing.vendors.create",
            "inventory.products.view","inventory.products.create","inventory.products.edit",
            "inventory.transfers.create",
            "accounting.invoices.view","accounting.reports.view","accounting.journals.view",
            "hr.employees.view","hr.leaves.view","hr.leaves.approve",
            "manufacturing.orders.view","manufacturing.orders.create","manufacturing.orders.confirm",
            "projects.view","projects.create","projects.edit",
            "helpdesk.tickets.view","helpdesk.tickets.assign",
            "reports.view","reports.export",
            "order_tracking.view","order_tracking.edit",
            "payroll.view",
        ],
        "accountant": [
            "accounting.journals.view","accounting.journals.create",
            "accounting.invoices.view","accounting.invoices.post",
            "accounting.payments.create","accounting.payments.post",
            "accounting.reports.view",
            "sales.invoices.view","sales.invoices.create",
            "purchasing.orders.view",
            "reports.view","reports.export",
            "payroll.view","payroll.reports",
        ],
        "warehouse": [
            "inventory.products.view","inventory.products.edit",
            "inventory.adjustments.create","inventory.transfers.create",
            "purchasing.orders.view",
            "order_tracking.view","order_tracking.edit",
            "reports.view","manufacturing.orders.view",
        ],
        "hr_officer": [
            "hr.employees.view","hr.employees.create","hr.employees.edit",
            "hr.leaves.view","hr.leaves.approve",
            "payroll.view","payroll.process","payroll.reports",
            "reports.view",
        ],
        "sales_rep": [
            "sales.orders.view","sales.orders.create","sales.orders.edit",
            "sales.customers.view","sales.customers.create",
            "sales.invoices.view",
            "inventory.products.view",
            "order_tracking.view",
            "helpdesk.tickets.view","helpdesk.tickets.create",
            "reports.view",
        ],
        "viewer": [
            "sales.orders.view","sales.customers.view",
            "inventory.products.view",
            "accounting.invoices.view","accounting.journals.view",
            "purchasing.orders.view","manufacturing.orders.view",
            "projects.view","helpdesk.tickets.view",
            "order_tracking.view","reports.view",
        ],
        "user": [
            "sales.orders.view","sales.customers.view",
            "inventory.products.view",
            "projects.view",
            "helpdesk.tickets.view","helpdesk.tickets.create",
            "order_tracking.view",
        ],
    }

    for role_code, perm_codes in ROLE_PERMISSIONS.items():
        # Lookup role id
        row = conn.execute(
            sa.text("SELECT id, tenant_id FROM \"role\" WHERE code = :code AND is_deleted = false LIMIT 1"),
            {"code": role_code}
        ).fetchone()
        if not row:
            continue
        role_id, tenant_id = row[0], row[1]

        for perm_code in perm_codes:
            pid = perm_ids.get(perm_code)
            if not pid:
                continue
            conn.execute(sa.text(
                "INSERT INTO role_permission (id, role_id, permission_id, tenant_id) "
                "VALUES (:id, :role_id, :perm_id, :tenant_id) "
                "ON CONFLICT (role_id, permission_id) DO NOTHING"
            ), {
                "id": str(uuid.uuid4()),
                "role_id": role_id,
                "perm_id": pid,
                "tenant_id": tenant_id or "cierp",
            })


def downgrade():
    op.drop_table('role_permission')
    op.drop_table('permission')
