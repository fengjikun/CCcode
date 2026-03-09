import type { HealthEntry, ActivityEntry } from '../types/dashboard'
import { delay, rand } from './mockConfig'

const HEALTH_DATA: HealthEntry[] = [
  { key: '1', component: 'L1 数据接入管道', status: 'Healthy', uptime: '99.97%', qps: 3420, latency: '12ms', lastCheck: '1 分钟前' },
  { key: '2', component: 'L2 数据转换引擎', status: 'Healthy', uptime: '99.92%', qps: 1850, latency: '38ms', lastCheck: '2 分钟前' },
  { key: '3', component: 'L3 本体语义服务', status: 'Healthy', uptime: '99.95%', qps: 960, latency: '15ms', lastCheck: '1 分钟前' },
  { key: '4', component: 'L4 Agent Runtime', status: 'Degraded', uptime: '98.50%', qps: 520, latency: '210ms', lastCheck: '3 分钟前' },
  { key: '5', component: 'L5 训练调度器', status: 'Healthy', uptime: '99.80%', qps: 45, latency: '85ms', lastCheck: '5 分钟前' },
  { key: '6', component: 'L6 模型网关', status: 'Healthy', uptime: '99.98%', qps: 15600, latency: '45ms', lastCheck: '30 秒前' },
  { key: '7', component: 'L7 数字员工服务', status: 'Healthy', uptime: '99.90%', qps: 280, latency: '120ms', lastCheck: '2 分钟前' },
]

const ACTIVITY_DATA: ActivityEntry[] = [
  { key: '1', time: '14:32:22', user: 'Equipment Agent', action: '执行故障诊断', target: '设备 #DV-8921', level: 'info' },
  { key: '2', time: '14:28:45', user: 'Inventory Agent', action: '自动创建采购订单', target: 'SKU #12345', level: 'success' },
  { key: '3', time: '14:15:22', user: '张工', action: '发布本体 Schema v3.2', target: '采购订单对象', level: 'success' },
  { key: '4', time: '13:58:10', user: 'Customer Agent', action: '自动回复工单', target: 'TK-3342', level: 'success' },
  { key: '5', time: '13:45:33', user: '系统', action: 'Agent Runtime 性能降级告警', target: 'L4 服务', level: 'warning' },
  { key: '6', time: '13:30:00', user: '李工', action: '部署模型 v2.1.0', target: 'purchase-order-classifier', level: 'info' },
  { key: '7', time: '13:12:18', user: '系统', action: '训练任务完成', target: 'equipment-fault-predictor v1.8.2', level: 'success' },
  { key: '8', time: '12:55:42', user: '王工', action: '新增数据源连接', target: 'SAP ERP Production', level: 'info' },
]

export interface PlatformStats {
  datasources: number
  transformJobs: number
  objectTypes: number
  agents: number
  skills: number
  trainingJobs: number
  deployedModels: number
  digitalWorkers: number
  totalRequests: string
  avgLatency: string
  uptime: string
  activeUsers: number
}

const PLATFORM_STATS: PlatformStats = {
  datasources: 24,
  transformJobs: 156,
  objectTypes: 89,
  agents: 12,
  skills: 47,
  trainingJobs: 8,
  deployedModels: 23,
  digitalWorkers: 15,
  totalRequests: '2.4M',
  avgLatency: '45ms',
  uptime: '99.9%',
  activeUsers: 36,
}

export async function getHealthData(): Promise<HealthEntry[]> {
  await delay(rand(300, 600))
  return HEALTH_DATA
}

export async function getActivityData(): Promise<ActivityEntry[]> {
  await delay(rand(300, 600))
  return ACTIVITY_DATA
}

export async function getPlatformStats(): Promise<PlatformStats> {
  await delay(rand(200, 500))
  return { ...PLATFORM_STATS }
}
