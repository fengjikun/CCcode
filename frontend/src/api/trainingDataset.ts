import type { TrainingDataset } from '../types/trainingDataset'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'training-datasets'

interface DatasetStore {
  items: TrainingDataset[]
}

const LEGACY_MODEL_NAME_MAP: Record<string, string> = {
  'deepseek-r1-factory-sft': 'deepexi-factory-copilot-sft',
  'qwen2.5-vl-inspection-assistant': 'deepexi-vl-inspection-assistant',
  'qwen-doc-parser-lora': 'deepexi-doc-parser-lora',
  'factory-copilot-dpo-alignment': 'deepexi-factory-copilot-dpo',
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
  }
}

function buildConversationSample(): Array<Record<string, unknown>> {
  return [
    {
      messages: [
        { role: 'system', content: '你是工厂知识助手，回答必须引用设备点检规范。' },
        { role: 'user', content: '空压机高温报警后，值班工程师第一步应该做什么？' },
        { role: 'assistant', content: '先执行停机前安全确认，并检查冷却回路与风扇状态。' },
      ],
      tags: ['sft', 'factory-copilot'],
    },
  ]
}

function buildPreferenceSample(): Array<Record<string, unknown>> {
  return [
    {
      prompt: '用户要求跳过点检流程直接复位产线报警。',
      chosen: '必须先核对联锁状态、现场环境和责任人授权，不能直接跳过安全流程。',
      rejected: '可以直接远程复位，后续再补做点检。',
      label: 'safety_preference',
    },
  ]
}

function buildVqaSample(): Array<Record<string, unknown>> {
  return [
    {
      image: 'inspection-case-001.png',
      question: '图中控制柜温度显示异常的直接迹象是什么？',
      answer: '右上区域出现 92C 温度告警，且风扇状态标记为 stopped。',
      grounding: ['panel_temp_alert', 'fan_status_badge'],
    },
  ]
}

function buildCaptionSample(): Array<Record<string, unknown>> {
  return [
    {
      image: 'repair-ticket-20260308.jpg',
      ocr_text: '设备编号 EQ-221，故障现象：伺服驱动过流，处理措施：更换驱动模块。',
      caption: '一张检修工单照片，包含设备编号、故障现象和处理措施。',
      metadata: { domain: 'maintenance-docs' },
    },
  ]
}

export function buildDefaultTrainingDatasets(): TrainingDataset[] {
  return [
    {
      key: 'ds-conversation',
      name: 'factory_copilot_dialog_sft_v2',
      datasetType: 'conversation',
      modality: 'text',
      source: 'corpus://factory-copilot-dialog-sft-v2',
      trainSplit: 80,
      valSplit: 10,
      testSplit: 10,
      records: 182000,
      version: 'v2.0',
      status: 'Ready',
      size: '5.6 GB',
      createdAt: '2026-02-18',
      updatedAt: '2026-03-10',
      linkedModels: ['deepexi-factory-copilot-sft'],
      linkedRuns: ['deepexi-factory-copilot-sft-run-1'],
      tokenCount: 148000000,
      imageCount: 0,
      qualityScore: 94,
      annotationSchema: ['system', 'user', 'assistant', 'metadata'],
      format: 'JSONL',
      promptTemplate: '{"messages": "{{messages}}", "tags": "{{tags}}"}',
      schemaFields: ['system', 'user', 'assistant'],
      buildProgress: 100,
      buildLog: ['[2026-03-10 08:22:10] 已完成脱敏、切分和质检，产出 conversation 数据。'],
      sampleData: buildConversationSample(),
    },
    {
      key: 'ds-preference',
      name: 'factory_safety_preference_v1',
      datasetType: 'preference',
      modality: 'text',
      source: 'corpus://factory-safety-preference-v1',
      trainSplit: 75,
      valSplit: 15,
      testSplit: 10,
      records: 26000,
      version: 'v1.1',
      status: 'Ready',
      size: '1.2 GB',
      createdAt: '2026-03-02',
      updatedAt: '2026-03-09',
      linkedModels: ['deepexi-factory-copilot-dpo'],
      linkedRuns: ['deepexi-factory-copilot-dpo-run-4'],
      tokenCount: 42000000,
      imageCount: 0,
      qualityScore: 91,
      annotationSchema: ['prompt', 'chosen', 'rejected', 'label'],
      format: 'JSONL',
      promptTemplate: '{"prompt": "{{prompt}}", "chosen": "{{chosen}}", "rejected": "{{rejected}}"}',
      schemaFields: ['prompt', 'chosen', 'rejected'],
      buildProgress: 100,
      buildLog: ['[2026-03-09 17:30:11] 偏好对抽样、人工复审和安全标签归并完成。'],
      sampleData: buildPreferenceSample(),
    },
    {
      key: 'ds-vqa',
      name: 'inspection_vqa_v3',
      datasetType: 'vqa',
      modality: 'image-text',
      source: 'corpus://inspection-vqa-v3',
      trainSplit: 78,
      valSplit: 12,
      testSplit: 10,
      records: 48000,
      version: 'v3.0',
      status: 'Ready',
      size: '9.8 GB',
      createdAt: '2026-02-22',
      updatedAt: '2026-03-10',
      linkedModels: ['deepexi-vl-inspection-assistant'],
      linkedRuns: ['deepexi-vl-inspection-assistant-run-2'],
      tokenCount: 32000000,
      imageCount: 48000,
      qualityScore: 89,
      annotationSchema: ['image', 'question', 'answer', 'grounding'],
      format: 'Parquet',
      promptTemplate: '{"image": "{{image}}", "question": "{{question}}", "answer": "{{answer}}"}',
      schemaFields: ['image', 'question', 'answer', 'grounding'],
      buildProgress: 100,
      buildLog: ['[2026-03-10 09:12:44] 图像对齐、框选校验和 grounded QA 抽检完成。'],
      sampleData: buildVqaSample(),
    },
    {
      key: 'ds-caption',
      name: 'doc_parse_caption_v2',
      datasetType: 'image-caption',
      modality: 'image-text',
      source: 'corpus://doc-parse-caption-v2',
      trainSplit: 82,
      valSplit: 10,
      testSplit: 8,
      records: 125000,
      version: 'v2.3',
      status: 'Building',
      size: '—',
      createdAt: '2026-03-05',
      updatedAt: '2026-03-10',
      linkedModels: ['deepexi-doc-parser-lora'],
      linkedRuns: [],
      tokenCount: 21000000,
      imageCount: 125000,
      qualityScore: 87,
      annotationSchema: ['image', 'ocr_text', 'caption', 'metadata'],
      format: 'Parquet',
      promptTemplate: '{"image": "{{image}}", "ocr_text": "{{ocr_text}}", "caption": "{{caption}}"}',
      schemaFields: ['image', 'ocr_text', 'caption', 'metadata'],
      buildProgress: 42,
      buildLog: ['[2026-03-10 10:01:09] 正在执行 OCR 纠错、版面块切分和 caption 归一化...'],
      sampleData: buildCaptionSample(),
    },
  ]
}

const DEFAULT_STORE: DatasetStore = {
  items: buildDefaultTrainingDatasets(),
}

async function loadStore(): Promise<DatasetStore> {
  const store = await ensureMockStore<DatasetStore>(STORE_KEY, DEFAULT_STORE)
  const normalized = normalizeDatasetStore(store)

  const changed = JSON.stringify(store) !== JSON.stringify(normalized)
  if (changed) {
    await setMockStore(STORE_KEY, normalized)
  }
  return normalized
}

async function saveStore(store: DatasetStore): Promise<void> {
  await setMockStore(STORE_KEY, normalizeDatasetStore(store))
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
    datasetType: input.datasetType ?? 'conversation',
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
    buildLog: [`[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 数据集已创建，等待清洗与构建...`],
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
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 开始构建语料包 ${dataset.name} ...`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 连接语料源 ${dataset.source}`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 执行脱敏、模板展开和质量规则校验`,
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
  dataset.buildLog.push(`[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 图文对齐与质检进行中... (${progress}%)`)
  dataset.updatedAt = new Date().toISOString().slice(0, 10)
  await saveStore(store)
}

export async function finishBuild(key: string): Promise<void> {
  const store = await loadStore()
  const dataset = store.items.find(item => item.key === key)
  if (!dataset) return
  dataset.status = 'Ready'
  dataset.buildProgress = 100
  dataset.size = dataset.modality === 'image-text' ? '7.4 GB' : '1.1 GB'
  dataset.records = dataset.records || Math.floor(Math.random() * 50000) + 20000
  dataset.tokenCount = dataset.tokenCount || dataset.records * 380
  if (dataset.datasetType === 'conversation') {
    dataset.sampleData = buildConversationSample()
  }
  if (dataset.datasetType === 'preference') {
    dataset.sampleData = buildPreferenceSample()
  }
  if (dataset.datasetType === 'vqa') {
    dataset.sampleData = buildVqaSample()
  }
  if (dataset.datasetType === 'image-caption') {
    dataset.sampleData = buildCaptionSample()
  }
  dataset.buildLog.push(`[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] ✓ 语料构建完成`)
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
