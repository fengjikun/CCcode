import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockStore: { items: any[] } = { items: [] }

vi.mock('./mockStoreClient', () => ({
  ensureMockStore: vi.fn(async (_namespace: string, defaults: { items: any[] }) => {
    if (mockStore.items.length === 0) {
      mockStore.items = structuredClone(defaults.items)
    }
    return { items: structuredClone(mockStore.items) }
  }),
  setMockStore: vi.fn(async (_namespace: string, value: { items: any[] }) => {
    mockStore.items = structuredClone(value.items)
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

    expect(list.length).toBe(ONTOLOGY_DEFS.length * 2)
    expect(list.some((item) => item.category === 'structured')).toBe(true)
    expect(list.some((item) => item.category === 'unstructured')).toBe(true)
    expect(list.some((item) => item.type === 'S3' || item.type === 'OSS' || item.type === 'MinIO')).toBe(true)
    expect(list.some((item) => item.name === '制造业_故障诊断本体_db')).toBe(true)
    expect(list.some((item) => item.name === '制造业_故障诊断本体_bucket')).toBe(true)
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
