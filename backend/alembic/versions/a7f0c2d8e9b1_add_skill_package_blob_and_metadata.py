"""add skill package blob and metadata

Revision ID: a7f0c2d8e9b1
Revises: d1a2b3c4d5e6
Create Date: 2026-03-06 22:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a7f0c2d8e9b1"
down_revision: Union[str, Sequence[str], None] = "d1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("pm_skills", sa.Column("metadata_json", sa.Text(), nullable=True))
    op.add_column("pm_skills", sa.Column("package_blob", sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column("pm_skills", "package_blob")
    op.drop_column("pm_skills", "metadata_json")
