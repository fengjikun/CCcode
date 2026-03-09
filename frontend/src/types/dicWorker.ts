/**
 * L7 FDE 数字员工类型定义
 */

export type DICWorkerStatus = 'Online' | 'Busy' | 'Offline' | 'Maintenance'

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
