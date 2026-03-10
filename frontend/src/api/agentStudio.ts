import { ONTOLOGY_CATALOG } from '../mocks/skills/ontologyCatalog'
import type { Agent, AgentType } from '../types/agent'
import { normalizeServiceModelName } from '../types/modelCatalog'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'agent-studio'
const SEED_VERSION = 3
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
  buildSeedAgent({
    id: 'ag-001',
    code: '0.0.1',
    name: '设备故障诊断智能体',
    type: 'Operational',
    status: 'Active',
    version: 'v2.0.0',
    description: '基于故障诊断本体与图谱知识，定位设备根因并给出处置、工单与排查建议。',
    model: 'Deepexi-Industry-60B-Instruct',
    skillIds: [buildBusinessSkillId('0.0.1'), 'g-root-cause', 'g-knowledge-retrieval', 'g-work-order'],
  }),
  buildSeedAgent({
    id: 'ag-002',
    code: '2.4.18',
    name: '商品补货智能体',
    type: 'Operational',
    status: 'Active',
    version: 'v1.0.0',
    description: '基于商品补货本体，结合销量流速、库存水位与尺码分布生成门店补货与调拨方案。',
    model: 'Deepexi-R1-Reasoner',
    skillIds: [buildBusinessSkillId('2.4.18'), 'g-workflow-orchestration', 'g-decision-support', 'g-work-order'],
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
