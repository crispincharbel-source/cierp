from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import BaseModel, Base
import uuid

from app.core.config import settings

# Association table: users <-> roles
#
# NOTE: The DB schema includes multitenancy + soft-delete fields. If this table is
# defined with only (user_id, role_id), SQLAlchemy will INSERT only those columns,
# which fails when the DB has NOT NULL columns like id/tenant_id.
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("id", String(36), primary_key=True, default=lambda: str(uuid.uuid4())),
    Column("tenant_id", String(50), nullable=False, default=settings.TENANT_ID),
    Column("user_id", String(36), ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
    Column("role_id", String(36), ForeignKey("role.id", ondelete="CASCADE"), nullable=False),
    Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False),
    Column("is_deleted", Boolean, nullable=False, server_default="false"),
    UniqueConstraint("tenant_id", "user_id", "role_id", name="uq_user_roles_tenant_user_role"),
)


class Company(BaseModel):
    __tablename__ = "company"

    name = Column(String(300), nullable=False)
    code = Column(String(50), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    country = Column(String(100), nullable=True, default="Lebanon")
    currency = Column(String(10), nullable=False, default="USD")
    is_active = Column(Boolean, default=True)

    users = relationship("User", back_populates="company", lazy="noload")


class Role(BaseModel):
    __tablename__ = "role"

    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False)

    users = relationship("User", secondary=user_roles, back_populates="roles", lazy="noload")


class User(BaseModel):
    __tablename__ = "user"

    company_id = Column(String(36), ForeignKey("company.id"), nullable=True)
    email = Column(String(255), nullable=False, index=True)
    password_hash = Column(String(500), nullable=False)
    first_name = Column(String(100), nullable=False, default="")
    last_name = Column(String(100), nullable=False, default="")
    is_active = Column(Boolean, default=True)
    is_superadmin = Column(Boolean, default=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    company = relationship("Company", back_populates="users", lazy="noload")
    roles = relationship("Role", secondary=user_roles, back_populates="users", lazy="selectin")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.email

    @property
    def role_codes(self) -> list:
        return [r.code for r in (self.roles or [])]
