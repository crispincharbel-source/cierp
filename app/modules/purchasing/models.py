from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import BaseModel


class Supplier(BaseModel):
    __tablename__ = "supplier"
    name = Column(String(300), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    country = Column(String(100), nullable=True)
    payment_terms = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    payable_account_id = Column(String(36), nullable=True)


class PurchaseOrder(BaseModel):
    __tablename__ = "purchase_order"
    number = Column(String(100), nullable=True, index=True)
    state = Column(String(30), default="draft")
    # draft | sent | confirmed | received | billed | cancelled
    supplier_id = Column(String(36), ForeignKey("supplier.id"), nullable=True)
    supplier_name = Column(String(300), nullable=True)
    order_date = Column(DateTime(timezone=True), nullable=True)
    expected_date = Column(DateTime(timezone=True), nullable=True)
    currency = Column(String(10), default="USD")
    subtotal = Column(Numeric(20, 4), default=0)
    tax_amount = Column(Numeric(20, 4), default=0)
    total = Column(Numeric(20, 4), default=0)
    notes = Column(Text, nullable=True)
    # Links to created documents
    picking_id = Column(String(36), nullable=True)   # receipt transfer
    invoice_id = Column(String(36), nullable=True)   # vendor bill

    supplier = relationship("Supplier", lazy="noload")
    lines = relationship("PurchaseOrderLine", back_populates="order", cascade="all, delete-orphan")


class PurchaseOrderLine(BaseModel):
    __tablename__ = "purchase_order_line"
    order_id = Column(String(36), ForeignKey("purchase_order.id"), nullable=False, index=True)
    product_id = Column(String(36), nullable=True)
    product_name = Column(String(300), nullable=False)
    quantity = Column(Numeric(20, 4), default=1)
    unit_price = Column(Numeric(20, 4), default=0)
    tax_percent = Column(Numeric(10, 4), default=0)
    subtotal = Column(Numeric(20, 4), default=0)
    tax_amount = Column(Numeric(20, 4), default=0)
    total = Column(Numeric(20, 4), default=0)
    qty_received = Column(Numeric(20, 4), default=0)
    qty_billed = Column(Numeric(20, 4), default=0)

    order = relationship("PurchaseOrder", back_populates="lines")
