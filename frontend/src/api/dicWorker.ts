import type { DICWorker } from '../types/dicWorker'
import { ensureMockStore } from './mockStoreClient'

const STORE_KEY = 'dic-workers'

interface DICStore {
  workers: DICWorker[]
}

const DEFAULT_STORE: DICStore = {
  workers: [
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
  ],
}

async function loadStore(): Promise<DICStore> {
  return ensureMockStore<DICStore>(STORE_KEY, DEFAULT_STORE)
}

export async function listDICWorkers(): Promise<DICWorker[]> {
  const store = await loadStore()
  return store.workers
}

export interface DICStats {
  total: number
  online: number
  busy: number
  totalTasksToday: number
  totalTasksCompleted: string
}

export async function getDICStats(): Promise<DICStats> {
  const workers = (await loadStore()).workers
  return {
    total: workers.length,
    online: workers.filter(w => w.status === 'Online').length,
    busy: workers.filter(w => w.status === 'Busy').length,
    totalTasksToday: workers.reduce((s, w) => s + w.tasksToday, 0),
    totalTasksCompleted: `${(workers.reduce((s, w) => s + w.tasksCompleted, 0) / 1000).toFixed(1)}K`,
  }
}
