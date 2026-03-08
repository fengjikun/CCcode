/** L1 数据源类型定义 */

export type DataSourceCategory = 'structured' | 'unstructured'

export type StructuredType =
  | 'MySQL'
  | 'PostgreSQL'
  | 'Oracle'
  | 'SQL Server'
  | 'SAP ERP'
  | 'MongoDB'

export type UnstructuredType =
  | 'CSV'
  | 'Excel'
  | 'JSON'
  | 'XML'
  | 'PDF'
  | 'Word'
  | 'TXT'

export type DataSourceType = StructuredType | UnstructuredType

export type SyncFrequency = 'realtime' | '5min' | '15min' | 'hourly' | 'daily' | 'manual'

export type DataSourceStatus = 'Active' | 'Inactive' | 'Error' | 'Syncing'

export const STRUCTURED_TYPES: StructuredType[] = ['MySQL', 'PostgreSQL', 'Oracle', 'SQL Server', 'SAP ERP', 'MongoDB']
export const UNSTRUCTURED_TYPES: UnstructuredType[] = ['CSV', 'Excel', 'JSON', 'XML', 'PDF', 'Word', 'TXT']

export const SYNC_FREQUENCY_LABELS: Record<SyncFrequency, string> = {
  realtime: '实时',
  '5min': '每 5 分钟',
  '15min': '每 15 分钟',
  hourly: '每小时',
  daily: '每日',
  manual: '手动触发',
}

export const CATEGORY_LABELS: Record<DataSourceCategory, string> = {
  structured: '结构化数据',
  unstructured: '非结构化数据',
}

export const STATUS_COLORS: Record<DataSourceStatus, string> = {
  Active: 'green',
  Inactive: 'default',
  Error: 'red',
  Syncing: 'cyan',
}

export const TYPE_ICONS: Record<string, string> = {
  MySQL: '🐬',
  PostgreSQL: '🐘',
  Oracle: '🔴',
  'SQL Server': '🟦',
  'SAP ERP': '🏢',
  MongoDB: '🍃',
  CSV: '📄',
  Excel: '📊',
  JSON: '📋',
  XML: '📝',
  PDF: '📕',
  Word: '📘',
  TXT: '📃',
}

export interface DataSourceConnection {
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  fileName?: string
  fileSize?: number
  encoding?: string
}

export interface DataSource {
  id: string
  name: string
  category: DataSourceCategory
  type: DataSourceType
  connection: DataSourceConnection
  syncFrequency: SyncFrequency
  status: DataSourceStatus
  lastSync: string | null
  recordCount: number
  description?: string
  createdAt: string
  updatedAt: string
}
