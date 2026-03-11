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

vi.mock('./dicWorker', () => ({
  listDICWorkers: vi.fn(async () => [{ id: 'dic-1' }, { id: 'dic-2' }]),
}))

vi.mock('./agentStudio', () => ({
  listAgents: vi.fn(async () => [{ id: 'ag-1' }, { id: 'ag-2' }, { id: 'ag-3' }]),
}))

vi.mock('./skillsMarket', () => ({
  listSkills: vi.fn(async () => [{ id: 'sk-1' }, { id: 'sk-2' }, { id: 'sk-3' }, { id: 'sk-4' }]),
}))

vi.mock('./modelTraining', () => ({
  listTrainingJobs: vi.fn(async () => [{ key: 'job-1' }, { key: 'job-2' }, { key: 'job-3' }, { key: 'job-4' }, { key: 'job-5' }]),
}))

vi.mock('./modelGateway', () => ({
  listModels: vi.fn(async () => [
    { key: 'model-1', stage: 'Production' },
    { key: 'model-2', stage: 'Canary' },
    { key: 'model-3', stage: 'Archived' },
  ]),
  getGatewayStats: vi.fn(async () => ({
    deployedModels: 2,
    totalQps: '8.0K',
    avgLatency: '1.3s',
    availability: '99.95%',
    productionCount: 1,
    canaryCount: 1,
    stagingCount: 0,
  })),
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
      digitalWorkers: 3,
      agents: 3,
      skills: 4,
      trainingJobs: 5,
      deployedModels: 2,
      avgLatency: '1.3s',
      uptime: '100%',
    })
    expect(stats).toHaveProperty('ontologyProjects', 3)
  })
})
