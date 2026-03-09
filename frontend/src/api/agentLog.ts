import type { AgentLog, LogLevel } from '../types/agentLog'
import { ensureMockStore } from './mockStoreClient'

const STORE_KEY = 'agent-logs'

interface LogStore {
  logs: AgentLog[]
}

const DEFAULT_STORE: LogStore = {
  logs: [
    { key: '1', time: '2025-03-08 14:32:22', agentId: 'agt-001', agentName: 'Equipment Agent', action: '执行动作: CreateMaintenanceTicket', detail: '设备 #DV-8921 振动超标，自动创建工单', level: 'success', duration: 3200, toolsUsed: ['ontology-api'], skillUsed: '设备故障诊断专家' },
    { key: '2', time: '2025-03-08 14:28:43', agentId: 'agt-002', agentName: 'Inventory Agent', action: '检测到库存不足', detail: 'SKU #12345 当前库存 2 件，安全库存 10 件', level: 'warning', duration: 800, toolsUsed: ['erp-api'] },
    { key: '3', time: '2025-03-08 13:58:10', agentId: 'agt-004', agentName: 'Customer Agent', action: '自动回复工单 #TK-3342', detail: '基于知识库匹配到解决方案', level: 'success', duration: 2800, toolsUsed: ['knowledge-api'] },
  ],
}

const AGENT_COLORS: Record<string, string> = {
  'Equipment Agent': 'blue',
  'Inventory Agent': 'green',
  'Ontology Assistant': 'purple',
  'Customer Agent': 'cyan',
  'Quality Agent': 'orange',
  'Supplier Agent': 'magenta',
}

async function loadStore(): Promise<LogStore> {
  return ensureMockStore<LogStore>(STORE_KEY, DEFAULT_STORE)
}

export async function getAgentLogs(filters?: {
  agentName?: string
  level?: LogLevel
  keyword?: string
}): Promise<AgentLog[]> {
  let result = [...(await loadStore()).logs]
  if (filters?.agentName) result = result.filter(l => l.agentName === filters.agentName)
  if (filters?.level) result = result.filter(l => l.level === filters.level)
  if (filters?.keyword) {
    const q = filters.keyword.toLowerCase()
    result = result.filter(l => l.action.toLowerCase().includes(q) || (l.detail || '').toLowerCase().includes(q))
  }
  return result
}

export async function getAgentNames(): Promise<string[]> {
  return [...new Set((await loadStore()).logs.map(l => l.agentName))]
}

export function getAgentColor(name: string): string {
  return AGENT_COLORS[name] || 'default'
}

export interface LogStats {
  total: number
  success: number
  warning: number
  error: number
  avgDuration: string
  agentCount: number
}

export async function getLogStats(): Promise<LogStats> {
  const logs = (await loadStore()).logs
  const durations = logs.filter(l => l.duration).map(l => l.duration!)
  return {
    total: logs.length,
    success: logs.filter(l => l.level === 'success').length,
    warning: logs.filter(l => l.level === 'warning').length,
    error: logs.filter(l => l.level === 'error').length,
    avgDuration: durations.length ? `${(durations.reduce((a, b) => a + b, 0) / durations.length / 1000).toFixed(1)}s` : '0.0s',
    agentCount: new Set(logs.map(l => l.agentName)).size,
  }
}
