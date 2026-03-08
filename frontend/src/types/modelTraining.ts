/**
 * L5 模型训练类型定义
 */

export type TrainingStatus = 'Running' | 'Completed' | 'Failed' | 'Queued' | 'Stopped'
export type Framework = 'PyTorch' | 'TensorFlow' | 'scikit-learn' | 'Transformers'

export interface TrainingJob {
  key: string
  name: string
  projectName: string
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
}

export interface TrainingProject {
  key: string
  name: string
  description: string
  dataSource: string
  framework: Framework
  gpu: string
  jobs: number
  bestMetric: string
  createdAt: string
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
