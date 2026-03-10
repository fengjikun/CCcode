import { beforeEach, describe, expect, it, vi } from 'vitest'

let storeValue: unknown

vi.mock('./mockStoreClient', () => ({
  ensureMockStore: async (_namespace: string, defaults: unknown) => {
    if (!storeValue) storeValue = structuredClone(defaults)
    return structuredClone(storeValue)
  },
  setMockStore: async (_namespace: string, value: unknown) => value,
}))

vi.mock('./dataSource', () => ({
  listDataSources: vi.fn(async () => [{ id: 'ds-1' }, { id: 'ds-2' }]),
}))

vi.mock('./projectManagement', () => ({
  listProjects: vi.fn(async () => [{ id: 'proj-1' }, { id: 'proj-2' }, { id: 'proj-3' }]),
}))

vi.mock('./transform', () => ({
  listTransforms: vi.fn(async () => [{ id: 'tf-1' }, { id: 'tf-2' }, { id: 'tf-3' }, { id: 'tf-4' }]),
}))

vi.mock('./digitalHuman', () => ({
  listDigitalHumans: vi.fn(async () => [{ id: 'dh-1' }]),
}))

describe('dashboard stats aggregation', () => {
  beforeEach(() => {
    storeValue = undefined
  })

  it('aggregates aligned counts from the source feature APIs', async () => {
    const { getPlatformStats } = await import('./dashboard')

    const stats = await getPlatformStats()

    expect(stats).toMatchObject({
      datasources: 2,
      transformJobs: 4,
      digitalWorkers: 1,
    })
    expect(stats).toHaveProperty('ontologyProjects', 3)
  })
})
