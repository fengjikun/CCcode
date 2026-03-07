export type DigitalHumanType =
  | 'fault-repair'
  | 'engineering-design'
  | 'process-optimization'
  | 'bom-analysis'
  | 'operation-decision'
  | 'store-matching'
  | 'data-ops'
  | 'tax-planning'

export const DIGITAL_HUMAN_TYPES: DigitalHumanType[] = [
  'fault-repair',
  'engineering-design',
  'process-optimization',
  'bom-analysis',
  'operation-decision',
  'store-matching',
  'data-ops',
  'tax-planning',
]

export const DIGITAL_HUMAN_TYPE_LABELS: Record<DigitalHumanType, string> = {
  'fault-repair': '故障维修',
  'engineering-design': '工程设计',
  'process-optimization': '工艺优化',
  'bom-analysis': 'BOM分析',
  'operation-decision': '运营决策',
  'store-matching': '店货匹配',
  'data-ops': '数据运维',
  'tax-planning': '财税筹划',
}

export const DIGITAL_HUMAN_TYPE_COLORS: Record<DigitalHumanType, string> = {
  'fault-repair': 'orange',
  'engineering-design': 'blue',
  'process-optimization': 'cyan',
  'bom-analysis': 'purple',
  'operation-decision': 'red',
  'store-matching': 'green',
  'data-ops': 'geekblue',
  'tax-planning': 'gold',
}

export const DIGITAL_HUMAN_TYPE_ICONS: Record<DigitalHumanType, string> = {
  'fault-repair': '🔧',
  'engineering-design': '📐',
  'process-optimization': '⚙️',
  'bom-analysis': '📋',
  'operation-decision': '📊',
  'store-matching': '🏪',
  'data-ops': '🖥️',
  'tax-planning': '💰',
}

export interface DigitalHuman {
  id: string
  name: string
  description?: string
  type: DigitalHumanType
  projectId?: string
  createdAt: string
  updatedAt: string
}
