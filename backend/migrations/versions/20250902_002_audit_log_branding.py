"""Add audit_log and company_branding tables

Revision ID: 002_audit_branding
Revises: 001_initial
Create Date: 2025-09-02 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002_audit_branding"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # audit_log table
    op.create_table(
        "audit_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean, server_default="false", nullable=False),
        sa.Column("actor_id", sa.String(36), nullable=True),
        sa.Column("actor_email", sa.String(255), nullable=True),
        sa.Column("actor_name", sa.String(200), nullable=True),
        sa.Column("action", sa.String(200), nullable=False, index=True),
        sa.Column("resource_type", sa.String(100), nullable=True, index=True),
        sa.Column("resource_id", sa.String(36), nullable=True),
        sa.Column("resource_label", sa.String(500), nullable=True),
        sa.Column("changes", postgresql.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(50), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("severity", sa.String(20), nullable=False, server_default="info"),
        sa.Column("module", sa.String(100), nullable=True, index=True),
        sa.Column("extra", postgresql.JSON(), nullable=True),
    )

    # company_branding table
    op.create_table(
        "company_branding",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean, server_default="false", nullable=False),
        sa.Column("company_id", sa.String(36), nullable=True),
        sa.Column("logo_data", sa.Text(), nullable=True),
        sa.Column("logo_filename", sa.String(255), nullable=True),
        sa.Column("logo_mime_type", sa.String(100), nullable=True),
        sa.Column("report_header", sa.String(500), nullable=True),
        sa.Column("report_footer", sa.String(500), nullable=True),
        sa.Column("primary_color", sa.String(20), nullable=True, server_default="#1a3a5c"),
        sa.Column("secondary_color", sa.String(20), nullable=True, server_default="#2563eb"),
        sa.Column("show_logo_on_reports", sa.Boolean, server_default="true"),
        sa.Column("show_logo_on_invoices", sa.Boolean, server_default="true"),
        sa.Column("show_logo_on_payslips", sa.Boolean, server_default="true"),
        sa.Column("updated_by", sa.String(36), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("company_branding")
    op.drop_table("audit_log")
