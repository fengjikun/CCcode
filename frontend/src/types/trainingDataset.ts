/**
 * L5 训练数据集类型定义
 */

import type { DatasetType, ModelModality } from './modelCenter'

export type DatasetStatus = 'Ready' | 'Building' | 'Failed' | 'Archived'

export type DatasetFormat = 'JSONL' | 'CSV' | 'Parquet'

export interface TrainingDataset {
  key: string
  name: string
  datasetType: DatasetType
  modality: ModelModality
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
  linkedRuns: string[]
  tokenCount: number
  imageCount: number
  qualityScore: number
  annotationSchema: string[]
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
  'instruction',
  'input',
  'output',
  'system',
  'user',
  'assistant',
  'equipment_id',
  'fault_code',
  'alarm_code',
  'root_cause',
  'repair_action',
  'evidence',
  'image',
  'question',
  'answer',
  'chosen',
  'rejected',
  'ocr_text',
  'grounding',
  'bbox',
  'metadata',
]
