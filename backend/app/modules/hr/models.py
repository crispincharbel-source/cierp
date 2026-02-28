from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from app.core.database import BaseModel


class Department(BaseModel):
    __tablename__ = "department"
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=True)
    manager_name = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)


class Employee(BaseModel):
    __tablename__ = "employee"
    employee_number = Column(String(50), nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    department_id = Column(String(36), ForeignKey("department.id"), nullable=True)
    job_title = Column(String(200), nullable=True)
    hire_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(30), default="active")  # active, on_leave, terminated
    salary = Column(Numeric(20, 4), default=0)
    currency = Column(String(10), default="USD")
    national_id = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    gender = Column(String(20), nullable=True)
    birth_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    department = relationship("Department", lazy="noload")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class LeaveRequest(BaseModel):
    __tablename__ = "leave_request"
    employee_id = Column(String(36), ForeignKey("employee.id"), nullable=False)
    employee_name = Column(String(200), nullable=True)
    leave_type = Column(String(50), nullable=False)  # annual, sick, unpaid, other
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    days = Column(Numeric(5, 1), default=1)
    state = Column(String(30), default="pending")  # pending, approved, rejected
    reason = Column(Text, nullable=True)
    approved_by = Column(String(200), nullable=True)

    employee = relationship("Employee", lazy="noload")


class Payslip(BaseModel):
    __tablename__ = "payslip"
    employee_id = Column(String(36), ForeignKey("employee.id"), nullable=False)
    employee_name = Column(String(200), nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    basic_salary = Column(Numeric(20, 4), default=0)
    allowances = Column(Numeric(20, 4), default=0)
    deductions = Column(Numeric(20, 4), default=0)
    tax = Column(Numeric(20, 4), default=0)
    net_pay = Column(Numeric(20, 4), default=0)
    currency = Column(String(10), default="USD")
    state = Column(String(30), default="draft")  # draft, confirmed, paid
    notes = Column(Text, nullable=True)

    employee = relationship("Employee", lazy="noload")
