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
const DATA_VERSION = 4

interface DSStore {
  items: DataSource[]
  _v?: number
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
const DB_DISPLAY_LABELS = ['主库', '业务库', '分析库', '台账库', '归档库'] as const
const DB_ID_LABELS = ['primary', 'business', 'analytics', 'ledger', 'archive'] as const
const STORAGE_DISPLAY_LABELS = ['文档仓', '资料桶', '归档桶', '附件仓'] as const
const STORAGE_ID_LABELS = ['docs', 'assets', 'archive', 'attachments'] as const

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
  variant: number,
): DataSource {
  const type = resolveStructuredType(industry, index + variant)
  const syncFrequency = resolveSyncFrequency(phase, dataCount, index)
  const status = resolveStatus(index + variant)
  const codeSlug = toCodeSlug(code)
  const industryLabel = INDUSTRY_LABELS[industry] ?? industry
  const dbLabel = DB_DISPLAY_LABELS[(index + variant) % DB_DISPLAY_LABELS.length]
  const dbIdLabel = DB_ID_LABELS[(index + variant) % DB_ID_LABELS.length]
  const recordMultiplier = variant === 0 ? 12 : 7
  const databaseName = variant === 0
    ? `onto_${codeSlug.replace(/-/g, '_')}`
    : `onto_${codeSlug.replace(/-/g, '_')}_${dbIdLabel}`

  return {
    id: `ds-${codeSlug}-${dbIdLabel}`,
    name: `${industryLabel}_${ontologyName}_${dbLabel}`,
    category: 'structured',
    type,
    connection: {
      host: `${toAsciiSlug(industry)}-${codeSlug}-${dbIdLabel}.db.demo.local`,
      port: STRUCTURED_PORTS[type],
      database: databaseName,
      username: `ro_${toAsciiSlug(industry) || 'general'}`,
      password: `demo_${codeSlug}`,
    },
    syncFrequency,
    status,
    lastSync: resolveLastSync(syncFrequency, status, index + variant),
    recordCount: dataCount * recordMultiplier + index * (variant === 0 ? 37 : 23),
    description: `${phase}阶段本体数据库，服务于${ontologyName}；用于结构化抽取与实体主数据归集。场景：${agentScene}`,
    createdAt: buildTimestamp(index, variant),
    updatedAt: buildTimestamp(index, 12 + variant),
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
  const storageLabel = STORAGE_DISPLAY_LABELS[index % STORAGE_DISPLAY_LABELS.length]
  const storageIdLabel = STORAGE_ID_LABELS[index % STORAGE_ID_LABELS.length]

  return {
    id: `ds-${codeSlug}-${storageIdLabel}`,
    name: `${industryLabel}_${ontologyName}_${storageLabel}`,
    category: 'unstructured',
    type,
    connection: {
      endpoint: `https://${endpointHost}`,
      bucket: `ontology-${toAsciiSlug(industry) || 'general'}-${codeSlug}-${storageIdLabel}`,
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

function shouldAddSecondaryDatabase(industry: string, index: number): boolean {
  switch (industry) {
    case 'manufacturing':
      return index % 3 === 0
    case 'retail':
      return index % 5 === 1
    case 'medical':
      return index % 6 === 2
    case 'transport':
      return index % 8 === 3
    case 'general':
      return index % 9 === 4
    default:
      return false
  }
}

function shouldAddObjectStorage(industry: string, index: number): boolean {
  switch (industry) {
    case 'manufacturing':
      return index % 7 === 0
    case 'retail':
      return index % 4 === 1
    case 'medical':
      return index % 3 === 0
    case 'transport':
      return index % 6 === 0
    case 'general':
      return index % 8 === 0
    default:
      return false
  }
}

function buildDatasourceBundle(
  code: string,
  ontologyName: string,
  industry: string,
  phase: string,
  agentScene: string,
  dataCount: number,
  index: number,
): DataSource[] {
  const items = [
    buildStructuredDataSource(code, ontologyName, industry, phase, agentScene, dataCount, index, 0),
  ]

  if (shouldAddSecondaryDatabase(industry, index)) {
    items.push(buildStructuredDataSource(code, ontologyName, industry, phase, agentScene, dataCount, index, 1))
  }

  if (shouldAddObjectStorage(industry, index)) {
    items.push(buildObjectStorageDataSource(code, ontologyName, industry, phase, agentScene, dataCount, index))
  }

  return items
}

function buildDefaultItems(): DataSource[] {
  return ONTOLOGY_DEFS.flatMap(([code, ontologyName, industry, phase, , agentScene, , dataCount], index) =>
    buildDatasourceBundle(code, ontologyName, industry, phase, agentScene, dataCount, index),
  )
}

const DEFAULT_STORE: DSStore = {
  items: buildDefaultItems(),
  _v: DATA_VERSION,
}

async function loadStore(): Promise<DSStore> {
  const store = await ensureMockStore<DSStore>(STORE_KEY, DEFAULT_STORE)
  if (store._v === DATA_VERSION && Array.isArray(store.items) && store.items.length > 0) {
    return store
  }

  await saveStore(DEFAULT_STORE)
  return DEFAULT_STORE
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
