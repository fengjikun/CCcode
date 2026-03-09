import type {
  DataSource,
  DataSourceCategory,
  DataSourceType,
  SyncFrequency,
  DataSourceConnection,
} from '../types/dataSource'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'data-sources'

interface DSStore {
  items: DataSource[]
}

const DEFAULT_STORE: DSStore = {
  items: [
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
      description: 'IoT 传感器实时数据',
      createdAt: '2024-07-20T08:00:00.000Z',
      updatedAt: '2024-12-01T10:30:00.000Z',
    },
  ],
}

async function loadStore(): Promise<DSStore> {
  return ensureMockStore<DSStore>(STORE_KEY, DEFAULT_STORE)
}

async function saveStore(store: DSStore): Promise<void> {
  await setMockStore(STORE_KEY, store)
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

export async function testConnection(_connection: DataSourceConnection): Promise<{ success: boolean; message: string }> {
  return { success: true, message: '连接成功，数据库版本 8.0.35' }
}
