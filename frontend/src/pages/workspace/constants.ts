import type { DataSourceType, PropertyDataType } from '../../types/projectMvp'

export const PROPERTY_DATA_TYPES: PropertyDataType[] = [
  'STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'DATE', 'DATETIME', 'JSON', 'TEXT',
]

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
