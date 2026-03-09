import { listDataSources } from './dataSource'
import type { TransformProject, TransformType } from '../types/transform'
import { delay, rand } from './mockConfig'

const STORAGE_KEY = 'deepexios_transforms'

const DEFAULT_PROJECTS: TransformProject[] = [
  {
    id: 'tf-001',
    name: 'transform_orders',
    description: '采购订单跨源关联：SAP 订单 + CRM 客户主数据 → 标准化订单',
    type: 'Join',
    inputSources: ['ds-001', 'ds-004'],
    inputSourceNames: ['ds_sap_orders', 'ds_warehouse_db'],
    outputDatasets: ['normalized_orders', 'order_customer_joined'],
    status: 'Success',
    records: 125840,
    duration: '2m 15s',
    lastRun: '5 分钟前',
    schedule: '每 15 分钟',
    createdAt: '2024-08-01T08:00:00.000Z',
    updatedAt: '2024-12-01T10:00:00.000Z',
  },
  {
    id: 'tf-002',
    name: 'transform_assets',
    description: '设备资产整合：IoT 传感器 + 维保记录 + 设备台账 → 设备全景',
    type: 'ETL',
    inputSources: ['ds-002', 'ds-003'],
    inputSourceNames: ['ds_iot_sensors', 'ds_equipment_manual'],
    outputDatasets: ['equipment_profile', 'sensor_aggregated', 'maintenance_history'],
    status: 'Success',
    records: 89200,
    duration: '4m 32s',
    lastRun: '15 分钟前',
    schedule: '每小时',
    createdAt: '2024-09-10T08:00:00.000Z',
    updatedAt: '2024-12-01T10:00:00.000Z',
  },
  {
    id: 'tf-003',
    name: 'transform_inventory',
    description: '库存数据实时聚合：仓储 DB + SAP 物料 → 库存水位 + 周转分析',
    type: 'Aggregate',
    inputSources: ['ds-004', 'ds-001'],
    inputSourceNames: ['ds_warehouse_db', 'ds_sap_orders'],
    outputDatasets: ['inventory_realtime'],
    status: 'Running',
    records: 23400,
    duration: '-',
    lastRun: '运行中',
    schedule: '实时',
    createdAt: '2024-10-01T08:00:00.000Z',
    updatedAt: '2024-12-01T10:00:00.000Z',
  },
]

function load(): TransformProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      save(DEFAULT_PROJECTS)
      return DEFAULT_PROJECTS
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function save(list: TransformProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export async function listTransforms(): Promise<TransformProject[]> {
  await delay(rand(300, 600))
  return load()
}

export async function createTransform(input: {
  name: string
  description: string
  type: TransformType
  inputSources: string[]
  outputDatasets: string[]
  schedule: string
}): Promise<TransformProject> {
  await delay(rand(400, 700))
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
  const list = load()
  list.push(project)
  save(list)
  return project
}

export async function updateTransform(
  id: string,
  patch: Partial<Pick<TransformProject, 'name' | 'description' | 'type' | 'inputSources' | 'outputDatasets' | 'schedule'>>,
): Promise<TransformProject | null> {
  await delay(rand(300, 500))
  const list = load()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return null

  if (patch.inputSources) {
    const allDS = await listDataSources()
    const selectedDS = allDS.filter(d => patch.inputSources!.includes(d.id))
    list[idx].inputSourceNames = selectedDS.map(d => d.name)
    list[idx].inputSources = patch.inputSources
  }
  if (patch.outputDatasets) {
    list[idx].outputDatasets = patch.outputDatasets.filter(Boolean)
  }
  if (patch.name) list[idx].name = patch.name
  if (patch.description) list[idx].description = patch.description
  if (patch.type) list[idx].type = patch.type
  if (patch.schedule) list[idx].schedule = patch.schedule
  list[idx].updatedAt = new Date().toISOString()
  save(list)
  return list[idx]
}

export async function deleteTransform(id: string): Promise<void> {
  await delay(rand(300, 500))
  save(load().filter(p => p.id !== id))
}

/** 模拟运行转换任务 */
export async function runTransform(id: string): Promise<TransformProject | null> {
  const list = load()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return Promise.resolve(null)
  list[idx].status = 'Running'
  list[idx].lastRun = '运行中'
  list[idx].updatedAt = new Date().toISOString()
  save(list)

  await delay(2500)
  const updated = load()
  const i = updated.findIndex(p => p.id === id)
  if (i < 0) return null
  updated[i].status = 'Success'
  updated[i].records = updated[i].records + Math.floor(Math.random() * 5000) + 1000
  updated[i].duration = `${Math.floor(Math.random() * 4) + 1}m ${Math.floor(Math.random() * 50) + 10}s`
  updated[i].lastRun = '刚刚'
  updated[i].updatedAt = new Date().toISOString()
  save(updated)
  return updated[i]
}

/** 停止运行中的任务 */
export async function stopTransform(id: string): Promise<TransformProject | null> {
  await delay(rand(300, 500))
  const list = load()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return null
  if (list[idx].status === 'Running') {
    list[idx].status = 'Idle'
    list[idx].lastRun = '已停止'
    list[idx].updatedAt = new Date().toISOString()
    save(list)
  }
  return list[idx]
}
