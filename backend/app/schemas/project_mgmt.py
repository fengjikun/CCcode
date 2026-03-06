from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, from_attributes=True)


class DocumentStatus(str, Enum):
    READY = "READY"
    FAILED = "FAILED"
    PROCESSING = "PROCESSING"


class RunStatus(str, Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELED = "CANCELED"


class ReviewStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ActionStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"


class FunctionStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"


class DataSourceType(str, Enum):
    MYSQL = "MYSQL"
    POSTGRESQL = "POSTGRESQL"
    SQLSERVER = "SQLSERVER"
    ORACLE = "ORACLE"
    CLICKHOUSE = "CLICKHOUSE"


class DataSourceStatus(str, Enum):
    UNKNOWN = "UNKNOWN"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class DataSourceExtractMode(str, Enum):
    TABLE = "TABLE"
    SQL = "SQL"


class DataSourceSyncMode(str, Enum):
    FULL = "FULL"
    INCREMENTAL = "INCREMENTAL"


class PropertyDataType(str, Enum):
    STRING = "STRING"
    INTEGER = "INTEGER"
    FLOAT = "FLOAT"
    BOOLEAN = "BOOLEAN"
    DATE = "DATE"
    DATETIME = "DATETIME"
    JSON = "JSON"
    TEXT = "TEXT"


class ReviewKind(str, Enum):
    ENTITY = "ENTITY"
    RELATION = "RELATION"


class SkillCode(str, Enum):
    DATA_PROCESSING = "data_processing"
    GRAPH_SYNTHESIS = "graph_synthesis"
    CUSTOM = "custom"


class SkillSource(str, Enum):
    BUILT_IN = "built_in"
    UPLOADED = "uploaded"


class ProjectCreateRequest(_CamelModel):
    name: str
    description: Optional[str] = None


class ProjectSummary(_CamelModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    document_count: int
    version_count: int
    latest_run_status: Optional[RunStatus] = None


class EnabledPatchRequest(_CamelModel):
    enabled: bool


class ProjectDocument(_CamelModel):
    id: str
    name: str
    file_type: str
    size: int
    status: DocumentStatus
    enabled: bool
    uploaded_at: datetime


class DataSourceUpsertRequest(_CamelModel):
    name: str
    type: DataSourceType
    host: str
    port: int
    database: str
    schema: Optional[str] = None
    username: str
    password: Optional[str] = None
    ssl_enabled: bool = False
    enabled: bool = True
    extract_mode: DataSourceExtractMode
    tables: list[str] = Field(default_factory=list)
    custom_sql: Optional[str] = None
    row_limit: int
    sync_mode: DataSourceSyncMode
    incremental_column: Optional[str] = None


class ProjectDataSource(_CamelModel):
    id: str
    name: str
    type: DataSourceType
    host: str
    port: int
    database: str
    schema: Optional[str] = None
    username: str
    password_masked: Optional[str] = None
    ssl_enabled: bool
    enabled: bool
    extract_mode: DataSourceExtractMode
    tables: list[str] = Field(default_factory=list)
    custom_sql: Optional[str] = None
    row_limit: int
    sync_mode: DataSourceSyncMode
    incremental_column: Optional[str] = None
    status: DataSourceStatus
    last_test_at: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ConnectionTestResult(_CamelModel):
    status: str
    tested_at: datetime
    message: str


class SchemaProperty(_CamelModel):
    id: str
    name: str
    display_name: str
    data_type: PropertyDataType
    required: bool
    default_value: Optional[str] = None
    description: Optional[str] = None
    sort_order: int


class SchemaPropertyUpsert(_CamelModel):
    id: Optional[str] = None
    name: str
    display_name: Optional[str] = None
    data_type: PropertyDataType = PropertyDataType.STRING
    required: bool = False
    default_value: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None


class EntityTypeUpsertRequest(_CamelModel):
    name: str
    description: Optional[str] = None
    properties: list[SchemaPropertyUpsert] = Field(default_factory=list)


class EntityType(_CamelModel):
    id: str
    name: str
    description: Optional[str] = None
    properties: list[SchemaProperty] = Field(default_factory=list)


class RelationTypeUpsertRequest(_CamelModel):
    name: str
    domain: str
    range: str
    description: Optional[str] = None
    properties: list[SchemaPropertyUpsert] = Field(default_factory=list)


class RelationType(_CamelModel):
    id: str
    name: str
    domain: str
    range: str
    description: Optional[str] = None
    properties: list[SchemaProperty] = Field(default_factory=list)


class SkillConfig(_CamelModel):
    id: str
    code: SkillCode
    name: str
    description: Optional[str] = None
    enabled: bool
    prompt: str
    source: SkillSource
    tags: list[str] = Field(default_factory=list)
    blocked: bool = False
    missing: Optional[str] = None
    file_name: Optional[str] = None
    created_at: Optional[datetime] = None


class SchemaConfig(_CamelModel):
    entity_types: list[EntityType] = Field(default_factory=list)
    relation_types: list[RelationType] = Field(default_factory=list)
    entity_scope: str = ""
    relation_scope: str = ""
    skills: list[SkillConfig] = Field(default_factory=list)
    updated_at: datetime


class SchemaPromptsUpdateRequest(_CamelModel):
    entity_scope: str
    relation_scope: str
    skills: list[SkillConfig] = Field(default_factory=list)


class AiInsightResult(_CamelModel):
    scanned_document_count: int
    added_entity_count: int
    added_relation_count: int
    added_entity_names: list[str]
    added_relation_names: list[str]
    warnings: list[str] = Field(default_factory=list)


class ReviewItem(_CamelModel):
    id: str
    kind: ReviewKind
    title: str
    evidence: str
    confidence: float
    status: ReviewStatus
    entity_type_name: Optional[str] = None
    entity_name: Optional[str] = None
    relation_type_name: Optional[str] = None
    relation_domain_name: Optional[str] = None
    relation_range_name: Optional[str] = None


class ExtractionRun(_CamelModel):
    id: str
    status: RunStatus
    progress: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    candidate_entity_count: int
    candidate_relation_count: int
    pending_review_count: int
    review_items: list[ReviewItem] = Field(default_factory=list)


class ReviewStatusUpdateRequest(_CamelModel):
    status: ReviewStatus


class PublishVersionRequest(_CamelModel):
    label: str
    notes: Optional[str] = None


class OntologyVersion(_CamelModel):
    id: str
    version: str
    label: str
    notes: Optional[str] = None
    created_at: datetime
    source_run_id: str
    entity_count: int
    relation_count: int


class ActionCreateRequest(_CamelModel):
    name: str
    description: Optional[str] = None
    status: ActionStatus = ActionStatus.DRAFT


class ActionStatusPatchRequest(_CamelModel):
    status: ActionStatus


class ProjectAction(_CamelModel):
    id: str
    name: str
    description: Optional[str] = None
    status: ActionStatus


class FunctionCreateRequest(_CamelModel):
    name: str
    description: Optional[str] = None
    script_content: str
    status: FunctionStatus = FunctionStatus.DRAFT


class FunctionStatusPatchRequest(_CamelModel):
    status: FunctionStatus


class ProjectFunction(_CamelModel):
    id: str
    name: str
    description: Optional[str] = None
    script_content: str
    status: FunctionStatus


class ProjectDetail(_CamelModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    current_version_id: Optional[str] = None
    documents: list[ProjectDocument] = Field(default_factory=list)
    data_sources: list[ProjectDataSource] = Field(default_factory=list)
    schema_config: SchemaConfig
    runs: list[ExtractionRun] = Field(default_factory=list)
    versions: list[OntologyVersion] = Field(default_factory=list)
    actions: list[ProjectAction] = Field(default_factory=list)
    functions: list[ProjectFunction] = Field(default_factory=list)
