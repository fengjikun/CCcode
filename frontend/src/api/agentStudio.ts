import { ONTOLOGY_CATALOG } from '../mocks/skills/ontologyCatalog'
import type { Agent, AgentType } from '../types/agent'
import { normalizeServiceModelName } from '../types/modelCatalog'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'agent-studio'
const SEED_VERSION = 4
const DEFAULT_TIMESTAMP = '2026-03-10T09:00:00.000Z'

interface AgentStore {
  agents: Agent[]
  seedVersion?: number
}

interface SeedSpec {
  id: string
  code: string
  name: string
  type: AgentType
  status: Agent['status']
  version: string
  description: string
  model: string
  skillIds: string[]
}

function normalizeAgentModel(model: string): string {
  return normalizeServiceModelName(model)
}

function buildBusinessSkillId(code: string): string {
  return `skill-biz-${code.replace(/\./g, '-')}`
}

function toProjectId(code: string): string {
  return `proj-${code.replace(/\./g, '')}`
}

function buildOntologySystemPrompt(name: string, entry: (typeof ONTOLOGY_CATALOG)[number]): string {
  return [
    `你是${name}。`,
    `你基于「${entry.name}」提供专业能力，服务场景为：${entry.agentScene}。`,
    `请优先结合本体中的核心三元组「${entry.triple}」理解上下游实体、约束关系与动作链路。`,
    '输出必须结构化，至少包含：当前判断、关键依据、风险/缺口、执行建议、需补充的数据。',
    '如果信息不足，明确指出缺失的本体节点、业务属性或外部数据，不要直接臆断。',
  ].join('\n')
}

function buildContextSummary(entry: (typeof ONTOLOGY_CATALOG)[number]): string {
  return [
    `${entry.phase}场景`,
    `本体：${entry.name}`,
    `典型三元组：${entry.triple}`,
    `目标任务：${entry.agentScene}`,
    `训练方向：${entry.trainingType}`,
  ].join(' | ')
}

function buildSeedAgent(spec: SeedSpec): Agent {
  const entry = ONTOLOGY_CATALOG.find(item => item.code === spec.code)
  if (!entry) {
    return {
      id: spec.id,
      name: spec.name,
      type: spec.type,
      status: spec.status,
      version: spec.version,
      description: spec.description,
      systemPrompt: '你是一个业务智能体，请依据领域本体输出结构化结论。',
      model: normalizeAgentModel(spec.model),
      skillIds: spec.skillIds,
      createdAt: DEFAULT_TIMESTAMP,
      updatedAt: DEFAULT_TIMESTAMP,
    }
  }

  return {
    id: spec.id,
    name: spec.name,
    type: spec.type,
    status: spec.status,
    version: spec.version,
    description: spec.description,
    systemPrompt: buildOntologySystemPrompt(spec.name, entry),
    model: normalizeAgentModel(spec.model),
    skillIds: spec.skillIds,
    projectId: toProjectId(entry.code),
    ontologyCode: entry.code,
    ontologyName: entry.name,
    ontologyIndustry: entry.industry,
    ontologyPhase: entry.phase,
    agentScene: entry.agentScene,
    contextSummary: buildContextSummary(entry),
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  }
}

export const DEFAULT_AGENTS: Agent[] = [
  // ── 制造·生产 ──
  buildSeedAgent({
    id: 'ag-001',
    code: '0.0.1',
    name: '设备运维诊断智能体',
    type: 'Operational',
    status: 'Active',
    version: 'v2.0.0',
    description: '基于故障诊断本体与图谱知识，定位设备根因并给出处置、工单与排查建议。',
    model: 'Deepexi-Industry-60B-Instruct',
    skillIds: [buildBusinessSkillId('0.0.1'), 'g-root-cause', 'g-knowledge-retrieval', 'g-work-order'],
  }),
  buildSeedAgent({
    id: 'ag-003',
    code: '1.3.12',
    name: '动态排产智能体',
    type: 'Operational',
    status: 'Active',
    version: 'v1.2.0',
    description: '遇到插单或设备异常时，自动重算全局最优开工排序，减少停产损失。',
    model: 'Deepexi-R1-Reasoner',
    skillIds: [buildBusinessSkillId('1.3.12'), 'g-resource-scheduling', 'g-workflow-orchestration', 'g-decision-support'],
  }),
  buildSeedAgent({
    id: 'ag-004',
    code: '1.3.13',
    name: '质量溯源智能体',
    type: 'Analytical',
    status: 'Active',
    version: 'v1.0.0',
    description: '利用知识图谱反向追踪次品产生的具体工序与因素，输出质量归因报告。',
    model: 'Deepexi-Industry-60B-Instruct',
    skillIds: [buildBusinessSkillId('1.3.13'), 'g-root-cause', 'g-traceability', 'g-report-generation'],
  }),
  buildSeedAgent({
    id: 'ag-005',
    code: '1.4.18',
    name: '库存自动补货智能体',
    type: 'Operational',
    status: 'Active',
    version: 'v1.1.0',
    description: '物料跌破安全库存阈值时，自动生成多供应商采购订单，保障产线连续性。',
    model: 'Deepexi-R1-Reasoner',
    skillIds: [buildBusinessSkillId('1.4.18'), 'g-workflow-orchestration', 'g-alert-notification', 'g-work-order'],
  }),
  buildSeedAgent({
    id: 'ag-006',
    code: '1.6.27',
    name: '维修指引智能体',
    type: 'Support',
    status: 'Active',
    version: 'v1.0.0',
    description: '结合维护SOP本体，自动为现场工人生成可视化的分步维修作业指导书。',
    model: 'Deepexi-Industry-60B-Instruct',
    skillIds: [buildBusinessSkillId('1.6.27'), 'g-knowledge-retrieval', 'g-document-parsing', 'g-conversation-qa'],
  }),
  // ── 零售 ──
  buildSeedAgent({
    id: 'ag-002',
    code: '2.4.18',
    name: '店货匹配运营决策智能体',
    type: 'Operational',
    status: 'Active',
    version: 'v1.0.0',
    description: '基于商品补货本体，结合销量流速、库存水位与尺码分布生成门店补货与调拨方案。',
    model: 'Deepexi-R1-Reasoner',
    skillIds: [buildBusinessSkillId('2.4.18'), 'g-workflow-orchestration', 'g-decision-support', 'g-work-order'],
  }),
  buildSeedAgent({
    id: 'ag-007',
    code: '2.5.22',
    name: '精准营销推送智能体',
    type: 'Operational',
    status: 'Active',
    version: 'v1.0.0',
    description: '基于会员画像本体，针对不同消费标签的用户自动生成个性化优惠推送内容。',
    model: 'Deepexi-Industry-60B-Instruct',
    skillIds: [buildBusinessSkillId('2.5.22'), 'g-recommendation', 'g-decision-support', 'g-report-generation'],
  }),
  buildSeedAgent({
    id: 'ag-008',
    code: '2.5.24',
    name: '舆情响应智能体',
    type: 'Operational',
    status: 'Testing',
    version: 'v0.8.0',
    description: '识别情感极性为负面的客户评论，自动触发补偿策略并安排人工介入。',
    model: 'Deepexi-R1-Reasoner',
    skillIds: [buildBusinessSkillId('2.5.24'), 'g-alert-notification', 'g-workflow-orchestration', 'g-work-order'],
  }),
  buildSeedAgent({
    id: 'ag-009',
    code: '2.3.12',
    name: '临期清货智能体',
    type: 'Operational',
    status: 'Active',
    version: 'v1.0.0',
    description: '自动识别临期库存并向POS端下发折扣指令，加速陈旧库存周转，降低损耗率。',
    model: 'Deepexi-R1-Reasoner',
    skillIds: [buildBusinessSkillId('2.3.12'), 'g-decision-support', 'g-alert-notification', 'g-workflow-orchestration'],
  }),
  // ── 医疗 ──
  buildSeedAgent({
    id: 'ag-010',
    code: '3.1.1',
    name: '预诊分诊智能体',
    type: 'Analytical',
    status: 'Active',
    version: 'v1.3.0',
    description: '根据患者主诉，结合ICD-11诊断本体自动推荐挂号科室与紧急程度优先级。',
    model: 'Deepexi-Industry-60B-Instruct',
    skillIds: [buildBusinessSkillId('3.1.1'), 'g-risk-scoring', 'g-decision-support', 'g-conversation-qa'],
  }),
  buildSeedAgent({
    id: 'ag-011',
    code: '3.1.3',
    name: '用药安全检查智能体',
    type: 'Support',
    status: 'Active',
    version: 'v2.1.0',
    description: '医生开方时自动扫描处方内药物的交互禁忌三元组，输出冲突预警与替代建议。',
    model: 'Deepexi-Industry-60B-Instruct',
    skillIds: [buildBusinessSkillId('3.1.3'), 'g-compliance-review', 'g-risk-scoring', 'g-knowledge-retrieval'],
  }),
  buildSeedAgent({
    id: 'ag-012',
    code: '3.2.9',
    name: '医疗设备主动维保智能体',
    type: 'Operational',
    status: 'Testing',
    version: 'v0.9.0',
    description: '在大型医疗设备（MRI/CT等）故障前，根据传感器三元组主动触发预防性维保工单。',
    model: 'Deepexi-R1-Reasoner',
    skillIds: [buildBusinessSkillId('3.2.9'), 'g-root-cause', 'g-alert-notification', 'g-work-order'],
  }),
  // ── 交通 ──
  buildSeedAgent({
    id: 'ag-013',
    code: '4.2.5',
    name: '车辆能耗优化智能体',
    type: 'Operational',
    status: 'Active',
    version: 'v1.0.0',
    description: '实时监控货车工况本体，干预驾驶策略或自动驾驶参数，降低非必要油耗。',
    model: 'Deepexi-R1-Reasoner',
    skillIds: [buildBusinessSkillId('4.2.5'), 'g-kpi-attribution', 'g-decision-support', 'g-report-generation'],
  }),
  buildSeedAgent({
    id: 'ag-014',
    code: '4.4.11',
    name: '物流时效督办智能体',
    type: 'Operational',
    status: 'Active',
    version: 'v1.1.0',
    description: '预测运输单延误风险，自动触发加急转单或多式联运切换，保障履约时效。',
    model: 'Deepexi-R1-Reasoner',
    skillIds: [buildBusinessSkillId('4.4.11'), 'g-workflow-orchestration', 'g-alert-notification', 'g-work-order'],
  }),
]

const DEFAULT_STORE: AgentStore = {
  agents: DEFAULT_AGENTS,
  seedVersion: SEED_VERSION,
}

function normalizeAgent(agent: Agent): Agent {
  return {
    ...agent,
    model: normalizeAgentModel(agent.model),
  }
}

function upgradeSeededAgent(existing: Agent, seeded: Agent): Agent {
  const upgraded = normalizeAgent({
    ...existing,
    skillIds: existing.id === 'ag-001' ? seeded.skillIds : (existing.skillIds?.length ? existing.skillIds : seeded.skillIds),
    projectId: existing.projectId || seeded.projectId,
    ontologyCode: existing.ontologyCode || seeded.ontologyCode,
    ontologyName: existing.ontologyName || seeded.ontologyName,
    ontologyIndustry: existing.ontologyIndustry || seeded.ontologyIndustry,
    ontologyPhase: existing.ontologyPhase || seeded.ontologyPhase,
    agentScene: existing.agentScene || seeded.agentScene,
    contextSummary: existing.contextSummary || seeded.contextSummary,
  })

  if (!upgraded.description || upgraded.description === '基于设备本体与故障知识图谱，自动分析传感器数据并生成维修方案') {
    upgraded.description = seeded.description
  }
  if (!upgraded.systemPrompt || upgraded.systemPrompt === '你是一个设备故障诊断专家。') {
    upgraded.systemPrompt = seeded.systemPrompt
  }
  if (existing.id === 'ag-001') {
    upgraded.name = seeded.name
    upgraded.systemPrompt = seeded.systemPrompt
  }
  return upgraded
}

function normalizeStore(store: AgentStore): AgentStore {
  return {
    ...store,
    agents: store.agents.map(normalizeAgent),
  }
}

async function loadStore(): Promise<AgentStore> {
  const store = normalizeStore(await ensureMockStore<AgentStore>(STORE_KEY, DEFAULT_STORE))
  let changed = false

  if ((store.seedVersion ?? 0) < SEED_VERSION) {
    const seededById = new Map(DEFAULT_AGENTS.map(agent => [agent.id, agent]))
    const nextAgents = store.agents.map((agent) => {
      const seeded = seededById.get(agent.id)
      if (!seeded) return agent
      const upgraded = upgradeSeededAgent(agent, seeded)
      if (JSON.stringify(upgraded) !== JSON.stringify(agent)) changed = true
      return upgraded
    })

    const existingIds = new Set(nextAgents.map(agent => agent.id))
    for (const seeded of DEFAULT_AGENTS) {
      if (!existingIds.has(seeded.id)) {
        nextAgents.push(seeded)
        changed = true
      }
    }

    const upgradedStore = {
      ...store,
      agents: nextAgents,
      seedVersion: SEED_VERSION,
    }
    if (changed) {
      await setMockStore(STORE_KEY, upgradedStore)
    }
    return upgradedStore
  }

  if (store.seedVersion !== SEED_VERSION) {
    changed = true
  }

  if (changed) {
    const normalized = { ...store, seedVersion: SEED_VERSION }
    await setMockStore(STORE_KEY, normalized)
    return normalized
  }
  return store
}

async function saveStore(store: AgentStore): Promise<void> {
  await setMockStore(STORE_KEY, {
    ...normalizeStore(store),
    seedVersion: SEED_VERSION,
  })
}

export async function listAgents(): Promise<Agent[]> {
  return (await loadStore()).agents
}

export async function getAgent(id: string): Promise<Agent | null> {
  return (await loadStore()).agents.find(a => a.id === id) ?? null
}

export async function createAgent(input: {
  name: string
  type: AgentType
  description?: string
  systemPrompt: string
  model: string
  skillIds: string[]
}): Promise<Agent> {
  const now = new Date().toISOString()
  const agent: Agent = {
    id: `ag-${Date.now()}`,
    name: input.name,
    type: input.type,
    status: 'Testing',
    version: 'v0.1.0',
    description: input.description,
    systemPrompt: input.systemPrompt,
    model: input.model,
    skillIds: input.skillIds,
    createdAt: now,
    updatedAt: now,
  }
  const store = await loadStore()
  store.agents.push(agent)
  await saveStore(store)
  return normalizeAgent(agent)
}

export async function updateAgent(
  id: string,
  patch: Partial<Pick<Agent, 'name' | 'description' | 'status' | 'systemPrompt' | 'model' | 'skillIds'>>,
): Promise<Agent | null> {
  const store = await loadStore()
  const idx = store.agents.findIndex(a => a.id === id)
  if (idx < 0) return null
  store.agents[idx] = normalizeAgent({
    ...store.agents[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  })
  await saveStore(store)
  return store.agents[idx]
}

export async function deleteAgent(id: string): Promise<void> {
  const store = await loadStore()
  store.agents = store.agents.filter(a => a.id !== id)
  await saveStore(store)
}

export async function publishAsDigitalHuman(agentId: string): Promise<{ success: boolean; digitalHumanId: string }> {
  await updateAgent(agentId, { status: 'Active' })
  return { success: true, digitalHumanId: `dh-${Date.now()}` }
}
