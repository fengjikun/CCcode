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

vi.mock('./dataSource', () => ({
  listDataSources: vi.fn(async () => [
    { id: 'ds-structured-1', name: '故障工单主表' },
    { id: 'ds-un-2', name: '机台原始日志文件库' },
  ]),
}))

describe('transform fault-diagnosis mock store', () => {
  beforeEach(() => {
    mockStore.items = []
    mockStore._v = undefined
  })

  it('seeds fault-diagnosis and replenishment transform defaults', async () => {
    const { listTransforms } = await import('./transform')

    const list = await listTransforms()

    expect(list.length).toBeGreaterThan(1)
    expect(list.some((item) => item.type === 'MultimodalExtraction')).toBe(true)
    expect(list.some((item) => item.description.includes('故障')) || list.some((item) => item.description.includes('维修'))).toBe(true)
    expect(list.some((item) => item.outputDatasets.some((dataset: string) => dataset.includes('root_cause')))).toBe(true)
    expect(list.some((item) => item.name.includes('replenishment'))).toBe(true)
    expect(list.some((item) => item.outputDatasets.some((dataset: string) => dataset.includes('replenishment_plan')))).toBe(true)
    expect(mockStore._v).toBeDefined()
  })

  it('migrates legacy ETL records to the new transform defaults', async () => {
    mockStore.items = [
      {
        id: 'tf-legacy',
        name: 'transform_orders',
        description: 'legacy',
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
    ]
    mockStore._v = undefined

    const { listTransforms } = await import('./transform')
    const list = await listTransforms()

    expect(list.some((item) => (item.type as string) === 'Join')).toBe(false)
    expect(list.some((item) => item.type === 'DatasetPackaging')).toBe(true)
    expect(list.some((item) => item.description.includes('根因')) || list.some((item) => item.description.includes('告警'))).toBe(true)
    expect(mockStore._v).toBeDefined()
  })

  it('creates a transform task with resolved datasource display names', async () => {
    const { createTransform } = await import('./transform')

    const created = await createTransform({
      name: 'fault_test_transform',
      description: '测试故障转换',
      type: 'ChunkAnnotation',
      inputSources: ['ds-structured-1', 'ds-un-2'],
      outputDatasets: ['test_chunks'],
      schedule: '手动触发',
    })

    expect(created.inputSourceNames).toEqual(['故障工单主表', '机台原始日志文件库'])
    expect(created.type).toBe('ChunkAnnotation')
  })
})
