"""add project management schema and skills tables

Revision ID: 9cf2e5b3aa41
Revises: 5b25e2f9c6a1
Create Date: 2026-03-06 18:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9cf2e5b3aa41"
down_revision: Union[str, Sequence[str], None] = "5b25e2f9c6a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pm_schema_configs",
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("entity_scope", sa.Text(), nullable=True),
        sa.Column("relation_scope", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("project_id"),
    )

    op.create_table(
        "pm_entity_types",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "name", name="uq_pm_entity_types_project_name"),
    )

    op.create_table(
        "pm_relation_types",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("domain_entity_type_id", sa.String(), nullable=False),
        sa.Column("range_entity_type_id", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "name", name="uq_pm_relation_types_project_name"),
    )
    op.create_index(
        "ix_pm_relation_types_project_domain_range",
        "pm_relation_types",
        ["project_id", "domain_entity_type_id", "range_entity_type_id"],
        unique=False,
    )

    op.create_table(
        "pm_schema_properties",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("owner_kind", sa.String(length=16), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=64), nullable=False),
        sa.Column("data_type", sa.String(length=16), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False),
        sa.Column("default_value", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id",
            "owner_kind",
            "owner_id",
            "name",
            name="uq_pm_schema_properties_owner_name",
        ),
    )
    op.create_index(
        "ix_pm_schema_properties_owner_sort",
        "pm_schema_properties",
        ["project_id", "owner_kind", "owner_id", "sort_order"],
        unique=False,
    )

    op.create_table(
        "pm_skills",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("tags_json", sa.Text(), nullable=True),
        sa.Column("blocked", sa.Boolean(), nullable=False),
        sa.Column("missing", sa.String(length=255), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("package_path", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pm_skills_project_source_code",
        "pm_skills",
        ["project_id", "source", "code"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_pm_skills_project_source_code", table_name="pm_skills")
    op.drop_table("pm_skills")

    op.drop_index("ix_pm_schema_properties_owner_sort", table_name="pm_schema_properties")
    op.drop_table("pm_schema_properties")

    op.drop_index("ix_pm_relation_types_project_domain_range", table_name="pm_relation_types")
    op.drop_table("pm_relation_types")

    op.drop_table("pm_entity_types")
    op.drop_table("pm_schema_configs")
