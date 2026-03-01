"""
CI ERP — Database-backed RBAC Permission Models

Tables
------
permission       id, code (unique), description, module, is_active
role_permission  role_id FK→role.id, permission_id FK→permission.id  (join table)

Design notes
------------
- Permissions are global (not per-tenant) — they encode *capabilities* of the
  system, not data ownership.
- role_permission rows carry tenant_id for future multi-tenant customisation.
- Role.permissions is lazy="noload"; callers eager-load with selectinload() when needed.
- In-memory PERMISSIONS dict (permissions.py) is the seeding source-of-truth.
  The DB is the runtime source-of-truth after first boot.
"""
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime,
    ForeignKey, Table, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid as _uuid


# ─── role_permission join table ───────────────────────────────────────────────
role_permission = Table(
    "role_permission",
    Base.metadata,
    Column("id",            String(36),  primary_key=True,
           default=lambda: str(_uuid.uuid4())),
    Column("role_id",       String(36),  ForeignKey("role.id",       ondelete="CASCADE"),
           nullable=False, index=True),
    Column("permission_id", String(36),  ForeignKey("permission.id", ondelete="CASCADE"),
           nullable=False, index=True),
    Column("tenant_id",     String(100), nullable=False, index=True, default="cierp"),
    Column("created_at",    DateTime(timezone=True), server_default=func.now(), nullable=False),
    UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
)


# ─── Permission model ─────────────────────────────────────────────────────────
class Permission(Base):
    """
    A single named permission code, e.g. 'sales.orders.confirm'.
    No tenant_id — permissions are system-wide capabilities.
    """
    __tablename__ = "permission"

    id          = Column(String(36),  primary_key=True,
                         default=lambda: str(_uuid.uuid4()))
    code        = Column(String(200), nullable=False, unique=True, index=True)
    description = Column(Text,        nullable=True)
    module      = Column(String(100), nullable=True, index=True)
    is_active   = Column(Boolean,     nullable=False,
                         default=True, server_default="true")
    created_at  = Column(DateTime(timezone=True),
                         server_default=func.now(), nullable=False)

    roles = relationship(
        "Role",
        secondary=role_permission,
        back_populates="permissions",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<Permission code={self.code!r}>"
