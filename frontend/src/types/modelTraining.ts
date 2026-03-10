/**
 * L5 模型训练类型定义
 */

import type { DatasetType, ModelFamily, ModelModality, TrainStage } from './modelCenter'

export type TrainingStatus = 'Running' | 'Completed' | 'Failed' | 'Queued' | 'Stopped'
export type Framework = 'PyTorch' | 'TensorFlow' | 'scikit-learn' | 'Transformers'
export type TrainMethod = 'full' | 'lora' | 'qlora'
export type BaseModel = 'DeepSeek-V3' | 'DeepSeek-R1' | 'Qwen-72B' | 'GLM-4' | 'Llama-3.1-70B'

export interface TrainingJob {
  key: string
  name: string
  projectName: string
  modelFamily?: ModelFamily
  modality?: ModelModality
  trainStage?: TrainStage
  datasetType?: DatasetType
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
  modelFamily?: ModelFamily
  modality?: ModelModality
  trainStage?: TrainStage
  datasetType?: DatasetType
  dataSource: string
  framework: Framework
  gpu: string
  jobs: number
  bestMetric: string
  createdAt: string
  trainMethod: TrainMethod
  baseModel: BaseModel
  datasetName: string
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
  TensorFlow: 'orange',
  'scikit-learn': 'blue',
  Transformers: 'purple',
}
