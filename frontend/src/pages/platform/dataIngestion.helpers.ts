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

function containsAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword))
}

export function getIngestionCategoryLabel(category: DataSourceCategory): string {
  return category === 'structured' ? '数据库' : '对象存储'
}

export function getIngestionDomainLabel(dataSource: DataSource): string {
  const name = dataSource.name
  if (containsAnyKeyword(name, ['工单'])) return '工单域'
  if (containsAnyKeyword(name, ['台账'])) return '资产域'
  if (containsAnyKeyword(name, ['告警'])) return '告警域'
  if (containsAnyKeyword(name, ['PLC'])) return '设备日志域'
  if (containsAnyKeyword(name, ['传感器'])) return '时序信号域'
  if (containsAnyKeyword(name, ['维修履历'])) return '维修知识域'
  if (containsAnyKeyword(name, ['点检'])) return '巡检保养域'
  if (containsAnyKeyword(name, ['备件'])) return '备件域'
  if (containsAnyKeyword(name, ['交接班'])) return '现场文本域'
  if (containsAnyKeyword(name, ['波形'])) return '波形文件域'
  if (containsAnyKeyword(name, ['热像'])) return '视觉资料域'
  if (containsAnyKeyword(name, ['手册'])) return '知识文档域'
  if (containsAnyKeyword(name, ['复盘'])) return '复盘报告域'
  if (containsAnyKeyword(name, ['日志'])) return '原始日志域'
  if (containsAnyKeyword(name, ['销售订单', '零售 ERP', 'ERP 销售'])) return '销售履约域'
  if (containsAnyKeyword(name, ['库存', '在途', 'WMS'])) return '库存供给域'
  if (containsAnyKeyword(name, ['商品主数据', '尺码'])) return '商品策略域'
  if (containsAnyKeyword(name, ['补货计划', '调拨'])) return '补货执行域'
  if (containsAnyKeyword(name, ['业务说明'])) return '业务规则域'
  if (containsAnyKeyword(name, ['规则'])) return '分配规则域'
  return '通用源数据'
}

export function getIngestionModeLabel(dataSource: DataSource): string {
  const name = dataSource.name
  if (dataSource.category === 'structured') {
    if (containsAnyKeyword(name, ['告警'])) return '实时事件流'
    if (containsAnyKeyword(name, ['PLC', '传感器', '库存', '在途', 'WMS'])) return '分钟批采'
    if (containsAnyKeyword(name, ['台账', '商品主数据', '尺码'])) return '全量对账'
    if (containsAnyKeyword(name, ['工单', '备件', '销售订单', '补货计划', '调拨'])) return '增量 CDC'
    return '定时抽取'
  }

  if (containsAnyKeyword(name, ['日志'])) return '文件增量扫描'
  if (containsAnyKeyword(name, ['波形', '调拨单', '执行样本'])) return '批量文件采集'
  if (containsAnyKeyword(name, ['热像'])) return '图像归档同步'
  if (containsAnyKeyword(name, ['手册', '复盘', '业务说明', '规则'])) return '文档增量同步'
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
  if (containsAnyKeyword(name, ['工单'])) return '落地 ODS 工单中心 / fault_work_order'
  if (containsAnyKeyword(name, ['台账'])) return '落地 DIM 设备主数据 / equipment_asset'
  if (containsAnyKeyword(name, ['告警'])) return '落地告警事件中心 / alarm_event_stream'
  if (containsAnyKeyword(name, ['PLC'])) return '落地设备运行主题 / plc_runtime_log'
  if (containsAnyKeyword(name, ['传感器'])) return '落地时序特征仓 / sensor_timeseries'
  if (containsAnyKeyword(name, ['维修履历'])) return '落地维修案例仓 / maintenance_case'
  if (containsAnyKeyword(name, ['点检'])) return '落地巡检记录仓 / inspection_task'
  if (containsAnyKeyword(name, ['备件'])) return '落地备件保障仓 / spare_part_inventory'
  if (containsAnyKeyword(name, ['交接班'])) return '落地文本事件仓 / shift_handover_note'
  if (containsAnyKeyword(name, ['日志'])) return '落地原始日志区 / raw_machine_logs'
  if (containsAnyKeyword(name, ['波形'])) return '落地波形特征区 / waveform_feature_store'
  if (containsAnyKeyword(name, ['热像'])) return '落地图像证据区 / thermal_image_evidence'
  if (containsAnyKeyword(name, ['手册'])) return '落地知识文档区 / maintenance_manual_docs'
  if (containsAnyKeyword(name, ['复盘'])) return '落地复盘知识区 / rca_report_docs'
  if (containsAnyKeyword(name, ['销售订单', '零售 ERP', 'ERP 销售'])) return '落地销售履约主题 / retail_sales_order_fact'
  if (containsAnyKeyword(name, ['库存', '在途', 'WMS'])) return '落地库存供给主题 / inventory_supply_snapshot'
  if (containsAnyKeyword(name, ['商品主数据', '尺码'])) return '落地商品策略维表 / product_size_profile'
  if (containsAnyKeyword(name, ['补货计划', '调拨'])) return '落地补货执行主题 / replenishment_plan_fact'
  if (containsAnyKeyword(name, ['业务说明'])) return '落地补货规则文档区 / replenishment_spec_docs'
  if (containsAnyKeyword(name, ['规则'])) return '落地尺码策略区 / size_allocation_rules'
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
