"""merge_heads

Revision ID: a301f51e8d96
Revises: a7f0c2d8e9b1, e2f3a4b5c6d7
Create Date: 2026-03-07 14:03:39.447341

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a301f51e8d96'
down_revision: Union[str, Sequence[str], None] = ('a7f0c2d8e9b1', 'e2f3a4b5c6d7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
