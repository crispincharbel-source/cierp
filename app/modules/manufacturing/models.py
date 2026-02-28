from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import BaseModel


class BOM(BaseModel):
    __tablename__ = "bom"
    product_id = Column(String(36), nullable=True)
    product_name = Column(String(300), nullable=False)
    product_qty = Column(Numeric(20, 4), default=1)  # how many finished goods this BOM produces
    uom = Column(String(50), default="pcs")
    bom_type = Column(String(50), default="manufacture")
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)

    lines = relationship("BOMLine", back_populates="bom", cascade="all, delete-orphan")


class BOMLine(BaseModel):
    __tablename__ = "bom_line"
    bom_id = Column(String(36), ForeignKey("bom.id"), nullable=False, index=True)
    product_id = Column(String(36), nullable=True)
    product_name = Column(String(300), nullable=False)
    quantity = Column(Numeric(20, 4), default=1)
    uom = Column(String(50), default="pcs")
    notes = Column(Text, nullable=True)

    bom = relationship("BOM", back_populates="lines")


class ProductionOrder(BaseModel):
    __tablename__ = "production_order"
    number = Column(String(100), nullable=True, index=True)
    state = Column(String(30), default="draft")
    # draft | confirmed | in_progress | done | cancelled
    product_id = Column(String(36), nullable=True)
    product_name = Column(String(300), nullable=False)
    bom_id = Column(String(36), ForeignKey("bom.id"), nullable=True)
    qty_planned = Column(Numeric(20, 4), default=1)
    qty_produced = Column(Numeric(20, 4), default=0)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    date_start = Column(DateTime(timezone=True), nullable=True)
    date_finish = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    # Links to created stock moves
    finished_picking_id = Column(String(36), nullable=True)  # stock in (finished goods)
    component_picking_id = Column(String(36), nullable=True)  # stock out (components)
    # Costing
    planned_cost = Column(Numeric(20, 4), default=0)
    actual_cost = Column(Numeric(20, 4), default=0)

    bom = relationship("BOM", lazy="noload")
    lines = relationship("ProductionOrderLine", back_populates="order", cascade="all, delete-orphan")


class ProductionOrderLine(BaseModel):
    """Component lines on a production order (from BOM, can be adjusted)."""
    __tablename__ = "production_order_line"
    order_id = Column(String(36), ForeignKey("production_order.id"), nullable=False, index=True)
    product_id = Column(String(36), nullable=True)
    product_name = Column(String(300), nullable=False)
    quantity_planned = Column(Numeric(20, 4), default=1)
    quantity_consumed = Column(Numeric(20, 4), default=0)
    uom = Column(String(50), default="pcs")

    order = relationship("ProductionOrder", back_populates="lines")
