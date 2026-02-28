# CRM models - Lead pipeline is in sales/models.py
# This module handles activities and contacts

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from app.core.database import BaseModel


class Activity(BaseModel):
    __tablename__ = "activity"
    activity_type = Column(String(50), nullable=False)  # call, email, meeting, task
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=True)
    related_model = Column(String(100), nullable=True)  # lead, customer, etc.
    related_id = Column(String(36), nullable=True)
    assigned_to = Column(String(200), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    done_date = Column(DateTime(timezone=True), nullable=True)
    state = Column(String(30), default="planned")  # planned, done, cancelled
