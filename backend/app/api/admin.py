from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.deps import require_superadmin
from app.core.security import hash_password
from app.modules.identity.models import User, Role


router = APIRouter(prefix="/admin", tags=["Admin"])


# ----------------------
# Schemas
# ----------------------

class RoleCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    roles: Optional[List[str]] = []
    is_active: Optional[bool] = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class RolesReplace(BaseModel):
    roles: List[str]


# ----------------------
# Role Endpoints
# ----------------------

@router.get("/roles")
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    result = await db.execute(
        select(Role).where(
            Role.tenant_id == current_user.tenant_id,
            Role.is_deleted == False,
        )
    )
    roles = result.scalars().all()

    return [
        {
            "id": r.id,
            "code": r.code,
            "name": r.name,
            "description": r.description,
        }
        for r in roles
    ]


@router.post("/roles")
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    existing = (
        await db.execute(
            select(Role).where(
                Role.tenant_id == current_user.tenant_id,
                Role.code == data.code,
                Role.is_deleted == False,
            )
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=422, detail="Role code already exists")

    role = Role(
        tenant_id=current_user.tenant_id,
        code=data.code,
        name=data.name,
        description=data.description,
        is_system=False,
    )

    db.add(role)
    await db.commit()
    await db.refresh(role)

    return {"id": role.id, "code": role.code}


# ----------------------
# User Endpoints
# ----------------------

@router.get("/users")
async def list_users(
    q: Optional[str] = Query(None),
    active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    query = (
        select(User)
        .options(selectinload(User.roles))
        .where(
            User.tenant_id == current_user.tenant_id,
            User.is_deleted == False,
        )
    )

    if q:
        query = query.where(User.email.ilike(f"%{q}%"))

    if active is not None:
        query = query.where(User.is_active == active)

    result = await db.execute(query)
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "is_active": u.is_active,
            "roles": u.role_codes,
            "is_superadmin": u.is_superadmin,
        }
        for u in users
    ]


@router.post("/users")
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    existing = (
        await db.execute(
            select(User).where(
                User.tenant_id == current_user.tenant_id,
                User.email == data.email,
                User.is_deleted == False,
            )
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=422, detail="User already exists")

    user = User(
        tenant_id=current_user.tenant_id,
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name or "",
        last_name=data.last_name or "",
        is_active=data.is_active if data.is_active is not None else True,
        is_superadmin=False,
    )

    # assign roles — scoped to same tenant
    if data.roles:
        result = await db.execute(
            select(Role).where(
                Role.tenant_id == current_user.tenant_id,
                Role.code.in_(data.roles),
                Role.is_deleted == False,
            )
        )
        roles = result.scalars().all()

        if len(roles) != len(data.roles):
            raise HTTPException(status_code=422, detail="One or more roles not found")

        user.roles = roles

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {"id": user.id}


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id,
            User.is_deleted == False,
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.first_name is not None:
        user.first_name = data.first_name

    if data.last_name is not None:
        user.last_name = data.last_name

    if data.is_active is not None:
        user.is_active = data.is_active

    if data.password:
        user.password_hash = hash_password(data.password)

    await db.commit()

    return {"status": "updated"}


@router.put("/users/{user_id}/roles")
async def replace_user_roles(
    user_id: str,
    data: RolesReplace,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id,
            User.is_deleted == False,
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        select(Role).where(
            Role.tenant_id == current_user.tenant_id,
            Role.code.in_(data.roles),
            Role.is_deleted == False,
        )
    )
    roles = result.scalars().all()

    if len(roles) != len(data.roles):
        raise HTTPException(status_code=422, detail="One or more roles not found")

    user.roles = roles

    await db.commit()

    return {"status": "roles updated"}

# ─── Audit Log Endpoints ────────────────────────────────────────────────────────
from app.modules.identity.models import AuditLog

@router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    module: Optional[str] = None,
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    """Retrieve audit log entries for the tenant."""
    from sqlalchemy import and_, desc
    
    filters = [AuditLog.tenant_id == current_user.tenant_id, AuditLog.is_deleted == False]
    if module:
        filters.append(AuditLog.module == module)
    if action:
        filters.append(AuditLog.action.ilike(f"%{action}%"))
    
    total_result = await db.execute(
        select(func.count()).select_from(AuditLog).where(and_(*filters))
    )
    total = total_result.scalar() or 0
    
    result = await db.execute(
        select(AuditLog)
        .where(and_(*filters))
        .order_by(desc(AuditLog.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    logs = result.scalars().all()
    
    return {
        "items": [
            {
                "id": l.id,
                "action": l.action,
                "module": l.module,
                "actor_email": l.actor_email,
                "actor_name": l.actor_name,
                "resource_type": l.resource_type,
                "resource_id": l.resource_id,
                "resource_label": l.resource_label,
                "severity": l.severity,
                "ip_address": l.ip_address,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ─── Permissions Endpoint (read-only map) ─────────────────────────────────────
@router.get("/permissions-map")
async def get_permissions_map(_: User = Depends(require_superadmin)):
    """Return the full RBAC permissions map (in-memory registry)."""
    from app.modules.identity.permissions import PERMISSIONS, ROLE_PERMISSIONS
    return {"permissions": PERMISSIONS, "role_permissions": ROLE_PERMISSIONS}


# ─── Runtime DB Permission Management ─────────────────────────────────────────
from app.modules.identity.permissions_models import Permission, role_permission as rp_table
from app.modules.identity.permission_service import (
    assign_permission_to_role,
    revoke_permission_from_role,
    list_role_permissions,
    invalidate_role_cache,
    invalidate_user_cache,
)


@router.get("/permissions")
async def list_all_permissions(
    module: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    """List all permission codes in the database."""
    from sqlalchemy import asc as sql_asc
    q = select(Permission).where(Permission.is_active == True)
    if module:
        q = q.where(Permission.module == module.lower())
    q = q.order_by(sql_asc(Permission.code))
    result = await db.execute(q)
    perms = result.scalars().all()
    return [
        {"id": p.id, "code": p.code, "description": p.description,
         "module": p.module, "is_active": p.is_active}
        for p in perms
    ]


@router.get("/roles/{role_id}/permissions")
async def get_role_permissions_endpoint(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    """List all permissions assigned to a role (DB-backed)."""
    codes = await list_role_permissions(db, role_id)
    return {"role_id": role_id, "permissions": codes, "count": len(codes)}


class PermissionAssign(BaseModel):
    permission_code: str


@router.post("/roles/{role_id}/permissions")
async def assign_role_permission_endpoint(
    role_id: str,
    data: PermissionAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin),
):
    """
    Assign a permission to a role at runtime.
    Takes effect immediately (cache invalidated automatically).
    """
    created = await assign_permission_to_role(
        db, role_id, data.permission_code, current_user.tenant_id
    )
    await db.commit()
    return {"assigned": created, "role_id": role_id, "permission": data.permission_code}


@router.delete("/roles/{role_id}/permissions/{permission_code:path}")
async def revoke_role_permission_endpoint(
    role_id: str,
    permission_code: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    """Revoke a permission from a role at runtime."""
    removed = await revoke_permission_from_role(db, role_id, permission_code)
    await db.commit()
    if not removed:
        raise HTTPException(status_code=404, detail="Permission assignment not found")
    return {"revoked": True, "role_id": role_id, "permission": permission_code}


@router.post("/cache/invalidate")
async def invalidate_cache_endpoint(
    user_id: Optional[str] = None,
    role_id: Optional[str] = None,
    _: User = Depends(require_superadmin),
):
    """
    Manually invalidate the in-process permission cache.
    Useful after bulk permission changes or when testing RBAC.
    """
    if user_id:
        invalidate_user_cache(user_id)
        return {"invalidated": "user", "user_id": user_id}
    if role_id:
        invalidate_role_cache(role_id)
        return {"invalidated": "role", "role_id": role_id}
    # Clear everything
    from app.modules.identity.permission_service import _perm_cache
    _perm_cache.clear()
    return {"invalidated": "all"}


from sqlalchemy import func
