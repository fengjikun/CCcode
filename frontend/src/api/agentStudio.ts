import type { Agent, AgentType } from '../types/agent'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'agent-studio'

interface AgentStore {
  agents: Agent[]
}

const DEFAULT_STORE: AgentStore = {
  agents: [
    {
      id: 'ag-001',
      name: '设备故障诊断 Agent',
      type: 'Operational',
      status: 'Active',
      version: 'v2.3.1',
      description: '基于设备本体与故障知识图谱，自动分析传感器数据并生成维修方案',
      systemPrompt: '你是一个设备故障诊断专家。',
      model: 'DeepSeek-V3',
      skillIds: ['sk-001'],
      createdAt: '2024-06-15T08:00:00.000Z',
      updatedAt: '2024-11-20T10:00:00.000Z',
    },
  ],
}

async function loadStore(): Promise<AgentStore> {
  return ensureMockStore<AgentStore>(STORE_KEY, DEFAULT_STORE)
}

async function saveStore(store: AgentStore): Promise<void> {
  await setMockStore(STORE_KEY, store)
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
  return agent
}

export async function updateAgent(
  id: string,
  patch: Partial<Pick<Agent, 'name' | 'description' | 'status' | 'systemPrompt' | 'model' | 'skillIds'>>,
): Promise<Agent | null> {
  const store = await loadStore()
  const idx = store.agents.findIndex(a => a.id === id)
  if (idx < 0) return null
  store.agents[idx] = { ...store.agents[idx], ...patch, updatedAt: new Date().toISOString() }
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
