import type { DICWorker } from '../types/dicWorker'

const MOCK_WORKERS: DICWorker[] = [
  {
    key: '1', id: 'dic-001', name: '本体建模助手', icon: '🏗️',
    description: '智能本体设计与验证：自动推荐属性、检查 Schema 一致性、生成迁移脚本',
    category: 'ontology', status: 'Online',
    tasksCompleted: 1245, tasksToday: 18, avgResponseTime: '2.3s', successRate: '99.2%',
    skills: ['Schema 验证', '属性推荐', '迁移脚本生成'],
    lastActive: '2 分钟前',
  },
  {
    key: '2', id: 'dic-002', name: '数据质量巡检员', icon: '📊',
    description: '自动化数据质量检查：空值检测、格式校验、异常值识别、数据血缘追踪',
    category: 'data-quality', status: 'Busy',
    tasksCompleted: 3420, tasksToday: 42, avgResponseTime: '5.1s', successRate: '98.7%',
    skills: ['空值检测', '格式校验', '异常值识别', '血缘追踪'],
    lastActive: '正在执行',
  },
  {
    key: '3', id: 'dic-003', name: '知识图谱维护员', icon: '🔗',
    description: '实体冲突发现、关系缺失检测、图谱一致性验证、自动修复建议',
    category: 'knowledge-graph', status: 'Online',
    tasksCompleted: 892, tasksToday: 8, avgResponseTime: '3.8s', successRate: '97.5%',
    skills: ['实体消歧', '关系补全', '一致性校验', '冗余检测'],
    lastActive: '5 分钟前',
  },
  {
    key: '4', id: 'dic-004', name: 'Schema 迁移助手', icon: '📝',
    description: '本体升级迁移脚本自动生成：版本对比、影响分析、回滚方案',
    category: 'ontology', status: 'Online',
    tasksCompleted: 456, tasksToday: 3, avgResponseTime: '8.2s', successRate: '99.8%',
    skills: ['版本对比', '迁移脚本', '影响分析', '回滚方案'],
    lastActive: '12 分钟前',
  },
  {
    key: '5', id: 'dic-005', name: '数据管道监控员', icon: '🔧',
    description: '实时监控 ETL 管道健康状态：延迟告警、吞吐异常、错误溯源',
    category: 'platform-ops', status: 'Online',
    tasksCompleted: 5680, tasksToday: 156, avgResponseTime: '0.5s', successRate: '99.9%',
    skills: ['管道监控', '延迟告警', '错误溯源', '自动恢复'],
    lastActive: '30 秒前',
  },
  {
    key: '6', id: 'dic-006', name: '数据血缘分析师', icon: '🧬',
    description: '自动构建数据血缘图谱：字段级追踪、影响范围分析、变更通知',
    category: 'data-quality', status: 'Online',
    tasksCompleted: 780, tasksToday: 6, avgResponseTime: '4.5s', successRate: '98.2%',
    skills: ['字段追踪', '血缘图谱', '影响分析', '变更通知'],
    lastActive: '8 分钟前',
  },
  {
    key: '7', id: 'dic-007', name: '安全审计员', icon: '🛡️',
    description: '数据访问审计：权限合规检查、敏感数据发现、操作日志分析',
    category: 'platform-ops', status: 'Maintenance',
    tasksCompleted: 2340, tasksToday: 0, avgResponseTime: '1.8s', successRate: '99.5%',
    skills: ['权限审计', '敏感数据扫描', '日志分析', '合规报告'],
    lastActive: '维护中',
  },
  {
    key: '8', id: 'dic-008', name: '图谱推理引擎', icon: '🧠',
    description: '知识图谱推理：路径发现、属性推断、规则挖掘、关系预测',
    category: 'knowledge-graph', status: 'Online',
    tasksCompleted: 560, tasksToday: 4, avgResponseTime: '12.5s', successRate: '96.8%',
    skills: ['路径发现', '属性推断', '规则挖掘', '关系预测'],
    lastActive: '15 分钟前',
  },
]

export function listDICWorkers(): DICWorker[] {
  return MOCK_WORKERS
}

export interface DICStats {
  total: number
  online: number
  busy: number
  totalTasksToday: number
  totalTasksCompleted: string
}

export function getDICStats(): DICStats {
  return {
    total: MOCK_WORKERS.length,
    online: MOCK_WORKERS.filter(w => w.status === 'Online').length,
    busy: MOCK_WORKERS.filter(w => w.status === 'Busy').length,
    totalTasksToday: MOCK_WORKERS.reduce((s, w) => s + w.tasksToday, 0),
    totalTasksCompleted: `${(MOCK_WORKERS.reduce((s, w) => s + w.tasksCompleted, 0) / 1000).toFixed(1)}K`,
  }
}
