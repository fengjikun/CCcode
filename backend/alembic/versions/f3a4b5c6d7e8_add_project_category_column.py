"""add project category column

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-03-08 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, None] = "a301f51e8d96"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("pm_projects") as batch_op:
        batch_op.add_column(sa.Column("category", sa.String(32), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("pm_projects") as batch_op:
        batch_op.drop_column("category")
