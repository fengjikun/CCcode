/**
 * L5 训练数据集类型定义
 */

export type DatasetStatus = 'Ready' | 'Building' | 'Failed' | 'Archived'

export type DatasetFormat = 'JSONL' | 'CSV' | 'Parquet'

export interface TrainingDataset {
  key: string
  name: string
  source: string
  trainSplit: number
  valSplit: number
  testSplit: number
  records: number
  version: string
  status: DatasetStatus
  size: string
  createdAt: string
  updatedAt: string
  linkedModels: string[]
  format: DatasetFormat
  promptTemplate: string
  schemaFields: string[]
  buildProgress: number
  buildLog: string[]
  sampleData: Array<Record<string, unknown>>
}

export const DATASET_STATUS_COLORS: Record<DatasetStatus, string> = {
  Ready: 'green',
  Building: 'orange',
  Failed: 'red',
  Archived: 'default',
}

export const DATASET_FORMAT_COLORS: Record<DatasetFormat, string> = {
  JSONL: 'blue',
  CSV: 'cyan',
  Parquet: 'purple',
}

export const SCHEMA_FIELD_OPTIONS = [
  '设备编号',
  '设备名称',
  '运行状态',
  '故障类型',
  '温度',
  '振动值',
  '压力',
  '转速',
  '安装日期',
  '维护周期',
  '所属车间',
  '负责人',
]
