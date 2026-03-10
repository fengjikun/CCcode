import type {
  DataSource,
  DataSourceCategory,
  DataSourceType,
  DataSourceStatus,
  SyncFrequency,
  DataSourceConnection,
  StructuredType,
  ObjectStorageType,
} from '../types/dataSource'
import { ONTOLOGY_DEFS } from './projectManagement'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'data-sources'

interface DSStore {
  items: DataSource[]
}

const INDUSTRY_LABELS: Record<string, string> = {
  manufacturing: '制造业',
  retail: '零售业',
  medical: '医疗健康',
  transport: '交通物流',
  general: '通用业务',
}

const STRUCTURED_TYPE_MAP: Record<string, StructuredType[]> = {
  manufacturing: ['SAP ERP', 'MySQL', 'MongoDB'],
  retail: ['MySQL', 'PostgreSQL'],
  medical: ['PostgreSQL', 'Oracle'],
  transport: ['SQL Server', 'PostgreSQL'],
  general: ['MySQL', 'PostgreSQL'],
}

const OBJECT_STORAGE_TYPE_MAP: Record<string, ObjectStorageType[]> = {
  manufacturing: ['MinIO', 'S3'],
  retail: ['OSS', 'S3'],
  medical: ['OSS', 'MinIO'],
  transport: ['S3', 'OSS'],
  general: ['MinIO', 'S3'],
}

const STRUCTURED_PORTS: Record<StructuredType, number> = {
  MySQL: 3306,
  PostgreSQL: 5432,
  Oracle: 1521,
  'SQL Server': 1433,
  'SAP ERP': 3300,
  MongoDB: 27017,
}

const STORAGE_REGIONS = ['cn-north-1', 'cn-east-1', 'cn-south-1', 'ap-southeast-1'] as const

function toAsciiSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toCodeSlug(code: string): string {
  return code.replace(/\./g, '-')
}

function resolveStructuredType(industry: string, index: number): StructuredType {
  const options = STRUCTURED_TYPE_MAP[industry] ?? STRUCTURED_TYPE_MAP.general
  return options[index % options.length]
}

function resolveObjectStorageType(industry: string, index: number): ObjectStorageType {
  const options = OBJECT_STORAGE_TYPE_MAP[industry] ?? OBJECT_STORAGE_TYPE_MAP.general
  return options[index % options.length]
}

function resolveSyncFrequency(phase: string, dataCount: number, index: number): SyncFrequency {
  if (phase.includes('生产') || phase.includes('调度')) return 'realtime'
  if (dataCount >= 8000) return index % 2 === 0 ? '15min' : 'hourly'
  if (dataCount >= 5000) return 'hourly'
  return index % 3 === 0 ? 'daily' : 'manual'
}

function resolveStatus(index: number): DataSourceStatus {
  if (index % 11 === 0) return 'Syncing'
  if (index % 13 === 0) return 'Inactive'
  if (index % 17 === 0) return 'Error'
  return 'Active'
}

function resolveLastSync(syncFrequency: SyncFrequency, status: DataSourceStatus, index: number): string | null {
  if (status === 'Inactive') return null
  if (syncFrequency === 'realtime' && status === 'Active') return 'Live'
  if (status === 'Syncing') return '同步中'
  if (status === 'Error') return `${(index % 6) + 1} 小时前`
  return `${(index % 15) + 1} 分钟前`
}

function buildTimestamp(index: number, offsetDays: number): string {
  const date = new Date('2025-01-01T08:00:00.000Z')
  date.setUTCDate(date.getUTCDate() + index + offsetDays)
  return date.toISOString()
}

function buildStructuredDataSource(
  code: string,
  ontologyName: string,
  industry: string,
  phase: string,
  agentScene: string,
  dataCount: number,
  index: number,
): DataSource {
  const type = resolveStructuredType(industry, index)
  const syncFrequency = resolveSyncFrequency(phase, dataCount, index)
  const status = resolveStatus(index)
  const codeSlug = toCodeSlug(code)
  const industryLabel = INDUSTRY_LABELS[industry] ?? industry

  return {
    id: `ds-${codeSlug}-db`,
    name: `${industryLabel}_${ontologyName}_db`,
    category: 'structured',
    type,
    connection: {
      host: `${toAsciiSlug(industry)}-${codeSlug}.db.demo.local`,
      port: STRUCTURED_PORTS[type],
      database: `onto_${codeSlug.replace(/-/g, '_')}`,
      username: `ro_${toAsciiSlug(industry) || 'general'}`,
      password: `demo_${codeSlug}`,
    },
    syncFrequency,
    status,
    lastSync: resolveLastSync(syncFrequency, status, index),
    recordCount: dataCount * 12 + index * 37,
    description: `${phase}阶段本体数据库，服务于${ontologyName}；用于结构化抽取与实体主数据归集。场景：${agentScene}`,
    createdAt: buildTimestamp(index, 0),
    updatedAt: buildTimestamp(index, 12),
  }
}

function buildObjectStorageDataSource(
  code: string,
  ontologyName: string,
  industry: string,
  phase: string,
  agentScene: string,
  dataCount: number,
  index: number,
): DataSource {
  const type = resolveObjectStorageType(industry, index)
  const syncFrequency = resolveSyncFrequency(phase, dataCount, index + 1)
  const status = resolveStatus(index + 3)
  const codeSlug = toCodeSlug(code)
  const industryLabel = INDUSTRY_LABELS[industry] ?? industry
  const endpointHost = `${type.toLowerCase()}.${toAsciiSlug(industry) || 'general'}.demo.local`

  return {
    id: `ds-${codeSlug}-bucket`,
    name: `${industryLabel}_${ontologyName}_bucket`,
    category: 'unstructured',
    type,
    connection: {
      endpoint: `https://${endpointHost}`,
      bucket: `ontology-${toAsciiSlug(industry) || 'general'}-${codeSlug}`,
      region: STORAGE_REGIONS[index % STORAGE_REGIONS.length],
      pathPrefix: `${ontologyName}/v${(index % 3) + 1}/`,
      accessKey: `ak_${codeSlug}`,
      secretKey: `sk_${codeSlug}`,
    },
    syncFrequency,
    status,
    lastSync: resolveLastSync(syncFrequency, status, index + 3),
    recordCount: dataCount * 4 + index * 19,
    description: `${phase}阶段本体对象存储，用于沉淀${ontologyName}相关文档、半结构化抽取结果与图谱附件。场景：${agentScene}`,
    createdAt: buildTimestamp(index, 1),
    updatedAt: buildTimestamp(index, 15),
  }
}

function buildDefaultItems(): DataSource[] {
  return ONTOLOGY_DEFS.flatMap(([code, ontologyName, industry, phase, , agentScene, , dataCount], index) => [
    buildStructuredDataSource(code, ontologyName, industry, phase, agentScene, dataCount, index),
    buildObjectStorageDataSource(code, ontologyName, industry, phase, agentScene, dataCount, index),
  ])
}

const DEFAULT_STORE: DSStore = {
  items: buildDefaultItems(),
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
  if (_connection.endpoint && _connection.bucket) {
    return { success: true, message: '对象存储连接成功，Bucket 可访问' }
  }
  return { success: true, message: '连接成功，数据库版本 8.0.35' }
}
