"""add project management run action function tables

Revision ID: c6d5f9a7b2de
Revises: 9cf2e5b3aa41
Create Date: 2026-03-06 19:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c6d5f9a7b2de"
down_revision: Union[str, Sequence[str], None] = "9cf2e5b3aa41"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pm_extraction_runs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("source_snapshot_json", sa.Text(), nullable=True),
        sa.Column("candidate_entity_count", sa.Integer(), nullable=False),
        sa.Column("candidate_relation_count", sa.Integer(), nullable=False),
        sa.Column("pending_review_count", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pm_extraction_runs_project_created",
        "pm_extraction_runs",
        ["project_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_pm_extraction_runs_project_status",
        "pm_extraction_runs",
        ["project_id", "status"],
        unique=False,
    )

    op.create_table(
        "pm_review_items",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("run_id", sa.String(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("entity_type_name", sa.String(length=64), nullable=True),
        sa.Column("entity_name", sa.String(length=255), nullable=True),
        sa.Column("relation_type_name", sa.String(length=64), nullable=True),
        sa.Column("relation_domain_name", sa.String(length=64), nullable=True),
        sa.Column("relation_range_name", sa.String(length=64), nullable=True),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pm_review_items_project_run",
        "pm_review_items",
        ["project_id", "run_id"],
        unique=False,
    )
    op.create_index(
        "ix_pm_review_items_run_status",
        "pm_review_items",
        ["run_id", "status"],
        unique=False,
    )

    op.create_table(
        "pm_ontology_versions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("version", sa.String(length=16), nullable=False),
        sa.Column("label", sa.String(length=128), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source_run_id", sa.String(), nullable=False),
        sa.Column("entity_count", sa.Integer(), nullable=False),
        sa.Column("relation_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "version_no", name="uq_pm_ontology_versions_project_no"),
    )
    op.create_index(
        "ix_pm_ontology_versions_project_created",
        "pm_ontology_versions",
        ["project_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "pm_version_items",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("version_id", sa.String(), nullable=False),
        sa.Column("run_item_id", sa.String(), nullable=True),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pm_version_items_project_version",
        "pm_version_items",
        ["project_id", "version_id"],
        unique=False,
    )

    op.create_table(
        "pm_project_actions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pm_project_actions_project_created",
        "pm_project_actions",
        ["project_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "pm_project_functions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("script_content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pm_project_functions_project_created",
        "pm_project_functions",
        ["project_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_pm_project_functions_project_created", table_name="pm_project_functions")
    op.drop_table("pm_project_functions")

    op.drop_index("ix_pm_project_actions_project_created", table_name="pm_project_actions")
    op.drop_table("pm_project_actions")

    op.drop_index("ix_pm_version_items_project_version", table_name="pm_version_items")
    op.drop_table("pm_version_items")

    op.drop_index("ix_pm_ontology_versions_project_created", table_name="pm_ontology_versions")
    op.drop_table("pm_ontology_versions")

    op.drop_index("ix_pm_review_items_run_status", table_name="pm_review_items")
    op.drop_index("ix_pm_review_items_project_run", table_name="pm_review_items")
    op.drop_table("pm_review_items")

    op.drop_index("ix_pm_extraction_runs_project_status", table_name="pm_extraction_runs")
    op.drop_index("ix_pm_extraction_runs_project_created", table_name="pm_extraction_runs")
    op.drop_table("pm_extraction_runs")
