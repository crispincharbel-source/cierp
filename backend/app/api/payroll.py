"""
Lebanese Payroll API Router — full CRUD + payslip computation + PDF export.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel as Schema
from typing import Optional, List
from datetime import datetime
import io

from app.core.database import get_db
from app.core.deps import require_auth
from app.modules.identity.models import User
from app.modules.identity.permissions import require_permission
from app.modules.payroll.models import PayrollEntry, PayrollBatch, EmployeeAdvance, EndOfServiceCalculation
from app.modules.hr.models import Employee
from app.modules.payroll.service import compute_payroll, compute_end_of_service

router = APIRouter(prefix="/payroll", tags=["Payroll"])


def row_to_dict(obj) -> dict:
    d = {}
    for c in obj.__table__.columns:
        v = getattr(obj, c.name)
        if hasattr(v, "isoformat"):
            v = v.isoformat()
        elif hasattr(v, "__float__"):
            try:
                v = float(v)
            except Exception:
                pass
        d[c.name] = v
    return d


# ─── Schemas ──────────────────────────────────────────────────────

class PayrollEntryCreate(Schema):
    employee_id: str
    period_year: int
    period_month: int
    basic_salary: float = 0
    cost_of_living: float = 0
    transport_allowance: float = 0
    housing_allowance: float = 0
    meal_allowance: float = 0
    phone_allowance: float = 0
    overtime_amount: float = 0
    bonus: float = 0
    other_allowances: float = 0
    absence_deduction: float = 0
    advance_deduction: float = 0
    other_deductions: float = 0
    currency: str = "USD"
    usd_to_lbp_rate: float = 89500
    working_days: int = 22
    absent_days: int = 0
    overtime_hours: float = 0
    notes: Optional[str] = None
    bank_account: Optional[str] = None


class PayrollEntryUpdate(Schema):
    bonus: Optional[float] = None
    other_allowances: Optional[float] = None
    other_deductions: Optional[float] = None
    advance_deduction: Optional[float] = None
    notes: Optional[str] = None
    state: Optional[str] = None


class AdvanceCreate(Schema):
    employee_id: str
    amount: float
    currency: str = "USD"
    reason: Optional[str] = None
    monthly_recovery: float = 0


class EndServiceCreate(Schema):
    employee_id: str
    termination_date: str
    termination_reason: str = "resignation"
    nssf_accumulated: float = 0
    notes: Optional[str] = None


# ─── Payroll Entries ──────────────────────────────────────────────

@router.get("/entries")
async def list_entries(
    year: Optional[int] = None,
    month: Optional[int] = None,
    employee_id: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    q = select(PayrollEntry).where(PayrollEntry.is_deleted == False, PayrollEntry.tenant_id == user.tenant_id)
    if year:
        q = q.where(PayrollEntry.period_year == year)
    if month:
        q = q.where(PayrollEntry.period_month == month)
    if employee_id:
        q = q.where(PayrollEntry.employee_id == employee_id)
    if state:
        q = q.where(PayrollEntry.state == state)
    q = q.order_by(PayrollEntry.period_year.desc(), PayrollEntry.period_month.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return {"entries": [row_to_dict(r) for r in result.scalars().all()]}


@router.post("/entries")
async def create_entry(
    data: PayrollEntryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
    _p: User = Depends(require_permission("payroll.process")),
):
    # Verify employee exists
    emp = (await db.execute(select(Employee).where(Employee.id == data.employee_id))).scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check duplicate
    existing = (await db.execute(
        select(PayrollEntry).where(
            PayrollEntry.employee_id == data.employee_id,
            PayrollEntry.period_year == data.period_year,
            PayrollEntry.period_month == data.period_month,
            PayrollEntry.is_deleted == False,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Payroll entry already exists for this period")

    # Compute
    computed = compute_payroll(
        basic_salary=data.basic_salary,
        cost_of_living=data.cost_of_living,
        transport_allowance=data.transport_allowance,
        housing_allowance=data.housing_allowance,
        meal_allowance=data.meal_allowance,
        phone_allowance=data.phone_allowance,
        overtime_amount=data.overtime_amount,
        bonus=data.bonus,
        other_allowances=data.other_allowances,
        absence_deduction=data.absence_deduction,
        advance_deduction=data.advance_deduction,
        other_deductions=data.other_deductions,
        currency=data.currency,
        usd_to_lbp_rate=data.usd_to_lbp_rate,
        working_days=data.working_days,
        absent_days=data.absent_days,
    )

    import calendar
    month_name = calendar.month_name[data.period_month]
    entry = PayrollEntry(
        tenant_id=user.tenant_id,
        employee_id=data.employee_id,
        employee_name=emp.full_name,
        period_year=data.period_year,
        period_month=data.period_month,
        period_label=f"{month_name} {data.period_year}",
        basic_salary=data.basic_salary,
        cost_of_living=data.cost_of_living,
        transport_allowance=data.transport_allowance,
        housing_allowance=data.housing_allowance,
        meal_allowance=data.meal_allowance,
        phone_allowance=data.phone_allowance,
        overtime_amount=data.overtime_amount,
        bonus=data.bonus,
        other_allowances=data.other_allowances,
        absence_deduction=data.absence_deduction,
        advance_deduction=data.advance_deduction,
        other_deductions=data.other_deductions,
        currency=data.currency,
        working_days=data.working_days,
        absent_days=data.absent_days,
        overtime_hours=data.overtime_hours,
        notes=data.notes,
        bank_account=data.bank_account,
        **computed,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"entry": row_to_dict(entry)}


@router.get("/entries/{entry_id}")
async def get_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    entry = (await db.execute(
        select(PayrollEntry).where(PayrollEntry.id == entry_id, PayrollEntry.is_deleted == False)
    )).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"entry": row_to_dict(entry)}


@router.patch("/entries/{entry_id}/confirm")
async def confirm_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
    _p: User = Depends(require_permission("payroll.process")),
):
    entry = (await db.execute(
        select(PayrollEntry).where(PayrollEntry.id == entry_id, PayrollEntry.is_deleted == False)
    )).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if entry.state != "draft":
        raise HTTPException(status_code=400, detail="Only draft entries can be confirmed")
    entry.state = "confirmed"
    await db.commit()
    return {"ok": True, "state": "confirmed"}


@router.patch("/entries/{entry_id}/mark-paid")
async def mark_paid(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    entry = (await db.execute(
        select(PayrollEntry).where(PayrollEntry.id == entry_id, PayrollEntry.is_deleted == False)
    )).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.state = "paid"
    entry.payment_date = datetime.utcnow()
    await db.commit()
    return {"ok": True, "state": "paid"}


# ─── Advances ─────────────────────────────────────────────────────

@router.get("/advances")
async def list_advances(
    employee_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    q = select(EmployeeAdvance).where(EmployeeAdvance.is_deleted == False, EmployeeAdvance.tenant_id == user.tenant_id)
    if employee_id:
        q = q.where(EmployeeAdvance.employee_id == employee_id)
    result = await db.execute(q)
    return {"advances": [row_to_dict(r) for r in result.scalars().all()]}


@router.post("/advances")
async def create_advance(
    data: AdvanceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    emp = (await db.execute(select(Employee).where(Employee.id == data.employee_id))).scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    advance = EmployeeAdvance(
        tenant_id=user.tenant_id,
        employee_id=data.employee_id,
        employee_name=emp.full_name,
        amount=data.amount,
        currency=data.currency,
        reason=data.reason,
        monthly_recovery=data.monthly_recovery,
    )
    db.add(advance)
    await db.commit()
    await db.refresh(advance)
    return {"advance": row_to_dict(advance)}


# ─── End of Service ───────────────────────────────────────────────

@router.post("/end-of-service")
async def compute_eos(
    data: EndServiceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    emp = (await db.execute(select(Employee).where(Employee.id == data.employee_id))).scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    termination_date = datetime.strptime(data.termination_date, "%Y-%m-%d").date()
    computed = compute_end_of_service(
        last_basic_salary=float(emp.salary or 0),
        hire_date=emp.hire_date,
        termination_date=termination_date,
        nssf_accumulated=data.nssf_accumulated,
    )
    eos = EndOfServiceCalculation(
        tenant_id=user.tenant_id,
        employee_id=data.employee_id,
        employee_name=emp.full_name,
        hire_date=emp.hire_date,
        termination_date=datetime.strptime(data.termination_date, "%Y-%m-%d"),
        last_basic_salary=float(emp.salary or 0),
        termination_reason=data.termination_reason,
        notes=data.notes,
        **computed,
    )
    db.add(eos)
    await db.commit()
    await db.refresh(eos)
    return {"end_of_service": row_to_dict(eos)}


# ─── Summary / Reports ────────────────────────────────────────────

@router.get("/summary")
async def payroll_summary(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    result = await db.execute(
        select(
            func.count(PayrollEntry.id).label("count"),
            func.sum(PayrollEntry.gross_pay).label("total_gross"),
            func.sum(PayrollEntry.net_pay).label("total_net"),
            func.sum(PayrollEntry.nssf_employee).label("total_nssf_employee"),
            func.sum(PayrollEntry.total_employer_contribution).label("total_employer"),
            func.sum(PayrollEntry.income_tax).label("total_income_tax"),
        ).where(
            PayrollEntry.period_year == year,
            PayrollEntry.period_month == month,
            PayrollEntry.is_deleted == False,
            PayrollEntry.tenant_id == user.tenant_id,
        )
    )
    row = result.one()
    return {
        "year": year,
        "month": month,
        "employee_count": row.count or 0,
        "total_gross": float(row.total_gross or 0),
        "total_net": float(row.total_net or 0),
        "total_nssf_employee": float(row.total_nssf_employee or 0),
        "total_employer_contribution": float(row.total_employer or 0),
        "total_income_tax": float(row.total_income_tax or 0),
    }
