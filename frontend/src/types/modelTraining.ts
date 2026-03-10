/**
 * L5 模型训练类型定义
 */

import type { DatasetType, ModelCapability, ModelFamily, ModelModality, TrainStage } from './modelCenter'

export type TrainingStatus = 'Running' | 'Completed' | 'Failed' | 'Queued' | 'Stopped'
export type Framework = 'PyTorch' | 'Transformers'
export type TrainMethod = TrainStage
export type BaseModel =
  | 'Deepexi-R1-Industry-32B'
  | 'Deepexi-Industry-72B-Instruct'
  | 'Deepexi-VL-Industry-32B'
  | 'Deepexi-VL-Document-7B'

export interface TrainingJob {
  key: string
  name: string
  projectName: string
  modelFamily: ModelFamily
  modality: ModelModality
  trainStage: TrainStage
  capability: ModelCapability
  datasetType: DatasetType
  datasetName: string
  baseModel: BaseModel
  alignmentTags: string[]
  checkpoint: string
  contextWindow: number
  loraRank?: number
  tokenCount: number
  imageCount: number
  dataSource: string
  framework: Framework
  gpu: string
  status: TrainingStatus
  progress: number
  epoch: string
  bestMetric: string
  metricName: string
  startedAt: string
  duration: string
  createdBy: string
  learningRate: number
  batchSize: number
  warmupSteps: number
  totalSteps: number
  currentStep: number
  trainLoss: number[]
  valLoss: number[]
  lrHistory: number[]
  gpuMemUsage: string
  gpuUtil: string
  logs: string[]
}

export interface TrainingProject {
  key: string
  name: string
  description: string
  displayName: string
  modelFamily: ModelFamily
  modality: ModelModality
  trainStage: TrainStage
  capability: ModelCapability
  datasetType: DatasetType
  alignmentTags: string[]
  dataSource: string
  framework: Framework
  gpu: string
  jobs: number
  bestMetric: string
  createdAt: string
  trainMethod: TrainMethod
  baseModel: BaseModel
  datasetName: string
  contextWindow: number
  tokenCount: number
  imageCount: number
  loraRank?: number
  hyperParams: {
    learningRate: number
    batchSize: number
    epochs: number
    warmupSteps: number
    maxSeqLen: number
  }
}

export const TRAINING_STATUS_COLORS: Record<TrainingStatus, string> = {
  Running: 'processing',
  Completed: 'success',
  Failed: 'error',
  Queued: 'default',
  Stopped: 'warning',
}

export const FRAMEWORK_COLORS: Record<Framework, string> = {
  PyTorch: 'red',
  Transformers: 'purple',
}
