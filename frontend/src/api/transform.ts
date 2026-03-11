import { listDataSources } from './dataSource'
import type { TransformProject, TransformType } from '../types/transform'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'transforms'
const DATA_VERSION = 5

interface TFStore {
  items: TransformProject[]
  _v?: number
}

function buildDefaultItems(): TransformProject[] {
  return [
    {
      id: 'tf-001',
      name: 'fault_workorder_structuring',
      description: '对故障工单、点检记录进行字段补齐、状态归一和事件时间线重建，形成可分析的结构化工单事实表。',
      type: 'LayoutRecovery',
      inputSources: ['ds-fault-work-orders', 'ds-inspection-records'],
      inputSourceNames: ['故障工单主表', '点检记录表'],
      outputDatasets: ['fault_workorder_event', 'repair_feedback_structured', 'inspection_abnormal_link'],
      status: 'Success',
      records: 268400,
      duration: '4m 42s',
      lastRun: '12 分钟前',
      schedule: '每小时',
      createdAt: '2026-02-05T08:00:00.000Z',
      updatedAt: '2026-03-11T08:20:00.000Z',
    },
    {
      id: 'tf-002',
      name: 'alarm_plc_event_alignment',
      description: '将告警事件流与 PLC 运行日志按设备、工位和时间窗对齐，构建故障前后事件序列样本。',
      type: 'DatasetPackaging',
      inputSources: ['ds-alarm-events', 'ds-plc-runtime-logs'],
      inputSourceNames: ['设备告警事件表', 'PLC 运行日志'],
      outputDatasets: ['alarm_plc_aligned_event', 'fault_timeline_window', 'alarm_rule_hit_sample'],
      status: 'Running',
      records: 942000,
      duration: '6m 05s',
      lastRun: '进行中',
      schedule: '事件触发',
      createdAt: '2026-02-12T09:10:00.000Z',
      updatedAt: '2026-03-11T08:33:00.000Z',
    },
    {
      id: 'tf-003',
      name: 'multimodal_fault_feature_extraction',
      description: '综合机台日志、振动波形和热像图片抽取频域特征、视觉异常区域和上下文文本特征。',
      type: 'MultimodalExtraction',
      inputSources: ['ds-machine-log-files', 'ds-vibration-waveforms', 'ds-thermal-images'],
      inputSourceNames: ['机台原始日志文件库', '振动波形文件库', '红外热像图片库'],
      outputDatasets: ['waveform_feature_vector', 'thermal_hotspot_caption', 'machine_log_semantic_feature'],
      status: 'Success',
      records: 186500,
      duration: '8m 16s',
      lastRun: '26 分钟前',
      schedule: '每日',
      createdAt: '2026-02-18T10:20:00.000Z',
      updatedAt: '2026-03-11T08:02:00.000Z',
    },
    {
      id: 'tf-004',
      name: 'maintenance_knowledge_chunking',
      description: '对维修手册和 RCA 复盘报告做章节切片、知识点标注和问答样本抽取，沉淀诊断知识集。',
      type: 'ChunkAnnotation',
      inputSources: ['ds-maintenance-manuals', 'ds-rca-reports'],
      inputSourceNames: ['维修手册知识库', '故障复盘报告库'],
      outputDatasets: ['maintenance_manual_chunks', 'rca_case_labels', 'expert_diagnosis_qa_pairs'],
      status: 'Success',
      records: 73400,
      duration: '3m 58s',
      lastRun: '1 小时前',
      schedule: '每日',
      createdAt: '2026-02-24T13:00:00.000Z',
      updatedAt: '2026-03-11T07:22:00.000Z',
    },
    {
      id: 'tf-005',
      name: 'shift_handover_text_parsing',
      description: '抽取交接班文本中的异常现象、临时处置、未完成事项和责任班组，补齐故障现场上下文。',
      type: 'DocumentParsing',
      inputSources: ['ds-shift-handover'],
      inputSourceNames: ['班组交接班记录'],
      outputDatasets: ['shift_handover_event_note', 'onsite_exception_summary'],
      status: 'Idle',
      records: 0,
      duration: '-',
      lastRun: null,
      schedule: '手动触发',
      createdAt: '2026-03-01T08:00:00.000Z',
      updatedAt: '2026-03-10T18:00:00.000Z',
    },
    {
      id: 'tf-006',
      name: 'root_cause_training_packaging',
      description: '融合维修履历、设备台账和备件记录，封装根因诊断训练样本、停机影响标签和处置建议样本。',
      type: 'DatasetPackaging',
      inputSources: ['ds-maintenance-history', 'ds-equipment-master', 'ds-spare-parts-stock'],
      inputSourceNames: ['维修履历宽表', '设备台账主数据', '备件库存与领用'],
      outputDatasets: ['root_cause_training_set', 'downtime_impact_label', 'repair_strategy_pair'],
      status: 'Failed',
      records: 38200,
      duration: '2m 14s',
      lastRun: '3 小时前',
      schedule: '每日',
      createdAt: '2026-03-03T09:30:00.000Z',
      updatedAt: '2026-03-11T05:12:00.000Z',
    },
    {
      id: 'tf-007',
      name: 'retail_sales_inventory_alignment',
      description: '对销售订单事实和库存快照进行门店-SKU-尺码粒度对齐，形成商品补货缺口测算基础宽表。',
      type: 'LayoutRecovery',
      inputSources: ['ds-retail-sales-orders', 'ds-wms-stock-snapshot'],
      inputSourceNames: ['零售 ERP 销售订单事实库', 'WMS 仓库库存与在途快照库'],
      outputDatasets: ['store_sku_sales_inventory_base', 'sku_daily_velocity_snapshot', 'store_stock_gap_base'],
      status: 'Success',
      records: 428600,
      duration: '5m 18s',
      lastRun: '18 分钟前',
      schedule: '每小时',
      createdAt: '2026-03-04T08:20:00.000Z',
      updatedAt: '2026-03-11T08:16:00.000Z',
    },
    {
      id: 'tf-008',
      name: 'replenishment_rule_chunking',
      description: '对商品补货说明、尺码曲线和优先分配规则文档做切片、标签化和规则字段抽取。',
      type: 'ChunkAnnotation',
      inputSources: ['ds-replenishment-docs', 'ds-size-rules'],
      inputSourceNames: ['商品补货业务说明文档库', '尺码规则与优先分配文件库'],
      outputDatasets: ['replenishment_rule_chunks', 'size_curve_rule_labels', 'allocation_policy_qa_pairs'],
      status: 'Success',
      records: 19420,
      duration: '2m 56s',
      lastRun: '今天 06:40',
      schedule: '每日',
      createdAt: '2026-03-05T09:00:00.000Z',
      updatedAt: '2026-03-11T06:40:00.000Z',
    },
    {
      id: 'tf-009',
      name: 'replenishment_plan_packaging',
      description: '融合销售、库存、商品主数据和调拨执行样本，封装补货计划训练集、尺码分配样本和调拨执行数据集。',
      type: 'DatasetPackaging',
      inputSources: ['ds-retail-sales-orders', 'ds-wms-stock-snapshot', 'ds-product-size-master', 'ds-transfer-order-samples'],
      inputSourceNames: ['零售 ERP 销售订单事实库', 'WMS 仓库库存与在途快照库', '商品主数据与尺码曲线中心', '门店调拨单执行样本库'],
      outputDatasets: ['replenishment_plan_dataset', 'size_allocation_training_set', 'transfer_execution_payload_set'],
      status: 'Running',
      records: 286300,
      duration: '4m 37s',
      lastRun: '进行中',
      schedule: '事件触发',
      createdAt: '2026-03-06T10:10:00.000Z',
      updatedAt: '2026-03-11T08:34:00.000Z',
    },
    {
      id: 'tf-010',
      name: 'weekly_replenishment_review_parsing',
      description: '抽取补货复盘报告中的断码原因、满足率偏差、优先级调整建议和城市级例外策略。',
      type: 'DocumentParsing',
      inputSources: ['ds-replenishment-reviews'],
      inputSourceNames: ['补货复盘报告与运营周报'],
      outputDatasets: ['replenishment_review_event', 'size_fill_rate_exception', 'weekly_strategy_adjustment_note'],
      status: 'Idle',
      records: 0,
      duration: '-',
      lastRun: null,
      schedule: '手动触发',
      createdAt: '2026-03-07T08:40:00.000Z',
      updatedAt: '2026-03-10T19:20:00.000Z',
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
