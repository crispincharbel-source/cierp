"""
CI ERP — Company Branding & Logo API
Allows uploading a custom company logo that appears on all reports, invoices,
payslips, and print outputs. Unique feature not found in most ERPs.
"""
import base64
import mimetypes
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel as PydanticModel
from typing import Optional

from app.core.database import get_db
from app.core.deps import require_auth
from app.modules.identity.models import User, CompanyBranding
from app.core.audit import audit

router = APIRouter(prefix="/branding", tags=["Branding"])

ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


class BrandingUpdate(PydanticModel):
    report_header: Optional[str] = None
    report_footer: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    show_logo_on_reports: Optional[bool] = None
    show_logo_on_invoices: Optional[bool] = None
    show_logo_on_payslips: Optional[bool] = None


async def _get_or_create_branding(db: AsyncSession, tenant_id: str, user: User) -> CompanyBranding:
    result = await db.execute(
        select(CompanyBranding).where(
            CompanyBranding.tenant_id == tenant_id,
            CompanyBranding.is_deleted == False,
        )
    )
    branding = result.scalar_one_or_none()
    if not branding:
        branding = CompanyBranding(
            tenant_id=tenant_id,
            company_id=user.company_id,
            updated_by=user.id,
        )
        db.add(branding)
        await db.flush()
    return branding


def _branding_to_dict(b: CompanyBranding) -> dict:
    return {
        "id": b.id,
        "logo_data": b.logo_data,       # base64 string
        "logo_filename": b.logo_filename,
        "logo_mime_type": b.logo_mime_type,
        "report_header": b.report_header,
        "report_footer": b.report_footer,
        "primary_color": b.primary_color or "#1a3a5c",
        "secondary_color": b.secondary_color or "#2563eb",
        "show_logo_on_reports": b.show_logo_on_reports,
        "show_logo_on_invoices": b.show_logo_on_invoices,
        "show_logo_on_payslips": b.show_logo_on_payslips,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


@router.get("")
async def get_branding(
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get current branding settings for tenant."""
    result = await db.execute(
        select(CompanyBranding).where(
            CompanyBranding.tenant_id == user.tenant_id,
            CompanyBranding.is_deleted == False,
        )
    )
    branding = result.scalar_one_or_none()
    if not branding:
        return {
            "logo_data": None,
            "logo_filename": None,
            "logo_mime_type": None,
            "report_header": None,
            "report_footer": None,
            "primary_color": "#1a3a5c",
            "secondary_color": "#2563eb",
            "show_logo_on_reports": True,
            "show_logo_on_invoices": True,
            "show_logo_on_payslips": True,
        }
    return _branding_to_dict(branding)


@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a custom logo image (PNG/JPEG/WebP/SVG/GIF, max 5MB).
    This logo appears on ALL printed/saved reports, invoices, payslips, etc.
    """
    content_type = file.content_type or ""
    
    # Guess from filename if content_type missing
    if not content_type or content_type == "application/octet-stream":
        guessed, _ = mimetypes.guess_type(file.filename or "")
        content_type = guessed or content_type

    if content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{content_type}' not allowed. Use PNG, JPEG, WebP, GIF, or SVG."
        )

    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5 MB.")

    # Store as base64
    b64 = base64.b64encode(data).decode("utf-8")

    branding = await _get_or_create_branding(db, user.tenant_id, user)
    branding.logo_data = b64
    branding.logo_filename = file.filename
    branding.logo_mime_type = content_type
    branding.updated_by = user.id
    await db.flush()

    await audit(
        db, "branding.logo.upload",
        user=user,
        resource_type="company_branding",
        resource_id=branding.id,
        resource_label=file.filename,
        module="branding",
        tenant_id=user.tenant_id,
    )

    return {
        "message": "Logo uploaded successfully",
        "filename": file.filename,
        "size_bytes": len(data),
        "mime_type": content_type,
        "logo_data": b64,
    }


@router.delete("/logo")
async def remove_logo(
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Remove the current company logo."""
    result = await db.execute(
        select(CompanyBranding).where(
            CompanyBranding.tenant_id == user.tenant_id,
            CompanyBranding.is_deleted == False,
        )
    )
    branding = result.scalar_one_or_none()
    if branding:
        branding.logo_data = None
        branding.logo_filename = None
        branding.logo_mime_type = None
        branding.updated_by = user.id
        await db.flush()
        await audit(db, "branding.logo.remove", user=user, module="branding", tenant_id=user.tenant_id)
    return {"message": "Logo removed"}


@router.patch("")
async def update_branding(
    data: BrandingUpdate,
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update branding settings (colors, header/footer text, visibility toggles)."""
    branding = await _get_or_create_branding(db, user.tenant_id, user)

    if data.report_header is not None:   branding.report_header = data.report_header
    if data.report_footer is not None:   branding.report_footer = data.report_footer
    if data.primary_color is not None:   branding.primary_color = data.primary_color
    if data.secondary_color is not None: branding.secondary_color = data.secondary_color
    if data.show_logo_on_reports is not None:   branding.show_logo_on_reports = data.show_logo_on_reports
    if data.show_logo_on_invoices is not None:  branding.show_logo_on_invoices = data.show_logo_on_invoices
    if data.show_logo_on_payslips is not None:  branding.show_logo_on_payslips = data.show_logo_on_payslips
    branding.updated_by = user.id
    await db.flush()

    await audit(
        db, "branding.settings.update",
        user=user, resource_type="company_branding", resource_id=branding.id,
        module="branding", tenant_id=user.tenant_id,
    )

    return _branding_to_dict(branding)
