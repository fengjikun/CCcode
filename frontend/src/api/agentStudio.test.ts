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

describe('agentStudio defaults', () => {
  beforeEach(() => {
    storeValue = undefined
    vi.resetModules()
  })

  it('seeds ontology-driven fault diagnosis and product replenishment agents', async () => {
    const { listAgents } = await import('./agentStudio')

    const agents = await listAgents()

    expect(agents.some((agent) => agent.name === '设备运维诊断专员')).toBe(true)
    expect(agents.some((agent) => agent.name === '店货匹配运营决策专员')).toBe(true)

    const faultAgent = agents.find((agent) => agent.id === 'ag-001')
    const replenishmentAgent = agents.find((agent) => agent.id === 'ag-002')

    expect(faultAgent?.ontologyName).toBe('故障诊断本体')
    expect(faultAgent?.projectId).toBe('proj-001')
    expect(faultAgent?.skillIds).toContain('skill-biz-0-0-1')
    expect(faultAgent?.contextSummary).toContain('故障诊断本体')

    expect(replenishmentAgent?.ontologyName).toBe('商品补货本体')
    expect(replenishmentAgent?.projectId).toBe('proj-2418')
    expect(replenishmentAgent?.skillIds).toContain('skill-biz-2-4-18')
    expect(replenishmentAgent?.contextSummary).toContain('城市单品补货Agent')
  })

  it('upgrades a legacy store by refreshing the seeded fault diagnosis agent and adding missing seeded agents', async () => {
    storeValue = {
      agents: [
        {
          id: 'ag-001',
          name: '设备故障诊断 Agent',
          type: 'Operational',
          status: 'Active',
          version: 'v2.3.1',
          description: '基于设备本体与故障知识图谱，自动分析传感器数据并生成维修方案',
          systemPrompt: '你是一个设备故障诊断专家。',
          model: 'Deepexi 2.0 通用对话',
          skillIds: ['sk-001'],
          createdAt: '2024-06-15T08:00:00.000Z',
          updatedAt: '2024-11-20T10:00:00.000Z',
        },
      ],
    }

    const { listAgents } = await import('./agentStudio')

    const agents = await listAgents()
    const upgradedFaultAgent = agents.find((agent) => agent.id === 'ag-001')
    const replenishmentAgent = agents.find((agent) => agent.id === 'ag-002')

    expect(agents).toHaveLength(2)
    expect(upgradedFaultAgent?.name).toBe('设备运维诊断专员')
    expect(upgradedFaultAgent?.ontologyName).toBe('故障诊断本体')
    expect(upgradedFaultAgent?.contextSummary).toContain('故障诊断本体')
    expect(upgradedFaultAgent?.systemPrompt).toContain('设备运维诊断专员')
    expect(upgradedFaultAgent?.systemPrompt).toContain('故障诊断本体')
    expect(upgradedFaultAgent?.skillIds).toEqual([
      'skill-biz-0-0-1',
      'g-root-cause',
      'g-knowledge-retrieval',
      'g-work-order',
    ])

    expect(replenishmentAgent?.name).toBe('店货匹配运营决策专员')
    expect(replenishmentAgent?.ontologyName).toBe('商品补货本体')
    expect(replenishmentAgent?.skillIds).toContain('g-workflow-orchestration')
  })
})
