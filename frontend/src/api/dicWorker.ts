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
const SEED_VERSION = 2

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

const DEFAULT_STORE: DICStore = {
  workers: [
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
  ],
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

  const nextStore = { workers: normalizedWorkers, seedVersion: SEED_VERSION }
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
