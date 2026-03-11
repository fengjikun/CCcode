import type { AgentType } from '../types/agent'
import { normalizeServiceModelName } from '../types/modelCatalog'
import type { SkillCategory } from '../types/skill'
import {
  DIC_CATEGORY_LABELS,
  DIC_CATEGORY_WORKSPACE_PATHS,
  type DICWorker,
} from '../types/dicWorker'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'dic-workers'
const SEED_VERSION = 4

interface DICStore {
  workers: DICWorker[]
  seedVersion?: number
}

export interface DICWorkerUpdateInput extends Partial<
  Pick<
    DICWorker,
    | 'name'
    | 'description'
    | 'category'
    | 'status'
    | 'owner'
    | 'maintainers'
    | 'preferredModel'
    | 'linkedAgentIds'
    | 'linkedSkillIds'
    | 'skills'
    | 'systemPrompt'
    | 'operationBoundary'
    | 'publishChannels'
    | 'workspacePath'
  >
> {}

const DEFAULT_CHANNELS: DICWorker['publishChannels'] = ['管理平台', '运维控制台']

const MODEL_BY_CATEGORY: Record<DICWorker['category'], string> = {
  'ontology': 'Deepexi 2.0 推理增强',
  'data-quality': 'Deepexi 2.0 通用对话',
  'knowledge-graph': 'Deepexi 2.0 推理增强',
  'platform-ops': 'Deepexi 2.0 通用对话',
}

const OWNER_BY_CATEGORY: Record<DICWorker['category'], string> = {
  'ontology': '本体平台主管',
  'data-quality': '数据治理负责人',
  'knowledge-graph': '知识工程负责人',
  'platform-ops': '平台运维负责人',
}

export const DIC_AGENT_TYPE_BY_CATEGORY: Record<DICWorker['category'], AgentType> = {
  'ontology': 'Analytical',
  'data-quality': 'Analytical',
  'knowledge-graph': 'Analytical',
  'platform-ops': 'Operational',
}

export const DIC_SKILL_CATEGORIES_BY_CATEGORY: Record<DICWorker['category'], SkillCategory[]> = {
  'ontology': ['domain-expert', 'development'],
  'data-quality': ['data-analysis', 'development'],
  'knowledge-graph': ['domain-expert', 'data-analysis'],
  'platform-ops': ['development', 'communication'],
}

function defaultSystemPrompt(worker: Pick<DICWorker, 'name' | 'category'>) {
  return `你是${worker.name}，负责${DIC_CATEGORY_LABELS[worker.category]}方向的技术AI员工配置与执行协同。请优先输出可落地的诊断依据、风险判断和下一步操作建议。`
}

function defaultOperationBoundary(worker: Pick<DICWorker, 'category'>) {
  if (worker.category === 'ontology') {
    return '负责 Schema 推荐、一致性校验与迁移建议，不直接替代正式本体发布审批。'
  }
  if (worker.category === 'data-quality') {
    return '负责质量巡检、异常定位与修复建议，不直接改写生产库数据。'
  }
  if (worker.category === 'knowledge-graph') {
    return '负责图谱巡检、关系补全建议与一致性分析，不直接覆盖线上知识图谱。'
  }
  return '负责平台巡检、运行诊断与自动化建议，不直接执行高风险运维命令。'
}

function withDICWorkerDefaults(input: DICWorker): DICWorker {
  return {
    ...input,
    owner: input.owner ?? OWNER_BY_CATEGORY[input.category],
    maintainers: input.maintainers ?? ['AI平台运营', '技术域负责人'],
    preferredModel: normalizeServiceModelName(input.preferredModel ?? MODEL_BY_CATEGORY[input.category]),
    linkedAgentIds: input.linkedAgentIds ?? [],
    linkedSkillIds: input.linkedSkillIds ?? [],
    systemPrompt: input.systemPrompt ?? defaultSystemPrompt(input),
    operationBoundary: input.operationBoundary ?? defaultOperationBoundary(input),
    publishChannels: input.publishChannels ?? DEFAULT_CHANNELS,
    workspacePath: input.workspacePath ?? DIC_CATEGORY_WORKSPACE_PATHS[input.category],
    createdAt: input.createdAt ?? '2025-01-01T00:00:00.000Z',
    updatedAt: input.updatedAt ?? '2025-03-01T00:00:00.000Z',
  }
}

const DEFAULT_WORKERS = ([
  {
    key: '1', id: 'dic-001', name: '本体建模助手', icon: '🏗️',
    description: '智能本体设计与验证：自动推荐属性、检查 Schema 一致性、生成迁移脚本',
    category: 'ontology', status: 'Online',
    tasksCompleted: 1245, tasksToday: 18, avgResponseTime: '2.3s', successRate: '99.2%',
    skills: ['Schema 验证', '属性推荐', '迁移脚本生成'],
    lastActive: '2 分钟前',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-03-01T00:00:00.000Z',
  },
  {
    key: '2', id: 'dic-002', name: '数据质量巡检员', icon: '📊',
    description: '自动化数据质量检查：空值检测、格式校验、异常值识别、数据血缘追踪',
    category: 'data-quality', status: 'Busy',
    tasksCompleted: 3420, tasksToday: 42, avgResponseTime: '5.1s', successRate: '98.7%',
    skills: ['空值检测', '格式校验', '异常值识别', '血缘追踪'],
    lastActive: '正在执行',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-03-01T00:00:00.000Z',
  },
  {
    key: '3', id: 'dic-003', name: '知识图谱维护员', icon: '🔗',
    description: '实体冲突发现、关系缺失检测、图谱一致性验证、自动修复建议',
    category: 'knowledge-graph', status: 'Online',
    tasksCompleted: 892, tasksToday: 8, avgResponseTime: '3.8s', successRate: '97.5%',
    skills: ['实体消歧', '关系补全', '一致性校验', '冗余检测'],
    lastActive: '5 分钟前',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-03-01T00:00:00.000Z',
  },
  {
    key: '4', id: 'dic-004', name: '元数据标准管家', icon: '📚',
    description: '维护指标口径、字段命名规范与元数据资产映射，降低跨系统语义偏差',
    category: 'ontology', status: 'Online',
    tasksCompleted: 1168, tasksToday: 14, avgResponseTime: '2.9s', successRate: '98.9%',
    skills: ['口径对齐', '字段规范', '资产映射', '命名校验'],
    lastActive: '7 分钟前',
    createdAt: '2025-01-08T00:00:00.000Z',
    updatedAt: '2025-03-05T00:00:00.000Z',
  },
  {
    key: '5', id: 'dic-005', name: '主数据修复助手', icon: '🧹',
    description: '针对编码重复、缺失维度和跨源不一致问题生成修复建议与回溯清单',
    category: 'data-quality', status: 'Online',
    tasksCompleted: 1876, tasksToday: 21, avgResponseTime: '4.4s', successRate: '98.4%',
    skills: ['重复值识别', '维度补齐', '规则比对', '修复建议'],
    lastActive: '3 分钟前',
    createdAt: '2025-01-12T00:00:00.000Z',
    updatedAt: '2025-03-06T00:00:00.000Z',
  },
  {
    key: '6', id: 'dic-006', name: '图谱关系补全助手', icon: '🕸️',
    description: '基于知识规则和上下文证据发现缺失关系，输出补全候选与可信度评估',
    category: 'knowledge-graph', status: 'Busy',
    tasksCompleted: 1542, tasksToday: 27, avgResponseTime: '4.1s', successRate: '97.9%',
    skills: ['关系发现', '证据归因', '置信度评分', '图谱修补'],
    lastActive: '正在执行',
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2025-03-07T00:00:00.000Z',
  },
  {
    key: '7', id: 'dic-007', name: '平台发布护航助手', icon: '🚦',
    description: '跟踪发布窗口、依赖健康和回滚信号，辅助平台变更上线前后的稳定性把关',
    category: 'platform-ops', status: 'Online',
    tasksCompleted: 2314, tasksToday: 25, avgResponseTime: '3.2s', successRate: '99.1%',
    skills: ['发布巡检', '依赖检查', '回滚建议', '变更影响分析'],
    lastActive: '1 分钟前',
    createdAt: '2025-01-20T00:00:00.000Z',
    updatedAt: '2025-03-08T00:00:00.000Z',
  },
  {
    key: '8', id: 'dic-008', name: '智能告警响应员', icon: '🛎️',
    description: '聚合监控告警、日志异常和工单上下文，协助平台团队完成分级响应与处置建议',
    category: 'platform-ops', status: 'Maintenance',
    tasksCompleted: 2756, tasksToday: 16, avgResponseTime: '2.7s', successRate: '98.8%',
    skills: ['告警聚合', '日志研判', '故障分级', '处置预案'],
    lastActive: '维护窗口中',
    createdAt: '2025-01-25T00:00:00.000Z',
    updatedAt: '2025-03-09T00:00:00.000Z',
  },
  {
    key: '9', id: 'dic-009', name: '本体版本发布官', icon: '🧭',
    description: '管理本体版本差异、兼容性检查和发布节奏，降低模型与应用升级冲突',
    category: 'ontology', status: 'Busy',
    tasksCompleted: 968, tasksToday: 12, avgResponseTime: '3.1s', successRate: '99.0%',
    skills: ['版本比对', '兼容性校验', '发布审阅', '迁移评估'],
    lastActive: '正在评审',
    createdAt: '2025-02-01T00:00:00.000Z',
    updatedAt: '2025-03-10T00:00:00.000Z',
  },
  {
    key: '10', id: 'dic-010', name: '数据口径对账助手', icon: '🧾',
    description: '比对报表、指标平台和源系统口径差异，输出异常归因与修复协同建议',
    category: 'data-quality', status: 'Online',
    tasksCompleted: 2108, tasksToday: 19, avgResponseTime: '3.7s', successRate: '98.6%',
    skills: ['指标对账', '口径差异定位', '血缘核验', '异常归因'],
    lastActive: '6 分钟前',
    createdAt: '2025-02-05T00:00:00.000Z',
    updatedAt: '2025-03-10T00:00:00.000Z',
  },
  {
    key: '11', id: 'dic-011', name: '图谱实体治理专员', icon: '🧩',
    description: '负责实体命名统一、别名合并和冲突节点治理，提升图谱检索与推理稳定性',
    category: 'knowledge-graph', status: 'Online',
    tasksCompleted: 1334, tasksToday: 11, avgResponseTime: '3.4s', successRate: '98.1%',
    skills: ['实体归一', '别名合并', '冲突识别', '标签治理'],
    lastActive: '9 分钟前',
    createdAt: '2025-02-08T00:00:00.000Z',
    updatedAt: '2025-03-10T00:00:00.000Z',
  },
  {
    key: '12', id: 'dic-012', name: '平台容量预测助手', icon: '📈',
    description: '结合资源消耗、调用峰值和发布窗口预测容量风险，辅助平台提前扩容与限流',
    category: 'platform-ops', status: 'Online',
    tasksCompleted: 1893, tasksToday: 23, avgResponseTime: '2.8s', successRate: '99.3%',
    skills: ['容量预测', '峰值建模', '扩容建议', '限流策略'],
    lastActive: '4 分钟前',
    createdAt: '2025-02-12T00:00:00.000Z',
    updatedAt: '2025-03-10T00:00:00.000Z',
  },
  {
    key: '13', id: 'dic-013', name: '权限合规巡查员', icon: '🔐',
    description: '巡检平台账号、接口权限和高危操作授权链路，辅助识别越权与配置漂移风险',
    category: 'platform-ops', status: 'Offline',
    tasksCompleted: 1459, tasksToday: 7, avgResponseTime: '3.5s', successRate: '98.2%',
    skills: ['权限核验', '越权识别', '配置漂移检测', '审计建议'],
    lastActive: '30 分钟前',
    createdAt: '2025-02-16T00:00:00.000Z',
    updatedAt: '2025-03-09T00:00:00.000Z',
  },
  {
    key: '14', id: 'dic-014', name: '知识资产编目助手', icon: '🗂️',
    description: '整理知识库、图谱和文档资产目录，辅助技术团队构建统一可检索的知识底座',
    category: 'knowledge-graph', status: 'Online',
    tasksCompleted: 1216, tasksToday: 13, avgResponseTime: '3.0s', successRate: '97.8%',
    skills: ['资产编目', '标签整理', '知识挂载', '检索优化'],
    lastActive: '11 分钟前',
    createdAt: '2025-02-18T00:00:00.000Z',
    updatedAt: '2025-03-10T00:00:00.000Z',
  },
] satisfies DICWorker[]).map(withDICWorkerDefaults)

const DEFAULT_STORE: DICStore = {
  workers: DEFAULT_WORKERS,
  seedVersion: SEED_VERSION,
}

async function loadStore(): Promise<DICStore> {
  const store = await ensureMockStore<DICStore>(STORE_KEY, DEFAULT_STORE)
  let changed = false
  const normalizedWorkers = store.workers.map((worker) => {
    const normalized = withDICWorkerDefaults(worker)
    if (JSON.stringify(normalized) !== JSON.stringify(worker)) changed = true
    return normalized
  })

  if ((store.seedVersion ?? 0) >= SEED_VERSION) {
    if (changed) {
      const normalizedStore = { ...store, workers: normalizedWorkers, seedVersion: SEED_VERSION }
      await setMockStore(STORE_KEY, normalizedStore)
      return normalizedStore
    }
    return { ...store, workers: normalizedWorkers, seedVersion: SEED_VERSION }
  }

  const existingIds = new Set(normalizedWorkers.map(worker => worker.id))
  const nextWorkers = [...normalizedWorkers]
  for (const worker of DEFAULT_WORKERS) {
    if (!existingIds.has(worker.id)) {
      nextWorkers.push(worker)
      changed = true
    }
  }

  const nextStore = { workers: nextWorkers, seedVersion: SEED_VERSION }
  await setMockStore(STORE_KEY, nextStore)
  return nextStore
}

async function saveStore(store: DICStore): Promise<void> {
  await setMockStore(STORE_KEY, { ...store, seedVersion: SEED_VERSION })
}

export async function listDICWorkers(): Promise<DICWorker[]> {
  const store = await loadStore()
  return store.workers.map(worker => withDICWorkerDefaults(worker))
}

export async function getDICWorker(id: string): Promise<DICWorker | null> {
  const worker = (await loadStore()).workers.find(item => item.id === id) ?? null
  return worker ? withDICWorkerDefaults(worker) : null
}

export async function updateDICWorker(id: string, patch: DICWorkerUpdateInput): Promise<DICWorker | null> {
  const store = await loadStore()
  const idx = store.workers.findIndex(item => item.id === id)
  if (idx < 0) return null

  store.workers[idx] = withDICWorkerDefaults({
    ...store.workers[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  })
  await saveStore(store)
  return store.workers[idx]
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
