"""
CI ERP Reports API — Professional PDF generation (invoices, payslips, order reports).
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import io
from datetime import datetime

from app.core.database import get_db
from app.core.deps import require_auth
from app.modules.identity.models import User
from app.modules.sales.models import SaleOrder, SaleOrderLine
from app.modules.accounting.models import AccountMove, InvoiceLine
from app.modules.payroll.models import PayrollEntry

router = APIRouter(prefix="/reports", tags=["Reports & PDF"])


def _row_dict(obj) -> dict:
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


def _brand():
    from reportlab.lib import colors
    return {
        "blue": colors.HexColor("#1a3a5c"),
        "light_blue": colors.HexColor("#e8f0fe"),
        "accent": colors.HexColor("#2563eb"),
        "green": colors.HexColor("#16a34a"),
        "red": colors.HexColor("#dc2626"),
        "grey": colors.grey,
        "white": colors.white,
    }


def _pdf_header(canvas, company_name: str, doc_title: str, doc_ref: str):
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    c = _brand()
    canvas.setFillColor(c["blue"])
    canvas.rect(0, 267 * mm, 210 * mm, 30 * mm, fill=1, stroke=0)
    canvas.setFont("Helvetica-Bold", 16)
    canvas.setFillColor(colors.white)
    canvas.drawString(15 * mm, 285 * mm, company_name)
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(195 * mm, 285 * mm, doc_title)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawRightString(195 * mm, 278 * mm, doc_ref)
    canvas.setStrokeColor(c["blue"])
    canvas.setLineWidth(0.5)
    canvas.line(15 * mm, 15 * mm, 195 * mm, 15 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(c["grey"])
    canvas.drawString(15 * mm, 10 * mm, f"CI ERP  |  Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    canvas.drawRightString(195 * mm, 10 * mm, "CONFIDENTIAL")


def _pdf_header_landscape(canvas, company_name: str, doc_title: str, doc_ref: str):
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    c = _brand()
    canvas.setFillColor(c["blue"])
    canvas.rect(0, 190 * mm, 297 * mm, 20 * mm, fill=1, stroke=0)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.setFillColor(colors.white)
    canvas.drawString(10 * mm, 198 * mm, company_name)
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(287 * mm, 202 * mm, doc_title)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawRightString(287 * mm, 195 * mm, doc_ref)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(c["grey"])
    canvas.drawString(10 * mm, 6 * mm, f"CI ERP  |  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    canvas.drawRightString(287 * mm, 6 * mm, "CONFIDENTIAL")


# ─── Invoice PDF ──────────────────────────────────────────────────

def build_invoice_pdf(inv: dict, lines: list, company_name="CI ERP") -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_RIGHT

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=40*mm, bottomMargin=25*mm)
    c = _brand()

    lbl  = ParagraphStyle("l", fontSize=7, textColor=c["grey"], fontName="Helvetica")
    val  = ParagraphStyle("v", fontSize=10, fontName="Helvetica-Bold")
    hdr  = ParagraphStyle("h", fontSize=9, fontName="Helvetica-Bold", textColor=colors.white)
    cell = ParagraphStyle("c", fontSize=9, fontName="Helvetica")
    rcel = ParagraphStyle("r", fontSize=9, fontName="Helvetica", alignment=TA_RIGHT)

    story = []
    story.append(Paragraph("INVOICE", ParagraphStyle("T", fontSize=22, fontName="Helvetica-Bold", textColor=c["blue"])))
    story.append(HRFlowable(width="100%", thickness=2, color=c["blue"]))
    story.append(Spacer(1, 5*mm))

    currency = inv.get("currency", "USD")
    move_date = str(inv.get("move_date", "") or "")[:10]
    due_date  = str(inv.get("due_date",  "") or "")[:10]
    partner   = inv.get("partner_name", "")

    info = Table([
        [Paragraph("BILL TO", lbl), Paragraph("", lbl), Paragraph("INVOICE #", lbl), Paragraph("DATE", lbl), Paragraph("DUE DATE", lbl)],
        [Paragraph(partner, val),   Paragraph("", val),  Paragraph(inv.get("name","—"), val), Paragraph(move_date, val), Paragraph(due_date, val)],
    ], colWidths=[75*mm, 10*mm, 40*mm, 30*mm, 25*mm])
    info.setStyle(TableStyle([("VALIGN", (0,0),(-1,-1),"TOP"),("TOPPADDING",(0,0),(-1,-1),2)]))
    story.append(info)
    story.append(Spacer(1, 8*mm))

    thead = [Paragraph(h, hdr) for h in ["#","Description","Qty","Unit Price","Disc%","Tax%","Total"]]
    rows  = [thead]
    for i, ln in enumerate(lines, 1):
        rows.append([
            Paragraph(str(i), cell),
            Paragraph(str(ln.get("product_name","")), cell),
            Paragraph(f"{float(ln.get('quantity',0)):,.2f}", rcel),
            Paragraph(f"{float(ln.get('unit_price',0)):,.2f}", rcel),
            Paragraph(f"{float(ln.get('discount',0)):.1f}%", rcel),
            Paragraph(f"{float(ln.get('tax_percent',0)):.1f}%", rcel),
            Paragraph(f"{float(ln.get('total',0)):,.2f}", rcel),
        ])

    n = len(lines)
    sub  = float(inv.get("amount_untaxed", 0))
    tax  = float(inv.get("amount_tax", 0))
    tot  = float(inv.get("amount_total", 0))
    rows += [
        ["","","","","", Paragraph("Subtotal", rcel), Paragraph(f"{sub:,.2f}", rcel)],
        ["","","","","", Paragraph("Tax",      rcel), Paragraph(f"{tax:,.2f}", rcel)],
        ["","","","","",
         Paragraph("TOTAL DUE", ParagraphStyle("th", fontSize=11, fontName="Helvetica-Bold", textColor=c["blue"], alignment=TA_RIGHT)),
         Paragraph(f"{tot:,.2f} {currency}", ParagraphStyle("tv", fontSize=11, fontName="Helvetica-Bold", textColor=c["blue"], alignment=TA_RIGHT))],
    ]

    t = Table(rows, colWidths=[8*mm, 68*mm, 18*mm, 25*mm, 18*mm, 18*mm, 25*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  c["blue"]),
        ("ROWBACKGROUNDS",(0,1), (-1,n),  [colors.white, c["light_blue"]]),
        ("GRID",          (0,0), (-1,n),   0.3, colors.lightgrey),
        ("BOX",           (0,0), (-1,n),   0.5, c["blue"]),
        ("LINEABOVE",     (0,n+1),(-1,n+1), 1, c["blue"]),
        ("TOPPADDING",    (0,0), (-1,-1),  3),
        ("BOTTOMPADDING", (0,0), (-1,-1),  3),
        ("LEFTPADDING",   (0,0), (-1,-1),  4),
    ]))
    story.append(t)
    story.append(Spacer(1, 6*mm))
    if inv.get("ref"):
        story.append(Paragraph(f"Reference: {inv['ref']}", lbl))
    story.append(Paragraph("Thank you for your business.", cell))

    def _hdr(cv, d):
        cv.saveState()
        _pdf_header(cv, company_name, "INVOICE", inv.get("name","—"))
        cv.restoreState()

    doc.build(story, onFirstPage=_hdr, onLaterPages=_hdr)
    return buf.getvalue()


# ─── Payslip PDF ──────────────────────────────────────────────────

def build_payslip_pdf(e: dict, company_name="CI ERP") -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_RIGHT

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=40*mm, bottomMargin=25*mm)
    c   = _brand()
    cur = e.get("currency","USD")

    lbl  = ParagraphStyle("l", fontSize=7, textColor=c["grey"])
    val  = ParagraphStyle("v", fontSize=10, fontName="Helvetica-Bold")
    hdr  = ParagraphStyle("h", fontSize=9, fontName="Helvetica-Bold", textColor=colors.white)
    cell = ParagraphStyle("c", fontSize=9)
    rcel = ParagraphStyle("r", fontSize=9, alignment=TA_RIGHT)

    def amount(key):
        return f"{float(e.get(key, 0)):,.2f}"

    story = []
    story.append(Paragraph("PAYSLIP  —  LEBANESE COMPLIANCE", ParagraphStyle("T", fontSize=18, fontName="Helvetica-Bold", textColor=c["blue"])))
    story.append(HRFlowable(width="100%", thickness=2, color=c["blue"]))
    story.append(Spacer(1, 5*mm))

    info = Table([
        [Paragraph("Employee", lbl), Paragraph(e.get("employee_name",""), val),
         Paragraph("Period",   lbl), Paragraph(e.get("period_label",""), val)],
        [Paragraph("Working Days / Absent", lbl),
         Paragraph(f"{e.get('working_days',22)} days  |  {e.get('absent_days',0)} absent", val),
         Paragraph("Currency", lbl), Paragraph(cur, val)],
        [Paragraph("Bank Account", lbl), Paragraph(e.get("bank_account","—"), val),
         Paragraph("State", lbl), Paragraph(e.get("state","draft").upper(), val)],
    ], colWidths=[35*mm, 65*mm, 30*mm, 50*mm])
    info.setStyle(TableStyle([("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2)]))
    story.append(info)
    story.append(Spacer(1, 6*mm))

    def _section(title, color, rows_data):
        rows = [[Paragraph(title, hdr), Paragraph("RATE", hdr), Paragraph(f"AMOUNT ({cur})", hdr)]]
        for row in rows_data:
            rows.append([Paragraph(row[0], cell), Paragraph(row[1], rcel), Paragraph(row[2], rcel)])
        t = Table(rows, colWidths=[95*mm, 35*mm, 50*mm])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,0), color),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, c["light_blue"]]),
            ("GRID",          (0,0),(-1,-1), 0.3, colors.lightgrey),
            ("BOX",           (0,0),(-1,-1), 0.5, color),
            ("TOPPADDING",    (0,0),(-1,-1), 3),
            ("BOTTOMPADDING", (0,0),(-1,-1), 3),
            ("LEFTPADDING",   (0,0),(-1,-1), 5),
        ]))
        return t

    story.append(_section("EARNINGS", c["green"], [
        ("Basic Salary",              "—",      amount("basic_salary")),
        ("Cost of Living (COLA)",     "—",      amount("cost_of_living")),
        ("Transportation Allowance",  "—",      amount("transport_allowance")),
        ("Housing Allowance",         "—",      amount("housing_allowance")),
        ("Meal Allowance",            "—",      amount("meal_allowance")),
        ("Phone Allowance",           "—",      amount("phone_allowance")),
        ("Overtime",                  "—",      amount("overtime_amount")),
        ("Bonus",                     "—",      amount("bonus")),
        ("Other Allowances",          "—",      amount("other_allowances")),
    ]))

    story.append(Spacer(1, 2*mm))
    gross = float(e.get("gross_pay", 0))
    story.append(Table([[
        Paragraph("GROSS PAY", ParagraphStyle("gk", fontSize=11, fontName="Helvetica-Bold", textColor=c["green"])),
        Paragraph("", cell),
        Paragraph(f"{gross:,.2f} {cur}", ParagraphStyle("gv", fontSize=11, fontName="Helvetica-Bold", textColor=c["green"], alignment=TA_RIGHT)),
    ]], colWidths=[95*mm, 35*mm, 50*mm]))

    story.append(Spacer(1, 4*mm))
    story.append(_section("DEDUCTIONS", c["red"], [
        ("NSSF Employee Contribution",   "2.00%",  amount("nssf_employee")),
        ("Income Tax (Lebanese Brackets)","—",     amount("income_tax")),
        ("Absence Deduction",            "—",      amount("absence_deduction")),
        ("Advance Recovery",             "—",      amount("advance_deduction")),
        ("Other Deductions",             "—",      amount("other_deductions")),
    ]))

    story.append(Spacer(1, 2*mm))
    total_ded = float(e.get("total_deductions", 0))
    story.append(Table([[
        Paragraph("TOTAL DEDUCTIONS", ParagraphStyle("dk", fontSize=11, fontName="Helvetica-Bold", textColor=c["red"])),
        Paragraph("", cell),
        Paragraph(f"({total_ded:,.2f}) {cur}", ParagraphStyle("dv", fontSize=11, fontName="Helvetica-Bold", textColor=c["red"], alignment=TA_RIGHT)),
    ]], colWidths=[95*mm, 35*mm, 50*mm]))

    story.append(Spacer(1, 4*mm))
    story.append(_section("EMPLOYER NSSF CONTRIBUTIONS (info only)", c["blue"], [
        ("Health & Maternity (21.5%)",  "21.50%", amount("nssf_employer_health")),
        ("Family Allocation (6%)",      "6.00%",  amount("nssf_employer_family")),
        ("End of Service (8.5%)",       "8.50%",  amount("nssf_employer_end_service")),
    ]))

    story.append(Spacer(1, 6*mm))
    net = float(e.get("net_pay", 0))
    net_t = Table([[
        Paragraph("NET PAY", ParagraphStyle("nk", fontSize=14, fontName="Helvetica-Bold", textColor=c["blue"])),
        Paragraph(f"{net:,.2f}  {cur}", ParagraphStyle("nv", fontSize=14, fontName="Helvetica-Bold", textColor=c["blue"], alignment=TA_RIGHT)),
    ]], colWidths=[95*mm, 85*mm])
    net_t.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), c["light_blue"]),
        ("BOX",        (0,0),(-1,-1), 2, c["blue"]),
        ("TOPPADDING", (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1),8),
        ("LEFTPADDING",(0,0),(-1,-1), 10),
        ("RIGHTPADDING",(0,0),(-1,-1),10),
    ]))
    story.append(net_t)

    if e.get("notes"):
        story.append(Spacer(1, 4*mm))
        story.append(Paragraph(f"Notes: {e['notes']}", lbl))

    def _hdr(cv, d):
        cv.saveState()
        _pdf_header(cv, company_name, "PAYSLIP", f"{e.get('employee_name','')} — {e.get('period_label','')}")
        cv.restoreState()

    doc.build(story, onFirstPage=_hdr, onLaterPages=_hdr)
    return buf.getvalue()


# ─── Order Report PDF ─────────────────────────────────────────────

async def build_order_pdf(order_number: str, db: AsyncSession, company_name="CI ERP") -> bytes:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import ParagraphStyle
    from app.modules.order_tracking.models import (
        Cutting, Lamination, Printing, WarehouseToDispatch,
        DispatchToProduction, Extruder, RawSlitting, PVC, Slitting
    )

    SKIP_COLS = {"id", "created_at", "updated_at"}
    c = _brand()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
                            leftMargin=10*mm, rightMargin=10*mm,
                            topMargin=32*mm, bottomMargin=18*mm)

    hdr  = ParagraphStyle("h", fontSize=8, fontName="Helvetica-Bold", textColor=colors.white)
    cell = ParagraphStyle("c", fontSize=7, fontName="Helvetica")
    sec  = ParagraphStyle("s", fontSize=12, fontName="Helvetica-Bold", textColor=c["blue"])

    TABLES = [
        ("Cutting",              Cutting),
        ("Lamination",           Lamination),
        ("Printing",             Printing),
        ("Warehouse → Dispatch", WarehouseToDispatch),
        ("Dispatch → Production",DispatchToProduction),
        ("Extruder",             Extruder),
        ("Raw Slitting",         RawSlitting),
        ("PVC",                  PVC),
        ("Slitting",             Slitting),
    ]

    story = []
    story.append(Paragraph(f"ORDER TRACKING REPORT  —  {order_number}",
                           ParagraphStyle("T", fontSize=16, fontName="Helvetica-Bold", textColor=c["blue"])))
    story.append(Spacer(1, 5*mm))

    has_any = False
    for label, model in TABLES:
        result = await db.execute(
            select(model).where(model.order_number == order_number)
        )
        rows = result.scalars().all()
        if not rows:
            continue
        has_any = True

        story.append(Spacer(1, 5*mm))
        story.append(Paragraph(f"▸  {label}", sec))
        story.append(Spacer(1, 2*mm))

        cols = [cn for cn in (col.name for col in model.__table__.columns) if cn not in SKIP_COLS]
        thead = [Paragraph(cn.replace("_"," ").title(), hdr) for cn in cols]
        tdata = [thead]
        for row in rows:
            tr = []
            for col in cols:
                v = getattr(row, col)
                if v is None:    v = "—"
                elif hasattr(v, "isoformat"): v = str(v)[:10]
                elif isinstance(v, float):    v = f"{v:,.3f}".rstrip("0").rstrip(".")
                tr.append(Paragraph(str(v), cell))
            tdata.append(tr)

        cw = [277*mm / len(cols)] * len(cols)
        t = Table(tdata, colWidths=cw, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,0),  c["blue"]),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [colors.white, c["light_blue"]]),
            ("GRID",          (0,0),(-1,-1),  0.25, colors.lightgrey),
            ("BOX",           (0,0),(-1,-1),  0.5,  c["blue"]),
            ("TOPPADDING",    (0,0),(-1,-1),  2),
            ("BOTTOMPADDING", (0,0),(-1,-1),  2),
            ("LEFTPADDING",   (0,0),(-1,-1),  3),
        ]))
        story.append(t)

    if not has_any:
        story.append(Paragraph(f"No production data found for order: {order_number}", cell))

    def _hdr(cv, d):
        cv.saveState()
        _pdf_header_landscape(cv, company_name, "ORDER TRACKING REPORT", order_number)
        cv.restoreState()

    doc.build(story, onFirstPage=_hdr, onLaterPages=_hdr)
    return buf.getvalue()


# ─── Endpoints ────────────────────────────────────────────────────

@router.get("/pdf/invoice/{invoice_id}")
async def pdf_invoice(invoice_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_auth)):
    try:
        inv = (await db.execute(
            select(AccountMove).where(AccountMove.id == invoice_id, AccountMove.is_deleted == False)
        )).scalar_one_or_none()
        if not inv:
            raise HTTPException(404, "Invoice not found")
        lines = (await db.execute(
            select(InvoiceLine).where(InvoiceLine.move_id == invoice_id, InvoiceLine.is_deleted == False)
        )).scalars().all()
        pdf = build_invoice_pdf(_row_dict(inv), [_row_dict(l) for l in lines])
        fname = f"invoice_{inv.name or invoice_id}.pdf"
        return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
                                 headers={"Content-Disposition": f'attachment; filename="{fname}"'})
    except HTTPException:
        raise
    except ImportError:
        raise HTTPException(500, "Install reportlab: pip install reportlab")


@router.get("/pdf/payslip/{entry_id}")
async def pdf_payslip(entry_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_auth)):
    try:
        entry = (await db.execute(
            select(PayrollEntry).where(PayrollEntry.id == entry_id, PayrollEntry.is_deleted == False)
        )).scalar_one_or_none()
        if not entry:
            raise HTTPException(404, "Payroll entry not found")
        pdf = build_payslip_pdf(_row_dict(entry))
        fname = f"payslip_{entry.employee_name}_{entry.period_label}.pdf".replace(" ", "_")
        return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
                                 headers={"Content-Disposition": f'attachment; filename="{fname}"'})
    except HTTPException:
        raise
    except ImportError:
        raise HTTPException(500, "Install reportlab: pip install reportlab")


@router.get("/pdf/order/{order_number}")
async def pdf_order(order_number: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_auth)):
    try:
        pdf = await build_order_pdf(order_number, db)
        return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
                                 headers={"Content-Disposition": f'attachment; filename="order_{order_number}.pdf"'})
    except HTTPException:
        raise
    except ImportError:
        raise HTTPException(500, "Install reportlab: pip install reportlab")


# ─── Branded PDF Endpoints (use company logo) ─────────────────────────────────
from app.modules.identity.models import CompanyBranding as CompanyBrandingModel


async def _get_branding_dict(db: AsyncSession, tenant_id: str) -> dict:
    """Fetch branding settings for branded PDF generation."""
    result = await db.execute(
        select(CompanyBrandingModel).where(
            CompanyBrandingModel.tenant_id == tenant_id,
            CompanyBrandingModel.is_deleted == False,
        )
    )
    b = result.scalar_one_or_none()
    if not b:
        return {}
    return {
        "logo_data": b.logo_data,
        "logo_mime_type": b.logo_mime_type,
        "report_header": b.report_header,
        "report_footer": b.report_footer,
        "primary_color": b.primary_color or "#1a3a5c",
        "show_logo_on_reports": b.show_logo_on_reports,
        "show_logo_on_invoices": b.show_logo_on_invoices,
        "show_logo_on_payslips": b.show_logo_on_payslips,
    }


@router.get("/pdf/branded-invoice/{invoice_id}")
async def pdf_branded_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
):
    """Generate invoice PDF with company logo branding."""
    from app.core.pdf_generator import generate_invoice_pdf
    inv = (await db.execute(
        select(AccountMove).where(AccountMove.id == invoice_id, AccountMove.is_deleted == False)
    )).scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Invoice not found")

    lines = (await db.execute(
        select(InvoiceLine).where(InvoiceLine.move_id == invoice_id, InvoiceLine.is_deleted == False)
    )).scalars().all()

    branding = await _get_branding_dict(db, user.tenant_id)

    invoice_data = {
        **_row_dict(inv),
        "company_name": "CI ERP",
        "lines": [{"description": l.name, "quantity": l.quantity, "unit_price": float(l.price_unit or 0),
                   "total": float(l.price_subtotal or 0)} for l in lines],
        "subtotal": float(inv.amount_untaxed or 0),
        "tax": float(inv.amount_tax or 0),
        "total": float(inv.amount_total or 0),
        "currency": inv.currency or "USD",
    }

    pdf = generate_invoice_pdf(invoice_data, branding)
    fname = f"invoice_{inv.name or invoice_id}.pdf"
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{fname}"'})
