from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.deps import require_superadmin
from app.core.security import hash_password
from app.core.config import settings
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
    _: User = Depends(require_superadmin),
):
    result = await db.execute(select(Role).where(Role.is_deleted == False))
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
    _: User = Depends(require_superadmin),
):
    existing = (
        await db.execute(
            select(Role).where(Role.code == data.code, Role.is_deleted == False)
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=422, detail="Role code already exists")

    role = Role(
        tenant_id=settings.TENANT_ID,
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
    _: User = Depends(require_superadmin),
):
    query = select(User).options(selectinload(User.roles)).where(User.is_deleted == False)

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
    _: User = Depends(require_superadmin),
):
    existing = (
        await db.execute(
            select(User).where(User.email == data.email, User.is_deleted == False)
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=422, detail="User already exists")

    user = User(
        tenant_id=settings.TENANT_ID,
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name or "",
        last_name=data.last_name or "",
        is_active=data.is_active if data.is_active is not None else True,
        is_superadmin=False,
    )

    # assign roles
    if data.roles:
        result = await db.execute(
            select(Role).where(Role.code.in_(data.roles), Role.is_deleted == False)
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
    _: User = Depends(require_superadmin),
):
    result = await db.execute(
        select(User).options(selectinload(User.roles)).where(User.id == user_id)
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
    _: User = Depends(require_superadmin),
):
    result = await db.execute(
        select(User).options(selectinload(User.roles)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        select(Role).where(Role.code.in_(data.roles), Role.is_deleted == False)
    )
    roles = result.scalars().all()

    if len(roles) != len(data.roles):
        raise HTTPException(status_code=422, detail="One or more roles not found")

    user.roles = roles

    await db.commit()

    return {"status": "roles updated"}