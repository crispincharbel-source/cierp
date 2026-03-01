"""Initial schema — all CI ERP tables

Revision ID: 001_initial
Revises: 
Create Date: 2025-09-01 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # All tables created by SQLAlchemy create_all in development.
    # This migration is the baseline — add incremental changes in subsequent migrations.
    pass


def downgrade() -> None:
    pass
