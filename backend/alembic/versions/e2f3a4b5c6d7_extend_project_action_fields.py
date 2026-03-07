"""extend project action fields

Revision ID: e2f3a4b5c6d7
Revises: d1a2b3c4d5e6
Create Date: 2026-03-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, None] = "d1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("pm_project_actions") as batch_op:
        batch_op.add_column(sa.Column("display_name", sa.String(256), nullable=True))
        batch_op.add_column(sa.Column("target_object_type_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("trigger_type", sa.String(32), nullable=True, server_default="MANUAL"))
        batch_op.add_column(sa.Column("trigger_config_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("exception_policy", sa.String(32), nullable=True, server_default="IGNORE"))
        batch_op.add_column(sa.Column("exception_config_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("validation_rules_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("parameters_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("rules_json", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("pm_project_actions") as batch_op:
        batch_op.drop_column("display_name")
        batch_op.drop_column("target_object_type_id")
        batch_op.drop_column("trigger_type")
        batch_op.drop_column("trigger_config_json")
        batch_op.drop_column("exception_policy")
        batch_op.drop_column("exception_config_json")
        batch_op.drop_column("validation_rules_json")
        batch_op.drop_column("parameters_json")
        batch_op.drop_column("rules_json")
