"""
CI ERP — Multi-Tenant Enforcement
Provides tenant-scoped database helpers to ensure all queries filter by tenant_id.
This guarantees SaaS-safe data isolation: one tenant can NEVER see another's data.
"""
from typing import Type, TypeVar, Optional, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from app.core.database import BaseModel

T = TypeVar("T", bound=BaseModel)


class TenantScope:
    """
    Context manager that ensures all DB queries are tenant-scoped.
    Usage:
        scope = TenantScope(db, tenant_id, user)
        items = await scope.list(Product)
        item  = await scope.get(Product, item_id)
        await scope.delete(item)
    """

    def __init__(self, db: AsyncSession, tenant_id: str, user=None):
        self.db = db
        self.tenant_id = tenant_id
        self.user = user

    def _base_filter(self, model: Type[T]):
        """Standard tenant + soft-delete filter."""
        return and_(
            model.tenant_id == self.tenant_id,
            model.is_deleted == False,
        )

    async def get(self, model: Type[T], record_id: str, *, eager_loads=None) -> Optional[T]:
        """Fetch a single record, enforcing tenant isolation."""
        q = select(model).where(
            and_(self._base_filter(model), model.id == record_id)
        )
        if eager_loads:
            from sqlalchemy.orm import selectinload
            for rel in eager_loads:
                q = q.options(selectinload(rel))
        result = await self.db.execute(q)
        return result.scalar_one_or_none()

    async def list(
        self,
        model: Type[T],
        *,
        extra_filters=None,
        order_by=None,
        offset: int = 0,
        limit: int = 100,
        eager_loads=None,
    ) -> List[T]:
        """List records for tenant."""
        filters = [self._base_filter(model)]
        if extra_filters:
            if isinstance(extra_filters, list):
                filters.extend(extra_filters)
            else:
                filters.append(extra_filters)

        q = select(model).where(and_(*filters))
        if order_by is not None:
            q = q.order_by(order_by)
        else:
            q = q.order_by(desc(model.created_at))
        q = q.offset(offset).limit(limit)

        if eager_loads:
            from sqlalchemy.orm import selectinload
            for rel in eager_loads:
                q = q.options(selectinload(rel))

        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def count(self, model: Type[T], *, extra_filters=None) -> int:
        """Count records for tenant."""
        filters = [self._base_filter(model)]
        if extra_filters:
            if isinstance(extra_filters, list):
                filters.extend(extra_filters)
            else:
                filters.append(extra_filters)
        result = await self.db.execute(
            select(func.count()).select_from(model).where(and_(*filters))
        )
        return result.scalar() or 0

    def create(self, model: Type[T], **kwargs) -> T:
        """Create a new model instance with tenant_id pre-set."""
        instance = model(tenant_id=self.tenant_id, **kwargs)
        self.db.add(instance)
        return instance

    async def soft_delete(self, instance: T) -> T:
        """Soft-delete a record (set is_deleted=True)."""
        instance.is_deleted = True
        await self.db.flush()
        return instance

    async def exists(self, model: Type[T], record_id: str) -> bool:
        """Check if a tenant-owned record exists."""
        result = await self.db.execute(
            select(func.count()).select_from(model).where(
                and_(self._base_filter(model), model.id == record_id)
            )
        )
        return (result.scalar() or 0) > 0


def get_tenant_scope(db: AsyncSession, user) -> TenantScope:
    """Create a TenantScope from the current authenticated user."""
    return TenantScope(db, user.tenant_id, user)
