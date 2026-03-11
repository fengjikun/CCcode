import type {
  DataSource,
  DataSourceCategory,
  DataSourceConnection,
  DataSourceStatus,
  DataSourceType,
  ObjectStorageType,
  StructuredType,
  SyncFrequency,
} from '../types/dataSource'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'data-sources'
const DATA_VERSION = 7

interface DSStore {
  items: DataSource[]
  _v?: number
}

const STRUCTURED_PORTS: Record<StructuredType, number> = {
  MySQL: 3306,
  PostgreSQL: 5432,
  Oracle: 1521,
  'SQL Server': 1433,
  'SAP ERP': 3300,
  MongoDB: 27017,
}

function buildStructuredSource(input: {
  id: string
  name: string
  type: StructuredType
  host: string
  database: string
  username: string
  syncFrequency: SyncFrequency
  status: DataSourceStatus
  lastSync: string | null
  recordCount: number
  description: string
  createdAt: string
  updatedAt: string
}): DataSource {
  return {
    id: input.id,
    name: input.name,
    category: 'structured',
    type: input.type,
    connection: {
      host: input.host,
      port: STRUCTURED_PORTS[input.type],
      database: input.database,
      username: input.username,
      password: 'mock_password',
    },
    syncFrequency: input.syncFrequency,
    status: input.status,
    lastSync: input.lastSync,
    recordCount: input.recordCount,
    description: input.description,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  }
}

function buildObjectStorageSource(input: {
  id: string
  name: string
  type: ObjectStorageType
  endpoint: string
  bucket: string
  region: string
  pathPrefix: string
  syncFrequency: SyncFrequency
  status: DataSourceStatus
  lastSync: string | null
  recordCount: number
  description: string
  createdAt: string
  updatedAt: string
}): DataSource {
  return {
    id: input.id,
    name: input.name,
    category: 'unstructured',
    type: input.type,
    connection: {
      endpoint: input.endpoint,
      bucket: input.bucket,
      region: input.region,
      pathPrefix: input.pathPrefix,
      accessKey: 'mock_access_key',
      secretKey: 'mock_secret_key',
    },
    syncFrequency: input.syncFrequency,
    status: input.status,
    lastSync: input.lastSync,
    recordCount: input.recordCount,
    description: input.description,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  }
}

function buildDefaultItems(): DataSource[] {
  return [
    buildStructuredSource({
      id: 'ds-fault-work-orders',
      name: '故障工单主表',
      type: 'PostgreSQL',
      host: 'pg-fault-workorder.factory.local',
      database: 'fault_workorder_ods',
      username: 'fault_reader',
      syncFrequency: '15min',
      status: 'Active',
      lastSync: '2 分钟前',
      recordCount: 286540,
      description: '设备故障工单源数据，包含报修、派工、响应、完工、关闭等完整生命周期字段。',
      createdAt: '2025-01-08T09:00:00.000Z',
      updatedAt: '2026-03-11T08:30:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-equipment-master',
      name: '设备台账主数据',
      type: 'MySQL',
      host: 'mysql-eam.factory.local',
      database: 'eam_masterdata',
      username: 'eam_reader',
      syncFrequency: 'daily',
      status: 'Active',
      lastSync: '今天 04:10',
      recordCount: 18420,
      description: '设备主数据源，提供机型、产线、安装位置、维保等级、责任班组等台账维度。',
      createdAt: '2024-12-12T08:00:00.000Z',
      updatedAt: '2026-03-11T04:10:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-alarm-events',
      name: '设备告警事件表',
      type: 'MongoDB',
      host: 'mongo-alarm.factory.local',
      database: 'alarm_event_hub',
      username: 'alarm_reader',
      syncFrequency: 'realtime',
      status: 'Syncing',
      lastSync: '同步中',
      recordCount: 8234512,
      description: '采集 PLC、SCADA、边缘网关上报的原始告警事件，用于告警聚类、压缩和关联分析。',
      createdAt: '2025-02-01T06:00:00.000Z',
      updatedAt: '2026-03-11T08:32:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-plc-runtime-logs',
      name: 'PLC 运行日志',
      type: 'SQL Server',
      host: 'sql-plc-historian.factory.local',
      database: 'plc_historian',
      username: 'plc_reader',
      syncFrequency: '5min',
      status: 'Active',
      lastSync: '1 分钟前',
      recordCount: 16780436,
      description: '产线 PLC 运行日志源数据，保留启停机、状态位、错误码、配方切换等事件记录。',
      createdAt: '2025-01-15T07:30:00.000Z',
      updatedAt: '2026-03-11T08:31:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-sensor-timeseries',
      name: '传感器时序归档',
      type: 'Oracle',
      host: 'oracle-iot-archive.factory.local',
      database: 'iot_ts_archive',
      username: 'iot_reader',
      syncFrequency: '5min',
      status: 'Active',
      lastSync: '4 分钟前',
      recordCount: 24890541,
      description: '振动、温度、电流、压力等多维传感器时序源数据，用于异常波动识别和趋势预测。',
      createdAt: '2025-01-20T09:20:00.000Z',
      updatedAt: '2026-03-11T08:28:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-maintenance-history',
      name: '维修履历宽表',
      type: 'PostgreSQL',
      host: 'pg-maint-history.factory.local',
      database: 'maintenance_dw',
      username: 'maintenance_reader',
      syncFrequency: 'hourly',
      status: 'Active',
      lastSync: '36 分钟前',
      recordCount: 146883,
      description: '沉淀故障根因、维修措施、更换部件、停机时长和维修结果，用于案例检索与复盘分析。',
      createdAt: '2024-11-18T08:00:00.000Z',
      updatedAt: '2026-03-11T07:55:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-inspection-records',
      name: '点检记录表',
      type: 'MySQL',
      host: 'mysql-patrol.factory.local',
      database: 'inspection_ops',
      username: 'patrol_reader',
      syncFrequency: 'hourly',
      status: 'Active',
      lastSync: '12 分钟前',
      recordCount: 569204,
      description: '巡检、点检、保养任务的原始执行记录，包含点检项、测量值、图片引用和异常备注。',
      createdAt: '2025-02-03T09:00:00.000Z',
      updatedAt: '2026-03-11T08:20:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-spare-parts-stock',
      name: '备件库存与领用',
      type: 'SAP ERP',
      host: 'sap-pm.factory.local',
      database: 'PM1',
      username: 'sap_pm_reader',
      syncFrequency: 'hourly',
      status: 'Active',
      lastSync: '48 分钟前',
      recordCount: 38217,
      description: '备件库存、领料、采购申请和到货记录源数据，用于维修决策和备件保障分析。',
      createdAt: '2024-10-10T08:00:00.000Z',
      updatedAt: '2026-03-11T07:42:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-shift-handover',
      name: '班组交接班记录',
      type: 'SQL Server',
      host: 'sql-shift.factory.local',
      database: 'shift_handover',
      username: 'shift_reader',
      syncFrequency: 'daily',
      status: 'Inactive',
      lastSync: null,
      recordCount: 22841,
      description: '交接班文本记录和异常摘要，用于还原故障发生前后的操作背景与现场上下文。',
      createdAt: '2025-01-05T08:00:00.000Z',
      updatedAt: '2026-03-08T23:10:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-retail-sales-orders',
      name: '零售 ERP 销售订单事实库',
      type: 'SAP ERP',
      host: 'sap-retail-order.ops.local',
      database: 'RTL1',
      username: 'retail_sales_reader',
      syncFrequency: '15min',
      status: 'Active',
      lastSync: '7 分钟前',
      recordCount: 3582641,
      description: '商品补货核心销售事实源，按门店、SKU、尺码沉淀近 14 日销量、退货和活动订单明细。',
      createdAt: '2025-02-12T08:00:00.000Z',
      updatedAt: '2026-03-11T08:25:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-wms-stock-snapshot',
      name: 'WMS 仓库库存与在途快照库',
      type: 'MySQL',
      host: 'mysql-wms-stock.ops.local',
      database: 'wms_supply_snapshot',
      username: 'wms_reader',
      syncFrequency: '5min',
      status: 'Syncing',
      lastSync: '同步中',
      recordCount: 1260842,
      description: '沉淀仓库可用库存、门店库存、锁定库存和在途数量，为补货缺口测算与分仓供给提供依据。',
      createdAt: '2025-02-15T08:00:00.000Z',
      updatedAt: '2026-03-11T08:33:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-product-size-master',
      name: '商品主数据与尺码曲线中心',
      type: 'PostgreSQL',
      host: 'pg-product-master.ops.local',
      database: 'retail_product_md',
      username: 'product_reader',
      syncFrequency: 'daily',
      status: 'Active',
      lastSync: '今天 02:40',
      recordCount: 468930,
      description: '维护品牌、品类、生命周期、标准尺码曲线、黄金尺码和门店补货优先级等补货主数据。',
      createdAt: '2025-01-28T08:00:00.000Z',
      updatedAt: '2026-03-11T02:40:00.000Z',
    }),
    buildStructuredSource({
      id: 'ds-replenishment-plans',
      name: '门店补货计划与调拨单',
      type: 'SQL Server',
      host: 'sql-replenishment-plan.ops.local',
      database: 'replenishment_execution',
      username: 'replenishment_reader',
      syncFrequency: 'hourly',
      status: 'Active',
      lastSync: '21 分钟前',
      recordCount: 184225,
      description: '记录理论补货缺口、实际分配结果、调拨单号和预计到货时间，用于执行闭环与效果复盘。',
      createdAt: '2025-02-20T08:00:00.000Z',
      updatedAt: '2026-03-11T08:12:00.000Z',
    }),
    buildObjectStorageSource({
      id: 'ds-machine-log-files',
      name: '机台原始日志文件库',
      type: 'MinIO',
      endpoint: 'https://minio-factory.local',
      bucket: 'fault-machine-log-raw',
      region: 'cn-east-1',
      pathPrefix: 'machines/raw-logs/',
      syncFrequency: '15min',
      status: 'Active',
      lastSync: '6 分钟前',
      recordCount: 128943,
      description: '保存 CNC、压铸机、贴片机等设备导出的 txt、csv、zip 日志原件。',
      createdAt: '2025-01-09T08:00:00.000Z',
      updatedAt: '2026-03-11T08:26:00.000Z',
    }),
    buildObjectStorageSource({
      id: 'ds-vibration-waveforms',
      name: '振动波形文件库',
      type: 'S3',
      endpoint: 'https://s3-factory.local',
      bucket: 'fault-vibration-waveforms',
      region: 'cn-north-1',
      pathPrefix: 'condition-monitoring/vibration/',
      syncFrequency: 'hourly',
      status: 'Active',
      lastSync: '55 分钟前',
      recordCount: 68420,
      description: '轴承、电机、主轴等关键部件的波形包和频谱文件，用于频域分析和故障模式识别。',
      createdAt: '2025-01-22T08:00:00.000Z',
      updatedAt: '2026-03-11T07:40:00.000Z',
    }),
    buildObjectStorageSource({
      id: 'ds-thermal-images',
      name: '红外热像图片库',
      type: 'OSS',
      endpoint: 'https://oss-factory.local',
      bucket: 'fault-thermal-images',
      region: 'cn-south-1',
      pathPrefix: 'inspection/thermal-images/',
      syncFrequency: 'daily',
      status: 'Active',
      lastSync: '今天 03:20',
      recordCount: 25607,
      description: '巡检热像图、关键设备热点图片和缺陷截图，用于视觉诊断与证据留存。',
      createdAt: '2025-02-08T08:00:00.000Z',
      updatedAt: '2026-03-11T03:20:00.000Z',
    }),
    buildObjectStorageSource({
      id: 'ds-maintenance-manuals',
      name: '维修手册知识库',
      type: 'MinIO',
      endpoint: 'https://minio-knowledge.local',
      bucket: 'fault-maintenance-manuals',
      region: 'cn-east-1',
      pathPrefix: 'manuals/sop/',
      syncFrequency: 'manual',
      status: 'Active',
      lastSync: '3 天前',
      recordCount: 1832,
      description: '设备维修手册、故障代码说明、SOP、点检标准等知识文档源文件。',
      createdAt: '2024-09-15T08:00:00.000Z',
      updatedAt: '2026-03-08T11:00:00.000Z',
    }),
    buildObjectStorageSource({
      id: 'ds-rca-reports',
      name: '故障复盘报告库',
      type: 'S3',
      endpoint: 'https://s3-ops.local',
      bucket: 'fault-rca-reports',
      region: 'ap-southeast-1',
      pathPrefix: 'rca/reports/',
      syncFrequency: 'daily',
      status: 'Active',
      lastSync: '昨天 23:40',
      recordCount: 4216,
      description: 'RCA 分析报告、8D 报告、停机复盘材料和专家会诊纪要等复盘文档。',
      createdAt: '2024-11-01T08:00:00.000Z',
      updatedAt: '2026-03-10T23:40:00.000Z',
    }),
    buildObjectStorageSource({
      id: 'ds-replenishment-docs',
      name: '商品补货业务说明文档库',
      type: 'MinIO',
      endpoint: 'https://minio-retail-docs.local',
      bucket: 'retail-replenishment-docs',
      region: 'cn-east-1',
      pathPrefix: 'docs/replenishment/',
      syncFrequency: 'manual',
      status: 'Active',
      lastSync: '2 天前',
      recordCount: 286,
      description: '保存补货业务说明、ERP-WMS 字段映射、策略阈值和流程规范文档，支撑业务建模与规则解释。',
      createdAt: '2025-02-10T08:00:00.000Z',
      updatedAt: '2026-03-09T16:20:00.000Z',
    }),
    buildObjectStorageSource({
      id: 'ds-size-rules',
      name: '尺码规则与优先分配文件库',
      type: 'OSS',
      endpoint: 'https://oss-retail-rules.local',
      bucket: 'retail-size-rules',
      region: 'cn-south-1',
      pathPrefix: 'rules/size-and-priority/',
      syncFrequency: 'daily',
      status: 'Active',
      lastSync: '今天 01:50',
      recordCount: 942,
      description: '存放尺码曲线、黄金尺码保障规则、A 类门店优先级和断码例外策略等非结构化规则文件。',
      createdAt: '2025-02-18T08:00:00.000Z',
      updatedAt: '2026-03-11T01:50:00.000Z',
    }),
    buildObjectStorageSource({
      id: 'ds-transfer-order-samples',
      name: '门店调拨单执行样本库',
      type: 'S3',
      endpoint: 'https://s3-retail-exec.local',
      bucket: 'retail-transfer-orders',
      region: 'ap-southeast-1',
      pathPrefix: 'orders/transfer/',
      syncFrequency: 'hourly',
      status: 'Active',
      lastSync: '44 分钟前',
      recordCount: 16754,
      description: '沉淀门店调拨单 JSON 样本、批量下发模板和执行回执，用于接口联调与执行追踪。',
      createdAt: '2025-02-22T08:00:00.000Z',
      updatedAt: '2026-03-11T07:48:00.000Z',
    }),
    buildObjectStorageSource({
      id: 'ds-replenishment-reviews',
      name: '补货复盘报告与运营周报',
      type: 'MinIO',
      endpoint: 'https://minio-retail-review.local',
      bucket: 'retail-replenishment-review',
      region: 'cn-east-1',
      pathPrefix: 'reviews/weekly/',
      syncFrequency: 'daily',
      status: 'Active',
      lastSync: '昨天 22:10',
      recordCount: 1208,
      description: '保存补货复盘报告、门店缺口汇总、尺码满足率分析和运营周报，用于持续优化补货策略。',
      createdAt: '2025-02-25T08:00:00.000Z',
      updatedAt: '2026-03-10T22:10:00.000Z',
    }),
  ]
}

const DEFAULT_STORE: DSStore = {
  items: buildDefaultItems(),
  _v: DATA_VERSION,
}

async function saveStore(store: DSStore): Promise<void> {
  await setMockStore(STORE_KEY, store)
}

async function loadStore(): Promise<DSStore> {
  const store = await ensureMockStore<DSStore>(STORE_KEY, DEFAULT_STORE)
  if (store._v === DATA_VERSION && Array.isArray(store.items)) {
    return store
  }

  await saveStore(DEFAULT_STORE)
  return DEFAULT_STORE
}

export async function listDataSources(): Promise<DataSource[]> {
  return (await loadStore()).items
}

export async function getDataSource(id: string): Promise<DataSource | null> {
  return (await loadStore()).items.find(d => d.id === id) ?? null
}

export async function createDataSource(input: {
  name: string
  category: DataSourceCategory
  type: DataSourceType
  connection: DataSourceConnection
  syncFrequency: SyncFrequency
  description?: string
}): Promise<DataSource> {
  const now = new Date().toISOString()
  const ds: DataSource = {
    id: `ds-${Date.now()}`,
    name: input.name,
    category: input.category,
    type: input.type,
    connection: input.connection,
    syncFrequency: input.syncFrequency,
    status: 'Active',
    lastSync: null,
    recordCount: 0,
    description: input.description,
    createdAt: now,
    updatedAt: now,
  }
  const store = await loadStore()
  store.items.push(ds)
  await saveStore(store)
  return ds
}

export async function updateDataSource(
  id: string,
  patch: Partial<Pick<DataSource, 'name' | 'description' | 'syncFrequency' | 'connection' | 'status'>>,
): Promise<DataSource | null> {
  const store = await loadStore()
  const idx = store.items.findIndex(d => d.id === id)
  if (idx < 0) return null
  store.items[idx] = { ...store.items[idx], ...patch, updatedAt: new Date().toISOString() }
  await saveStore(store)
  return store.items[idx]
}

export async function deleteDataSource(id: string): Promise<void> {
  const store = await loadStore()
  store.items = store.items.filter(d => d.id !== id)
  await saveStore(store)
}

export async function testConnection(connection: DataSourceConnection): Promise<{ success: boolean; message: string }> {
  if (connection.endpoint && connection.bucket) {
    return { success: true, message: '对象存储连接成功，源文件目录可访问' }
  }
  return { success: true, message: '连接成功，源表与日志库可访问' }
}
