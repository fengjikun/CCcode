import { listDataSources } from './dataSource'
import type { TransformProject, TransformType } from '../types/transform'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'transforms'

interface TFStore {
  items: TransformProject[]
}

const DEFAULT_STORE: TFStore = {
  items: [
    {
      id: 'tf-001',
      name: 'transform_orders',
      description: '采购订单跨源关联：SAP 订单 + CRM 客户主数据 → 标准化订单',
      type: 'Join',
      inputSources: ['ds-001'],
      inputSourceNames: ['ds_sap_orders'],
      outputDatasets: ['normalized_orders'],
      status: 'Success',
      records: 125840,
      duration: '2m 15s',
      lastRun: '5 分钟前',
      schedule: '每 15 分钟',
      createdAt: '2024-08-01T08:00:00.000Z',
      updatedAt: '2024-12-01T10:00:00.000Z',
    },
  ],
}

async function loadStore(): Promise<TFStore> {
  return ensureMockStore<TFStore>(STORE_KEY, DEFAULT_STORE)
}

async function saveStore(store: TFStore): Promise<void> {
  await setMockStore(STORE_KEY, store)
}

export async function listTransforms(): Promise<TransformProject[]> {
  return (await loadStore()).items
}

export async function createTransform(input: {
  name: string
  description: string
  type: TransformType
  inputSources: string[]
  outputDatasets: string[]
  schedule: string
}): Promise<TransformProject> {
  const now = new Date().toISOString()
  const allDS = await listDataSources()
  const selectedDS = allDS.filter(d => input.inputSources.includes(d.id))
  const project: TransformProject = {
    id: `tf-${Date.now()}`,
    name: input.name,
    description: input.description,
    type: input.type,
    inputSources: input.inputSources,
    inputSourceNames: selectedDS.map(d => d.name),
    outputDatasets: input.outputDatasets.filter(Boolean),
    status: 'Idle',
    records: 0,
    duration: '-',
    lastRun: null,
    schedule: input.schedule,
    createdAt: now,
    updatedAt: now,
  }
  const store = await loadStore()
  store.items.push(project)
  await saveStore(store)
  return project
}

export async function updateTransform(
  id: string,
  patch: Partial<Pick<TransformProject, 'name' | 'description' | 'type' | 'inputSources' | 'outputDatasets' | 'schedule'>>,
): Promise<TransformProject | null> {
  const store = await loadStore()
  const idx = store.items.findIndex(p => p.id === id)
  if (idx < 0) return null

  if (patch.inputSources) {
    const allDS = await listDataSources()
    const selectedDS = allDS.filter(d => patch.inputSources!.includes(d.id))
    store.items[idx].inputSourceNames = selectedDS.map(d => d.name)
    store.items[idx].inputSources = patch.inputSources
  }
  if (patch.outputDatasets) store.items[idx].outputDatasets = patch.outputDatasets.filter(Boolean)
  if (patch.name !== undefined) store.items[idx].name = patch.name
  if (patch.description !== undefined) store.items[idx].description = patch.description
  if (patch.type !== undefined) store.items[idx].type = patch.type
  if (patch.schedule !== undefined) store.items[idx].schedule = patch.schedule
  store.items[idx].updatedAt = new Date().toISOString()

  await saveStore(store)
  return store.items[idx]
}

export async function deleteTransform(id: string): Promise<void> {
  const store = await loadStore()
  store.items = store.items.filter(p => p.id !== id)
  await saveStore(store)
}

export async function runTransform(id: string): Promise<TransformProject | null> {
  const store = await loadStore()
  const idx = store.items.findIndex(p => p.id === id)
  if (idx < 0) return null
  store.items[idx].status = 'Success'
  store.items[idx].records = store.items[idx].records + Math.floor(Math.random() * 5000) + 1000
  store.items[idx].duration = `${Math.floor(Math.random() * 4) + 1}m ${Math.floor(Math.random() * 50) + 10}s`
  store.items[idx].lastRun = '刚刚'
  store.items[idx].updatedAt = new Date().toISOString()
  await saveStore(store)
  return store.items[idx]
}

export async function stopTransform(id: string): Promise<TransformProject | null> {
  const store = await loadStore()
  const idx = store.items.findIndex(p => p.id === id)
  if (idx < 0) return null
  store.items[idx].status = 'Idle'
  store.items[idx].lastRun = '已停止'
  store.items[idx].updatedAt = new Date().toISOString()
  await saveStore(store)
  return store.items[idx]
}
