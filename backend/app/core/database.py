from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, declared_attr
from sqlalchemy import Column, String, Boolean, DateTime, func, text
from typing import AsyncGenerator
from app.core.config import settings
import uuid as _uuid


engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        import re
        return re.sub(r'(?<!^)(?=[A-Z])', '_', cls.__name__).lower()


class BaseModel(Base):
    """Every table: UUID PK, tenant_id, timestamps, soft-delete."""
    __abstract__ = True

    id = Column(String(36), primary_key=True, default=lambda: str(_uuid.uuid4()))
    tenant_id = Column(String(100), nullable=False, index=True, default="cierp")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)
    is_deleted = Column(Boolean, default=False, server_default=text('false'), nullable=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Import all models then create tables."""
    import app.modules.identity.models           # noqa
    import app.modules.identity.permissions_models  # noqa — Permission + role_permission
    import app.modules.accounting.models         # noqa
    import app.modules.sales.models              # noqa
    import app.modules.crm.models                # noqa
    import app.modules.purchasing.models         # noqa
    import app.modules.inventory.models          # noqa
    import app.modules.hr.models                 # noqa
    import app.modules.manufacturing.models      # noqa
    import app.modules.projects.models           # noqa
    import app.modules.helpdesk.models           # noqa
    import app.modules.order_tracking.models     # noqa
    import app.modules.payroll.models            # noqa

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
