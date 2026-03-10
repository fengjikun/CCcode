import type { DataSource, DataSourceCategory, DataSourceStatus } from '../../types/dataSource'
import { SYNC_FREQUENCY_LABELS } from '../../types/dataSource'

export interface IngestionJobView {
  id: string
  taskName: string
  sourceName: string
  category: DataSourceCategory
  categoryLabel: string
  dataSourceType: string
  scheduleLabel: string
  status: DataSourceStatus
  statusLabel: string
  lastRunLabel: string
  recordCount: number
  recordCountLabel: string
  targetLabel: string
}

export const DATA_SOURCE_STATUS_LABELS: Record<DataSourceStatus, string> = {
  Active: '正常',
  Inactive: '未启用',
  Error: '异常',
  Syncing: '同步中',
}

export function getIngestionCategoryLabel(category: DataSourceCategory): string {
  return category === 'structured' ? '数据库' : '对象存储'
}

export function formatIngestionRecordCount(value: number): string {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`
  return value.toLocaleString()
}

export function getIngestionTargetLabel(dataSource: DataSource): string {
  if (dataSource.category === 'structured') {
    const host = dataSource.connection.host || '-'
    const database = dataSource.connection.database || '-'
    return `${host} / ${database}`
  }

  const bucket = dataSource.connection.bucket || '-'
  const pathPrefix = dataSource.connection.pathPrefix || '/'
  return `${bucket} / ${pathPrefix}`
}

export function toIngestionJobView(dataSource: DataSource): IngestionJobView {
  return {
    id: dataSource.id,
    taskName: `${dataSource.name}接入任务`,
    sourceName: dataSource.name,
    category: dataSource.category,
    categoryLabel: getIngestionCategoryLabel(dataSource.category),
    dataSourceType: dataSource.type,
    scheduleLabel: SYNC_FREQUENCY_LABELS[dataSource.syncFrequency] || dataSource.syncFrequency,
    status: dataSource.status,
    statusLabel: DATA_SOURCE_STATUS_LABELS[dataSource.status],
    lastRunLabel: dataSource.lastSync || '未同步',
    recordCount: dataSource.recordCount,
    recordCountLabel: formatIngestionRecordCount(dataSource.recordCount),
    targetLabel: getIngestionTargetLabel(dataSource),
  }
}
