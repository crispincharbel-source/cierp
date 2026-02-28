from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import BaseModel


class Product(BaseModel):
    __tablename__ = "product"
    name = Column(String(300), nullable=False)
    code = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    uom = Column(String(50), default="pcs")
    cost_price = Column(Numeric(20, 4), default=0)
    sale_price = Column(Numeric(20, 4), default=0)
    is_active = Column(Boolean, default=True)
    track_inventory = Column(Boolean, default=True)
    # DO NOT store qty here — computed from moves via service
    # kept for quick reads / dashboard only, updated by service
    qty_on_hand = Column(Numeric(20, 4), default=0)
    qty_reserved = Column(Numeric(20, 4), default=0)
    reorder_point = Column(Numeric(20, 4), default=0)
    # Accounting links
    income_account_id = Column(String(36), nullable=True)
    expense_account_id = Column(String(36), nullable=True)


class StockLocation(BaseModel):
    __tablename__ = "stock_location"
    name = Column(String(200), nullable=False)
    complete_name = Column(String(500), nullable=True)
    location_type = Column(String(50), nullable=False, default="internal")
    # internal | customer | vendor | transit | virtual
    parent_id = Column(String(36), ForeignKey("stock_location.id"), nullable=True)
    is_active = Column(Boolean, default=True)


class Warehouse(BaseModel):
    __tablename__ = "warehouse"
    name = Column(String(200), nullable=False)
    code = Column(String(20), nullable=False)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    # Location ids
    lot_stock_location_id = Column(String(36), ForeignKey("stock_location.id"), nullable=True)
    input_location_id = Column(String(36), ForeignKey("stock_location.id"), nullable=True)
    output_location_id = Column(String(36), ForeignKey("stock_location.id"), nullable=True)


class StockPicking(BaseModel):
    """A transfer document (groups moves)."""
    __tablename__ = "stock_picking"
    name = Column(String(100), nullable=True, index=True)
    picking_type = Column(String(50), nullable=False, default="outgoing")
    # incoming | outgoing | internal | return
    state = Column(String(30), default="draft")
    # draft | confirmed | assigned | done | cancelled
    origin = Column(String(200), nullable=True)  # source document ref
    source_type = Column(String(50), nullable=True)  # sale_order | purchase_order | mrp
    source_id = Column(String(36), nullable=True)
    partner_id = Column(String(36), nullable=True)
    partner_name = Column(String(300), nullable=True)
    location_id = Column(String(36), ForeignKey("stock_location.id"), nullable=True)
    location_dest_id = Column(String(36), ForeignKey("stock_location.id"), nullable=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    date_done = Column(DateTime(timezone=True), nullable=True)
    note = Column(Text, nullable=True)

    moves = relationship("StockMove", back_populates="picking", cascade="all, delete-orphan")


class StockMove(BaseModel):
    __tablename__ = "stock_move"
    picking_id = Column(String(36), ForeignKey("stock_picking.id"), nullable=True, index=True)
    move_type = Column(String(50), nullable=False)  # in | out | transfer | adjustment
    state = Column(String(30), default="draft")   # draft | confirmed | done | cancelled
    product_id = Column(String(36), ForeignKey("product.id"), nullable=False, index=True)
    product_name = Column(String(300), nullable=True)
    location_id = Column(String(36), ForeignKey("stock_location.id"), nullable=True)
    location_dest_id = Column(String(36), ForeignKey("stock_location.id"), nullable=True)
    warehouse_id = Column(String(36), ForeignKey("warehouse.id"), nullable=True)
    quantity = Column(Numeric(20, 4), nullable=False)
    qty_done = Column(Numeric(20, 4), default=0)
    uom = Column(String(50), default="pcs")
    reference = Column(String(200), nullable=True)
    origin = Column(String(200), nullable=True)
    source_type = Column(String(50), nullable=True)
    source_id = Column(String(36), nullable=True)
    notes = Column(Text, nullable=True)
    move_date = Column(DateTime(timezone=True), nullable=True)
    # Cost
    unit_cost = Column(Numeric(20, 4), default=0)
    valuation_amount = Column(Numeric(20, 4), default=0)

    product = relationship("Product", lazy="noload")
    picking = relationship("StockPicking", back_populates="moves")


class StockQuant(BaseModel):
    """On-hand stock per product per location."""
    __tablename__ = "stock_quant"
    product_id = Column(String(36), ForeignKey("product.id"), nullable=False, index=True)
    location_id = Column(String(36), ForeignKey("stock_location.id"), nullable=False, index=True)
    quantity = Column(Numeric(20, 4), default=0)
    reserved_quantity = Column(Numeric(20, 4), default=0)

    product = relationship("Product", lazy="noload")
