"""
Lebanese Payroll Service — NSSF, income tax brackets, end-of-service calculations.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, date
from app.modules.payroll.models import PayrollEntry, PayrollConfig, EndOfServiceCalculation
from app.modules.hr.models import Employee


# ─── Lebanese Income Tax Brackets (Annual LBP) ───────────────────
# Source: Lebanese Ministry of Finance 2024 schedule
# Tax is applied to the ANNUAL gross in LBP converted
LEBANESE_TAX_BRACKETS = [
    # (up_to_annual_lbp, rate_percent)
    (18_000_000,  2.0),
    (45_000_000,  4.0),
    (90_000_000,  7.0),
    (180_000_000, 11.0),
    (360_000_000, 15.0),
    (720_000_000, 20.0),
    (float("inf"), 25.0),  # Above 720M LBP annual
]

NSSF_EMPLOYEE_RATE = Decimal("0.02")        # 2%
NSSF_HEALTH_RATE = Decimal("0.215")         # 21.5%
NSSF_FAMILY_RATE = Decimal("0.06")          # 6%
NSSF_END_SERVICE_RATE = Decimal("0.085")    # 8.5%


def d(val) -> Decimal:
    """Safe decimal conversion."""
    try:
        return Decimal(str(val or 0))
    except Exception:
        return Decimal("0")


def calculate_lebanese_income_tax(annual_gross_lbp: Decimal) -> Decimal:
    """
    Progressive Lebanese income tax on annual gross salary (in LBP).
    Returns annual tax amount in LBP.
    """
    tax = Decimal("0")
    prev = Decimal("0")
    for upper, rate in LEBANESE_TAX_BRACKETS:
        upper_d = Decimal(str(upper))
        if annual_gross_lbp <= prev:
            break
        taxable_in_bracket = min(annual_gross_lbp, upper_d) - prev
        tax += taxable_in_bracket * Decimal(str(rate)) / Decimal("100")
        prev = upper_d
    return tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def compute_payroll(
    basic_salary: float,
    cost_of_living: float = 0,
    transport_allowance: float = 0,
    housing_allowance: float = 0,
    meal_allowance: float = 0,
    phone_allowance: float = 0,
    overtime_amount: float = 0,
    bonus: float = 0,
    other_allowances: float = 0,
    absence_deduction: float = 0,
    advance_deduction: float = 0,
    other_deductions: float = 0,
    currency: str = "USD",
    usd_to_lbp_rate: float = 89500,
    working_days: int = 22,
    absent_days: int = 0,
) -> Dict[str, Any]:
    """
    Full Lebanese payroll computation.
    Returns a dict of all payroll line items ready to store in PayrollEntry.
    """
    # Convert to Decimal
    basic = d(basic_salary)
    cola = d(cost_of_living)
    transport = d(transport_allowance)
    housing = d(housing_allowance)
    meal = d(meal_allowance)
    phone = d(phone_allowance)
    overtime = d(overtime_amount)
    bns = d(bonus)
    other_allow = d(other_allowances)
    absence_ded = d(absence_deduction)
    advance_ded = d(advance_deduction)
    other_ded = d(other_deductions)
    rate = d(usd_to_lbp_rate)

    # Gross pay
    gross = basic + cola + transport + housing + meal + phone + overtime + bns + other_allow
    gross = gross - absence_ded  # absence reduces gross

    # NSSF Employee (2% on basic + COLA, capped at certain gross)
    nssf_base = basic + cola
    nssf_employee = (nssf_base * NSSF_EMPLOYEE_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Income tax (convert gross to LBP, compute annual bracket tax, monthly portion)
    gross_lbp = gross * rate if currency == "USD" else gross
    annual_gross_lbp = gross_lbp * 12
    annual_tax_lbp = calculate_lebanese_income_tax(annual_gross_lbp)
    monthly_tax_lbp = (annual_tax_lbp / 12).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    # Convert back to salary currency
    if currency == "USD":
        income_tax = (monthly_tax_lbp / rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    else:
        income_tax = monthly_tax_lbp

    # Total deductions
    total_deductions = nssf_employee + income_tax + advance_ded + other_ded

    # Employer NSSF contributions
    nssf_employer_health = (nssf_base * NSSF_HEALTH_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    nssf_employer_family = (basic * NSSF_FAMILY_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    nssf_end_service = (basic * NSSF_END_SERVICE_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total_employer = nssf_employer_health + nssf_employer_family + nssf_end_service

    # Net pay
    net_pay = gross - total_deductions

    return {
        "gross_pay": float(gross),
        "nssf_employee": float(nssf_employee),
        "income_tax": float(income_tax),
        "absence_deduction": float(absence_ded),
        "advance_deduction": float(advance_ded),
        "other_deductions": float(other_ded),
        "total_deductions": float(total_deductions),
        "nssf_employer_health": float(nssf_employer_health),
        "nssf_employer_family": float(nssf_employer_family),
        "nssf_employer_end_service": float(nssf_end_service),
        "total_employer_contribution": float(total_employer),
        "net_pay": float(net_pay),
    }


def compute_end_of_service(
    last_basic_salary: float,
    hire_date: Optional[date],
    termination_date: Optional[date],
    nssf_accumulated: float = 0,
) -> Dict[str, Any]:
    """
    Lebanese End of Service Indemnity.
    1 month salary per year of service (Lebanese Labour Law Art. 54).
    """
    if not hire_date or not termination_date:
        return {"years_of_service": 0, "indemnity_amount": 0, "total_payout": 0}

    if isinstance(hire_date, datetime):
        hire_date = hire_date.date()
    if isinstance(termination_date, datetime):
        termination_date = termination_date.date()

    delta = termination_date - hire_date
    years = Decimal(str(delta.days)) / Decimal("365.25")
    years = years.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    basic = d(last_basic_salary)
    indemnity = (basic * years).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    nssf_acc = d(nssf_accumulated)
    total_payout = (indemnity + nssf_acc).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "years_of_service": float(years),
        "indemnity_amount": float(indemnity),
        "nssf_end_service_accumulated": float(nssf_acc),
        "total_payout": float(total_payout),
    }
