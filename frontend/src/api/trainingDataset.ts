import type { TrainingDataset } from '../types/trainingDataset'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'training-datasets'

interface DatasetStore {
  items: TrainingDataset[]
}

const DEFAULT_STORE: DatasetStore = {
  items: [
    {
      key: '1', name: 'purchase_orders_v3', source: 'ontology://PurchaseOrder/output',
      trainSplit: 70, valSplit: 15, testSplit: 15, records: 12450, version: 'v3.0',
      status: 'Ready', size: '156 MB', createdAt: '2025-02-15', updatedAt: '2025-03-08',
      linkedModels: ['purchase-order-classifier'], format: 'JSONL',
      promptTemplate: '{"instruction": "分类采购订单", "input": "{{设备名称}}", "output": "{{运行状态}}"}',
      schemaFields: ['设备编号', '设备名称', '运行状态', '故障类型'],
      buildProgress: 100,
      buildLog: ['[2025-03-08 10:00:01] ✓ 构建完成'],
      sampleData: [{ 设备编号: 'PO-20250101', 设备名称: '液压泵 A-01', 运行状态: '正常', 故障类型: '—' }],
    },
  ],
}

async function loadStore(): Promise<DatasetStore> {
  return ensureMockStore<DatasetStore>(STORE_KEY, DEFAULT_STORE)
}

async function saveStore(store: DatasetStore): Promise<void> {
  await setMockStore(STORE_KEY, store)
}

export async function listDatasets(): Promise<TrainingDataset[]> {
  return (await loadStore()).items
}

export async function getDatasetDetail(key: string): Promise<TrainingDataset | undefined> {
  return (await loadStore()).items.find(d => d.key === key)
}

export async function createDataset(input: Partial<TrainingDataset>): Promise<TrainingDataset> {
  const ds: TrainingDataset = {
    key: `ds-${Date.now()}`,
    name: input.name || '',
    source: input.source || '',
    trainSplit: input.trainSplit || 70,
    valSplit: input.valSplit || 15,
    testSplit: input.testSplit || 15,
    records: 0,
    version: 'v1.0',
    status: 'Building',
    size: '—',
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    linkedModels: [],
    format: input.format || 'JSONL',
    promptTemplate: input.promptTemplate || '',
    schemaFields: input.schemaFields || [],
    buildProgress: 0,
    buildLog: [`[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 数据集已创建，等待构建...`],
    sampleData: [],
  }
  const store = await loadStore()
  store.items.push(ds)
  await saveStore(store)
  return ds
}

export async function buildDataset(key: string): Promise<TrainingDataset | undefined> {
  const store = await loadStore()
  const ds = store.items.find(d => d.key === key)
  if (!ds) return undefined
  ds.status = 'Building'
  ds.buildProgress = 0
  ds.buildLog = [
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 开始构建数据集 ${ds.name} ...`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 连接本体数据源 ${ds.source}`,
  ]
  ds.updatedAt = new Date().toISOString().slice(0, 10)
  await saveStore(store)
  return ds
}

export async function updateBuildProgress(key: string, progress: number): Promise<void> {
  const store = await loadStore()
  const ds = store.items.find(d => d.key === key)
  if (!ds) return
  ds.buildProgress = progress
  ds.buildLog.push(`[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 数据清洗与转换中... (${progress}%)`)
  ds.updatedAt = new Date().toISOString().slice(0, 10)
  await saveStore(store)
}

export async function finishBuild(key: string): Promise<void> {
  const store = await loadStore()
  const ds = store.items.find(d => d.key === key)
  if (!ds) return
  ds.status = 'Ready'
  ds.buildProgress = 100
  ds.records = Math.floor(Math.random() * 20000) + 5000
  ds.size = `${(ds.records * 0.012).toFixed(0)} MB`
  ds.buildLog.push(`[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] ✓ 构建完成`)
  ds.updatedAt = new Date().toISOString().slice(0, 10)
  await saveStore(store)
}

export async function deleteDataset(key: string): Promise<void> {
  const store = await loadStore()
  store.items = store.items.filter(d => d.key !== key)
  await saveStore(store)
}

export interface DatasetStats {
  total: number
  totalRecords: string
  readyCount: number
  totalSize: string
  buildingCount: number
}

export async function getDatasetStats(): Promise<DatasetStats> {
  const list = (await loadStore()).items
  const totalRecords = list.reduce((s, d) => s + d.records, 0)
  return {
    total: list.length,
    totalRecords: totalRecords >= 1000 ? `${(totalRecords / 1000).toFixed(1)}K` : `${totalRecords}`,
    readyCount: list.filter(d => d.status === 'Ready').length,
    totalSize: '1.9 GB',
    buildingCount: list.filter(d => d.status === 'Building').length,
  }
}
