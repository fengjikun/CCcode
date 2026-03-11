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
    expect(items[0]?.name).toBe('设备运维诊断智能体')
    expect(items[0]?.linkedAgentIds).toEqual(['ag-001', 'ag-006', 'ag-003'])
    expect(items[0]?.linkedSkillIds).toEqual([
      'skill-biz-0-0-1',
      'g-root-cause',
      'g-knowledge-retrieval',
      'g-work-order',
      'skill-biz-1-6-27',
      'g-document-parsing',
      'g-conversation-qa',
      'skill-biz-1-3-12',
      'g-resource-scheduling',
      'g-workflow-orchestration',
      'g-decision-support',
    ])

    expect(items[1]?.id).toBe('dh-default-replenishment')
    expect(items[1]?.name).toBe('店货匹配运营决策专员')
    expect(items[1]?.ontologyCode).toBe('2.4.18')
    expect(items[1]?.linkedAgentIds).toEqual(['ag-002', 'ag-009', 'ag-007'])
    expect(items[1]?.linkedSkillIds).toEqual([
      'skill-biz-2-4-18',
      'g-workflow-orchestration',
      'g-decision-support',
      'g-work-order',
      'skill-biz-2-3-12',
      'g-alert-notification',
      'skill-biz-2-5-22',
      'g-recommendation',
      'g-report-generation',
    ])

    expect(items.slice(0, 20).map(item => item.id)).toEqual([
      'dh-default-device-fault',
      'dh-default-replenishment',
      'dh-default-repair-guide',
      'dh-default-production-scheduling',
      'dh-default-resource-matching',
      'dh-default-product-planning',
      'dh-default-shelf-optimization',
      'dh-default-staff-scheduling',
      'dh-default-clearance',
      'dh-default-member-growth',
      'dh-default-shopping-guide',
      'dh-default-traceability',
      'dh-default-delivery-dispatch',
      'dh-default-fulfillment',
      'dh-default-contract-risk',
      'dh-default-cashflow',
      'dh-default-root-insight',
      'dh-default-talent-matching',
      'dh-default-regulation-review',
      'dh-default-dynamic-pricing',
    ])
    expect(items.slice(0, 20).every(item => item.publishStatus === 'published')).toBe(true)
  })

  it('upgrades legacy pinned AI workers to the latest ontology and agent bindings', async () => {
    storeValue = {
      items: [
        {
          id: 'dh-default-device-fault',
          name: '设备运维诊断智能体',
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

    expect(items[0]?.name).toBe('设备运维诊断智能体')
    expect(items[0]?.systemPrompt).toContain('设备运维诊断智能体')
    expect(items[0]?.linkedAgentIds).toEqual(['ag-001', 'ag-006', 'ag-003'])

    expect(items[1]?.name).toBe('店货匹配运营决策专员')
    expect(items[1]?.type).toBe('store-matching')
    expect(items[1]?.projectId).toBe('proj-2418')
    expect(items[1]?.ontologyCode).toBe('2.4.18')
    expect(items[1]?.ontologyName).toBe('商品补货本体')
    expect(items[1]?.linkedAgentIds).toEqual(['ag-002', 'ag-009', 'ag-007'])
    expect(items[0]?.publishStatus).toBe('published')
    expect(items[1]?.publishStatus).toBe('published')
  })

  it('refreshes seeded content for recommended business AI workers', async () => {
    storeValue = {
      items: [
        {
          id: 'dh-default-production-scheduling',
          name: '生产排产调度专员',
          type: 'process-optimization',
          description: '旧版排产描述',
          targetUsers: '旧目标用户',
          serviceBoundary: '旧服务边界',
          systemPrompt: '旧提示词',
          projectId: 'proj-1312',
          ontologyCode: '1.3.12',
          ontologyName: '生产排产本体',
          ontologyIndustry: 'manufacturing',
          ontologyPhase: '生产',
          agentScene: '排产 Agent',
          trainingType: '执行类',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          linkedAgentIds: [],
          linkedSkillIds: [],
          publishStatus: 'draft',
        },
      ],
    }

    const { listDigitalHumans } = await import('./digitalHuman')

    const items = await listDigitalHumans()
    const scheduling = items.find(item => item.id === 'dh-default-production-scheduling')

    expect(scheduling?.description).toBe('基于生产排产本体、订单物料设备关系和约束规则，帮助生产管理者制定排产取舍与协同优先级，兼顾交付承诺、换线成本与产能稳定。')
    expect(scheduling?.linkedAgentIds).toEqual(['ag-003', 'ag-005', 'ag-004'])
    expect(scheduling?.targetUsers).toBe('计划调度员、车间主任、生产经理')
    expect(scheduling?.serviceBoundary).toContain('负责排产建议和冲突分析')
    expect(scheduling?.systemPrompt).toContain('你是生产排产调度专员')
    expect(scheduling?.publishStatus).toBe('published')
  })
})
