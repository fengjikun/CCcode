/**
 * L5 训练数据集类型定义
 */

export type DatasetStatus = 'Ready' | 'Building' | 'Failed' | 'Archived'

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
}

export const DATASET_STATUS_COLORS: Record<DatasetStatus, string> = {
  Ready: 'green',
  Building: 'orange',
  Failed: 'red',
  Archived: 'default',
}
