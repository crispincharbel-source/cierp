"""
CI ERP — Permission Service

Three public helpers that replace ad-hoc permission checks:

    get_user_permissions(db, user_id)          → set[str]
    check_permission(user, permission_code)    → bool
    assign_permission_to_role(db, role_id, code, tenant_id) → bool

In-process TTL cache
--------------------
Permissions are resolved via DB on first call per (user_id) and cached for
CACHE_TTL_SECONDS seconds.  Cache is invalidated explicitly when role/permission
assignments change via the Admin API.

Resolution chain
----------------
User.roles  →  role_permission  →  Permission.code

Superadmin users short-circuit: they implicitly have every permission.
Admin role users get the wildcard (*) which grants all permissions.
"""
import time
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.modules.identity.models import User, Role
from app.modules.identity.permissions import PERMISSIONS, ROLE_PERMISSIONS

logger = logging.getLogger("cierp.permissions")

# ─── In-process permission cache ─────────────────────────────────────────────
# Structure: { user_id: (permissions_set, expires_at) }
_perm_cache: dict[str, tuple[frozenset, float]] = {}
CACHE_TTL_SECONDS = 300   # 5 minutes — adjust to taste


def _cache_get(user_id: str) -> Optional[frozenset]:
    entry = _perm_cache.get(user_id)
    if entry and time.monotonic() < entry[1]:
        return entry[0]
    _perm_cache.pop(user_id, None)
    return None


def _cache_set(user_id: str, perms: frozenset) -> None:
    _perm_cache[user_id] = (perms, time.monotonic() + CACHE_TTL_SECONDS)


def invalidate_user_cache(user_id: str) -> None:
    """Call this whenever a user's roles are changed."""
    _perm_cache.pop(user_id, None)
    logger.debug(f"Permission cache invalidated for user {user_id}")


def invalidate_role_cache(role_code: str) -> None:
    """Wipe all cached entries when a role's permission set changes."""
    _perm_cache.clear()
    logger.debug(f"Permission cache cleared (role {role_code!r} changed)")


# ─── Core: resolve all permission codes for a user ───────────────────────────
ALL_PERMISSION_CODES: frozenset = frozenset(PERMISSIONS.keys())


async def get_user_permissions(db: AsyncSession, user_id: str) -> frozenset:
    """
    Return the complete set of permission codes for a user.

    Resolution order (first match wins):
      1. Superadmin → all permissions
      2. Role with wildcard "*" in ROLE_PERMISSIONS → all permissions
      3. DB role_permission rows for user's roles
      4. Fallback: in-memory ROLE_PERMISSIONS map (if DB rows absent)

    Result is cached for CACHE_TTL_SECONDS.
    """
    cached = _cache_get(user_id)
    if cached is not None:
        return cached

    # Load user with roles (roles always selectin-loaded via User model)
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.roles).selectinload(Role.permissions)
        )
        .where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user:
        return frozenset()

    # 1. Superadmin shortcut
    if user.is_superadmin:
        perms = ALL_PERMISSION_CODES
        _cache_set(user_id, perms)
        return perms

    collected: set[str] = set()
    for role in (user.roles or []):
        # 2. Wildcard via in-memory map (admin role)
        mem_perms = ROLE_PERMISSIONS.get(role.code, [])
        if "*" in mem_perms:
            perms = ALL_PERMISSION_CODES
            _cache_set(user_id, perms)
            return perms

        # 3. DB-backed permissions (populated after seeding)
        if role.permissions:
            for perm in role.permissions:
                if perm.is_active:
                    collected.add(perm.code)
        else:
            # 4. Fallback: in-memory map (before first DB seed or in tests)
            collected.update(p for p in mem_perms if p != "*")

    perms = frozenset(collected)
    _cache_set(user_id, perms)
    return perms


# ─── Sync check (for use in sync contexts / tests) ───────────────────────────
def check_permission_sync(user: User, permission_code: str) -> bool:
    """
    Synchronous permission check using *only* in-memory ROLE_PERMISSIONS map.
    Used by the FastAPI dependency as a fast-path when DB lookup is not needed.
    """
    if user.is_superadmin:
        return True
    for role in (user.roles or []):
        rp = ROLE_PERMISSIONS.get(role.code, [])
        if "*" in rp or permission_code in rp:
            return True
    return False


# ─── Async check (authoritative, DB-backed) ──────────────────────────────────
async def check_permission(db: AsyncSession, user: User, permission_code: str) -> bool:
    """
    Authoritative DB-backed permission check with cache.
    Prefer this for any write-path or sensitive operation.
    """
    if user.is_superadmin:
        return True
    perms = await get_user_permissions(db, str(user.id))
    return permission_code in perms


# ─── Assignment helpers ───────────────────────────────────────────────────────
async def assign_permission_to_role(
    db: AsyncSession,
    role_id: str,
    permission_code: str,
    tenant_id: str = "cierp",
) -> bool:
    """
    Assign a permission to a role (idempotent).
    Returns True if the assignment was created, False if it already existed.
    """
    from app.modules.identity.permissions_models import Permission, role_permission
    from sqlalchemy import insert

    # Ensure permission exists in DB
    perm = (await db.execute(
        select(Permission).where(Permission.code == permission_code)
    )).scalar_one_or_none()

    if not perm:
        # Auto-create from the in-memory registry
        desc = PERMISSIONS.get(permission_code, "")
        module = permission_code.split(".")[0] if "." in permission_code else None
        perm = Permission(code=permission_code, description=desc, module=module)
        db.add(perm)
        await db.flush()

    # Check if assignment already exists
    from sqlalchemy import and_
    existing = await db.execute(
        select(role_permission).where(
            and_(
                role_permission.c.role_id == role_id,
                role_permission.c.permission_id == perm.id,
            )
        )
    )
    if existing.first():
        return False  # already assigned

    await db.execute(
        insert(role_permission).values(
            role_id=role_id,
            permission_id=perm.id,
            tenant_id=tenant_id,
        )
    )
    await db.flush()

    # Invalidate cache for all users with this role
    invalidate_role_cache(role_id)
    logger.info(f"Permission {permission_code!r} assigned to role {role_id}")
    return True


async def revoke_permission_from_role(
    db: AsyncSession,
    role_id: str,
    permission_code: str,
) -> bool:
    """Remove a permission from a role. Returns True if removed."""
    from app.modules.identity.permissions_models import Permission, role_permission
    from sqlalchemy import delete, and_

    perm = (await db.execute(
        select(Permission).where(Permission.code == permission_code)
    )).scalar_one_or_none()
    if not perm:
        return False

    result = await db.execute(
        delete(role_permission).where(
            and_(
                role_permission.c.role_id == role_id,
                role_permission.c.permission_id == perm.id,
            )
        )
    )
    await db.flush()
    invalidate_role_cache(role_id)
    return result.rowcount > 0


async def list_role_permissions(db: AsyncSession, role_id: str) -> list[str]:
    """Return all permission codes currently assigned to a role."""
    from app.modules.identity.permissions_models import Permission, role_permission
    from sqlalchemy import and_

    result = await db.execute(
        select(Permission.code)
        .join(role_permission, role_permission.c.permission_id == Permission.id)
        .where(
            and_(
                role_permission.c.role_id == role_id,
                Permission.is_active == True,
            )
        )
        .order_by(Permission.code)
    )
    return [row[0] for row in result.all()]
