from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.core.database import BaseModel


class Account(BaseModel):
    __tablename__ = "account"
    code = Column(String(50), nullable=False, index=True)
    name = Column(String(300), nullable=False)
    account_type = Column(String(50), nullable=False)  # asset,liability,equity,income,expense
    is_active = Column(Boolean, default=True)
    internal_type = Column(String(50), nullable=True)  # receivable,payable,bank,cash,etc


class Journal(BaseModel):
    __tablename__ = "journal"
    name = Column(String(200), nullable=False)
    code = Column(String(20), nullable=False)
    journal_type = Column(String(50), nullable=False)  # sale,purchase,cash,bank,general
    default_account_id = Column(String(36), ForeignKey("account.id"), nullable=True)
    is_active = Column(Boolean, default=True)


class AccountMove(BaseModel):
    """A journal entry — the real double-entry accounting record."""
    __tablename__ = "account_move"
    name = Column(String(100), nullable=True, index=True)
    move_type = Column(String(30), nullable=False, default="entry")
    # entry | out_invoice | in_invoice | out_refund | in_refund | payment
    state = Column(String(20), nullable=False, default="draft")  # draft | posted | cancelled
    journal_id = Column(String(36), ForeignKey("journal.id"), nullable=True)
    partner_id = Column(String(36), nullable=True)
    partner_name = Column(String(300), nullable=True)
    move_date = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    currency = Column(String(10), default="USD")
    ref = Column(String(500), nullable=True)
    amount_untaxed = Column(Numeric(20, 4), default=0)
    amount_tax = Column(Numeric(20, 4), default=0)
    amount_total = Column(Numeric(20, 4), default=0)
    amount_residual = Column(Numeric(20, 4), default=0)
    payment_state = Column(String(30), default="not_paid")  # not_paid|partial|paid
    source_type = Column(String(50), nullable=True)
    source_id = Column(String(36), nullable=True)

    lines = relationship("AccountMoveLine", back_populates="move", cascade="all, delete-orphan",
                         foreign_keys="AccountMoveLine.move_id")
    invoice_lines = relationship("InvoiceLine", back_populates="move", cascade="all, delete-orphan",
                                 foreign_keys="InvoiceLine.move_id")


class AccountMoveLine(BaseModel):
    """Debit/credit line — the atomic unit of double-entry."""
    __tablename__ = "account_move_line"
    move_id = Column(String(36), ForeignKey("account_move.id"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("account.id"), nullable=False, index=True)
    account_code = Column(String(50), nullable=True)
    account_name = Column(String(300), nullable=True)
    name = Column(String(500), nullable=True)
    partner_id = Column(String(36), nullable=True)
    partner_name = Column(String(300), nullable=True)
    debit = Column(Numeric(20, 4), default=0)
    credit = Column(Numeric(20, 4), default=0)
    currency = Column(String(10), default="USD")
    reconciled = Column(Boolean, default=False)
    reconcile_id = Column(String(36), nullable=True)
    date = Column(DateTime(timezone=True), nullable=True)

    move = relationship("AccountMove", back_populates="lines", foreign_keys=[move_id])


class InvoiceLine(BaseModel):
    """Human-readable invoice line (generates move lines on posting)."""
    __tablename__ = "invoice_line"
    move_id = Column(String(36), ForeignKey("account_move.id"), nullable=False, index=True)
    product_id = Column(String(36), nullable=True)
    product_name = Column(String(300), nullable=False)
    account_id = Column(String(36), ForeignKey("account.id"), nullable=True)
    description = Column(Text, nullable=True)
    quantity = Column(Numeric(20, 4), default=1)
    unit_price = Column(Numeric(20, 4), default=0)
    discount = Column(Numeric(10, 4), default=0)
    tax_percent = Column(Numeric(10, 4), default=0)
    subtotal = Column(Numeric(20, 4), default=0)
    tax_amount = Column(Numeric(20, 4), default=0)
    total = Column(Numeric(20, 4), default=0)

    move = relationship("AccountMove", back_populates="invoice_lines", foreign_keys=[move_id])


class Tax(BaseModel):
    __tablename__ = "tax"
    name = Column(String(200), nullable=False)
    rate = Column(Numeric(10, 4), nullable=False, default=0)
    tax_type = Column(String(20), default="percent")
    include_base = Column(Boolean, default=False)
    account_id = Column(String(36), ForeignKey("account.id"), nullable=True)
    is_active = Column(Boolean, default=True)


class Payment(BaseModel):
    __tablename__ = "payment"
    number = Column(String(100), nullable=True, index=True)
    payment_type = Column(String(30), nullable=False)  # inbound | outbound
    partner_id = Column(String(36), nullable=True)
    partner_name = Column(String(300), nullable=True)
    journal_id = Column(String(36), ForeignKey("journal.id"), nullable=True)
    amount = Column(Numeric(20, 4), nullable=False, default=0)
    currency = Column(String(10), default="USD")
    payment_date = Column(DateTime(timezone=True), nullable=True)
    memo = Column(String(500), nullable=True)
    state = Column(String(30), default="draft")  # draft | posted | cancelled
    invoice_id = Column(String(36), ForeignKey("account_move.id"), nullable=True)
    move_id = Column(String(36), ForeignKey("account_move.id"), nullable=True)


# alias
Invoice = AccountMove
