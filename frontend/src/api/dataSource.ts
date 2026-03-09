import type {
  DataSource,
  DataSourceCategory,
  DataSourceType,
  SyncFrequency,
  DataSourceConnection,
} from '../types/dataSource'
import { delay, rand } from './mockConfig'

const STORAGE_KEY = 'deepexios_datasources'

const DEFAULT_DATASOURCES: DataSource[] = [
  {
    id: 'ds-001',
    name: 'ds_sap_orders',
    category: 'structured',
    type: 'SAP ERP',
    connection: { host: 'sap.company.com', port: 3300, database: 'PRD', username: 'sap_reader' },
    syncFrequency: '15min',
    status: 'Active',
    lastSync: '3 分钟前',
    recordCount: 125840,
    description: 'SAP ERP 订单主数据，包含采购订单、销售订单及物料移动',
    createdAt: '2024-06-15T08:00:00.000Z',
    updatedAt: '2024-12-01T10:30:00.000Z',
  },
  {
    id: 'ds-002',
    name: 'ds_iot_sensors',
    category: 'structured',
    type: 'MongoDB',
    connection: { host: 'mongo-iot.internal', port: 27017, database: 'sensor_data', username: 'iot_reader' },
    syncFrequency: 'realtime',
    status: 'Active',
    lastSync: 'Live',
    recordCount: 2340000,
    description: 'IoT 传感器实时数据，涵盖温度、振动、压力等设备运行参数',
    createdAt: '2024-07-20T08:00:00.000Z',
    updatedAt: '2024-12-01T10:30:00.000Z',
  },
  {
    id: 'ds-003',
    name: 'ds_equipment_manual',
    category: 'unstructured',
    type: 'PDF',
    connection: { fileName: '设备维修手册_v3.2.pdf', fileSize: 15400000 },
    syncFrequency: 'manual',
    status: 'Active',
    lastSync: '2 天前',
    recordCount: 342,
    description: '设备维修操作手册，包含故障代码、维修步骤及安全规范',
    createdAt: '2024-08-10T08:00:00.000Z',
    updatedAt: '2024-11-15T08:00:00.000Z',
  },
  {
    id: 'ds-004',
    name: 'ds_warehouse_db',
    category: 'structured',
    type: 'PostgreSQL',
    connection: { host: 'pg-warehouse.internal', port: 5432, database: 'warehouse', username: 'wh_reader' },
    syncFrequency: 'daily',
    status: 'Active',
    lastSync: '6 小时前',
    recordCount: 89200,
    description: '仓储管理数据库，库存、出入库记录与库位管理',
    createdAt: '2024-05-01T08:00:00.000Z',
    updatedAt: '2024-12-01T08:00:00.000Z',
  },
]

function load(): DataSource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      save(DEFAULT_DATASOURCES)
      return DEFAULT_DATASOURCES
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function save(list: DataSource[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export async function listDataSources(): Promise<DataSource[]> {
  await delay(rand(300, 600))
  return load()
}

export async function getDataSource(id: string): Promise<DataSource | null> {
  await delay(rand(200, 400))
  return load().find(d => d.id === id) ?? null
}

export async function createDataSource(input: {
  name: string
  category: DataSourceCategory
  type: DataSourceType
  connection: DataSourceConnection
  syncFrequency: SyncFrequency
  description?: string
}): Promise<DataSource> {
  await delay(rand(400, 700))
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
  const list = load()
  list.push(ds)
  save(list)
  return ds
}

export async function updateDataSource(
  id: string,
  patch: Partial<Pick<DataSource, 'name' | 'description' | 'syncFrequency' | 'connection' | 'status'>>,
): Promise<DataSource | null> {
  await delay(rand(300, 500))
  const list = load()
  const idx = list.findIndex(d => d.id === id)
  if (idx < 0) return null
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() }
  save(list)
  return list[idx]
}

export async function deleteDataSource(id: string): Promise<void> {
  await delay(rand(300, 500))
  save(load().filter(d => d.id !== id))
}

/** 模拟连接测试 — 始终成功 */
export async function testConnection(_connection: DataSourceConnection): Promise<{ success: boolean; message: string }> {
  await delay(800)
  return { success: true, message: '连接成功，数据库版本 8.0.35' }
}
