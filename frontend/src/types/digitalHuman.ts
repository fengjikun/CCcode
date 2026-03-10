import type { SkillIndustry } from './skill'

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

export const DIGITAL_HUMAN_TYPE_DESCRIPTIONS: Record<DigitalHumanType, string> = {
  'fault-repair': '基于设备本体与故障知识库，精准定位根因，输出结构化维修方案',
  'engineering-design': '融合工程规范本体，辅助图纸审查、参数校验与设计优化决策',
  'process-optimization': '结合工艺知识图谱，分析瓶颈工序，提升良率与节拍效率',
  'bom-analysis': '解析物料清单结构，识别替代料与成本优化空间，支持供应链决策',
  'operation-decision': '整合运营数据本体，提供实时经营洞察与多维决策支持',
  'store-matching': '基于门店与商品本体，智能匹配货品结构，提升动销率',
  'data-ops': '监控数据链路健康度，自动诊断质量问题，保障数据资产稳定运行',
  'tax-planning': '依托财税知识本体，合规筹划税务结构，降低涉税风险',
}

export interface DigitalHuman {
  id: string
  name: string
  description?: string
  type: DigitalHumanType
  projectId?: string
  ontologyCode?: string
  ontologyName?: string
  ontologyIndustry?: SkillIndustry
  ontologyPhase?: string
  agentScene?: string
  trainingType?: string
  createdAt: string
  updatedAt: string
}
