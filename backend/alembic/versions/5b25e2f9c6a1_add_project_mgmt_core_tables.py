"""add project management core tables

Revision ID: 5b25e2f9c6a1
Revises: bf3b4c0a7f21
Create Date: 2026-03-06 12:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5b25e2f9c6a1"
down_revision: Union[str, Sequence[str], None] = "bf3b4c0a7f21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pm_projects",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=300), nullable=True),
        sa.Column("current_version_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_user_id", "name", name="uq_pm_projects_owner_name"),
    )
    op.create_index(
        "ix_pm_projects_owner_updated",
        "pm_projects",
        ["owner_user_id", "updated_at"],
        unique=False,
    )

    op.create_table(
        "pm_project_documents",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("file_type", sa.String(length=16), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pm_project_documents_project_uploaded",
        "pm_project_documents",
        ["project_id", "uploaded_at"],
        unique=False,
    )

    op.create_table(
        "pm_project_data_sources",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("host", sa.String(length=255), nullable=False),
        sa.Column("port", sa.Integer(), nullable=False),
        sa.Column("database_name", sa.String(length=128), nullable=False),
        sa.Column("schema_name", sa.String(length=128), nullable=True),
        sa.Column("username", sa.String(length=128), nullable=False),
        sa.Column("password_encrypted", sa.Text(), nullable=False),
        sa.Column("ssl_enabled", sa.Boolean(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("extract_mode", sa.String(length=16), nullable=False),
        sa.Column("tables_json", sa.Text(), nullable=True),
        sa.Column("custom_sql", sa.Text(), nullable=True),
        sa.Column("row_limit", sa.Integer(), nullable=False),
        sa.Column("sync_mode", sa.String(length=16), nullable=False),
        sa.Column("incremental_column", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("last_test_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "name", name="uq_pm_project_data_sources_project_name"),
    )
    op.create_index(
        "ix_pm_project_data_sources_project_enabled",
        "pm_project_data_sources",
        ["project_id", "enabled"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_pm_project_data_sources_project_enabled", table_name="pm_project_data_sources")
    op.drop_table("pm_project_data_sources")

    op.drop_index("ix_pm_project_documents_project_uploaded", table_name="pm_project_documents")
    op.drop_table("pm_project_documents")

    op.drop_index("ix_pm_projects_owner_updated", table_name="pm_projects")
    op.drop_table("pm_projects")
