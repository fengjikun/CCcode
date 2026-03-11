import type { TrainingDataset } from '../types/trainingDataset'
import { REFRESHED_MODEL_NAMES } from '../types/modelCatalog'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'training-datasets'
const DATA_VERSION = 2

interface DatasetStore {
  items: TrainingDataset[]
  _v?: number
}

const LEGACY_MODEL_NAME_MAP: Record<string, string> = {
  'deepseek-r1-factory-sft': REFRESHED_MODEL_NAMES.reasoning,
  'qwen2.5-vl-inspection-assistant': REFRESHED_MODEL_NAMES.vlInspection,
  'qwen-doc-parser-lora': REFRESHED_MODEL_NAMES.vlDoc,
  'factory-copilot-dpo-alignment': REFRESHED_MODEL_NAMES.chat,
}

function normalizeModelReference(modelName: string): string {
  return LEGACY_MODEL_NAME_MAP[modelName] ?? modelName
}

function normalizeRunReference(runName: string): string {
  for (const [legacyName, currentName] of Object.entries(LEGACY_MODEL_NAME_MAP)) {
    if (runName.startsWith(`${legacyName}-run-`)) {
      return runName.replace(`${legacyName}-run-`, `${currentName}-run-`)
    }
  }
  return runName
}

function inferLegacyDatasetType(dataset: Partial<TrainingDataset>): TrainingDataset['datasetType'] {
  const sample = dataset.sampleData?.[0]
  if (sample && typeof sample === 'object') {
    if ('messages' in sample) return 'conversation'
    if ('chosen' in sample && 'rejected' in sample) return 'preference'
    if ('image' in sample && 'question' in sample) return 'vqa'
    if ('image' in sample && 'ocr_text' in sample) return 'image-caption'
  }
  return 'instruction'
}

function inferLegacyModality(dataset: Partial<TrainingDataset>): TrainingDataset['modality'] {
  const sample = dataset.sampleData?.[0]
  if (sample && typeof sample === 'object' && 'image' in sample) return 'image-text'
  return 'text'
}

export function normalizeTrainingDataset(dataset: Partial<TrainingDataset>): TrainingDataset {
  const records = dataset.records ?? 0
  const datasetType = dataset.datasetType ?? inferLegacyDatasetType(dataset)
  const modality = dataset.modality ?? inferLegacyModality(dataset)

  return {
    key: dataset.key ?? `legacy-${Date.now()}`,
    name: dataset.name ?? '',
    datasetType,
    modality,
    source: dataset.source ?? '',
    trainSplit: dataset.trainSplit ?? 80,
    valSplit: dataset.valSplit ?? 10,
    testSplit: dataset.testSplit ?? 10,
    records,
    version: dataset.version ?? 'v1.0',
    status: dataset.status ?? 'Ready',
    size: dataset.size ?? '—',
    createdAt: dataset.createdAt ?? new Date().toISOString().slice(0, 10),
    updatedAt: dataset.updatedAt ?? new Date().toISOString().slice(0, 10),
    linkedModels: (dataset.linkedModels ?? []).map(normalizeModelReference),
    linkedRuns: (dataset.linkedRuns ?? []).map(normalizeRunReference),
    tokenCount: dataset.tokenCount ?? Math.max(records * 380, records > 0 ? 380 : 0),
    imageCount: dataset.imageCount ?? (modality === 'image-text' ? records : 0),
    qualityScore: dataset.qualityScore ?? 80,
    annotationSchema: dataset.annotationSchema ?? dataset.schemaFields ?? [],
    format: dataset.format ?? 'JSONL',
    promptTemplate: dataset.promptTemplate ?? '',
    schemaFields: dataset.schemaFields ?? [],
    buildProgress: dataset.buildProgress ?? 0,
    buildLog: dataset.buildLog ?? [],
    sampleData: dataset.sampleData ?? [],
  }
}

function normalizeDatasetStore(store: DatasetStore): DatasetStore {
  return {
    items: store.items.map(normalizeTrainingDataset),
    _v: store._v ?? DATA_VERSION,
  }
}

function buildInstructionSample(): Array<Record<string, unknown>> {
  return [
    {
      instruction: '根据主轴振动值、轴承温升和最近一次告警记录判断最可能的故障根因。',
      input: {
        equipment_id: 'MC-SPINDLE-07',
        alarm_code: 'ALM-4821',
        vibration_rms: '12.8 mm/s',
        bearing_temp: '92 C',
        last_repair: '14 days ago',
      },
      output: '高概率为主轴前轴承磨损并伴随润滑不足，建议先停机检查轴承游隙与润滑状态。',
      root_cause: 'bearing_wear',
    },
  ]
}

function buildConversationSample(): Array<Record<string, unknown>> {
  return [
    {
      messages: [
        { role: 'system', content: '你是设备故障诊断助手，回答必须说明证据和维修优先级。' },
        { role: 'user', content: '贴片机频繁抛出伺服跟随误差报警，是否需要立即停线？' },
        { role: 'assistant', content: '如果跟随误差持续升高且伴随电流波动，应立即降速并安排停线检查编码器与伺服驱动。' },
      ],
      tags: ['fault-dialog', 'repair-priority'],
    },
  ]
}

function buildPreferenceSample(): Array<Record<string, unknown>> {
  return [
    {
      prompt: '压铸机液压温度持续偏高，但班组希望先继续生产到本班结束。',
      chosen: '应先评估油温上升速度和密封风险，必要时停机检查冷却回路，不能只为赶产量继续运行。',
      rejected: '可以继续运行，交班后再统一处理。',
      label: 'repair_strategy_preference',
    },
  ]
}

function buildVqaSample(): Array<Record<string, unknown>> {
  return [
    {
      image: 'thermal-motor-11-20260311.jpg',
      question: '热像图中最需要关注的异常区域在哪里？',
      answer: '电机右上轴承座位置出现明显热点，温度较周边高出约 18C。',
      grounding: ['bearing_housing_hotspot', 'temp_delta_18c'],
    },
  ]
}

function buildCaptionSample(): Array<Record<string, unknown>> {
  return [
    {
      image: 'repair-report-20260310.png',
      ocr_text: '设备: CNC-08, 故障代码: E431, 处理: 清理冷却回路并更换过滤芯。',
      caption: '一张维修报告截图，记录了设备编号、故障代码和维修措施。',
      metadata: { domain: 'repair-report', equipment_id: 'CNC-08' },
    },
  ]
}

export function buildDefaultTrainingDatasets(): TrainingDataset[] {
  return [
    {
      key: 'ds-root-cause-sft',
      name: 'fault_root_cause_instruction_sft_v2',
      datasetType: 'instruction',
      modality: 'text',
      source: 'transform://root_cause_training_set',
      trainSplit: 80,
      valSplit: 10,
      testSplit: 10,
      records: 96000,
      version: 'v2.0',
      status: 'Ready',
      size: '3.4 GB',
      createdAt: '2026-02-18',
      updatedAt: '2026-03-11',
      linkedModels: [REFRESHED_MODEL_NAMES.reasoning],
      linkedRuns: [`${REFRESHED_MODEL_NAMES.reasoning}-run-3`],
      tokenCount: 88000000,
      imageCount: 0,
      qualityScore: 95,
      annotationSchema: ['instruction', 'input', 'output', 'root_cause', 'evidence'],
      format: 'JSONL',
      promptTemplate: '{"instruction":"{{instruction}}","input":"{{input}}","output":"{{output}}"}',
      schemaFields: ['instruction', 'input', 'output', 'root_cause', 'evidence'],
      buildProgress: 100,
      buildLog: ['[2026-03-11 08:20:10] 根因诊断指令集构建完成，已融合工单、维修履历和设备台账证据链。'],
      sampleData: buildInstructionSample(),
    },
    {
      key: 'ds-maintenance-dialog',
      name: 'maintenance_decision_dialog_v1',
      datasetType: 'conversation',
      modality: 'text',
      source: 'transform://repair_strategy_pair',
      trainSplit: 78,
      valSplit: 12,
      testSplit: 10,
      records: 42000,
      version: 'v1.0',
      status: 'Ready',
      size: '1.6 GB',
      createdAt: '2026-02-24',
      updatedAt: '2026-03-10',
      linkedModels: [REFRESHED_MODEL_NAMES.chat],
      linkedRuns: [`${REFRESHED_MODEL_NAMES.chat}-run-6`],
      tokenCount: 36500000,
      imageCount: 0,
      qualityScore: 90,
      annotationSchema: ['system', 'user', 'assistant', 'equipment_id', 'fault_code'],
      format: 'JSONL',
      promptTemplate: '{"messages":"{{messages}}","tags":"{{tags}}"}',
      schemaFields: ['system', 'user', 'assistant', 'equipment_id', 'fault_code'],
      buildProgress: 100,
      buildLog: ['[2026-03-10 18:40:12] 维修决策多轮对话集已完成抽样、去重和人工复审。'],
      sampleData: buildConversationSample(),
    },
    {
      key: 'ds-repair-preference',
      name: 'repair_strategy_preference_v1',
      datasetType: 'preference',
      modality: 'text',
      source: 'transform://repair_strategy_pair',
      trainSplit: 75,
      valSplit: 15,
      testSplit: 10,
      records: 26000,
      version: 'v1.0',
      status: 'Ready',
      size: '1.0 GB',
      createdAt: '2026-03-01',
      updatedAt: '2026-03-10',
      linkedModels: [REFRESHED_MODEL_NAMES.chat],
      linkedRuns: [`${REFRESHED_MODEL_NAMES.chat}-run-7`],
      tokenCount: 24000000,
      imageCount: 0,
      qualityScore: 93,
      annotationSchema: ['prompt', 'chosen', 'rejected', 'label', 'risk_level'],
      format: 'JSONL',
      promptTemplate: '{"prompt":"{{prompt}}","chosen":"{{chosen}}","rejected":"{{rejected}}"}',
      schemaFields: ['prompt', 'chosen', 'rejected', 'label'],
      buildProgress: 100,
      buildLog: ['[2026-03-10 16:15:21] 维修策略偏好对构建完成，安全拒答场景已纳入负样本。'],
      sampleData: buildPreferenceSample(),
    },
    {
      key: 'ds-thermal-vqa',
      name: 'thermal_fault_vqa_v2',
      datasetType: 'vqa',
      modality: 'image-text',
      source: 'transform://thermal_image_evidence',
      trainSplit: 80,
      valSplit: 10,
      testSplit: 10,
      records: 38000,
      version: 'v2.0',
      status: 'Ready',
      size: '6.8 GB',
      createdAt: '2026-02-28',
      updatedAt: '2026-03-11',
      linkedModels: [REFRESHED_MODEL_NAMES.vlInspection],
      linkedRuns: [`${REFRESHED_MODEL_NAMES.vlInspection}-run-3`],
      tokenCount: 25500000,
      imageCount: 38000,
      qualityScore: 89,
      annotationSchema: ['image', 'question', 'answer', 'grounding', 'equipment_id'],
      format: 'Parquet',
      promptTemplate: '{"image":"{{image}}","question":"{{question}}","answer":"{{answer}}"}',
      schemaFields: ['image', 'question', 'answer', 'grounding'],
      buildProgress: 100,
      buildLog: ['[2026-03-11 07:42:44] 热像视觉问答集完成框选校验和热点区域标注对齐。'],
      sampleData: buildVqaSample(),
    },
    {
      key: 'ds-repair-caption',
      name: 'repair_report_caption_v1',
      datasetType: 'image-caption',
      modality: 'image-text',
      source: 'transform://maintenance_manual_chunks',
      trainSplit: 82,
      valSplit: 10,
      testSplit: 8,
      records: 64000,
      version: 'v1.0',
      status: 'Building',
      size: '—',
      createdAt: '2026-03-05',
      updatedAt: '2026-03-11',
      linkedModels: [REFRESHED_MODEL_NAMES.vlDoc],
      linkedRuns: [],
      tokenCount: 18000000,
      imageCount: 64000,
      qualityScore: 86,
      annotationSchema: ['image', 'ocr_text', 'caption', 'metadata', 'fault_code'],
      format: 'Parquet',
      promptTemplate: '{"image":"{{image}}","ocr_text":"{{ocr_text}}","caption":"{{caption}}"}',
      schemaFields: ['image', 'ocr_text', 'caption', 'metadata'],
      buildProgress: 48,
      buildLog: ['[2026-03-11 08:05:08] 正在执行维修报告截图 OCR 纠错与 caption 归一化...'],
      sampleData: buildCaptionSample(),
    },
    {
      key: 'ds-onsite-context',
      name: 'onsite_handover_instruction_v1',
      datasetType: 'instruction',
      modality: 'text',
      source: 'transform://onsite_exception_summary',
      trainSplit: 80,
      valSplit: 10,
      testSplit: 10,
      records: 22000,
      version: 'v1.0',
      status: 'Archived',
      size: '0.9 GB',
      createdAt: '2026-02-10',
      updatedAt: '2026-03-01',
      linkedModels: [REFRESHED_MODEL_NAMES.reasoning],
      linkedRuns: [],
      tokenCount: 19500000,
      imageCount: 0,
      qualityScore: 87,
      annotationSchema: ['instruction', 'input', 'output', 'equipment_id'],
      format: 'JSONL',
      promptTemplate: '{"instruction":"{{instruction}}","input":"{{input}}","output":"{{output}}"}',
      schemaFields: ['instruction', 'input', 'output', 'equipment_id'],
      buildProgress: 100,
      buildLog: ['[2026-03-01 12:10:00] 现场交接班上下文集已归档，迁移至冷存储。'],
      sampleData: buildInstructionSample(),
    },
  ]
}

const DEFAULT_STORE: DatasetStore = {
  items: buildDefaultTrainingDatasets(),
  _v: DATA_VERSION,
}

async function loadStore(): Promise<DatasetStore> {
  const store = await ensureMockStore<DatasetStore>(STORE_KEY, DEFAULT_STORE)
  if (store._v !== DATA_VERSION) {
    await setMockStore(STORE_KEY, DEFAULT_STORE)
    return DEFAULT_STORE
  }

  const normalized = normalizeDatasetStore(store)
  const changed = JSON.stringify(store) !== JSON.stringify(normalized)
  if (changed) {
    await setMockStore(STORE_KEY, normalized)
  }
  return normalized
}

async function saveStore(store: DatasetStore): Promise<void> {
  await setMockStore(STORE_KEY, normalizeDatasetStore({ ...store, _v: DATA_VERSION }))
}

export async function listDatasets(): Promise<TrainingDataset[]> {
  return (await loadStore()).items
}

export async function getDatasetDetail(key: string): Promise<TrainingDataset | undefined> {
  return (await loadStore()).items.find(dataset => dataset.key === key)
}

export async function createDataset(input: Partial<TrainingDataset>): Promise<TrainingDataset> {
  const dataset: TrainingDataset = {
    key: `ds-${Date.now()}`,
    name: input.name || '',
    datasetType: input.datasetType ?? 'instruction',
    modality: input.modality ?? 'text',
    source: input.source || '',
    trainSplit: input.trainSplit || 80,
    valSplit: input.valSplit || 10,
    testSplit: input.testSplit || 10,
    records: 0,
    version: 'v1.0',
    status: 'Building',
    size: '—',
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    linkedModels: [],
    linkedRuns: [],
    tokenCount: input.tokenCount ?? 0,
    imageCount: input.imageCount ?? 0,
    qualityScore: input.qualityScore ?? 0,
    annotationSchema: input.annotationSchema ?? [],
    format: input.format || 'JSONL',
    promptTemplate: input.promptTemplate || '',
    schemaFields: input.schemaFields || [],
    buildProgress: 0,
    buildLog: [`[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 数据集已创建，等待抽样、脱敏与构建...`],
    sampleData: input.sampleData ?? [],
  }
  const store = await loadStore()
  store.items.push(dataset)
  await saveStore(store)
  return dataset
}

export async function buildDataset(key: string): Promise<TrainingDataset | undefined> {
  const store = await loadStore()
  const dataset = store.items.find(item => item.key === key)
  if (!dataset) return undefined
  dataset.status = 'Building'
  dataset.buildProgress = 0
  dataset.buildLog = [
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 开始构建训练数据集 ${dataset.name} ...`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 连接来源 ${dataset.source}`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 执行脱敏、标签归一和质检规则校验`,
  ]
  dataset.updatedAt = new Date().toISOString().slice(0, 10)
  await saveStore(store)
  return dataset
}

export async function updateBuildProgress(key: string, progress: number): Promise<void> {
  const store = await loadStore()
  const dataset = store.items.find(item => item.key === key)
  if (!dataset) return
  dataset.buildProgress = progress
  dataset.buildLog.push(`[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 正在执行样本对齐与质检... (${progress}%)`)
  dataset.updatedAt = new Date().toISOString().slice(0, 10)
  await saveStore(store)
}

export async function finishBuild(key: string): Promise<void> {
  const store = await loadStore()
  const dataset = store.items.find(item => item.key === key)
  if (!dataset) return
  dataset.status = 'Ready'
  dataset.buildProgress = 100
  dataset.size = dataset.modality === 'image-text' ? '7.4 GB' : '1.3 GB'
  dataset.records = dataset.records || Math.floor(Math.random() * 50000) + 20000
  dataset.tokenCount = dataset.tokenCount || dataset.records * 380
  if (dataset.datasetType === 'instruction') dataset.sampleData = buildInstructionSample()
  if (dataset.datasetType === 'conversation') dataset.sampleData = buildConversationSample()
  if (dataset.datasetType === 'preference') dataset.sampleData = buildPreferenceSample()
  if (dataset.datasetType === 'vqa') dataset.sampleData = buildVqaSample()
  if (dataset.datasetType === 'image-caption') dataset.sampleData = buildCaptionSample()
  dataset.buildLog.push(`[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] ✓ 训练数据集构建完成`)
  dataset.updatedAt = new Date().toISOString().slice(0, 10)
  await saveStore(store)
}

export async function deleteDataset(key: string): Promise<void> {
  const store = await loadStore()
  store.items = store.items.filter(item => item.key !== key)
  await saveStore(store)
}

export interface DatasetStats {
  total: number
  totalRecords: string
  readyCount: number
  totalSize: string
  buildingCount: number
}

export async function getDatasetStats(): Promise<DatasetStats> {
  const datasets = (await loadStore()).items
  const totalRecords = datasets.reduce((sum, dataset) => sum + dataset.records, 0)
  const totalSizeGb = datasets.reduce((sum, dataset) => sum + (dataset.modality === 'image-text' ? 2.4 : 0.8), 0)
  return {
    total: datasets.length,
    totalRecords: totalRecords >= 1000 ? `${(totalRecords / 1000).toFixed(1)}K` : `${totalRecords}`,
    readyCount: datasets.filter(dataset => dataset.status === 'Ready').length,
    totalSize: `${totalSizeGb.toFixed(1)} GB`,
    buildingCount: datasets.filter(dataset => dataset.status === 'Building').length,
  }
}
