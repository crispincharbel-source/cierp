"""
Accounting workflow service — double-entry posting engine.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from decimal import Decimal
import uuid

from app.modules.accounting.models import (
    Account, AccountMove, AccountMoveLine, InvoiceLine, Payment, Journal
)


async def get_or_create_account(db: AsyncSession, tenant_id: str, code: str,
                                  name: str, account_type: str, internal_type: str = None) -> Account:
    r = await db.execute(select(Account).where(Account.tenant_id == tenant_id, Account.code == code))
    acc = r.scalar_one_or_none()
    if not acc:
        acc = Account(tenant_id=tenant_id, code=code, name=name,
                      account_type=account_type, internal_type=internal_type)
        db.add(acc)
        await db.flush()
    return acc


async def post_invoice(db: AsyncSession, move: AccountMove, tenant_id: str) -> AccountMove:
    """
    Post an invoice: compute totals from lines, create double-entry move lines.
    out_invoice: DR Accounts Receivable / CR Revenue + Tax Payable
    in_invoice:  DR Expense + Tax Receivable / CR Accounts Payable
    """
    if move.state != "draft":
        raise ValueError(f"Cannot post invoice in state '{move.state}'")

    lines = (await db.execute(
        select(InvoiceLine).where(InvoiceLine.move_id == move.id)
    )).scalars().all()

    if not lines:
        raise ValueError("Cannot post invoice with no lines")

    # Recalculate totals
    subtotal = Decimal("0")
    tax_total = Decimal("0")
    for line in lines:
        qty = Decimal(str(line.quantity or 0))
        price = Decimal(str(line.unit_price or 0))
        disc = Decimal(str(line.discount or 0))
        tax_pct = Decimal(str(line.tax_percent or 0))
        line_sub = qty * price * (1 - disc / 100)
        line_tax = line_sub * tax_pct / 100
        line.subtotal = line_sub
        line.tax_amount = line_tax
        line.total = line_sub + line_tax
        subtotal += line_sub
        tax_total += line_tax

    total = subtotal + tax_total
    move.amount_untaxed = subtotal
    move.amount_tax = tax_total
    move.amount_total = total
    move.amount_residual = total

    # Generate sequence number
    if not move.name:
        prefix = "SINV" if move.move_type == "out_invoice" else "PINV"
        seq = (await db.execute(
            select(func.count()).where(AccountMove.tenant_id == tenant_id,
                                       AccountMove.move_type == move.move_type)
        )).scalar() or 0
        move.name = f"{prefix}-{datetime.now().year}-{str(seq + 1).zfill(4)}"

    # Get/create required accounts
    if move.move_type == "out_invoice":
        partner_account = await get_or_create_account(
            db, tenant_id, "1200", "Accounts Receivable", "asset", "receivable"
        )
        revenue_account = await get_or_create_account(
            db, tenant_id, "4000", "Sales Revenue", "income"
        )
        tax_account = await get_or_create_account(
            db, tenant_id, "2200", "Sales Tax Payable", "liability"
        ) if tax_total > 0 else None
    else:  # in_invoice
        partner_account = await get_or_create_account(
            db, tenant_id, "2100", "Accounts Payable", "liability", "payable"
        )
        revenue_account = await get_or_create_account(
            db, tenant_id, "5000", "Cost of Goods / Expenses", "expense"
        )
        tax_account = await get_or_create_account(
            db, tenant_id, "1300", "Tax Receivable", "asset"
        ) if tax_total > 0 else None

    now = datetime.now(timezone.utc)
    move_date = move.move_date or now

    # Clear any existing draft move lines
    existing = (await db.execute(
        select(AccountMoveLine).where(AccountMoveLine.move_id == move.id)
    )).scalars().all()
    for ml in existing:
        await db.delete(ml)
    await db.flush()

    move_lines = []

    if move.move_type == "out_invoice":
        # DR Receivable (total)
        move_lines.append(AccountMoveLine(
            tenant_id=tenant_id, move_id=move.id,
            account_id=partner_account.id,
            account_code=partner_account.code,
            account_name=partner_account.name,
            name=move.name, partner_id=move.partner_id,
            partner_name=move.partner_name,
            debit=float(total), credit=0, date=move_date
        ))
        # CR Revenue (subtotal)
        move_lines.append(AccountMoveLine(
            tenant_id=tenant_id, move_id=move.id,
            account_id=revenue_account.id,
            account_code=revenue_account.code,
            account_name=revenue_account.name,
            name=move.name,
            debit=0, credit=float(subtotal), date=move_date
        ))
        # CR Tax Payable
        if tax_total > 0 and tax_account:
            move_lines.append(AccountMoveLine(
                tenant_id=tenant_id, move_id=move.id,
                account_id=tax_account.id,
                account_code=tax_account.code,
                account_name=tax_account.name,
                name=f"Tax - {move.name}",
                debit=0, credit=float(tax_total), date=move_date
            ))
    else:  # in_invoice
        # DR Expense (subtotal)
        move_lines.append(AccountMoveLine(
            tenant_id=tenant_id, move_id=move.id,
            account_id=revenue_account.id,
            account_code=revenue_account.code,
            account_name=revenue_account.name,
            name=move.name,
            debit=float(subtotal), credit=0, date=move_date
        ))
        # DR Tax Receivable
        if tax_total > 0 and tax_account:
            move_lines.append(AccountMoveLine(
                tenant_id=tenant_id, move_id=move.id,
                account_id=tax_account.id,
                account_code=tax_account.code,
                account_name=tax_account.name,
                name=f"Tax - {move.name}",
                debit=float(tax_total), credit=0, date=move_date
            ))
        # CR Payable (total)
        move_lines.append(AccountMoveLine(
            tenant_id=tenant_id, move_id=move.id,
            account_id=partner_account.id,
            account_code=partner_account.code,
            account_name=partner_account.name,
            name=move.name, partner_id=move.partner_id,
            partner_name=move.partner_name,
            debit=0, credit=float(total), date=move_date
        ))

    for ml in move_lines:
        db.add(ml)

    move.state = "posted"
    move.payment_state = "not_paid"
    await db.flush()
    return move


async def post_payment(db: AsyncSession, payment: Payment, tenant_id: str,
                        invoice: AccountMove = None) -> Payment:
    """
    Post a payment and optionally reconcile against an invoice.
    inbound:  DR Bank/Cash / CR Accounts Receivable
    outbound: DR Accounts Payable / CR Bank/Cash
    """
    if not payment.number:
        seq = (await db.execute(
            select(func.count()).where(Payment.tenant_id == tenant_id)
        )).scalar() or 0
        payment.number = f"PAY-{datetime.now().year}-{str(seq + 1).zfill(4)}"

    bank_account = await get_or_create_account(
        db, tenant_id, "1010", "Bank Account", "asset", "bank"
    )
    if payment.payment_type == "inbound":
        recv_account = await get_or_create_account(
            db, tenant_id, "1200", "Accounts Receivable", "asset", "receivable"
        )
        # Create journal entry: DR Bank / CR Receivable
        move = AccountMove(
            tenant_id=tenant_id,
            move_type="payment",
            state="posted",
            partner_id=payment.partner_id,
            partner_name=payment.partner_name,
            move_date=payment.payment_date or datetime.now(timezone.utc),
            amount_total=payment.amount,
            ref=f"Payment {payment.number}",
            name=payment.number,
        )
        db.add(move)
        await db.flush()

        db.add(AccountMoveLine(
            tenant_id=tenant_id, move_id=move.id,
            account_id=bank_account.id, account_code=bank_account.code,
            account_name=bank_account.name, name=payment.number,
            debit=float(payment.amount), credit=0,
            date=payment.payment_date or datetime.now(timezone.utc)
        ))
        db.add(AccountMoveLine(
            tenant_id=tenant_id, move_id=move.id,
            account_id=recv_account.id, account_code=recv_account.code,
            account_name=recv_account.name, name=payment.number,
            partner_id=payment.partner_id, partner_name=payment.partner_name,
            debit=0, credit=float(payment.amount),
            date=payment.payment_date or datetime.now(timezone.utc)
        ))
        payment.move_id = move.id

    else:  # outbound
        pay_account = await get_or_create_account(
            db, tenant_id, "2100", "Accounts Payable", "liability", "payable"
        )
        move = AccountMove(
            tenant_id=tenant_id,
            move_type="payment",
            state="posted",
            partner_id=payment.partner_id,
            partner_name=payment.partner_name,
            move_date=payment.payment_date or datetime.now(timezone.utc),
            amount_total=payment.amount,
            ref=f"Payment {payment.number}",
            name=payment.number,
        )
        db.add(move)
        await db.flush()

        db.add(AccountMoveLine(
            tenant_id=tenant_id, move_id=move.id,
            account_id=pay_account.id, account_code=pay_account.code,
            account_name=pay_account.name, name=payment.number,
            partner_id=payment.partner_id, partner_name=payment.partner_name,
            debit=float(payment.amount), credit=0,
            date=payment.payment_date or datetime.now(timezone.utc)
        ))
        db.add(AccountMoveLine(
            tenant_id=tenant_id, move_id=move.id,
            account_id=bank_account.id, account_code=bank_account.code,
            account_name=bank_account.name, name=payment.number,
            debit=0, credit=float(payment.amount),
            date=payment.payment_date or datetime.now(timezone.utc)
        ))
        payment.move_id = move.id

    payment.state = "posted"

    # Reconcile against invoice if provided
    if invoice and invoice.state == "posted":
        paid = Decimal(str(payment.amount))
        residual = Decimal(str(invoice.amount_residual or 0))
        new_residual = max(Decimal("0"), residual - paid)
        invoice.amount_residual = new_residual
        if new_residual == 0:
            invoice.payment_state = "paid"
        else:
            invoice.payment_state = "partial"

    await db.flush()
    return payment


async def get_trial_balance(db: AsyncSession, tenant_id: str) -> list:
    """Get trial balance from move lines."""
    result = await db.execute(
        select(
            Account.code,
            Account.name,
            Account.account_type,
            func.coalesce(func.sum(AccountMoveLine.debit), 0).label("total_debit"),
            func.coalesce(func.sum(AccountMoveLine.credit), 0).label("total_credit"),
        )
        .join(AccountMoveLine, AccountMoveLine.account_id == Account.id)
        .join(AccountMove, AccountMove.id == AccountMoveLine.move_id)
        .where(
            Account.tenant_id == tenant_id,
            AccountMove.state == "posted",
            AccountMove.tenant_id == tenant_id,
        )
        .group_by(Account.id, Account.code, Account.name, Account.account_type)
        .order_by(Account.code)
    )
    rows = result.all()
    return [
        {
            "code": r.code, "name": r.name, "type": r.account_type,
            "debit": float(r.total_debit), "credit": float(r.total_credit),
            "balance": float(r.total_debit) - float(r.total_credit),
        }
        for r in rows
    ]
