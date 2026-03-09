import type { Agent, AgentType } from '../types/agent'
import { delay, rand } from './mockConfig'

const STORAGE_KEY = 'deepexios_agents'

const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'ag-001',
    name: '设备故障诊断 Agent',
    type: 'Operational',
    status: 'Active',
    version: 'v2.3.1',
    description: '基于设备本体与故障知识图谱，自动分析传感器数据，定位故障根因，生成维修方案',
    systemPrompt: '你是一个设备故障诊断专家。根据设备传感器数据和历史维修记录，分析潜在故障，识别根因，推荐维修方案。始终优先考虑安全性和设备寿命。',
    model: 'DeepSeek-V3',
    skillIds: ['sk-002', 'sk-003', 'sk-005', 'sk-007'],
    createdAt: '2024-06-15T08:00:00.000Z',
    updatedAt: '2024-11-20T10:00:00.000Z',
  },
  {
    id: 'ag-002',
    name: '库存管理 Agent',
    type: 'Operational',
    status: 'Active',
    version: 'v1.8.2',
    description: '监控库存水位，预测物料需求，自动触发补货流程，优化库存周转率',
    systemPrompt: '你是一个库存管理专家。监控物料库存水位，结合需求预测与安全库存策略，及时发起补货建议并协调供应链。',
    model: 'DeepSeek-V3',
    skillIds: ['sk-001', 'sk-004', 'sk-006', 'sk-008'],
    createdAt: '2024-07-20T08:00:00.000Z',
    updatedAt: '2024-11-18T10:00:00.000Z',
  },
  {
    id: 'ag-003',
    name: '客户服务 Agent',
    type: 'Support',
    status: 'Testing',
    version: 'v0.9.5',
    description: '智能客服问答，基于产品知识图谱解答客户问题，引导工单创建',
    systemPrompt: '你是一个客户服务助手。基于产品知识库为客户提供准确的技术支持和业务解答，必要时引导客户创建服务工单。',
    model: 'DeepSeek-V3',
    skillIds: ['sk-005'],
    createdAt: '2024-09-01T08:00:00.000Z',
    updatedAt: '2024-11-25T10:00:00.000Z',
  },
]

function load(): Agent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      save(DEFAULT_AGENTS)
      return DEFAULT_AGENTS
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function save(list: Agent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export async function listAgents(): Promise<Agent[]> {
  await delay(rand(300, 600))
  return load()
}

export async function getAgent(id: string): Promise<Agent | null> {
  await delay(rand(200, 400))
  return load().find(a => a.id === id) ?? null
}

export async function createAgent(input: {
  name: string
  type: AgentType
  description?: string
  systemPrompt: string
  model: string
  skillIds: string[]
}): Promise<Agent> {
  await delay(rand(400, 700))
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
  const list = load()
  list.push(agent)
  save(list)
  return agent
}

export async function updateAgent(
  id: string,
  patch: Partial<Pick<Agent, 'name' | 'description' | 'status' | 'systemPrompt' | 'model' | 'skillIds'>>,
): Promise<Agent | null> {
  await delay(rand(300, 500))
  const list = load()
  const idx = list.findIndex(a => a.id === id)
  if (idx < 0) return null
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() }
  save(list)
  return list[idx]
}

export async function deleteAgent(id: string): Promise<void> {
  await delay(rand(300, 500))
  save(load().filter(a => a.id !== id))
}

/** 发布 Agent 为数字员工 */
export async function publishAsDigitalHuman(agentId: string): Promise<{ success: boolean; digitalHumanId: string }> {
  await delay(rand(500, 800))
  const agent = getAgent(agentId)
  if (!agent) return { success: false, digitalHumanId: '' }

  // 更新 agent 状态为 Active
  updateAgent(agentId, { status: 'Active' })

  // 创建对应的数字员工 (通过 digitalHuman API)
  const dhId = `dh-${Date.now()}`
  return { success: true, digitalHumanId: dhId }
}
