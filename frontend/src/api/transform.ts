import { listDataSources } from './dataSource'
import type { TransformProject, TransformType } from '../types/transform'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'transforms'
const DATA_VERSION = 3

interface TFStore {
  items: TransformProject[]
  _v?: number
}

function buildDefaultItems(): TransformProject[] {
  return [
    {
      id: 'tf-001',
      name: 'prep_equipment_manuals',
      description: '针对 PDF 说明书、维保手册与扫描件执行通用文档解析，输出 Markdown、结构块和问答样本。',
      type: 'DocumentParsing',
      inputSources: ['ds-manuals-archive', 'ds-maintenance-scans'],
      inputSourceNames: ['制造业_设备维保手册_文档仓', '制造业_巡检扫描件_资料桶'],
      outputDatasets: ['maintenance_manual_markdown', 'maintenance_manual_chunks', 'maintenance_manual_vqa'],
      status: 'Success',
      records: 182400,
      duration: '6m 18s',
      lastRun: '8 分钟前',
      schedule: '每小时',
      createdAt: '2025-12-08T08:00:00.000Z',
      updatedAt: '2026-03-10T08:40:00.000Z',
    },
    {
      id: 'tf-002',
      name: 'prep_quality_forms',
      description: '对 Word、Excel、拍照表单做版面恢复和表格抽取，沉淀质检单结构化语料。',
      type: 'LayoutRecovery',
      inputSources: ['ds-quality-forms'],
      inputSourceNames: ['制造业_质量检验单_附件仓'],
      outputDatasets: ['quality_form_cells', 'quality_form_markdown'],
      status: 'Running',
      records: 56400,
      duration: '3m 42s',
      lastRun: '进行中',
      schedule: '每日',
      createdAt: '2026-01-12T09:10:00.000Z',
      updatedAt: '2026-03-10T09:15:00.000Z',
    },
    {
      id: 'tf-003',
      name: 'prep_contract_corpus',
      description: '面向合同、报价单和图文附件做要素抽取、切片与数据集封装，供 RAG 与 SFT 联合训练使用。',
      type: 'DatasetPackaging',
      inputSources: ['ds-contract-bucket'],
      inputSourceNames: ['通用业务_合同档案_归档桶'],
      outputDatasets: ['contract_rag_chunks', 'contract_sft_pairs', 'contract_entity_labels'],
      status: 'Idle',
      records: 0,
      duration: '-',
      lastRun: null,
      schedule: '手动触发',
      createdAt: '2026-02-18T10:20:00.000Z',
      updatedAt: '2026-03-09T16:00:00.000Z',
    },
    {
      id: 'tf-004',
      name: 'prep_inspection_reports',
      description: '对工厂巡检报告（PDF/Word）做多模态要素抽取，输出图表、表格 JSON 和文本块，用于设备状态知识库。',
      type: 'MultimodalExtraction',
      inputSources: ['ds-inspection-reports'],
      inputSourceNames: ['制造业_巡检报告_归档库'],
      outputDatasets: ['inspection_image_captions', 'inspection_table_json', 'inspection_text_chunks'],
      status: 'Success',
      records: 94300,
      duration: '4m 55s',
      lastRun: '35 分钟前',
      schedule: '每日',
      createdAt: '2026-01-20T11:00:00.000Z',
      updatedAt: '2026-03-10T07:30:00.000Z',
    },
    {
      id: 'tf-005',
      name: 'prep_safety_regulations',
      description: '将安全规程手册、法规文件转换为切片与标注格式，构建合规问答训练集。',
      type: 'ChunkAnnotation',
      inputSources: ['ds-safety-docs'],
      inputSourceNames: ['制造业_安全规程_文档仓'],
      outputDatasets: ['safety_qa_pairs', 'safety_compliance_chunks'],
      status: 'Success',
      records: 47800,
      duration: '2m 31s',
      lastRun: '1 小时前',
      schedule: '每周',
      createdAt: '2026-02-01T14:00:00.000Z',
      updatedAt: '2026-03-09T14:20:00.000Z',
    },
    {
      id: 'tf-006',
      name: 'prep_product_catalog',
      description: '对产品目录、技术规格书做版面恢复和表格结构抽取，生成结构化商品属性数据集。',
      type: 'LayoutRecovery',
      inputSources: ['ds-product-catalog'],
      inputSourceNames: ['制造业_产品目录_附件仓'],
      outputDatasets: ['product_attribute_table', 'product_spec_markdown'],
      status: 'Failed',
      records: 12100,
      duration: '1m 08s',
      lastRun: '3 小时前',
      schedule: '手动触发',
      createdAt: '2026-02-10T09:30:00.000Z',
      updatedAt: '2026-03-10T06:50:00.000Z',
    },
    {
      id: 'tf-007',
      name: 'prep_training_courseware',
      description: '解析 PPT 培训课件，还原版面布局并抽取图文内容，为员工知识问答系统提供语料。',
      type: 'DocumentParsing',
      inputSources: ['ds-training-ppt'],
      inputSourceNames: ['人力资源_培训课件_PPT 仓'],
      outputDatasets: ['courseware_chunks', 'courseware_vqa', 'courseware_summary'],
      status: 'Success',
      records: 68500,
      duration: '3m 22s',
      lastRun: '昨天 18:00',
      schedule: '每周',
      createdAt: '2026-02-25T10:00:00.000Z',
      updatedAt: '2026-03-09T18:00:00.000Z',
    },
    {
      id: 'tf-008',
      name: 'prep_financial_statements',
      description: '针对年报、季报等财务报表 PDF 做表格精准抽取与切片标注，构建财务分析训练集。',
      type: 'ChunkAnnotation',
      inputSources: ['ds-finance-reports'],
      inputSourceNames: ['财务部_报表归档_文档桶'],
      outputDatasets: ['financial_table_json', 'financial_qa_pairs', 'financial_entity_labels'],
      status: 'Running',
      records: 31200,
      duration: '2m 04s',
      lastRun: '进行中',
      schedule: '每月',
      createdAt: '2026-03-01T08:00:00.000Z',
      updatedAt: '2026-03-10T09:50:00.000Z',
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
  store.items[idx].records = store.items[idx].records + Math.floor(Math.random() * 5000) + 1000
  store.items[idx].duration = `${Math.floor(Math.random() * 4) + 1}m ${Math.floor(Math.random() * 50) + 10}s`
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
