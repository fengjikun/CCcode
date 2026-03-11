import type { HealthEntry, ActivityEntry } from '../types/dashboard'
import { listAgents } from './agentStudio'
import { listDataSources } from './dataSource'
import { listDigitalHumans } from './digitalHuman'
import { listModels, getGatewayStats } from './modelGateway'
import { ensureMockStore, setMockStore } from './mockStoreClient'
import { listProjects } from './projectManagement'
import { listSkills } from './skillsMarket'
import { listTrainingJobs } from './modelTraining'
import { listTransforms } from './transform'

const STORE_KEY = 'dashboard'
const DATA_VERSION = 5

export interface PlatformStats {
  datasources: number
  transformJobs: number
  objectTypes: number
  ontologyProjects: number
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

interface DashboardStore {
  health: HealthEntry[]
  activity: ActivityEntry[]
  stats: PlatformStats
  _v?: number
}

const DEFAULT_STORE: DashboardStore = {
  health: [
    { key: '1', component: '数据接入管道', status: 'Healthy', uptime: '99.97%', qps: 3420, latency: '12ms', lastCheck: '1 分钟前' },
    { key: '2', component: '数据准备引擎', status: 'Healthy', uptime: '99.92%', qps: 1850, latency: '38ms', lastCheck: '2 分钟前' },
    { key: '3', component: '本体语义服务', status: 'Healthy', uptime: '99.95%', qps: 960, latency: '15ms', lastCheck: '1 分钟前' },
    { key: '4', component: '智能体运行服务', status: 'Degraded', uptime: '98.50%', qps: 520, latency: '210ms', lastCheck: '3 分钟前' },
    { key: '5', component: '模型训练调度器', status: 'Healthy', uptime: '99.80%', qps: 45, latency: '85ms', lastCheck: '5 分钟前' },
    { key: '6', component: '模型网关', status: 'Healthy', uptime: '99.98%', qps: 15600, latency: '45ms', lastCheck: '30 秒前' },
    { key: '7', component: 'AI员工服务', status: 'Healthy', uptime: '99.90%', qps: 280, latency: '120ms', lastCheck: '2 分钟前' },
  ],
  activity: [
    { key: '1', time: '14:32:22', user: 'Equipment Agent', action: '执行故障诊断', target: '设备 #DV-8921', level: 'info' },
    { key: '2', time: '14:28:45', user: 'Inventory Agent', action: '自动创建采购订单', target: 'SKU #12345', level: 'success' },
    { key: '3', time: '14:15:22', user: '张工', action: '发布本体 Schema v3.2', target: '采购订单对象', level: 'success' },
    { key: '4', time: '13:58:10', user: 'Customer Agent', action: '自动回复工单', target: 'TK-3342', level: 'success' },
    { key: '5', time: '13:45:33', user: '系统', action: '智能体运行服务性能降级告警', target: '智能体编排模块', level: 'warning' },
    { key: '6', time: '13:30:00', user: '李工', action: '部署模型 v2.1.0', target: 'purchase-order-classifier', level: 'info' },
    { key: '7', time: '13:12:18', user: '系统', action: '文档解析批次完成', target: 'maintenance_manual_markdown', level: 'success' },
    { key: '8', time: '12:55:42', user: '王工', action: '新增数据源连接', target: 'SAP ERP Production', level: 'info' },
  ],
  stats: {
    datasources: 24,
    transformJobs: 156,
    objectTypes: 89,
    ontologyProjects: 89,
    agents: 12,
    skills: 47,
    trainingJobs: 8,
    deployedModels: 23,
    digitalWorkers: 15,
    totalRequests: '2.4M',
    avgLatency: '45ms',
    uptime: '100%',
    activeUsers: 36,
  },
  _v: DATA_VERSION,
}

async function loadStore(): Promise<DashboardStore> {
  const store = await ensureMockStore<DashboardStore>(STORE_KEY, DEFAULT_STORE)
  if (store._v === DATA_VERSION) {
    return store
  }
  await setMockStore(STORE_KEY, DEFAULT_STORE)
  return DEFAULT_STORE
}

export async function getHealthData(): Promise<HealthEntry[]> {
  const store = await loadStore()
  return store.health
}

export async function getActivityData(): Promise<ActivityEntry[]> {
  const store = await loadStore()
  return store.activity
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const store = await loadStore()
  const [
    dataSourcesResult,
    projectsResult,
    transformResult,
    digitalHumansResult,
    agentsResult,
    skillsResult,
    trainingJobsResult,
    modelsResult,
    gatewayStatsResult,
  ] = await Promise.allSettled([
    listDataSources(),
    listProjects(),
    listTransforms(),
    listDigitalHumans(),
    listAgents(),
    listSkills(),
    listTrainingJobs(),
    listModels(),
    getGatewayStats(),
  ])

  return {
    ...store.stats,
    datasources: dataSourcesResult.status === 'fulfilled' ? dataSourcesResult.value.length : store.stats.datasources,
    ontologyProjects: projectsResult.status === 'fulfilled' ? projectsResult.value.length : store.stats.ontologyProjects,
    transformJobs: transformResult.status === 'fulfilled' ? transformResult.value.length : store.stats.transformJobs,
    digitalWorkers: digitalHumansResult.status === 'fulfilled' ? digitalHumansResult.value.length : store.stats.digitalWorkers,
    agents: agentsResult.status === 'fulfilled' ? agentsResult.value.length : store.stats.agents,
    skills: skillsResult.status === 'fulfilled' ? skillsResult.value.length : store.stats.skills,
    trainingJobs: trainingJobsResult.status === 'fulfilled' ? trainingJobsResult.value.length : store.stats.trainingJobs,
    deployedModels: modelsResult.status === 'fulfilled'
      ? modelsResult.value.filter(model => model.stage !== 'Archived').length
      : store.stats.deployedModels,
    avgLatency: gatewayStatsResult.status === 'fulfilled' ? gatewayStatsResult.value.avgLatency : store.stats.avgLatency,
    uptime: '100%',
  }
}
