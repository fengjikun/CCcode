import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockStore: { items: any[]; _v?: number } = { items: [] }

vi.mock('./mockStoreClient', () => ({
  ensureMockStore: vi.fn(async (_namespace: string, defaults: { items: any[]; _v?: number }) => {
    if (mockStore.items.length === 0) {
      mockStore.items = structuredClone(defaults.items)
      mockStore._v = defaults._v
    }
    return { items: structuredClone(mockStore.items), _v: mockStore._v }
  }),
  setMockStore: vi.fn(async (_namespace: string, value: { items: any[]; _v?: number }) => {
    mockStore.items = structuredClone(value.items)
    mockStore._v = value._v
    return value
  }),
}))

import { ONTOLOGY_DEFS } from './projectManagement'
import {
  createDataSource,
  getDataSource,
  listDataSources,
  testConnection,
} from './dataSource'
import { OBJECT_STORAGE_TYPES } from '../types/dataSource'

describe('dataSource ontology seeding', () => {
  beforeEach(() => {
    mockStore.items = []
    mockStore._v = undefined
  })

  it('exports ontology presets for datasource generation', () => {
    expect(Array.isArray(ONTOLOGY_DEFS)).toBe(true)
    expect(ONTOLOGY_DEFS.length).toBeGreaterThan(100)
  })

  it('exposes object storage datasource types', () => {
    expect(OBJECT_STORAGE_TYPES).toEqual(['S3', 'OSS', 'MinIO'])
  })

  it('generates one database datasource and one object storage datasource per ontology', async () => {
    const list = await listDataSources()
    const databaseCount = list.filter((item) => item.category === 'structured').length
    const objectStorageCount = list.filter((item) => item.category === 'unstructured').length
    const ontologyNameToDatabaseCount = new Map<string, number>()

    for (const item of list.filter((entry) => entry.category === 'structured')) {
      const ontologyName = item.name.split('_').slice(1, -1).join('_')
      ontologyNameToDatabaseCount.set(ontologyName, (ontologyNameToDatabaseCount.get(ontologyName) ?? 0) + 1)
    }

    expect(databaseCount).toBeGreaterThan(objectStorageCount)
    expect(objectStorageCount).toBeGreaterThan(0)
    expect(databaseCount).toBeGreaterThan(ONTOLOGY_DEFS.length)
    expect(list.some((item) => item.type === 'S3' || item.type === 'OSS' || item.type === 'MinIO')).toBe(true)
    expect(list.some((item) => item.name.includes('制造业_故障诊断本体'))).toBe(true)
    expect([...ontologyNameToDatabaseCount.values()].some((count) => count > 1)).toBe(true)
  })

  it('migrates legacy persisted datasource stores to the seeded version', async () => {
    mockStore.items = [
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
        description: 'legacy',
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
        description: 'legacy',
        createdAt: '2024-07-20T08:00:00.000Z',
        updatedAt: '2024-12-01T10:30:00.000Z',
      },
    ]
    mockStore._v = undefined

    const list = await listDataSources()

    expect(list.filter((item) => item.category === 'structured').length).toBeGreaterThan(
      list.filter((item) => item.category === 'unstructured').length,
    )
    expect(list.some((item) => item.name.includes('制造业_故障诊断本体'))).toBe(true)
    expect(mockStore._v).toBeDefined()
  })

  it('keeps persisted versioned datasource stores instead of reseeding defaults', async () => {
    mockStore.items = [
      {
        id: 'ds-custom-001',
        name: '企业主数据湖',
        category: 'structured',
        type: 'PostgreSQL',
        connection: { host: 'lake.company.local', port: 5432, database: 'lakehouse', username: 'reader' },
        syncFrequency: 'hourly',
        status: 'Active',
        lastSync: '1 分钟前',
        recordCount: 9876543210,
        description: 'persisted',
        createdAt: '2025-01-01T08:00:00.000Z',
        updatedAt: '2025-03-10T08:00:00.000Z',
      },
    ]
    mockStore._v = 5

    const list = await listDataSources()

    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe('ds-custom-001')
    expect(list[0]?.name).toBe('企业主数据湖')
    expect(mockStore.items).toHaveLength(1)
    expect(mockStore._v).toBe(5)
  })

  it('creates an object storage datasource with bucket connection fields', async () => {
    const created = await createDataSource({
      name: '测试对象存储',
      category: 'unstructured',
      type: 'MinIO',
      connection: {
        endpoint: 'https://minio.demo.local',
        bucket: 'ontology-fault-diagnosis',
        region: 'cn-east-1',
        pathPrefix: 'fault-diagnosis/',
        accessKey: 'demo-access',
        secretKey: 'demo-secret',
      },
      syncFrequency: 'daily',
      description: '对象存储测试数据源',
    })

    const loaded = await getDataSource(created.id)

    expect(loaded?.connection.bucket).toBe('ontology-fault-diagnosis')
    expect(loaded?.type).toBe('MinIO')
  })

  it('returns an object-storage specific success message for storage endpoints', async () => {
    const result = await testConnection({
      endpoint: 'https://s3.demo.local',
      bucket: 'ontology-demo',
      region: 'cn-north-1',
    })

    expect(result.success).toBe(true)
    expect(result.message).toContain('对象存储')
  })
})
