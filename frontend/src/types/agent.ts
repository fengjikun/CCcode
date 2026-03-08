/** L4 智能体类型定义 */

export type AgentType = 'Operational' | 'Support' | 'Analytical'

export type AgentStatus = 'Active' | 'Testing' | 'Offline'

export const AGENT_TYPES: AgentType[] = ['Operational', 'Support', 'Analytical']

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  Operational: '运营型',
  Support: '服务型',
  Analytical: '分析型',
}

export const AGENT_TYPE_COLORS: Record<AgentType, string> = {
  Operational: 'blue',
  Support: 'cyan',
  Analytical: 'purple',
}

export const AGENT_TYPE_DESCRIPTIONS: Record<AgentType, string> = {
  Operational: '执行业务操作流程，如设备诊断、工单创建、审批流转等',
  Support: '提供交互式问答与技术支持，如客户服务、知识检索等',
  Analytical: '数据分析与洞察生成，如需求预测、成本分析、异常检测等',
}

export const AGENT_TYPE_ICONS: Record<AgentType, string> = {
  Operational: '🤖',
  Support: '💬',
  Analytical: '📊',
}

export const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  Active: 'green',
  Testing: 'orange',
  Offline: 'default',
}

export interface Agent {
  id: string
  name: string
  type: AgentType
  status: AgentStatus
  version: string
  description?: string
  systemPrompt: string
  model: string
  skillIds: string[]
  createdAt: string
  updatedAt: string
}
