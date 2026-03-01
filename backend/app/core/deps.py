from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_token
from app.modules.identity.models import User

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # ── Tenant isolation — extract tenant_id from token ────────────────────
    token_tenant = payload.get("tenant_id")
    if not token_tenant:
        raise HTTPException(status_code=401, detail="Token missing tenant_id claim")

    # ── Optional X-Tenant-ID header must match the token claim ────────────
    # This lets multi-tenant proxies pass the header without being able to
    # escalate — the header is only accepted when it matches the signed token.
    header_tenant = request.headers.get("X-Tenant-ID")
    if header_tenant and header_tenant != token_tenant:
        raise HTTPException(
            status_code=401,
            detail="X-Tenant-ID header does not match token tenant",
        )

    # ── Tenant-scoped user lookup — prevents cross-tenant token replay ─────
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(
            User.id == payload["sub"],
            User.tenant_id == token_tenant,   # ← the isolation gate
            User.is_deleted == False,
        )
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # ── Populate request.state for AuditMiddleware (Layer 1) ──────────────
    request.state.user_id    = str(user.id)
    request.state.user_email = user.email
    request.state.tenant_id  = user.tenant_id

    return user


async def require_auth(user: User = Depends(get_current_user)) -> User:
    return user


async def require_superadmin(user: User = Depends(require_auth)) -> User:
    if not getattr(user, "is_superadmin", False):
        raise HTTPException(status_code=403, detail="Not authorized")
    return user
