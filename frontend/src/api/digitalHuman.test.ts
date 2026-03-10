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

describe('digitalHuman defaults', () => {
  beforeEach(() => {
    storeValue = undefined
    vi.resetModules()
  })

  it('seeds pinned AI workers for fault diagnosis and product replenishment at the front', async () => {
    const { listDigitalHumans } = await import('./digitalHuman')

    const items = await listDigitalHumans()

    expect(items[0]?.id).toBe('dh-default-device-fault')
    expect(items[0]?.name).toBe('设备故障诊断智能体')
    expect(items[0]?.linkedAgentIds).toEqual(['ag-001'])
    expect(items[0]?.linkedSkillIds).toEqual([
      'skill-biz-0-0-1',
      'g-root-cause',
      'g-knowledge-retrieval',
      'g-work-order',
    ])

    expect(items[1]?.id).toBe('dh-default-replenishment')
    expect(items[1]?.name).toBe('商品补货智能体')
    expect(items[1]?.ontologyCode).toBe('2.4.18')
    expect(items[1]?.linkedAgentIds).toEqual(['ag-002'])
    expect(items[1]?.linkedSkillIds).toEqual([
      'skill-biz-2-4-18',
      'g-workflow-orchestration',
      'g-decision-support',
      'g-work-order',
    ])
  })

  it('upgrades legacy pinned AI workers to the latest ontology and agent bindings', async () => {
    storeValue = {
      items: [
        {
          id: 'dh-default-device-fault',
          name: '设备运维诊断专员',
          type: 'fault-repair',
          description: '旧版设备诊断入口',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          linkedAgentIds: [],
          linkedSkillIds: [],
        },
        {
          id: 'dh-default-replenishment',
          name: '供应链补货协同专员',
          type: 'bom-analysis',
          description: '旧版补货入口',
          projectId: 'proj-1418',
          ontologyCode: '1.4.18',
          ontologyName: '库存风险本体',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          linkedAgentIds: [],
          linkedSkillIds: [],
        },
      ],
    }

    const { listDigitalHumans } = await import('./digitalHuman')

    const items = await listDigitalHumans()

    expect(items[0]?.name).toBe('设备故障诊断智能体')
    expect(items[0]?.systemPrompt).toContain('设备故障诊断智能体')
    expect(items[0]?.linkedAgentIds).toEqual(['ag-001'])

    expect(items[1]?.name).toBe('商品补货智能体')
    expect(items[1]?.type).toBe('store-matching')
    expect(items[1]?.projectId).toBe('proj-2418')
    expect(items[1]?.ontologyCode).toBe('2.4.18')
    expect(items[1]?.ontologyName).toBe('商品补货本体')
    expect(items[1]?.linkedAgentIds).toEqual(['ag-002'])
  })
})
