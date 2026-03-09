import type { TrainingDataset } from '../types/trainingDataset'
import { delay, rand } from './mockConfig'

const MOCK_DATASETS: TrainingDataset[] = [
  {
    key: '1', name: 'purchase_orders_v3', source: 'ontology://PurchaseOrder/output',
    trainSplit: 70, valSplit: 15, testSplit: 15, records: 12450, version: 'v3.0',
    status: 'Ready', size: '156 MB', createdAt: '2025-02-15', updatedAt: '2025-03-08',
    linkedModels: ['purchase-order-classifier'],
    format: 'JSONL',
    promptTemplate: '{"instruction": "分类采购订单", "input": "{{设备名称}} {{故障类型}}", "output": "{{运行状态}}"}',
    schemaFields: ['设备编号', '设备名称', '运行状态', '故障类型'],
    buildProgress: 100,
    buildLog: [
      '[2025-03-08 10:00:01] 开始构建数据集 purchase_orders_v3 ...',
      '[2025-03-08 10:00:02] 连接本体数据源 ontology://PurchaseOrder/output',
      '[2025-03-08 10:00:05] 已加载 12,450 条原始记录',
      '[2025-03-08 10:00:12] 数据清洗完成，有效记录 12,450 条',
      '[2025-03-08 10:00:18] 按比例切分: Train 8715 / Val 1868 / Test 1867',
      '[2025-03-08 10:00:25] 导出 JSONL 格式，大小 156 MB',
      '[2025-03-08 10:00:26] ✓ 构建完成',
    ],
    sampleData: [
      { 设备编号: 'PO-20250101', 设备名称: '液压泵 A-01', 运行状态: '正常', 故障类型: '—', 温度: 42.5, 振动值: 0.12 },
      { 设备编号: 'PO-20250102', 设备名称: '压缩机 B-03', 运行状态: '告警', 故障类型: '过热', 温度: 88.3, 振动值: 0.45 },
      { 设备编号: 'PO-20250103', 设备名称: '电机 C-07', 运行状态: '故障', 故障类型: '轴承磨损', 温度: 95.1, 振动值: 1.82 },
      { 设备编号: 'PO-20250104', 设备名称: '传送带 D-12', 运行状态: '正常', 故障类型: '—', 温度: 35.8, 振动值: 0.08 },
    ],
  },
  {
    key: '2', name: 'equipment_sensors_v2', source: 'ontology://Equipment/output',
    trainSplit: 80, valSplit: 10, testSplit: 10, records: 45230, version: 'v2.1',
    status: 'Ready', size: '1.2 GB', createdAt: '2025-01-20', updatedAt: '2025-03-07',
    linkedModels: ['equipment-fault-predictor'],
    format: 'Parquet',
    promptTemplate: '',
    schemaFields: ['设备编号', '设备名称', '温度', '振动值', '压力', '转速'],
    buildProgress: 100,
    buildLog: [
      '[2025-03-07 14:30:01] 开始构建数据集 equipment_sensors_v2 ...',
      '[2025-03-07 14:30:03] 连接本体数据源 ontology://Equipment/output',
      '[2025-03-07 14:30:20] 已加载 45,230 条原始记录',
      '[2025-03-07 14:30:45] 数据清洗完成，有效记录 45,230 条',
      '[2025-03-07 14:31:02] 按比例切分: Train 36184 / Val 4523 / Test 4523',
      '[2025-03-07 14:31:30] 导出 Parquet 格式，大小 1.2 GB',
      '[2025-03-07 14:31:31] ✓ 构建完成',
    ],
    sampleData: [
      { 设备编号: 'EQ-001', 设备名称: '数控车床 CNC-A1', 温度: 45.2, 振动值: 0.15, 压力: 2.4, 转速: 1500 },
      { 设备编号: 'EQ-002', 设备名称: '注塑机 INJ-B2', 温度: 72.8, 振动值: 0.32, 压力: 8.1, 转速: 800 },
      { 设备编号: 'EQ-003', 设备名称: '焊接机器人 WR-C3', 温度: 58.6, 振动值: 0.21, 压力: 1.2, 转速: 0 },
      { 设备编号: 'EQ-004', 设备名称: 'AGV 搬运车 AGV-05', 温度: 38.1, 振动值: 0.08, 压力: 0, 转速: 200 },
      { 设备编号: 'EQ-005', 设备名称: '冲压机 PR-D4', 温度: 62.3, 振动值: 0.55, 压力: 12.5, 转速: 600 },
    ],
  },
  {
    key: '3', name: 'customer_churn_v1', source: 'ontology://Customer/output',
    trainSplit: 70, valSplit: 15, testSplit: 15, records: 8920, version: 'v1.0',
    status: 'Ready', size: '89 MB', createdAt: '2025-02-28', updatedAt: '2025-03-05',
    linkedModels: ['churn-predictor'],
    format: 'CSV',
    promptTemplate: '',
    schemaFields: ['客户ID', '客户名称', '注册时长', '月活跃天数', '月消费金额', '流失标签'],
    buildProgress: 100,
    buildLog: [
      '[2025-03-05 09:00:01] 开始构建数据集 customer_churn_v1 ...',
      '[2025-03-05 09:00:15] 数据清洗完成，有效记录 8,920 条',
      '[2025-03-05 09:00:22] 导出 CSV 格式，大小 89 MB',
      '[2025-03-05 09:00:23] ✓ 构建完成',
    ],
    sampleData: [
      { 客户ID: 'CU-10023', 客户名称: '深圳万达电子', 注册时长: '3.2年', 月活跃天数: 22, 月消费金额: 15800, 流失标签: '否' },
      { 客户ID: 'CU-10045', 客户名称: '广州宏图科技', 注册时长: '1.1年', 月活跃天数: 5, 月消费金额: 2300, 流失标签: '是' },
      { 客户ID: 'CU-10067', 客户名称: '上海智联信息', 注册时长: '4.5年', 月活跃天数: 28, 月消费金额: 42000, 流失标签: '否' },
    ],
  },
  {
    key: '4', name: 'inventory_demand_v1', source: 'ontology://Inventory/output',
    trainSplit: 75, valSplit: 15, testSplit: 10, records: 23100, version: 'v1.2',
    status: 'Building', size: '320 MB', createdAt: '2025-03-01', updatedAt: '2025-03-08',
    linkedModels: ['demand-forecaster'],
    format: 'JSONL',
    promptTemplate: '{"instruction": "预测库存需求", "input": "{{设备名称}} {{转速}}", "output": "{{压力}}"}',
    schemaFields: ['设备编号', '设备名称', '转速', '压力'],
    buildProgress: 68,
    buildLog: [
      '[2025-03-08 16:00:01] 开始构建数据集 inventory_demand_v1 ...',
      '[2025-03-08 16:00:03] 连接本体数据源 ontology://Inventory/output',
      '[2025-03-08 16:00:18] 已加载 23,100 条原始记录',
      '[2025-03-08 16:00:35] 数据清洗中... (68%)',
    ],
    sampleData: [
      { 设备编号: 'INV-301', 设备名称: '原料仓 A', 转速: 0, 压力: 1.1 },
      { 设备编号: 'INV-302', 设备名称: '成品仓 B', 转速: 0, 压力: 0.8 },
    ],
  },
  {
    key: '5', name: 'quality_inspection_v1', source: 'ontology://QualityInspection/output',
    trainSplit: 70, valSplit: 15, testSplit: 15, records: 6200, version: 'v1.0',
    status: 'Ready', size: '72 MB', createdAt: '2025-03-03', updatedAt: '2025-03-06',
    linkedModels: [],
    format: 'CSV',
    promptTemplate: '',
    schemaFields: ['设备编号', '设备名称', '运行状态', '故障类型', '温度'],
    buildProgress: 100,
    buildLog: [
      '[2025-03-06 11:00:01] 开始构建数据集 quality_inspection_v1 ...',
      '[2025-03-06 11:00:10] 数据清洗完成，有效记录 6,200 条',
      '[2025-03-06 11:00:15] 导出 CSV 格式，大小 72 MB',
      '[2025-03-06 11:00:16] ✓ 构建完成',
    ],
    sampleData: [
      { 设备编号: 'QI-001', 设备名称: '质检台 A', 运行状态: '正常', 故障类型: '—', 温度: 25.0 },
      { 设备编号: 'QI-002', 设备名称: '质检台 B', 运行状态: '告警', 故障类型: '传感器偏移', 温度: 30.2 },
      { 设备编号: 'QI-003', 设备名称: 'X光检测仪', 运行状态: '正常', 故障类型: '—', 温度: 22.8 },
    ],
  },
  {
    key: '6', name: 'supplier_risk_v1', source: 'ontology://Supplier/output',
    trainSplit: 70, valSplit: 20, testSplit: 10, records: 3400, version: 'v1.0',
    status: 'Ready', size: '45 MB', createdAt: '2025-02-20', updatedAt: '2025-03-04',
    linkedModels: ['supplier-risk-scorer'],
    format: 'Parquet',
    promptTemplate: '',
    schemaFields: ['供应商ID', '供应商名称', '合作年限', '交付准时率', '质量合格率', '风险等级'],
    buildProgress: 100,
    buildLog: [
      '[2025-03-04 08:00:01] 开始构建数据集 supplier_risk_v1 ...',
      '[2025-03-04 08:00:08] 数据清洗完成，有效记录 3,400 条',
      '[2025-03-04 08:00:12] 导出 Parquet 格式，大小 45 MB',
      '[2025-03-04 08:00:13] ✓ 构建完成',
    ],
    sampleData: [
      { 供应商ID: 'SP-2001', 供应商名称: '华东精密制造', 合作年限: 5, 交付准时率: 96.2, 质量合格率: 99.1, 风险等级: '低' },
      { 供应商ID: 'SP-2015', 供应商名称: '北方重工配件', 合作年限: 2, 交付准时率: 82.5, 质量合格率: 94.3, 风险等级: '中' },
      { 供应商ID: 'SP-2028', 供应商名称: '江南电子元器件', 合作年限: 8, 交付准时率: 98.7, 质量合格率: 99.8, 风险等级: '低' },
    ],
  },
  {
    key: '7', name: 'workorder_nlp_v1', source: 'ontology://WorkOrder/output',
    trainSplit: 80, valSplit: 10, testSplit: 10, records: 8750, version: 'v1.0',
    status: 'Failed', size: '—', createdAt: '2025-03-07', updatedAt: '2025-03-08',
    linkedModels: [],
    format: 'JSONL',
    promptTemplate: '{"instruction": "解析工单", "input": "{{设备名称}} {{故障类型}}", "output": "{{运行状态}}"}',
    schemaFields: ['设备编号', '设备名称', '故障类型', '运行状态', '维护周期'],
    buildProgress: 37,
    buildLog: [
      '[2025-03-08 09:00:01] 开始构建数据集 workorder_nlp_v1 ...',
      '[2025-03-08 09:00:03] 连接本体数据源 ontology://WorkOrder/output',
      '[2025-03-08 09:00:15] 已加载 8,750 条原始记录',
      '[2025-03-08 09:00:28] 数据清洗中... (37%)',
      '[2025-03-08 09:00:35] ✗ 错误: 字段 "维护周期" 存在 1,204 条空值，超过阈值 10%',
      '[2025-03-08 09:00:35] ✗ 构建失败',
    ],
    sampleData: [],
  },
]

const STORAGE_KEY = 'deepexios_datasets'

function load(): TrainingDataset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) { save(MOCK_DATASETS); return MOCK_DATASETS }
    const parsed = JSON.parse(raw) as TrainingDataset[]
    // Migrate old data that might not have new fields
    const migrated = parsed.map(d => ({
      ...d,
      format: d.format || 'JSONL',
      promptTemplate: d.promptTemplate || '',
      schemaFields: d.schemaFields || [],
      buildProgress: d.buildProgress ?? (d.status === 'Ready' ? 100 : 0),
      buildLog: d.buildLog || [],
      sampleData: d.sampleData || [],
    }))
    return migrated
  } catch { return MOCK_DATASETS }
}

function save(list: TrainingDataset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export async function listDatasets(): Promise<TrainingDataset[]> {
  await delay(rand(300, 600))
  return load()
}

export async function getDatasetDetail(key: string): Promise<TrainingDataset | undefined> {
  await delay(rand(200, 400))
  return load().find(d => d.key === key)
}

export async function createDataset(input: Partial<TrainingDataset>): Promise<TrainingDataset> {
  await delay(rand(400, 700))
  const list = load()
  const ds: TrainingDataset = {
    key: `ds-${Date.now()}`,
    name: input.name || '',
    source: input.source || '',
    trainSplit: input.trainSplit || 70,
    valSplit: input.valSplit || 15,
    testSplit: input.testSplit || 15,
    records: 0,
    version: 'v1.0',
    status: 'Building',
    size: '—',
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    linkedModels: [],
    format: input.format || 'JSONL',
    promptTemplate: input.promptTemplate || '',
    schemaFields: input.schemaFields || [],
    buildProgress: 0,
    buildLog: [
      `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 数据集已创建，等待构建...`,
    ],
    sampleData: [],
  }
  list.push(ds)
  save(list)
  return ds
}

export async function buildDataset(key: string): Promise<TrainingDataset | undefined> {
  await delay(rand(500, 800))
  const list = load()
  const ds = list.find(d => d.key === key)
  if (!ds) return undefined
  ds.status = 'Building'
  ds.buildProgress = 0
  ds.buildLog = [
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 开始构建数据集 ${ds.name} ...`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 连接本体数据源 ${ds.source}`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 正在加载数据...`,
  ]
  ds.updatedAt = new Date().toISOString().slice(0, 10)
  save(list)
  return ds
}

export async function updateBuildProgress(key: string, progress: number): Promise<void> {
  await delay(rand(100, 300))
  const list = load()
  const ds = list.find(d => d.key === key)
  if (!ds) return
  ds.buildProgress = progress
  ds.buildLog.push(
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 数据清洗与转换中... (${progress}%)`
  )
  ds.updatedAt = new Date().toISOString().slice(0, 10)
  save(list)
}

export async function finishBuild(key: string): Promise<void> {
  await delay(rand(200, 400))
  const list = load()
  const ds = list.find(d => d.key === key)
  if (!ds) return
  ds.status = 'Ready'
  ds.buildProgress = 100
  ds.records = Math.floor(Math.random() * 20000) + 5000
  ds.size = `${(ds.records * 0.012).toFixed(0)} MB`
  ds.buildLog.push(
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 数据清洗完成，有效记录 ${ds.records.toLocaleString()} 条`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] 导出 ${ds.format} 格式，大小 ${ds.size}`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] ✓ 构建完成`,
  )
  ds.updatedAt = new Date().toISOString().slice(0, 10)
  save(list)
}

export async function deleteDataset(key: string): Promise<void> {
  await delay(rand(300, 500))
  save(load().filter(d => d.key !== key))
}

export interface DatasetStats {
  total: number
  totalRecords: string
  readyCount: number
  totalSize: string
  buildingCount: number
}

export async function getDatasetStats(): Promise<DatasetStats> {
  await delay(rand(200, 400))
  const list = load()
  const totalRecords = list.reduce((s, d) => s + d.records, 0)
  return {
    total: list.length,
    totalRecords: totalRecords >= 1000 ? `${(totalRecords / 1000).toFixed(1)}K` : `${totalRecords}`,
    readyCount: list.filter(d => d.status === 'Ready').length,
    totalSize: '1.9 GB',
    buildingCount: list.filter(d => d.status === 'Building').length,
  }
}
