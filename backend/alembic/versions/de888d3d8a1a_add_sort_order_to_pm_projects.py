"""add sort_order to pm_projects

Revision ID: de888d3d8a1a
Revises: f3a4b5c6d7e8
Create Date: 2026-03-08 19:36:15.885506

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'de888d3d8a1a'
down_revision: Union[str, Sequence[str], None] = 'f3a4b5c6d7e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('pm_projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False))

    # Pin the demo project to the top
    op.execute("UPDATE pm_projects SET sort_order = 100 WHERE id = 'proj_01ccfa6841df'")


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('pm_projects', schema=None) as batch_op:
        batch_op.drop_column('sort_order')
