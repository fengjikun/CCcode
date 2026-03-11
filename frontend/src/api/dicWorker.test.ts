import { beforeEach, describe, expect, it, vi } from 'vitest'

let storeValue: unknown

vi.mock('./mockStoreClient', () => ({
  ensureMockStore: async (_namespace: string, defaults: unknown) => {
    if (!storeValue) storeValue = structuredClone(defaults)
    return structuredClone(storeValue)
  },
  setMockStore: async (_namespace: string, value: unknown) => {
    storeValue = structuredClone(value)
    return structuredClone(storeValue)
  },
}))

describe('dicWorker defaults', () => {
  beforeEach(() => {
    storeValue = undefined
    vi.resetModules()
  })

  it('seeds a broader set of internal technical AI workers', async () => {
    const { listDICWorkers, getDICStats } = await import('./dicWorker')

    const workers = await listDICWorkers()
    const stats = await getDICStats()

    expect(workers).toHaveLength(14)
    expect(workers.map(worker => worker.id)).toEqual([
      'dic-001',
      'dic-002',
      'dic-003',
      'dic-004',
      'dic-005',
      'dic-006',
      'dic-007',
      'dic-008',
      'dic-009',
      'dic-010',
      'dic-011',
      'dic-012',
      'dic-013',
      'dic-014',
    ])
    expect(workers.some(worker => worker.category === 'platform-ops')).toBe(true)
    expect(workers.find(worker => worker.id === 'dic-007')?.name).toBe('平台发布护航助手')
    expect(workers.find(worker => worker.id === 'dic-008')?.status).toBe('Maintenance')
    expect(workers.find(worker => worker.id === 'dic-013')?.status).toBe('Offline')
    expect(workers.find(worker => worker.id === 'dic-014')?.name).toBe('知识资产编目助手')
    expect(stats.total).toBe(14)
  })

  it('upgrades legacy stores by appending missing seeded workers', async () => {
    storeValue = {
      workers: [
        {
          key: '1',
          id: 'dic-001',
          name: '本体建模助手',
          icon: '🏗️',
          description: '旧版本体员工',
          category: 'ontology',
          status: 'Online',
          tasksCompleted: 100,
          tasksToday: 2,
          avgResponseTime: '3.0s',
          successRate: '99.0%',
          skills: ['Schema 验证'],
          lastActive: '刚刚',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          key: '2',
          id: 'dic-002',
          name: '数据质量巡检员',
          icon: '📊',
          description: '旧版质量员工',
          category: 'data-quality',
          status: 'Busy',
          tasksCompleted: 200,
          tasksToday: 4,
          avgResponseTime: '4.0s',
          successRate: '98.0%',
          skills: ['空值检测'],
          lastActive: '刚刚',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          key: '3',
          id: 'dic-003',
          name: '知识图谱维护员',
          icon: '🔗',
          description: '旧版图谱员工',
          category: 'knowledge-graph',
          status: 'Online',
          tasksCompleted: 300,
          tasksToday: 5,
          avgResponseTime: '5.0s',
          successRate: '97.0%',
          skills: ['实体消歧'],
          lastActive: '刚刚',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      seedVersion: 3,
    }

    const { listDICWorkers } = await import('./dicWorker')

    const workers = await listDICWorkers()

    expect(workers).toHaveLength(14)
    expect(workers[0]?.description).toBe('旧版本体员工')
    expect(workers.filter(worker => worker.category === 'platform-ops')).toHaveLength(4)
    expect(workers.find(worker => worker.id === 'dic-006')?.name).toBe('图谱关系补全助手')
    expect(workers.find(worker => worker.id === 'dic-012')?.name).toBe('平台容量预测助手')
  })
})
