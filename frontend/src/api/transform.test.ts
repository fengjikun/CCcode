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
    { id: 'ds-un-1', name: '制造业_设备维保手册_文档仓' },
    { id: 'ds-un-2', name: '制造业_巡检扫描件_资料桶' },
  ]),
}))

describe('transform dataset-prep mock store', () => {
  beforeEach(() => {
    mockStore.items = []
    mockStore._v = undefined
  })

  it('seeds document-oriented dataset prep defaults', async () => {
    const { listTransforms } = await import('./transform')

    const list = await listTransforms()

    expect(list.length).toBeGreaterThan(1)
    expect(list.some((item) => item.type === 'DocumentParsing')).toBe(true)
    expect(list.some((item) => item.description.includes('解析'))).toBe(true)
    expect(list.some((item) => item.outputDatasets.some((dataset: string) => dataset.includes('markdown')))).toBe(true)
    expect(mockStore._v).toBeDefined()
  })

  it('migrates legacy ETL records to the new dataset prep defaults', async () => {
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
    expect(list.some((item) => item.type === 'DocumentParsing')).toBe(true)
    expect(list.some((item) => item.description.includes('通用文档解析'))).toBe(true)
    expect(mockStore._v).toBeDefined()
  })

  it('creates a dataset prep task with resolved datasource display names', async () => {
    const { createTransform } = await import('./transform')

    const created = await createTransform({
      name: 'prep_test_docs',
      description: '测试文档解析',
      type: 'ChunkAnnotation',
      inputSources: ['ds-un-1', 'ds-un-2'],
      outputDatasets: ['test_chunks'],
      schedule: '手动触发',
    })

    expect(created.inputSourceNames).toEqual(['制造业_设备维保手册_文档仓', '制造业_巡检扫描件_资料桶'])
    expect(created.type).toBe('ChunkAnnotation')
  })
})
