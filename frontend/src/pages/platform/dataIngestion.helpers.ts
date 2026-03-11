import type { DataSource, DataSourceCategory, DataSourceStatus } from '../../types/dataSource'
import { SYNC_FREQUENCY_LABELS } from '../../types/dataSource'

export interface IngestionJobView {
  id: string
  taskName: string
  sourceName: string
  category: DataSourceCategory
  categoryLabel: string
  domainLabel: string
  dataSourceType: string
  ingestionModeLabel: string
  scheduleLabel: string
  status: DataSourceStatus
  statusLabel: string
  lastRunLabel: string
  recordCount: number
  recordCountLabel: string
  targetLabel: string
  outputLabel: string
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

export function getIngestionDomainLabel(dataSource: DataSource): string {
  const name = dataSource.name
  if (name.includes('工单')) return '工单域'
  if (name.includes('台账')) return '资产域'
  if (name.includes('告警')) return '告警域'
  if (name.includes('PLC')) return '设备日志域'
  if (name.includes('传感器')) return '时序信号域'
  if (name.includes('维修履历')) return '维修知识域'
  if (name.includes('点检')) return '巡检保养域'
  if (name.includes('备件')) return '备件域'
  if (name.includes('交接班')) return '现场文本域'
  if (name.includes('波形')) return '波形文件域'
  if (name.includes('热像')) return '视觉资料域'
  if (name.includes('手册')) return '知识文档域'
  if (name.includes('复盘')) return '复盘报告域'
  if (name.includes('日志')) return '原始日志域'
  return '通用源数据'
}

export function getIngestionModeLabel(dataSource: DataSource): string {
  const name = dataSource.name
  if (dataSource.category === 'structured') {
    if (name.includes('告警')) return '实时事件流'
    if (name.includes('PLC') || name.includes('传感器')) return '分钟批采'
    if (name.includes('台账')) return '全量对账'
    if (name.includes('工单') || name.includes('备件')) return '增量 CDC'
    return '定时抽取'
  }

  if (name.includes('日志')) return '文件增量扫描'
  if (name.includes('波形')) return '批量文件采集'
  if (name.includes('热像')) return '图像归档同步'
  if (name.includes('手册') || name.includes('复盘')) return '文档增量同步'
  return '对象存储同步'
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

export function getIngestionOutputLabel(dataSource: DataSource): string {
  const name = dataSource.name
  if (name.includes('工单')) return '落地 ODS 工单中心 / fault_work_order'
  if (name.includes('台账')) return '落地 DIM 设备主数据 / equipment_asset'
  if (name.includes('告警')) return '落地告警事件中心 / alarm_event_stream'
  if (name.includes('PLC')) return '落地设备运行主题 / plc_runtime_log'
  if (name.includes('传感器')) return '落地时序特征仓 / sensor_timeseries'
  if (name.includes('维修履历')) return '落地维修案例仓 / maintenance_case'
  if (name.includes('点检')) return '落地巡检记录仓 / inspection_task'
  if (name.includes('备件')) return '落地备件保障仓 / spare_part_inventory'
  if (name.includes('交接班')) return '落地文本事件仓 / shift_handover_note'
  if (name.includes('日志')) return '落地原始日志区 / raw_machine_logs'
  if (name.includes('波形')) return '落地波形特征区 / waveform_feature_store'
  if (name.includes('热像')) return '落地图像证据区 / thermal_image_evidence'
  if (name.includes('手册')) return '落地知识文档区 / maintenance_manual_docs'
  if (name.includes('复盘')) return '落地复盘知识区 / rca_report_docs'
  return '落地标准接入区'
}

export function toIngestionJobView(dataSource: DataSource): IngestionJobView {
  return {
    id: dataSource.id,
    taskName: `${dataSource.name}采集任务`,
    sourceName: dataSource.name,
    category: dataSource.category,
    categoryLabel: getIngestionCategoryLabel(dataSource.category),
    domainLabel: getIngestionDomainLabel(dataSource),
    dataSourceType: dataSource.type,
    ingestionModeLabel: getIngestionModeLabel(dataSource),
    scheduleLabel: SYNC_FREQUENCY_LABELS[dataSource.syncFrequency] || dataSource.syncFrequency,
    status: dataSource.status,
    statusLabel: DATA_SOURCE_STATUS_LABELS[dataSource.status],
    lastRunLabel: dataSource.lastSync || '未同步',
    recordCount: dataSource.recordCount,
    recordCountLabel: formatIngestionRecordCount(dataSource.recordCount),
    targetLabel: getIngestionTargetLabel(dataSource),
    outputLabel: getIngestionOutputLabel(dataSource),
  }
}
