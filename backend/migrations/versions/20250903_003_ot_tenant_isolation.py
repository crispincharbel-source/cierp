"""Add tenant_id + is_deleted to Order Tracking production tables

Revision ID: 20250903_003
Revises: 20250902_002
Create Date: 2025-09-03 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '20250903_003'
down_revision = '20250902_002'
branch_labels = None
depends_on = None

OT_STAGE_TABLES = [
    'ot_cutting', 'ot_lamination', 'ot_printing',
    'ot_warehouse_to_dispatch', 'ot_dispatch_to_production',
    'ot_extruder', 'ot_raw_slitting', 'ot_pvc', 'ot_slitting',
    'ot_activity_log', 'ot_admin_settings',
]


def upgrade():
    for table in OT_STAGE_TABLES:
        # Add tenant_id column (backfill with default tenant 'cierp')
        op.add_column(table, sa.Column('tenant_id', sa.String(100), nullable=True))
        op.execute(f"UPDATE {table} SET tenant_id = 'cierp' WHERE tenant_id IS NULL")
        op.alter_column(table, 'tenant_id', nullable=False)
        op.create_index(f'ix_{table}_tenant_id', table, ['tenant_id'])

        # Add soft-delete column
        op.add_column(table, sa.Column('is_deleted', sa.Boolean(),
                                       server_default=sa.text('false'), nullable=False))

    # ot_admin_settings: unique constraint is now per-tenant, drop old global one
    try:
        op.drop_index('uq_ot_settings_key', table_name='ot_admin_settings')
    except Exception:
        pass
    op.create_index('uq_ot_settings_tenant_key', 'ot_admin_settings',
                    ['tenant_id', 'setting_key'], unique=True)


def downgrade():
    try:
        op.drop_index('uq_ot_settings_tenant_key', table_name='ot_admin_settings')
    except Exception:
        pass

    for table in OT_STAGE_TABLES:
        try:
            op.drop_index(f'ix_{table}_tenant_id', table_name=table)
        except Exception:
            pass
        op.drop_column(table, 'tenant_id')
        op.drop_column(table, 'is_deleted')
