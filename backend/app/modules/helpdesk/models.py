from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.core.database import BaseModel


class HelpdeskTicket(BaseModel):
    __tablename__ = "helpdesk_ticket"
    number = Column(String(50), nullable=True, index=True)
    subject = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    state = Column(String(30), default="new")
    # new, open, pending, resolved, closed
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    category = Column(String(100), nullable=True)
    customer_name = Column(String(300), nullable=True)
    customer_email = Column(String(255), nullable=True)
    assigned_to = Column(String(200), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    sla_deadline = Column(DateTime(timezone=True), nullable=True)
    rating = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    replies = relationship("TicketReply", back_populates="ticket", cascade="all, delete-orphan")


class TicketReply(BaseModel):
    __tablename__ = "ticket_reply"
    ticket_id = Column(String(36), ForeignKey("helpdesk_ticket.id"), nullable=False)
    author = Column(String(200), nullable=True)
    body = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)

    ticket = relationship("HelpdeskTicket", back_populates="replies")
