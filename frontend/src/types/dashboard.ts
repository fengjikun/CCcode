/**
 * Dashboard 总览类型定义
 */
import type { ReactNode } from 'react'

/** L1-L7 流水线阶段 */
export interface PipelineStage {
  key: string
  label: string
  labelZh: string
  icon: ReactNode
  color: string
  entityCount: number
  status: 'healthy' | 'degraded' | 'offline'
}

/** 平台健康度条目 */
export interface HealthEntry {
  key: string
  component: string
  status: 'Healthy' | 'Degraded' | 'Offline'
  uptime: string
  qps: number
  latency: string
  lastCheck: string
}

/** 平台活动日志 */
export interface ActivityEntry {
  key: string
  time: string
  user: string
  action: string
  target: string
  level: 'info' | 'success' | 'warning' | 'error'
}
