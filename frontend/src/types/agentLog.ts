/**
 * L4 智能体执行日志类型定义
 */

export type LogLevel = 'info' | 'success' | 'warning' | 'error'

export interface AgentLog {
  key: string
  time: string
  agentId: string
  agentName: string
  action: string
  detail?: string
  level: LogLevel
  duration?: number
  toolsUsed?: string[]
  skillUsed?: string
}

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  info: 'blue',
  success: 'green',
  warning: 'orange',
  error: 'red',
}

export const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  info: '信息',
  success: '成功',
  warning: '警告',
  error: '错误',
}
