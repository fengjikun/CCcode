export type DocumentStatus = 'READY' | 'FAILED'
export type RunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED'
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type ActionStatus = 'DRAFT' | 'ACTIVE'
export type FunctionStatus = 'DRAFT' | 'ACTIVE'
export type DataSourceType = 'MYSQL' | 'POSTGRESQL' | 'SQLSERVER' | 'ORACLE' | 'CLICKHOUSE'
export type DataSourceStatus = 'UNKNOWN' | 'SUCCESS' | 'FAILED'
export type DataSourceExtractMode = 'TABLE' | 'SQL'
export type DataSourceSyncMode = 'FULL' | 'INCREMENTAL'

export interface ProjectDocument {
  id: string
  name: string
  fileType: 'docx' | 'md'
  size: number
  status: DocumentStatus
  enabled: boolean
  uploadedAt: string
}

export interface StructuredDataSource {
  id: string
  name: string
  type: DataSourceType
  host: string
  port: number
  database: string
  schema?: string
  username: string
  password: string
  sslEnabled: boolean
  enabled: boolean
  extractMode: DataSourceExtractMode
  tables: string[]
  customSql?: string
  rowLimit: number
  syncMode: DataSourceSyncMode
  incrementalColumn?: string
  status: DataSourceStatus
  lastTestAt?: string
  lastError?: string
  createdAt: string
  updatedAt: string
}

export interface EntityTypeConfig {
  id: string
  name: string
  description?: string
  properties: EntityPropertyConfig[]
}

export interface RelationTypeConfig {
  id: string
  name: string
  domain: string
  range: string
  description?: string
  properties: EntityPropertyConfig[]
}

export type PropertyDataType =
  | 'STRING'
  | 'INTEGER'
  | 'FLOAT'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'JSON'
  | 'TEXT'

export interface EntityPropertyConfig {
  id: string
  name: string
  displayName: string
  dataType: PropertyDataType
  required: boolean
  defaultValue?: string
  description?: string
  sortOrder: number
}

export type SkillCode = 'data_processing' | 'graph_synthesis' | 'custom'
export type SkillSource = 'built_in' | 'uploaded'

export interface SkillConfig {
  id: string
  code: SkillCode
  name: string
  description?: string
  enabled: boolean
  prompt: string
  source: SkillSource
  tags?: string[]
  blocked?: boolean
  missing?: string
  fileName?: string
  createdAt?: string
}

export interface SchemaConfig {
  entityTypes: EntityTypeConfig[]
  relationTypes: RelationTypeConfig[]
  entityScope: string
  relationScope: string
  skills: SkillConfig[]
  updatedAt: string
}

export interface ReviewItem {
  id: string
  kind: 'ENTITY' | 'RELATION'
  title: string
  evidence: string
  confidence: number
  status: ReviewStatus
}

export interface ExtractionRun {
  id: string
  status: RunStatus
  progress: number
  createdAt: string
  completedAt?: string
  candidateEntityCount: number
  candidateRelationCount: number
  pendingReviewCount: number
  reviewItems: ReviewItem[]
}

export interface OntologyVersion {
  id: string
  version: string
  label: string
  createdAt: string
  sourceRunId: string
  entityCount: number
  relationCount: number
}

export interface ActionDefinition {
  id: string
  name: string
  description?: string
  status: ActionStatus
}

export interface FunctionDefinition {
  id: string
  name: string
  description?: string
  scriptContent: string
  status: FunctionStatus
}

export interface ProjectDetail {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  currentVersionId?: string
  documents: ProjectDocument[]
  dataSources: StructuredDataSource[]
  schemaConfig: SchemaConfig
  runs: ExtractionRun[]
  versions: OntologyVersion[]
  actions: ActionDefinition[]
  functions: FunctionDefinition[]
}

export interface ProjectSummary {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  documentCount: number
  versionCount: number
  latestRunStatus?: RunStatus
}
