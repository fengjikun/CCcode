/**
 * L7 FDE AI员工类型定义
 */

export type DICWorkerStatus = 'Online' | 'Busy' | 'Offline' | 'Maintenance'
export type DICWorkerChannel = '管理平台' | '运维控制台' | '企业微信' | 'OpenAPI'

export interface DICWorker {
  key: string
  id: string
  name: string
  icon: string
  description: string
  category: 'ontology' | 'data-quality' | 'knowledge-graph' | 'platform-ops'
  status: DICWorkerStatus
  tasksCompleted: number
  tasksToday: number
  avgResponseTime: string
  successRate: string
  skills: string[]
  lastActive: string
  owner?: string
  maintainers?: string[]
  preferredModel?: string
  linkedAgentIds?: string[]
  linkedSkillIds?: string[]
  systemPrompt?: string
  operationBoundary?: string
  publishChannels?: DICWorkerChannel[]
  workspacePath?: string
  createdAt: string
  updatedAt: string
}

export const DIC_STATUS_COLORS: Record<DICWorkerStatus, string> = {
  Online: 'green',
  Busy: 'blue',
  Offline: 'default',
  Maintenance: 'orange',
}

export const DIC_CATEGORY_LABELS: Record<DICWorker['category'], string> = {
  'ontology': '本体建模',
  'data-quality': '数据质量',
  'knowledge-graph': '知识图谱',
  'platform-ops': '平台运维',
}

export const DIC_CATEGORY_COLORS: Record<DICWorker['category'], string> = {
  'ontology': 'purple',
  'data-quality': 'blue',
  'knowledge-graph': 'cyan',
  'platform-ops': 'green',
}

export const DIC_STATUS_LABELS: Record<DICWorkerStatus, string> = {
  Online: '在线',
  Busy: '忙碌中',
  Offline: '离线',
  Maintenance: '维护中',
}

export const DIC_CATEGORY_WORKSPACE_PATHS: Record<DICWorker['category'], string> = {
  'ontology': '/ontology/projects',
  'data-quality': '/datasource',
  'knowledge-graph': '/ontology/graph',
  'platform-ops': '/studio/agents',
}
