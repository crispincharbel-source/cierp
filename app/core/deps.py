from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_token
from app.modules.identity.models import User

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))  # avoid async lazy-load
        .where(User.id == payload["sub"], User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


async def require_auth(user: User = Depends(get_current_user)) -> User:
    return user


async def require_superadmin(user: User = Depends(require_auth)) -> User:
    # 403 (not 401) so frontend shows "no permission" without logout
    if not getattr(user, "is_superadmin", False):
        raise HTTPException(status_code=403, detail="Not authorized")
    return user