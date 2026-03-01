"""
CI ERP — PDF Generator with Custom Logo Branding
Generates professional PDFs for invoices, reports, payslips with tenant logo.
"""
import base64
import io
from datetime import datetime
from typing import Optional

try:
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm, cm
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


def _load_logo_image(logo_data: Optional[str], logo_mime: Optional[str], max_width=60*3.77953, max_height=30*3.77953):
    """Convert base64 logo to ReportLab Image element."""
    if not logo_data or not HAS_REPORTLAB:
        return None
    try:
        raw = base64.b64decode(logo_data)
        buf = io.BytesIO(raw)
        img = RLImage(buf)
        # Scale proportionally
        w, h = img.imageWidth, img.imageHeight
        if w > max_width:
            scale = max_width / w
            w, h = w * scale, h * scale
        if h > max_height:
            scale = max_height / h
            w, h = w * scale, h * scale
        img.drawWidth = w
        img.drawHeight = h
        return img
    except Exception:
        return None


def generate_invoice_pdf(
    invoice_data: dict,
    branding: Optional[dict] = None,
) -> bytes:
    """
    Generate a professional invoice PDF.
    invoice_data: {number, date, due_date, company_name, client_name, lines[], subtotal, tax, total}
    branding: {logo_data, logo_mime_type, report_header, report_footer, primary_color}
    """
    if not HAS_REPORTLAB:
        return b"PDF generation requires reportlab package"

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm,
                            topMargin=20*mm, bottomMargin=20*mm)
    
    styles = getSampleStyleSheet()
    branding = branding or {}
    primary = branding.get("primary_color", "#1a3a5c")
    
    try:
        primary_color = colors.HexColor(primary)
    except Exception:
        primary_color = colors.HexColor("#1a3a5c")

    # Custom styles
    title_style = ParagraphStyle("Title", parent=styles["Title"],
                                  textColor=primary_color, fontSize=20, spaceAfter=4)
    h2_style = ParagraphStyle("H2", parent=styles["Heading2"],
                               textColor=primary_color, fontSize=12, spaceAfter=4)
    normal = styles["Normal"]
    small = ParagraphStyle("Small", parent=normal, fontSize=8, textColor=colors.grey)

    story = []

    # ── Header with Logo ──────────────────────────────────────────────────────
    logo_img = None
    if branding.get("show_logo_on_invoices", True) and branding.get("logo_data"):
        logo_img = _load_logo_image(branding.get("logo_data"), branding.get("logo_mime_type"))

    company_name = invoice_data.get("company_name", "CI ERP")
    report_header = branding.get("report_header") or company_name

    header_data = []
    if logo_img:
        header_left = logo_img
    else:
        header_left = Paragraph(f"<b>{company_name}</b>", ParagraphStyle("co", fontSize=14, textColor=primary_color))
    
    header_right_lines = [
        f"<b>INVOICE</b>",
        f"# {invoice_data.get('number', '')}",
        f"Date: {invoice_data.get('date', '')}",
        f"Due: {invoice_data.get('due_date', '')}",
    ]
    header_right = Paragraph("<br/>".join(header_right_lines),
                              ParagraphStyle("inv", fontSize=10, alignment=TA_RIGHT))

    header_table = Table([[header_left, header_right]], colWidths=["60%", "40%"])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 12),
    ]))
    story.append(header_table)
    
    if branding.get("report_header"):
        story.append(Paragraph(branding["report_header"], small))
    
    story.append(Spacer(1, 6*mm))

    # ── Bill To ───────────────────────────────────────────────────────────────
    story.append(Paragraph("Bill To", h2_style))
    story.append(Paragraph(invoice_data.get("client_name", ""), normal))
    story.append(Spacer(1, 5*mm))

    # ── Line Items ────────────────────────────────────────────────────────────
    col_headers = ["Description", "Qty", "Unit Price", "Total"]
    table_data = [col_headers]
    
    for line in invoice_data.get("lines", []):
        table_data.append([
            line.get("description", ""),
            str(line.get("quantity", 0)),
            f"{line.get('unit_price', 0):,.2f}",
            f"{line.get('total', 0):,.2f}",
        ])
    
    # Totals
    currency = invoice_data.get("currency", "USD")
    table_data.append(["", "", "Subtotal", f"{invoice_data.get('subtotal', 0):,.2f}"])
    table_data.append(["", "", "Tax", f"{invoice_data.get('tax', 0):,.2f}"])
    table_data.append(["", "", "TOTAL", f"{currency} {invoice_data.get('total', 0):,.2f}"])

    lines_table = Table(table_data, colWidths=["50%", "10%", "20%", "20%"])
    n_lines = len(table_data)
    n_data = n_lines - 3  # 3 total rows

    lines_table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND", (0,0), (-1,0), primary_color),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,0), 9),
        ("BOTTOMPADDING", (0,0), (-1,0), 6),
        ("TOPPADDING", (0,0), (-1,0), 6),
        # Data rows
        ("FONTSIZE", (0,1), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,1), (-1, n_data), [colors.white, colors.HexColor("#f8f9fa")]),
        ("GRID", (0,0), (-1, n_data), 0.5, colors.HexColor("#dee2e6")),
        # Total rows
        ("FONTNAME", (2, n_data+1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (2, n_data+1), (-1, -1), 10),
        ("BACKGROUND", (2, n_lines-1), (-1, n_lines-1), primary_color),
        ("TEXTCOLOR", (2, n_lines-1), (-1, n_lines-1), colors.white),
        ("LINEABOVE", (2, n_data+1), (-1, n_data+1), 1, primary_color),
        ("ALIGN", (1,0), (-1,-1), "RIGHT"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,1), (-1,-1), 5),
        ("BOTTOMPADDING", (0,1), (-1,-1), 5),
    ]))
    story.append(lines_table)
    story.append(Spacer(1, 8*mm))

    # ── Notes ─────────────────────────────────────────────────────────────────
    if invoice_data.get("notes"):
        story.append(Paragraph("Notes", h2_style))
        story.append(Paragraph(invoice_data["notes"], normal))
        story.append(Spacer(1, 5*mm))

    # ── Footer ────────────────────────────────────────────────────────────────
    footer_text = branding.get("report_footer") or f"Generated by CI ERP • {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph(footer_text, ParagraphStyle("footer", fontSize=7, textColor=colors.grey, alignment=TA_CENTER)))

    doc.build(story)
    return buf.getvalue()


def generate_report_pdf(
    title: str,
    data_rows: list,
    columns: list,
    branding: Optional[dict] = None,
    subtitle: Optional[str] = None,
) -> bytes:
    """Generic tabular report PDF with branding."""
    if not HAS_REPORTLAB:
        return b"PDF generation requires reportlab"

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()
    branding = branding or {}

    try:
        primary_color = colors.HexColor(branding.get("primary_color", "#1a3a5c"))
    except Exception:
        primary_color = colors.HexColor("#1a3a5c")

    story = []

    # Logo + Title header
    logo_img = None
    if branding.get("show_logo_on_reports", True) and branding.get("logo_data"):
        logo_img = _load_logo_image(branding.get("logo_data"), branding.get("logo_mime_type"))

    title_para = Paragraph(f"<b>{title}</b>",
                            ParagraphStyle("rt", fontSize=16, textColor=primary_color))
    date_para = Paragraph(datetime.now().strftime("%Y-%m-%d %H:%M"),
                           ParagraphStyle("d", fontSize=8, textColor=colors.grey, alignment=TA_RIGHT))
    
    if logo_img:
        hdr = Table([[logo_img, title_para, date_para]], colWidths=["20%", "60%", "20%"])
    else:
        hdr = Table([["", title_para, date_para]], colWidths=["5%", "75%", "20%"])
    
    hdr.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("BOTTOMPADDING", (0,0), (-1,-1), 8)]))
    story.append(hdr)

    if subtitle:
        story.append(Paragraph(subtitle, ParagraphStyle("sub", fontSize=9, textColor=colors.grey)))
    
    story.append(Spacer(1, 5*mm))

    # Data table
    if data_rows:
        tbl_data = [columns] + [[str(cell) for cell in row] for row in data_rows]
        col_w = f"{100/len(columns):.0f}%"
        tbl = Table(tbl_data, colWidths=[col_w]*len(columns))
        n = len(tbl_data)
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), primary_color),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,0), (-1,-1), 8),
            ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#dee2e6")),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f8f9fa")]),
            ("TOPPADDING", (0,0), (-1,-1), 4),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ]))
        story.append(tbl)
    else:
        story.append(Paragraph("No data available for this report.", styles["Normal"]))

    # Footer
    footer = branding.get("report_footer") or f"CI ERP • {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(footer, ParagraphStyle("f", fontSize=7, textColor=colors.grey, alignment=TA_CENTER)))

    doc.build(story)
    return buf.getvalue()
