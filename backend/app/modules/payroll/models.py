"""
Lebanese Payroll Module - Full compliance with Lebanese labor law.
Handles NSSF, income tax brackets, transportation allowance, etc.
"""
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Text, Integer, JSON
from sqlalchemy.orm import relationship
from app.core.database import BaseModel


class PayrollConfig(BaseModel):
    """Company-level payroll settings for Lebanese labor law compliance."""
    __tablename__ = "payroll_config"
    # NSSF Rates (2024 Lebanese rates)
    nssf_employee_rate = Column(Numeric(8, 4), default=2.0)       # Employee: 2%
    nssf_employer_health_rate = Column(Numeric(8, 4), default=21.5)  # Employer health: 21.5%
    nssf_employer_family_rate = Column(Numeric(8, 4), default=6.0)   # Family allocation: 6%
    nssf_employer_end_service_rate = Column(Numeric(8, 4), default=8.5) # End of service: 8.5%
    # Transportation
    daily_transport_allowance = Column(Numeric(12, 4), default=32000)  # LBP
    max_transport_allowance_days = Column(Integer, default=22)
    # Income Tax (Lebanese brackets applied in LBP)
    currency = Column(String(10), default="LBP")
    exchange_rate_usd = Column(Numeric(16, 4), default=89500)  # Official rate
    # Seniority increment percent per year
    seniority_increment_rate = Column(Numeric(8, 4), default=3.0)
    notes = Column(Text, nullable=True)


class SalaryStructure(BaseModel):
    """Salary structure / template for a category of employees."""
    __tablename__ = "salary_structure"
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=True)
    currency = Column(String(10), default="USD")
    basic_ratio = Column(Numeric(8, 4), default=100.0)  # % of gross that is basic
    is_active = Column(Boolean, default=True)


class PayrollEntry(BaseModel):
    """A single payroll calculation for one employee for one period."""
    __tablename__ = "payroll_entry"
    employee_id = Column(String(36), ForeignKey("employee.id"), nullable=False, index=True)
    employee_name = Column(String(200), nullable=True)
    department_id = Column(String(36), nullable=True)
    period_year = Column(Integer, nullable=False)
    period_month = Column(Integer, nullable=False)   # 1-12
    period_label = Column(String(50), nullable=True)  # e.g. "January 2025"
    # Earnings
    basic_salary = Column(Numeric(20, 4), default=0)
    cost_of_living = Column(Numeric(20, 4), default=0)      # Lebanese COLA
    transport_allowance = Column(Numeric(20, 4), default=0)
    housing_allowance = Column(Numeric(20, 4), default=0)
    meal_allowance = Column(Numeric(20, 4), default=0)
    phone_allowance = Column(Numeric(20, 4), default=0)
    overtime_amount = Column(Numeric(20, 4), default=0)
    bonus = Column(Numeric(20, 4), default=0)
    other_allowances = Column(Numeric(20, 4), default=0)
    gross_pay = Column(Numeric(20, 4), default=0)
    # Deductions
    nssf_employee = Column(Numeric(20, 4), default=0)       # 2% NSSF
    income_tax = Column(Numeric(20, 4), default=0)          # Lebanese bracket tax
    absence_deduction = Column(Numeric(20, 4), default=0)
    advance_deduction = Column(Numeric(20, 4), default=0)
    other_deductions = Column(Numeric(20, 4), default=0)
    total_deductions = Column(Numeric(20, 4), default=0)
    # Employer contributions
    nssf_employer_health = Column(Numeric(20, 4), default=0)
    nssf_employer_family = Column(Numeric(20, 4), default=0)
    nssf_employer_end_service = Column(Numeric(20, 4), default=0)
    total_employer_contribution = Column(Numeric(20, 4), default=0)
    # Net
    net_pay = Column(Numeric(20, 4), default=0)
    currency = Column(String(10), default="USD")
    working_days = Column(Integer, default=22)
    absent_days = Column(Integer, default=0)
    overtime_hours = Column(Numeric(8, 2), default=0)
    state = Column(String(30), default="draft")  # draft | confirmed | paid
    payment_date = Column(DateTime(timezone=True), nullable=True)
    bank_account = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    employee = relationship("Employee", lazy="noload")


class PayrollBatch(BaseModel):
    """Group of payroll entries processed together."""
    __tablename__ = "payroll_batch"
    name = Column(String(200), nullable=False)
    period_year = Column(Integer, nullable=False)
    period_month = Column(Integer, nullable=False)
    state = Column(String(30), default="draft")  # draft | confirmed | paid | cancelled
    total_gross = Column(Numeric(20, 4), default=0)
    total_net = Column(Numeric(20, 4), default=0)
    total_nssf_employee = Column(Numeric(20, 4), default=0)
    total_nssf_employer = Column(Numeric(20, 4), default=0)
    total_income_tax = Column(Numeric(20, 4), default=0)
    employee_count = Column(Integer, default=0)
    currency = Column(String(10), default="USD")
    notes = Column(Text, nullable=True)
    created_by = Column(String(200), nullable=True)
    confirmed_by = Column(String(200), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)


class EmployeeAdvance(BaseModel):
    """Salary advance tracking."""
    __tablename__ = "employee_advance"
    employee_id = Column(String(36), ForeignKey("employee.id"), nullable=False, index=True)
    employee_name = Column(String(200), nullable=True)
    amount = Column(Numeric(20, 4), nullable=False)
    currency = Column(String(10), default="USD")
    advance_date = Column(DateTime(timezone=True), nullable=True)
    reason = Column(Text, nullable=True)
    state = Column(String(30), default="pending")  # pending | approved | recovered
    recovered_amount = Column(Numeric(20, 4), default=0)
    monthly_recovery = Column(Numeric(20, 4), default=0)
    approved_by = Column(String(200), nullable=True)

    employee = relationship("Employee", lazy="noload")


class EndOfServiceCalculation(BaseModel):
    """Lebanese End of Service / Indemnity calculation per employee."""
    __tablename__ = "end_of_service"
    employee_id = Column(String(36), ForeignKey("employee.id"), nullable=False, index=True)
    employee_name = Column(String(200), nullable=True)
    hire_date = Column(DateTime(timezone=True), nullable=True)
    termination_date = Column(DateTime(timezone=True), nullable=True)
    years_of_service = Column(Numeric(8, 2), default=0)
    last_basic_salary = Column(Numeric(20, 4), default=0)
    indemnity_amount = Column(Numeric(20, 4), default=0)  # = last salary * years
    nssf_end_service_accumulated = Column(Numeric(20, 4), default=0)
    total_payout = Column(Numeric(20, 4), default=0)
    currency = Column(String(10), default="USD")
    termination_reason = Column(String(100), nullable=True)
    # resignation | mutual | dismissal | end_contract
    state = Column(String(30), default="draft")
    notes = Column(Text, nullable=True)

    employee = relationship("Employee", lazy="noload")
