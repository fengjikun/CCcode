import type { AgentLog, LogLevel } from '../types/agentLog'

const MOCK_LOGS: AgentLog[] = [
  { key: '1', time: '2025-03-08 14:32:22', agentId: 'agt-001', agentName: 'Equipment Agent', action: '执行动作: CreateMaintenanceTicket', detail: '设备 #DV-8921 振动超标，自动创建 P2 维修工单 WO-20250308-0042', level: 'success', duration: 3200, toolsUsed: ['ontology-api', 'cmms-api'], skillUsed: '设备故障诊断专家' },
  { key: '2', time: '2025-03-08 14:32:18', agentId: 'agt-001', agentName: 'Equipment Agent', action: '调用诊断函数 checkMotorHealth()', detail: '分析电机 #DV-8921 健康状态，检测到轴承内圈磨损迹象', level: 'info', duration: 1850, toolsUsed: ['sensor-data-api'], skillUsed: '设备故障诊断专家' },
  { key: '3', time: '2025-03-08 14:32:15', agentId: 'agt-001', agentName: 'Equipment Agent', action: '分析传感器数据', detail: '设备 #DV-8921 振动值 12.5mm/s 超阈值 7.1mm/s', level: 'warning', duration: 2100, toolsUsed: ['sensor-data-api'] },
  { key: '4', time: '2025-03-08 14:28:45', agentId: 'agt-002', agentName: 'Inventory Agent', action: '执行动作: CreatePurchaseOrder', detail: '自动为 SKU #12345（轴承 SKF 6205-2RS）创建采购订单', level: 'success', duration: 4500, toolsUsed: ['erp-api', 'sap-api'], skillUsed: '库存需求预测' },
  { key: '5', time: '2025-03-08 14:28:43', agentId: 'agt-002', agentName: 'Inventory Agent', action: '检测到库存不足', detail: 'SKU #12345 当前库存 2 件，安全库存 10 件', level: 'warning', duration: 800, toolsUsed: ['erp-api'] },
  { key: '6', time: '2025-03-08 14:15:22', agentId: 'agt-003', agentName: 'Ontology Assistant', action: '验证新建 Object Types', detail: '批量验证 12 个新 Object Type 的 Schema 一致性，全部通过', level: 'success', duration: 6200, toolsUsed: ['ontology-api'] },
  { key: '7', time: '2025-03-08 13:58:10', agentId: 'agt-004', agentName: 'Customer Agent', action: '自动回复工单 #TK-3342', detail: '基于知识库匹配到解决方案，客户满意度评分 4.8/5', level: 'success', duration: 2800, toolsUsed: ['knowledge-api', 'ticket-api'] },
  { key: '8', time: '2025-03-08 13:45:33', agentId: 'agt-001', agentName: 'Equipment Agent', action: '安排预防性维护', detail: '电机 #DV-7712 运行 4800 小时，触发定期保养', level: 'info', duration: 1500, toolsUsed: ['cmms-api'], skillUsed: '维修工单生成器' },
  { key: '9', time: '2025-03-08 13:30:05', agentId: 'agt-005', agentName: 'Quality Agent', action: '质检异常告警', detail: '批次 #PB-2025-0308 硬度 HRC 56 低于标准 58-62', level: 'error', duration: 1200, toolsUsed: ['qms-api'], skillUsed: '质量检测报告生成' },
  { key: '10', time: '2025-03-08 13:15:20', agentId: 'agt-002', agentName: 'Inventory Agent', action: '需求预测计算完成', detail: '完成 SKU #12345 未来 30 天预测，预计需求 45 件', level: 'info', duration: 8500, toolsUsed: ['erp-api', 'code-executor'], skillUsed: '库存需求预测' },
  { key: '11', time: '2025-03-08 12:55:42', agentId: 'agt-006', agentName: 'Supplier Agent', action: '发送交期确认通知', detail: '向供应商 #SUP-088 发送交期确认邮件，PO-2025-03082', level: 'success', duration: 3100, toolsUsed: ['scm-api', 'notification-api'], skillUsed: '供应商协同通知' },
  { key: '12', time: '2025-03-08 12:40:15', agentId: 'agt-001', agentName: 'Equipment Agent', action: '传感器数据批量分析', detail: '完成 156 个测点的健康评估，发现 3 个异常', level: 'info', duration: 15200, toolsUsed: ['sensor-data-api', 'code-executor'], skillUsed: '传感器异常检测' },
]

const AGENT_COLORS: Record<string, string> = {
  'Equipment Agent': 'blue',
  'Inventory Agent': 'green',
  'Ontology Assistant': 'purple',
  'Customer Agent': 'cyan',
  'Quality Agent': 'orange',
  'Supplier Agent': 'magenta',
}

export function getAgentLogs(filters?: {
  agentName?: string
  level?: LogLevel
  keyword?: string
}): AgentLog[] {
  let result = [...MOCK_LOGS]
  if (filters?.agentName) {
    result = result.filter(l => l.agentName === filters.agentName)
  }
  if (filters?.level) {
    result = result.filter(l => l.level === filters.level)
  }
  if (filters?.keyword) {
    const q = filters.keyword.toLowerCase()
    result = result.filter(l =>
      l.action.toLowerCase().includes(q) ||
      (l.detail || '').toLowerCase().includes(q)
    )
  }
  return result
}

export function getAgentNames(): string[] {
  return [...new Set(MOCK_LOGS.map(l => l.agentName))]
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

export function getLogStats(): LogStats {
  const durations = MOCK_LOGS.filter(l => l.duration).map(l => l.duration!)
  return {
    total: MOCK_LOGS.length,
    success: MOCK_LOGS.filter(l => l.level === 'success').length,
    warning: MOCK_LOGS.filter(l => l.level === 'warning').length,
    error: MOCK_LOGS.filter(l => l.level === 'error').length,
    avgDuration: `${(durations.reduce((a, b) => a + b, 0) / durations.length / 1000).toFixed(1)}s`,
    agentCount: new Set(MOCK_LOGS.map(l => l.agentName)).size,
  }
}
