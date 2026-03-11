import { listDataSources } from './dataSource'
import type { TransformProject, TransformType } from '../types/transform'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'transforms'
const DATA_VERSION = 6

interface TFStore {
  items: TransformProject[]
  _v?: number
}

function buildDefaultItems(): TransformProject[] {
  return [
    {
      id: 'tf-001',
      name: 'prep_maintenance_manuals',
      description: '针对维修手册、SOP 和故障代码说明执行通用文档解析，输出 Markdown、切片和问答样本。',
      type: 'DocumentParsing',
      inputSources: ['ds-maintenance-manuals'],
      inputSourceNames: ['维修手册知识库'],
      outputDatasets: ['maintenance_manual_markdown', 'maintenance_manual_chunks', 'maintenance_manual_vqa'],
      status: 'Success',
      records: 182400,
      duration: '6m 18s',
      lastRun: '8 分钟前',
      schedule: '每小时',
      createdAt: '2026-01-08T08:00:00.000Z',
      updatedAt: '2026-03-11T08:24:00.000Z',
    },
    {
      id: 'tf-002',
      name: 'prep_rca_reports',
      description: '对 RCA 报告、8D 复盘材料和专家纪要做版面恢复与章节字段抽取，沉淀可追溯案例语料。',
      type: 'LayoutRecovery',
      inputSources: ['ds-rca-reports'],
      inputSourceNames: ['故障复盘报告库'],
      outputDatasets: ['rca_case_markdown', 'rca_timeline_cards', 'rca_conclusion_labels'],
      status: 'Running',
      records: 56400,
      duration: '3m 42s',
      lastRun: '进行中',
      schedule: '每日',
      createdAt: '2026-01-16T09:10:00.000Z',
      updatedAt: '2026-03-11T08:33:00.000Z',
    },
    {
      id: 'tf-003',
      name: 'prep_machine_multimodal_corpus',
      description: '联合机台日志、振动波形和热像图片抽取跨模态特征，构建设备诊断知识语料。',
      type: 'MultimodalExtraction',
      inputSources: ['ds-machine-log-files', 'ds-vibration-waveforms', 'ds-thermal-images'],
      inputSourceNames: ['机台原始日志文件库', '振动波形文件库', '红外热像图片库'],
      outputDatasets: ['machine_log_chunks', 'waveform_fault_features', 'thermal_hotspot_captions'],
      status: 'Success',
      records: 94300,
      duration: '4m 55s',
      lastRun: '35 分钟前',
      schedule: '每日',
      createdAt: '2026-01-24T10:20:00.000Z',
      updatedAt: '2026-03-11T07:58:00.000Z',
    },
    {
      id: 'tf-004',
      name: 'prep_replenishment_rules',
      description: '对补货说明、尺码曲线和优先分配规则文件做切片、标签化和问答样本构建。',
      type: 'ChunkAnnotation',
      inputSources: ['ds-replenishment-docs', 'ds-size-rules'],
      inputSourceNames: ['商品补货业务说明文档库', '尺码规则与优先分配文件库'],
      outputDatasets: ['replenishment_rule_chunks', 'size_policy_qa_pairs', 'allocation_policy_labels'],
      status: 'Success',
      records: 47800,
      duration: '2m 31s',
      lastRun: '1 小时前',
      schedule: '每日',
      createdAt: '2026-02-04T13:00:00.000Z',
      updatedAt: '2026-03-11T07:20:00.000Z',
    },
    {
      id: 'tf-005',
      name: 'prep_transfer_order_samples',
      description: '将调拨单样本、执行回执和业务说明封装为训练对话、接口负载和执行追踪数据集。',
      type: 'DatasetPackaging',
      inputSources: ['ds-transfer-order-samples', 'ds-replenishment-docs'],
      inputSourceNames: ['门店调拨单执行样本库', '商品补货业务说明文档库'],
      outputDatasets: ['transfer_execution_payload_set', 'allocation_feedback_pairs', 'dispatch_tracking_dataset'],
      status: 'Failed',
      records: 12100,
      duration: '1m 08s',
      lastRun: '3 小时前',
      schedule: '手动触发',
      createdAt: '2026-02-18T08:00:00.000Z',
      updatedAt: '2026-03-11T05:12:00.000Z',
    },
    {
      id: 'tf-006',
      name: 'prep_weekly_review_reports',
      description: '解析补货复盘报告和运营周报，提取断码原因、满足率偏差和策略调整建议。',
      type: 'DocumentParsing',
      inputSources: ['ds-replenishment-reviews'],
      inputSourceNames: ['补货复盘报告与运营周报'],
      outputDatasets: ['review_markdown', 'weekly_strategy_adjustment_note', 'size_fill_rate_exception'],
      status: 'Idle',
      records: 0,
      duration: '-',
      lastRun: null,
      schedule: '手动触发',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-10T18:00:00.000Z',
    },
    {
      id: 'tf-007',
      name: 'prep_cross_domain_knowledge_pack',
      description: '融合手册、RCA 报告和补货说明文档，封装跨域知识切片、引用证据和 SFT 样本。',
      type: 'DatasetPackaging',
      inputSources: ['ds-maintenance-manuals', 'ds-rca-reports', 'ds-replenishment-docs'],
      inputSourceNames: ['维修手册知识库', '故障复盘报告库', '商品补货业务说明文档库'],
      outputDatasets: ['cross_domain_knowledge_chunks', 'grounding_citation_pairs', 'assistant_sft_samples'],
      status: 'Success',
      records: 68500,
      duration: '3m 22s',
      lastRun: '昨天 18:00',
      schedule: '每日',
      createdAt: '2026-02-25T10:00:00.000Z',
      updatedAt: '2026-03-10T18:00:00.000Z',
    },
    {
      id: 'tf-008',
      name: 'prep_financial_review_corpus',
      description: '对周报、策略复盘和规则附件进行切片与发布，形成可用于分析与问答的评审语料。',
      type: 'ChunkAnnotation',
      inputSources: ['ds-replenishment-reviews', 'ds-size-rules'],
      inputSourceNames: ['补货复盘报告与运营周报', '尺码规则与优先分配文件库'],
      outputDatasets: ['review_table_json', 'review_qa_pairs', 'review_entity_labels'],
      status: 'Running',
      records: 31200,
      duration: '2m 04s',
      lastRun: '进行中',
      schedule: '每周',
      createdAt: '2026-03-01T08:00:00.000Z',
      updatedAt: '2026-03-11T08:34:00.000Z',
    },
  ]
}

const DEFAULT_STORE: TFStore = {
  items: buildDefaultItems(),
  _v: DATA_VERSION,
}

async function loadStore(): Promise<TFStore> {
  const store = await ensureMockStore<TFStore>(STORE_KEY, DEFAULT_STORE)
  if (store._v === DATA_VERSION && Array.isArray(store.items) && store.items.length > 0) {
    return store
  }

  await saveStore(DEFAULT_STORE)
  return DEFAULT_STORE
}

async function saveStore(store: TFStore): Promise<void> {
  await setMockStore(STORE_KEY, store)
}

export async function listTransforms(): Promise<TransformProject[]> {
  return (await loadStore()).items
}

export async function createTransform(input: {
  name: string
  description: string
  type: TransformType
  inputSources: string[]
  outputDatasets: string[]
  schedule: string
}): Promise<TransformProject> {
  const now = new Date().toISOString()
  const allDS = await listDataSources()
  const selectedDS = allDS.filter(d => input.inputSources.includes(d.id))
  const project: TransformProject = {
    id: `tf-${Date.now()}`,
    name: input.name,
    description: input.description,
    type: input.type,
    inputSources: input.inputSources,
    inputSourceNames: selectedDS.map(d => d.name),
    outputDatasets: input.outputDatasets.filter(Boolean),
    status: 'Idle',
    records: 0,
    duration: '-',
    lastRun: null,
    schedule: input.schedule,
    createdAt: now,
    updatedAt: now,
  }
  const store = await loadStore()
  store.items.push(project)
  store._v = DATA_VERSION
  await saveStore(store)
  return project
}

export async function updateTransform(
  id: string,
  patch: Partial<Pick<TransformProject, 'name' | 'description' | 'type' | 'inputSources' | 'outputDatasets' | 'schedule'>>,
): Promise<TransformProject | null> {
  const store = await loadStore()
  const idx = store.items.findIndex(p => p.id === id)
  if (idx < 0) return null

  if (patch.inputSources) {
    const allDS = await listDataSources()
    const selectedDS = allDS.filter(d => patch.inputSources!.includes(d.id))
    store.items[idx].inputSourceNames = selectedDS.map(d => d.name)
    store.items[idx].inputSources = patch.inputSources
  }
  if (patch.outputDatasets) store.items[idx].outputDatasets = patch.outputDatasets.filter(Boolean)
  if (patch.name !== undefined) store.items[idx].name = patch.name
  if (patch.description !== undefined) store.items[idx].description = patch.description
  if (patch.type !== undefined) store.items[idx].type = patch.type
  if (patch.schedule !== undefined) store.items[idx].schedule = patch.schedule
  store.items[idx].updatedAt = new Date().toISOString()
  store._v = DATA_VERSION

  await saveStore(store)
  return store.items[idx]
}

export async function deleteTransform(id: string): Promise<void> {
  const store = await loadStore()
  store.items = store.items.filter(p => p.id !== id)
  store._v = DATA_VERSION
  await saveStore(store)
}

export async function runTransform(id: string): Promise<TransformProject | null> {
  const store = await loadStore()
  const idx = store.items.findIndex(p => p.id === id)
  if (idx < 0) return null
  store.items[idx].status = 'Success'
  store.items[idx].records = store.items[idx].records + Math.floor(Math.random() * 8000) + 2000
  store.items[idx].duration = `${Math.floor(Math.random() * 6) + 2}m ${Math.floor(Math.random() * 50) + 10}s`
  store.items[idx].lastRun = '刚刚'
  store.items[idx].updatedAt = new Date().toISOString()
  store._v = DATA_VERSION
  await saveStore(store)
  return store.items[idx]
}

export async function stopTransform(id: string): Promise<TransformProject | null> {
  const store = await loadStore()
  const idx = store.items.findIndex(p => p.id === id)
  if (idx < 0) return null
  store.items[idx].status = 'Idle'
  store.items[idx].lastRun = '已停止'
  store.items[idx].updatedAt = new Date().toISOString()
  store._v = DATA_VERSION
  await saveStore(store)
  return store.items[idx]
}
