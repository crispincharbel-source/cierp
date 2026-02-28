from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.core.database import BaseModel


class Customer(BaseModel):
    __tablename__ = "customer"
    name = Column(String(300), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    country = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    credit_limit = Column(Numeric(20, 4), default=0)
    # Accounting link
    receivable_account_id = Column(String(36), nullable=True)


class SaleOrder(BaseModel):
    __tablename__ = "sale_order"
    number = Column(String(100), nullable=True, index=True)
    state = Column(String(30), default="draft")
    # draft | confirmed | done | cancelled
    customer_id = Column(String(36), ForeignKey("customer.id"), nullable=True)
    customer_name = Column(String(300), nullable=True)
    order_date = Column(DateTime(timezone=True), nullable=True)
    delivery_date = Column(DateTime(timezone=True), nullable=True)
    currency = Column(String(10), default="USD")
    subtotal = Column(Numeric(20, 4), default=0)
    tax_amount = Column(Numeric(20, 4), default=0)
    total = Column(Numeric(20, 4), default=0)
    notes = Column(Text, nullable=True)
    salesperson = Column(String(200), nullable=True)
    # Links to created documents
    picking_id = Column(String(36), nullable=True)   # delivery transfer
    invoice_id = Column(String(36), nullable=True)   # customer invoice

    customer = relationship("Customer", lazy="noload")
    lines = relationship("SaleOrderLine", back_populates="order", cascade="all, delete-orphan")


class SaleOrderLine(BaseModel):
    __tablename__ = "sale_order_line"
    order_id = Column(String(36), ForeignKey("sale_order.id"), nullable=False, index=True)
    product_id = Column(String(36), nullable=True)
    product_name = Column(String(300), nullable=False)
    quantity = Column(Numeric(20, 4), default=1)
    unit_price = Column(Numeric(20, 4), default=0)
    discount = Column(Numeric(10, 4), default=0)
    tax_percent = Column(Numeric(10, 4), default=0)
    subtotal = Column(Numeric(20, 4), default=0)
    tax_amount = Column(Numeric(20, 4), default=0)
    total = Column(Numeric(20, 4), default=0)
    qty_delivered = Column(Numeric(20, 4), default=0)
    qty_invoiced = Column(Numeric(20, 4), default=0)

    order = relationship("SaleOrder", back_populates="lines")


class Lead(BaseModel):
    __tablename__ = "lead"
    title = Column(String(300), nullable=False)
    state = Column(String(30), default="new")
    # new | qualified | proposal | negotiation | won | lost
    customer_id = Column(String(36), ForeignKey("customer.id"), nullable=True)
    customer_name = Column(String(300), nullable=True)
    contact_name = Column(String(200), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    expected_revenue = Column(Numeric(20, 4), default=0)
    probability = Column(Integer, default=20)
    source = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    assigned_to = Column(String(200), nullable=True)
    expected_close = Column(DateTime(timezone=True), nullable=True)
    # Won: link to SO created
    sale_order_id = Column(String(36), nullable=True)
