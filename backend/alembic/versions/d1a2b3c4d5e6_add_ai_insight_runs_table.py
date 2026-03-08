"""add ai insight runs table

Revision ID: d1a2b3c4d5e6
Revises: c6d5f9a7b2de
Create Date: 2026-03-06 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "c6d5f9a7b2de"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pm_ai_insight_runs",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("project_id", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("scanned_document_count", sa.Integer(), nullable=False),
        sa.Column("added_entity_count", sa.Integer(), nullable=False),
        sa.Column("added_relation_count", sa.Integer(), nullable=False),
        sa.Column("added_entity_names_json", sa.Text(), nullable=True),
        sa.Column("added_relation_names_json", sa.Text(), nullable=True),
        sa.Column("warnings_json", sa.Text(), nullable=True),
        sa.Column("runtime_meta_json", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pm_ai_insight_runs_project_created",
        "pm_ai_insight_runs",
        ["project_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_pm_ai_insight_runs_project_status",
        "pm_ai_insight_runs",
        ["project_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_pm_ai_insight_runs_project_status", table_name="pm_ai_insight_runs")
    op.drop_index("ix_pm_ai_insight_runs_project_created", table_name="pm_ai_insight_runs")
    op.drop_table("pm_ai_insight_runs")
