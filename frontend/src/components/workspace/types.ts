import type {
  ActionStatus,
  DataSourceExtractMode,
  DataSourceSyncMode,
  DataSourceType,
  FunctionStatus,
  PropertyDataType,
  ProjectDetail,
} from '../../types/projectMvp'
import type { LinkType, ObjectType } from '../../types/ontology'

export type TabKey = 'documents' | 'schema' | 'extraction' | 'actions' | 'functions'

export interface ActionFormData {
  name: string
  description?: string
  status: ActionStatus
}

export interface FunctionFormData {
  name: string
  description?: string
  scriptContent: string
  status: FunctionStatus
}

export interface DataSourceFormData {
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
  tables?: string[]
  customSql?: string
  rowLimit: number
  syncMode: DataSourceSyncMode
  incrementalColumn?: string
}

export interface PublishFormData {
  label: string
  notes?: string
}

export type SchemaCreateType = 'ENTITY' | 'RELATION'

export interface SchemaCreateFormData {
  type: SchemaCreateType
  entityName?: string
  entityDescription?: string
  entityProperties?: Array<{
    id?: string
    name?: string
    displayName?: string
    dataType?: PropertyDataType
    required?: boolean
    defaultValue?: string
  }>
  relationName?: string
  relationDomain?: string
  relationRange?: string
  relationDescription?: string
  relationProperties?: Array<{
    id?: string
    name?: string
    displayName?: string
    dataType?: PropertyDataType
    required?: boolean
    defaultValue?: string
  }>
}

export interface RelationEndpointIssue {
  missingDomain: boolean
  missingRange: boolean
}

export interface SchemaViewModel {
  entities: ProjectDetail['schemaConfig']['entityTypes']
  relations: ProjectDetail['schemaConfig']['relationTypes']
  objectTypes: ObjectType[]
  linkTypes: LinkType[]
  graphObjectTypeIdByEntityId: Map<string, number>
  entityIdByGraphObjectTypeId: Map<number, string>
  relationIssuesById: Map<string, RelationEndpointIssue>
  edgeStatsByEntityId: Map<string, { incoming: number; outgoing: number }>
  virtualObjectTypeCount: number
}

export const PROPERTY_DATA_TYPES: PropertyDataType[] = ['STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'DATE', 'DATETIME', 'JSON', 'TEXT']

export const DATA_SOURCE_TYPE_OPTIONS: Array<{ label: string; value: DataSourceType }> = [
  { label: 'MySQL', value: 'MYSQL' },
  { label: 'PostgreSQL', value: 'POSTGRESQL' },
  { label: 'SQL Server', value: 'SQLSERVER' },
  { label: 'Oracle', value: 'ORACLE' },
  { label: 'ClickHouse', value: 'CLICKHOUSE' },
]

export const DEFAULT_PORT_BY_DATA_SOURCE_TYPE: Record<DataSourceType, number> = {
  MYSQL: 3306,
  POSTGRESQL: 5432,
  SQLSERVER: 1433,
  ORACLE: 1521,
  CLICKHOUSE: 8123,
}
