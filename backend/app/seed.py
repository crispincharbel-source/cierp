"""CI ERP initial seed (single-tenant).

Creates:
- Company
- Roles: admin, user
- Admin user from env: ADMIN_EMAIL / ADMIN_PASSWORD

This is intentionally minimal so production DBs start clean.
"""

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.core.config import settings


async def seed_demo_data():
    # keep function name because app.main imports it
    async with AsyncSessionLocal() as db:
        from app.modules.identity.models import Company, Role, User

        tenant_id = settings.TENANT_ID
        company_code = settings.COMPANY_CODE
        company_name = settings.COMPANY_NAME
        admin_email = settings.ADMIN_EMAIL
        admin_password = settings.ADMIN_PASSWORD

        # If we already have any users for this tenant, assume seeded.
        existing = (
            await db.execute(
                select(func.count()).select_from(User).where(User.tenant_id == tenant_id)
            )
        ).scalar()
        if existing and existing > 0:
            return

        # Company
        company = (
            await db.execute(
                select(Company).where(
                    Company.tenant_id == tenant_id,
                    Company.code == company_code,
                    Company.is_deleted == False,
                )
            )
        ).scalar_one_or_none()

        if not company:
            company = Company(
                tenant_id=tenant_id,
                name=company_name,
                code=company_code,
                email=admin_email,
                currency="USD",
                country="Lebanon",
                is_active=True,
            )
            db.add(company)
            await db.flush()

        # Roles
        admin_role = (
            await db.execute(
                select(Role).where(
                    Role.tenant_id == tenant_id,
                    Role.code == "admin",
                    Role.is_deleted == False,
                )
            )
        ).scalar_one_or_none()
        if not admin_role:
            admin_role = Role(
                tenant_id=tenant_id,
                name="Administrator",
                code="admin",
                description="Full access",
                is_system=True,
            )
            db.add(admin_role)

        user_role = (
            await db.execute(
                select(Role).where(
                    Role.tenant_id == tenant_id,
                    Role.code == "user",
                    Role.is_deleted == False,
                )
            )
        ).scalar_one_or_none()
        if not user_role:
            user_role = Role(
                tenant_id=tenant_id,
                name="User",
                code="user",
                description="Standard access",
                is_system=True,
            )
            db.add(user_role)

        await db.flush()

        # Admin user (load roles eagerly to avoid async lazy-load)
        admin = (
            await db.execute(
                select(User)
                .options(selectinload(User.roles))
                .where(
                    User.tenant_id == tenant_id,
                    User.email == admin_email,
                    User.is_deleted == False,
                )
            )
        ).scalar_one_or_none()

        if not admin:
            admin = User(
                tenant_id=tenant_id,
                company_id=company.id,
                email=admin_email,
                password_hash=hash_password(admin_password),
                first_name="CI",
                last_name="Admin",
                is_active=True,
                is_superadmin=True,
            )
            db.add(admin)
            await db.flush()
            await db.refresh(admin, attribute_names=["roles"])  # ensure relationship ready

        # Ensure admin has admin role
        existing_codes = {r.code for r in (admin.roles or [])}
        if "admin" not in existing_codes:
            admin.roles.append(admin_role)

        await db.commit()