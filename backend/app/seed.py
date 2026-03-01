"""
CI ERP Seed — Environment-Gated.

PRODUCTION  → Only bootstraps company + roles + admin user. No demo data.
DEVELOPMENT → Also seeds realistic demo data (customers, orders, products, etc.)

Controlled by: ENVIRONMENT=production | development (default: development)
"""
import logging
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.core.config import settings

logger = logging.getLogger("cierp.seed")


# ─── Public entry point ───────────────────────────────────────────────────────
async def seed_demo_data():
    """Called from lifespan. Routes to correct seeder based on ENVIRONMENT."""
    await _bootstrap_required()
    if not settings.is_production:
        await _seed_demo()
    else:
        logger.info("Production environment — skipping demo data seed.")


# ─── Required Bootstrap (runs in ALL environments) ───────────────────────────
async def _bootstrap_required():
    async with AsyncSessionLocal() as db:
        from app.modules.identity.models import Company, Role, User

        tid = settings.TENANT_ID

        # ── Company ──────────────────────────────────────────────────────────
        company = (await db.execute(
            select(Company).where(
                Company.tenant_id == tid,
                Company.code == settings.COMPANY_CODE,
                Company.is_deleted == False,
            )
        )).scalar_one_or_none()

        if not company:
            company = Company(
                tenant_id=tid,
                name=settings.COMPANY_NAME,
                code=settings.COMPANY_CODE,
                email=settings.ADMIN_EMAIL,
                currency="USD",
                country="Lebanon",
                is_active=True,
            )
            db.add(company)
            await db.flush()
            logger.info(f"Bootstrapped company: {settings.COMPANY_NAME}")

        # ── System Roles ─────────────────────────────────────────────────────
        SYSTEM_ROLES = [
            ("admin",      "Administrator",  "Full system access"),
            ("manager",    "Manager",        "Departmental management access"),
            ("accountant", "Accountant",     "Accounting and finance access"),
            ("warehouse",  "Warehouse",      "Inventory and order tracking access"),
            ("hr_officer", "HR Officer",     "HR and payroll access"),
            ("sales_rep",  "Sales Rep",      "Sales and CRM access"),
            ("viewer",     "Viewer",         "Read-only access across all modules"),
            ("user",       "User",           "Basic user access"),
        ]

        role_objs: dict = {}
        for code, name, desc in SYSTEM_ROLES:
            role = (await db.execute(
                select(Role).where(
                    Role.tenant_id == tid,
                    Role.code == code,
                    Role.is_deleted == False,
                )
            )).scalar_one_or_none()
            if not role:
                role = Role(
                    tenant_id=tid, name=name, code=code,
                    description=desc, is_system=True,
                )
                db.add(role)
                await db.flush()
                logger.info(f"Created role: {code}")
            role_objs[code] = role

        # ── Admin User ────────────────────────────────────────────────────────
        admin = (await db.execute(
            select(User).options(selectinload(User.roles)).where(
                User.tenant_id == tid,
                User.email == settings.ADMIN_EMAIL,
                User.is_deleted == False,
            )
        )).scalar_one_or_none()

        if not admin:
            admin = User(
                tenant_id=tid,
                company_id=company.id,
                email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                first_name="CI",
                last_name="Admin",
                is_active=True,
                is_superadmin=True,
            )
            db.add(admin)
            await db.flush()
            await db.refresh(admin, attribute_names=["roles"])
            logger.info(f"Bootstrapped admin: {settings.ADMIN_EMAIL}")

        if "admin" not in {r.code for r in (admin.roles or [])}:
            admin.roles.append(role_objs["admin"])

        await db.commit()
        logger.info("Bootstrap complete.")

    # ── Seed permissions (idempotent, runs after tables are committed) ────────
    await _seed_permissions()


async def _seed_permissions():
    """
    Ensure every permission code in PERMISSIONS exists as a DB row
    and every role has its DB role_permission rows populated.

    Fully idempotent: INSERT … ON CONFLICT DO NOTHING.
    Runs in all environments (production + development).
    """
    from sqlalchemy import text as sql_text
    from app.modules.identity.permissions import PERMISSIONS, ROLE_PERMISSIONS
    from app.modules.identity.permissions_models import Permission, role_permission

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select, insert
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        tid = settings.TENANT_ID

        # 1. Ensure Permission rows exist
        perm_ids: dict[str, str] = {}
        for code, description in PERMISSIONS.items():
            module = code.split(".")[0] if "." in code else None
            existing = (await db.execute(
                select(Permission).where(Permission.code == code)
            )).scalar_one_or_none()
            if not existing:
                p = Permission(code=code, description=description, module=module)
                db.add(p)
                await db.flush()
                perm_ids[code] = str(p.id)
            else:
                perm_ids[code] = str(existing.id)

        # 2. Ensure role_permission rows exist
        from app.modules.identity.models import Role
        for role_code, perms in ROLE_PERMISSIONS.items():
            role = (await db.execute(
                select(Role).where(
                    Role.code == role_code,
                    Role.tenant_id == tid,
                    Role.is_deleted == False,
                )
            )).scalar_one_or_none()
            if not role:
                continue

            # Resolve wildcard for admin
            codes_to_assign = list(PERMISSIONS.keys()) if "*" in perms else perms

            for perm_code in codes_to_assign:
                pid = perm_ids.get(perm_code)
                if not pid:
                    continue
                # Check first, insert only if missing (idempotent)
                from sqlalchemy import and_ as sql_and
                existing_rp = (await db.execute(
                    select(role_permission).where(
                        sql_and(
                            role_permission.c.role_id == str(role.id),
                            role_permission.c.permission_id == pid,
                        )
                    )
                )).first()
                if not existing_rp:
                    import uuid
                    await db.execute(
                        insert(role_permission).values(
                            id=str(uuid.uuid4()),
                            role_id=str(role.id),
                            permission_id=pid,
                            tenant_id=tid,
                        )
                    )

        await db.commit()
        logger.info(f"Permission seed complete ({len(perm_ids)} permissions).")


# ─── Demo Data (development / staging only) ──────────────────────────────────
async def _seed_demo():
    async with AsyncSessionLocal() as db:
        from app.modules.sales.models import Customer, SaleOrder, SaleOrderLine
        from app.modules.purchasing.models import Supplier
        from app.modules.inventory.models import Product, Warehouse, StockLocation
        from app.modules.hr.models import Department, Employee

        tid = settings.TENANT_ID

        # Idempotency check
        existing = (await db.execute(
            select(func.count()).select_from(Customer).where(Customer.tenant_id == tid)
        )).scalar() or 0
        if existing > 0:
            logger.info("Demo data already present — skipping.")
            return

        logger.info("Seeding demo data...")

        # ── Customers ─────────────────────────────────────────────────────────
        customers = []
        for name, email, city, country in [
            ("ABC Corporation",    "contact@abccorp.com",   "Beirut",  "Lebanon"),
            ("XYZ Industries",     "info@xyzinc.com",       "Dubai",   "UAE"),
            ("Global Trading LLC", "ops@globaltrading.com", "Riyadh",  "Saudi Arabia"),
            ("Tech Solutions SAL", "hello@techsol.lb",      "Jounieh", "Lebanon"),
        ]:
            c = Customer(tenant_id=tid, name=name, email=email,
                         city=city, country=country, is_active=True)
            db.add(c)
            customers.append(c)
        await db.flush()

        # ── Suppliers ─────────────────────────────────────────────────────────
        for name, email, country in [
            ("Raw Materials Co",    "supply@rawmat.com",  "Turkey"),
            ("Packaging Plus",      "orders@packplus.com", "China"),
            ("Industrial Supplies", "sales@indsup.com",    "Germany"),
        ]:
            db.add(Supplier(tenant_id=tid, name=name, email=email,
                            country=country, is_active=True))

        # ── Warehouse & Locations ──────────────────────────────────────────────
        wh = Warehouse(tenant_id=tid, name="Main Warehouse", code="WH001",
                       address="Industrial Zone, Beirut")
        db.add(wh)
        await db.flush()

        for loc_name in ["Input", "Stock", "Output", "Quality Check"]:
            db.add(StockLocation(tenant_id=tid, warehouse_id=wh.id,
                                 name=loc_name, location_type="internal",
                                 is_active=True))

        # ── Products ───────────────────────────────────────────────────────────
        products = []
        for code, name, cat, sale, cost in [
            ("PKG-001", "Plastic Bag 30x40",      "Packaging",    0.15, 0.08),
            ("PKG-002", "Laminated Pouch 20x30",  "Packaging",    0.45, 0.22),
            ("PKG-003", "PVC Sheet Roll",          "Raw Material", 2.50, 1.80),
            ("INK-001", "Blue Printing Ink",       "Consumables",  8.00, 5.00),
            ("INK-002", "Red Printing Ink",        "Consumables",  8.00, 5.00),
            ("INK-003", "Black Printing Ink",      "Consumables",  7.50, 4.80),
        ]:
            p = Product(tenant_id=tid, code=code, name=name, category=cat,
                        sale_price=sale, cost_price=cost,
                        uom="pcs", is_active=True, qty_on_hand=5000)
            db.add(p)
            products.append(p)
        await db.flush()

        # ── Departments & Employees ───────────────────────────────────────────
        depts = {}
        for dname in ["Operations", "Finance", "Sales", "HR", "Production"]:
            d = Department(tenant_id=tid, name=dname, is_active=True)
            db.add(d)
            depts[dname] = d
        await db.flush()

        for first, last, dept, pos, sal in [
            ("John",  "Smith",   "Sales",      "Sales Manager",     3500),
            ("Maria", "Garcia",  "Finance",    "Accountant",        2800),
            ("Ahmed", "Hassan",  "Production", "Line Supervisor",   2200),
            ("Sara",  "Johnson", "HR",         "HR Officer",        2500),
            ("Tony",  "Khalil",  "Operations", "Logistics Officer", 2000),
        ]:
            db.add(Employee(
                tenant_id=tid,
                first_name=first, last_name=last,
                email=f"{first.lower()}.{last.lower()}@cierp.com",
                department_id=depts[dept].id,
                job_title=pos,
                salary=sal,
                status="active",
            ))

        # ── Sales Orders ──────────────────────────────────────────────────────
        for i, cust in enumerate(customers[:3], start=1):
            so = SaleOrder(
                tenant_id=tid,
                number=f"SO-{i:05d}",
                customer_id=cust.id,
                customer_name=cust.name,
                state="confirmed",
                currency="USD",
                order_date=datetime.now(timezone.utc),
            )
            db.add(so)
            await db.flush()

            subtotal = 0.0
            for prod in products[:2]:
                qty   = 1000.0
                price = float(prod.sale_price or 0)
                line_sub = qty * price
                subtotal += line_sub
                db.add(SaleOrderLine(
                    tenant_id=tid,
                    order_id=so.id,
                    product_id=prod.id,
                    product_name=prod.name,
                    quantity=qty,
                    unit_price=price,
                    subtotal=line_sub,
                    total=line_sub,
                ))

            so.subtotal   = subtotal
            so.tax_amount = subtotal * 0.11
            so.total      = subtotal + so.tax_amount

        await db.commit()
        logger.info("Demo data seeded successfully.")
