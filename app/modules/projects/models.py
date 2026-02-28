from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.core.database import BaseModel


class Project(BaseModel):
    __tablename__ = "project"
    name = Column(String(300), nullable=False)
    code = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    state = Column(String(30), default="active")
    # planning, active, on_hold, completed, cancelled
    customer_name = Column(String(300), nullable=True)
    manager_name = Column(String(200), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    budget = Column(Numeric(20, 4), default=0)
    progress = Column(Integer, default=0)

    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Task(BaseModel):
    __tablename__ = "task"
    project_id = Column(String(36), ForeignKey("project.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    state = Column(String(30), default="todo")
    # todo, in_progress, review, done, cancelled
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    assigned_to = Column(String(200), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    done_date = Column(DateTime(timezone=True), nullable=True)
    estimated_hours = Column(Numeric(10, 2), default=0)
    actual_hours = Column(Numeric(10, 2), default=0)

    project = relationship("Project", back_populates="tasks", lazy="noload")
