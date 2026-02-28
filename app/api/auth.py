from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import require_auth
from app.core.security import verify_password, create_access_token
from app.modules.identity.models import User, Company

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))  # avoid async lazy-load
        .where(User.email == data.email, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token(
        user_id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        roles=user.role_codes,
    )

    # Resolve company_code for the frontend contract
    company_code = ""
    if user.company_id:
        c = (
            await db.execute(
                select(Company).where(
                    Company.id == user.company_id,
                    Company.is_deleted == False,
                )
            )
        ).scalar_one_or_none()
        company_code = c.code if c else ""

    return LoginResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "company_id": user.company_id or "",
            "company_code": company_code,
            "roles": user.role_codes,
            "is_superadmin": user.is_superadmin,
        },
    )


@router.get("/me")
async def me(user: User = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    company_code = ""
    if user.company_id:
        c = (
            await db.execute(
                select(Company).where(
                    Company.id == user.company_id,
                    Company.is_deleted == False,
                )
            )
        ).scalar_one_or_none()
        company_code = c.code if c else ""

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "company_id": user.company_id or "",
            "company_code": company_code,
            "roles": user.role_codes,
            "is_superadmin": user.is_superadmin,
        }
    }


@router.post("/logout")
async def logout():
    return {"status": "ok"}