"""
Order Tracking SQLAlchemy Models — PostgreSQL mirror of the MySQL order-tracking schema.

TENANT ISOLATION STRATEGY:
  Production stage tables (Cutting, Lamination, etc.) mirror a legacy MySQL schema
  that has no tenant_id. Strategy chosen: add tenant_id as a nullable-then-required
  column via BaseModel BUT keep integer PK for MySQL compatibility. We use a
  TenantScopedBase that adds tenant_id + soft-delete without changing PK to UUID,
  preserving MySQL schema parity while gaining SaaS-safe isolation.

Tables (production stages):
  cutting, lamination, printing, warehouse_to_dispatch, dispatch_to_production,
  extruder, raw_slitting, pvc, slitting

Reference data:
  ot_ink, ot_solvent, ot_complex

Audit:
  ot_activity_log, ot_admin_settings
"""
from sqlalchemy import Column, String, Boolean, Float, Text, Integer, DateTime, Index
from sqlalchemy.orm import declared_attr
from sqlalchemy.sql import func, text
from app.core.database import Base
from app.core.config import settings


# ─── Tenant-Scoped Base for OT tables ────────────────────────────────────────
# Keeps integer PK (MySQL compat) but adds tenant_id + soft-delete for SaaS safety.
class OTBase(Base):
    """
    Abstract base for all Order Tracking production-stage tables.
    Adds tenant_id + is_deleted without changing the integer PK convention.
    """
    __abstract__ = True

    tenant_id  = Column(String(100), nullable=False, index=True, default=lambda: settings.TENANT_ID)
    is_deleted = Column(Boolean, nullable=False, server_default=text("false"), default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ─── Reference Tables (no tenant — shared lookup data) ───────────────────────

class OTInk(Base):
    """Ink stock — matches MySQL `ink` table. Shared reference, no tenant isolation needed."""
    __tablename__ = "ot_ink"

    code_number        = Column(String(50),  primary_key=True)
    supplier           = Column(String(255), nullable=False)
    color              = Column(String(255), nullable=False)
    code               = Column(String(50),  nullable=True)
    pal_number         = Column(String(50),  nullable=True)
    date               = Column(String(50),  nullable=True)
    batch_palet_number = Column(String(50),  nullable=True)
    is_finished        = Column(Boolean,     nullable=False, default=False)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OTSolvent(Base):
    """Solvent stock — matches MySQL `solvent` table. Shared reference."""
    __tablename__ = "ot_solvent"

    code_number        = Column(String(50),  primary_key=True)
    supplier           = Column(String(255), nullable=False)
    product            = Column(String(255), nullable=False)
    code               = Column(String(50),  nullable=False)
    pal_number         = Column(String(50),  nullable=True)
    date               = Column(String(50),  nullable=False)
    batch_palet_number = Column(String(50),  nullable=True)
    is_finished        = Column(Boolean,     nullable=False, default=False)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OTComplex(Base):
    """Complex material reference. Shared lookup."""
    __tablename__ = "ot_complex"

    id   = Column(Integer, primary_key=True, autoincrement=True)
    desc = Column(String(255), nullable=False)


class OTActivityLog(OTBase):
    """Per-tenant audit log for order tracking actions."""
    __tablename__ = "ot_activity_log"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String(255), nullable=False, index=True)
    action     = Column(String(50),  nullable=False, index=True)
    table_name = Column(String(50),  nullable=False)
    record_id  = Column(String(50),  nullable=False)
    details    = Column(Text,        nullable=True)
    timestamp  = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class OTAdminSettings(OTBase):
    """Per-tenant admin key-value settings."""
    __tablename__ = "ot_admin_settings"

    id                  = Column(Integer,     primary_key=True, autoincrement=True)
    setting_key         = Column(String(100), nullable=False, index=True)
    setting_value       = Column(Text,        nullable=True)
    setting_description = Column(String(255), nullable=True)
    last_updated_by     = Column(String(255), nullable=False)

    __table_args__ = (
        # Unique per tenant (not globally unique — each tenant can have same keys)
        Index("uq_ot_settings_tenant_key", "tenant_id", "setting_key", unique=True),
    )


# ─── Production Stage Tables (all tenant-scoped via OTBase) ──────────────────

class Cutting(OTBase):
    """Cutting stage."""
    __tablename__ = "ot_cutting"

    id             = Column(Integer,      primary_key=True, autoincrement=True)
    order_number   = Column(String(50),   nullable=False, index=True)
    batch_number   = Column(String(255),  nullable=False, index=True)
    machine        = Column(String(100),  nullable=False)
    customer_name  = Column(String(255),  nullable=False)
    operator_name  = Column(String(255),  nullable=False)
    zipper_number  = Column(String(50),   nullable=True)
    slider_number  = Column(String(50),   nullable=True)
    date           = Column(String(50),   nullable=False)
    speed          = Column(Float,        nullable=True)
    uom            = Column(String(20),   nullable=True)
    quantity       = Column(Float,        nullable=True)
    waste          = Column(Float,        nullable=True)
    notes          = Column(Text,         nullable=True)


class Lamination(OTBase):
    """Lamination stage. complex_1..6 replace old single `complex` column (migration 03)."""
    __tablename__ = "ot_lamination"

    id              = Column(Integer,     primary_key=True, autoincrement=True)
    order_number    = Column(String(50),  nullable=False, index=True)
    batch_number    = Column(String(255), nullable=False, index=True)
    machine         = Column(String(100), nullable=False)
    customer_name   = Column(String(255), nullable=False)
    operator_name   = Column(String(255), nullable=False)
    glue_number     = Column(String(50),  nullable=True)
    hardner_number  = Column(String(50),  nullable=True)
    date            = Column(String(50),  nullable=False)
    complex_1       = Column(String(255), nullable=True)
    complex_2       = Column(String(255), nullable=True)
    complex_3       = Column(String(255), nullable=True)
    complex_4       = Column(String(255), nullable=True)
    complex_5       = Column(String(255), nullable=True)
    complex_6       = Column(String(255), nullable=True)
    glue_speed      = Column(Float,       nullable=True)
    machine_speed   = Column(Float,       nullable=True)
    meters          = Column(Float,       nullable=True)
    weight          = Column(Float,       nullable=True)
    waste           = Column(Float,       nullable=True)
    glue_weight     = Column(Float,       nullable=True)
    hardner_weight  = Column(Float,       nullable=True)


class Printing(OTBase):
    """Printing stage. complex_1..6, ink_1..8, solvent_1..3 (migration 03)."""
    __tablename__ = "ot_printing"

    id               = Column(Integer,    primary_key=True, autoincrement=True)
    order_number     = Column(String(50), nullable=False, index=True)
    batch_number     = Column(String(255),nullable=False, index=True)
    machine          = Column(String(100),nullable=False)
    customer_name    = Column(String(255),nullable=False)
    operator_name    = Column(String(255),nullable=False)
    ink_1            = Column(String(50), nullable=True)
    ink_2            = Column(String(50), nullable=True)
    ink_3            = Column(String(50), nullable=True)
    ink_4            = Column(String(50), nullable=True)
    ink_5            = Column(String(50), nullable=True)
    ink_6            = Column(String(50), nullable=True)
    ink_7            = Column(String(50), nullable=True)
    ink_8            = Column(String(50), nullable=True)
    solvent_1        = Column(String(50), nullable=True)
    solvent_2        = Column(String(50), nullable=True)
    solvent_3        = Column(String(50), nullable=True)
    date             = Column(String(50), nullable=False)
    complex_1        = Column(String(255),nullable=True)
    complex_2        = Column(String(255),nullable=True)
    complex_3        = Column(String(255),nullable=True)
    complex_4        = Column(String(255),nullable=True)
    complex_5        = Column(String(255),nullable=True)
    complex_6        = Column(String(255),nullable=True)
    speed            = Column(Float,      nullable=True)
    width            = Column(Float,      nullable=True)
    printed_meters   = Column(Float,      nullable=True)
    weight           = Column(Float,      nullable=True)
    waste            = Column(Float,      nullable=True)
    number_of_colors = Column(Integer,    nullable=True)
    hours            = Column(Float,      nullable=True)
    notes            = Column(Text,       nullable=True)


class WarehouseToDispatch(OTBase):
    """Warehouse → Dispatch transfer."""
    __tablename__ = "ot_warehouse_to_dispatch"

    id                  = Column(Integer,    primary_key=True, autoincrement=True)
    order_number        = Column(String(50), nullable=False, index=True)
    batch_number        = Column(String(255),nullable=False, index=True)
    supplier_name       = Column(String(255),nullable=False)
    item_description    = Column(String(255),nullable=False)
    name_received       = Column(String(255),nullable=False)
    quantity_requested  = Column(Float,      nullable=False)
    quantity_sent       = Column(Float,      nullable=False)
    notes               = Column(Text,       nullable=True)
    date                = Column(String(50), nullable=False)


class DispatchToProduction(OTBase):
    """Dispatch → Production transfer."""
    __tablename__ = "ot_dispatch_to_production"

    id                  = Column(Integer,    primary_key=True, autoincrement=True)
    order_number        = Column(String(50), nullable=False, index=True)
    date                = Column(String(50), nullable=False)
    item_description    = Column(String(255),nullable=False)
    uom                 = Column(String(20), nullable=False)
    quantity_requested  = Column(Float,      nullable=False)
    quantity_sent       = Column(Float,      nullable=False)
    batch_number        = Column(String(255),nullable=False, index=True)
    name_received       = Column(String(255),nullable=False)
    quantity_returned   = Column(Float,      nullable=True)


class Extruder(OTBase):
    """Extruder stage. waste column added by migration 04."""
    __tablename__ = "ot_extruder"

    id                  = Column(Integer,    primary_key=True, autoincrement=True)
    order_number        = Column(String(50), nullable=False, index=True)
    date                = Column(String(50), nullable=False)
    waste               = Column(String(255),nullable=True)
    operator            = Column(String(255),nullable=False)
    client              = Column(String(255),nullable=False)
    color               = Column(String(50), nullable=False)
    size                = Column(String(50), nullable=False)
    thickness           = Column(Float,      nullable=False)
    item_description    = Column(String(255),nullable=False)
    meters              = Column(Float,      nullable=False)
    weight              = Column(Float,      nullable=False)
    ldpe_batch_number   = Column(String(50), nullable=True)
    enable_batch_number = Column(String(50), nullable=True)
    exact_batch_number  = Column(String(50), nullable=True)
    white_batch_number  = Column(String(50), nullable=True)


class RawSlitting(OTBase):
    """Raw Slitting stage. complex_1..6 (migration 03)."""
    __tablename__ = "ot_raw_slitting"

    id                    = Column(Integer,    primary_key=True, autoincrement=True)
    order_number          = Column(String(50), nullable=False, index=True)
    date                  = Column(String(50), nullable=False)
    batch_number          = Column(String(255),nullable=False, index=True)
    operator              = Column(String(255),nullable=False)
    client                = Column(String(255),nullable=False)
    complex_1             = Column(String(255),nullable=True)
    complex_2             = Column(String(255),nullable=True)
    complex_3             = Column(String(255),nullable=True)
    complex_4             = Column(String(255),nullable=True)
    complex_5             = Column(String(255),nullable=True)
    complex_6             = Column(String(255),nullable=True)
    supplier              = Column(String(255),nullable=False)
    roll_width            = Column(Float,      nullable=False)
    meters                = Column(Float,      nullable=False)
    weight                = Column(Float,      nullable=False)
    size_after_slitting   = Column(Float,      nullable=False)
    quantity              = Column(Integer,    nullable=False)
    purpose               = Column(String(255),nullable=True)
    remaining_destination = Column(String(255),nullable=True)
    waste                 = Column(Float,      nullable=True)


class PVC(OTBase):
    """PVC stage."""
    __tablename__ = "ot_pvc"

    id            = Column(Integer,    primary_key=True, autoincrement=True)
    order_number  = Column(String(50), nullable=False, index=True)
    batch_number  = Column(String(255),nullable=False, index=True)
    machine       = Column(String(100),nullable=False)
    customer_name = Column(String(255),nullable=False)
    operator_name = Column(String(255),nullable=False)
    glue_number   = Column(String(50), nullable=True)
    notes         = Column(Text,       nullable=True)
    date          = Column(String(50), nullable=False)


class Slitting(OTBase):
    """Slitting stage."""
    __tablename__ = "ot_slitting"

    id            = Column(Integer,    primary_key=True, autoincrement=True)
    order_number  = Column(String(50), nullable=False, index=True)
    batch_number  = Column(String(255),nullable=False, index=True)
    machine       = Column(String(100),nullable=False)
    customer_name = Column(String(255),nullable=False)
    operator_name = Column(String(255),nullable=False)
    date          = Column(String(50), nullable=False)
    barcode       = Column(String(100),nullable=True)
    production    = Column(Float,      nullable=True)
    waste         = Column(Float,      nullable=True)
    notes         = Column(Text,       nullable=True)
