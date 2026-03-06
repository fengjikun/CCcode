from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, LargeBinary, String, Text

from app.database import Base


class Project(Base):
    __tablename__ = "pm_projects"

    id = Column(String, primary_key=True)
    owner_user_id = Column(Integer, nullable=False)
    name = Column(String(64), nullable=False)
    description = Column(String(300))
    current_version_id = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class ProjectDocument(Base):
    __tablename__ = "pm_project_documents"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    name = Column(String(255), nullable=False)
    file_type = Column(String(16), nullable=False)
    size_bytes = Column(Integer, nullable=False, default=0)
    status = Column(String(32), nullable=False, default="READY")
    enabled = Column(Boolean, nullable=False, default=True)
    storage_path = Column(Text)
    uploaded_at = Column(DateTime, default=datetime.now)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class ProjectDataSource(Base):
    __tablename__ = "pm_project_data_sources"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    name = Column(String(128), nullable=False)
    type = Column(String(32), nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    database_name = Column(String(128), nullable=False)
    schema_name = Column(String(128))
    username = Column(String(128), nullable=False)
    password_encrypted = Column(Text, nullable=False)
    ssl_enabled = Column(Boolean, nullable=False, default=False)
    enabled = Column(Boolean, nullable=False, default=True)
    extract_mode = Column(String(16), nullable=False, default="TABLE")
    tables_json = Column(Text)
    custom_sql = Column(Text)
    row_limit = Column(Integer, nullable=False, default=10000)
    sync_mode = Column(String(16), nullable=False, default="FULL")
    incremental_column = Column(String(128))
    status = Column(String(32), nullable=False, default="UNKNOWN")
    last_test_at = Column(DateTime)
    last_error = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class SchemaConfig(Base):
    __tablename__ = "pm_schema_configs"

    project_id = Column(String, primary_key=True)
    entity_scope = Column(Text, default="")
    relation_scope = Column(Text, default="")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class EntityType(Base):
    __tablename__ = "pm_entity_types"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    name = Column(String(64), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class RelationType(Base):
    __tablename__ = "pm_relation_types"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    name = Column(String(64), nullable=False)
    domain_entity_type_id = Column(String, nullable=False)
    range_entity_type_id = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class SchemaProperty(Base):
    __tablename__ = "pm_schema_properties"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    owner_kind = Column(String(16), nullable=False)
    owner_id = Column(String, nullable=False)
    name = Column(String(64), nullable=False)
    display_name = Column(String(64), nullable=False)
    data_type = Column(String(16), nullable=False, default="STRING")
    required = Column(Boolean, nullable=False, default=False)
    default_value = Column(Text)
    description = Column(Text)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class Skill(Base):
    __tablename__ = "pm_skills"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    code = Column(String(32), nullable=False)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    enabled = Column(Boolean, nullable=False, default=True)
    prompt = Column(Text, default="")
    source = Column(String(32), nullable=False)
    tags_json = Column(Text)
    blocked = Column(Boolean, nullable=False, default=False)
    missing = Column(String(255))
    file_name = Column(String(255))
    metadata_json = Column(Text)
    package_blob = Column(LargeBinary)
    package_path = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class ExtractionRun(Base):
    __tablename__ = "pm_extraction_runs"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    status = Column(String(32), nullable=False, default="RUNNING")
    progress = Column(Integer, nullable=False, default=0)
    source_snapshot_json = Column(Text)
    candidate_entity_count = Column(Integer, nullable=False, default=0)
    candidate_relation_count = Column(Integer, nullable=False, default=0)
    pending_review_count = Column(Integer, nullable=False, default=0)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class AiInsightRun(Base):
    __tablename__ = "pm_ai_insight_runs"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    status = Column(String(32), nullable=False, default="RUNNING")
    progress = Column(Integer, nullable=False, default=0)
    scanned_document_count = Column(Integer, nullable=False, default=0)
    added_entity_count = Column(Integer, nullable=False, default=0)
    added_relation_count = Column(Integer, nullable=False, default=0)
    added_entity_names_json = Column(Text)
    added_relation_names_json = Column(Text)
    warnings_json = Column(Text)
    runtime_meta_json = Column(Text)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class ReviewItem(Base):
    __tablename__ = "pm_review_items"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    run_id = Column(String, nullable=False)
    kind = Column(String(16), nullable=False)
    title = Column(Text, nullable=False)
    evidence = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False, default=0.0)
    status = Column(String(16), nullable=False, default="PENDING")
    entity_type_name = Column(String(64))
    entity_name = Column(String(255))
    relation_type_name = Column(String(64))
    relation_domain_name = Column(String(64))
    relation_range_name = Column(String(64))
    payload_json = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class OntologyVersion(Base):
    __tablename__ = "pm_ontology_versions"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    version_no = Column(Integer, nullable=False)
    version = Column(String(16), nullable=False)
    label = Column(String(128), nullable=False)
    notes = Column(Text)
    source_run_id = Column(String, nullable=False)
    entity_count = Column(Integer, nullable=False, default=0)
    relation_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.now)


class VersionItem(Base):
    __tablename__ = "pm_version_items"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    version_id = Column(String, nullable=False)
    run_item_id = Column(String)
    kind = Column(String(16), nullable=False)
    title = Column(Text, nullable=False)
    evidence = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False, default=0.0)
    payload_json = Column(Text)
    created_at = Column(DateTime, default=datetime.now)


class ProjectAction(Base):
    __tablename__ = "pm_project_actions"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    status = Column(String(16), nullable=False, default="DRAFT")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class ProjectFunction(Base):
    __tablename__ = "pm_project_functions"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    script_content = Column(Text, nullable=False)
    status = Column(String(16), nullable=False, default="DRAFT")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
