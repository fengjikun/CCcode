/**
 * L5 模型评估类型定义
 */

import type { DatasetType, ModelCapability, ModelFamily, ModelModality } from './modelCenter'

export type EvalStatus = 'Running' | 'Completed' | 'Failed' | 'Pending'
export type EvalTaskType =
  | 'classification'
  | 'generation'
  | 'extraction'
  | 'qa'
  | 'instruction-following'
  | 'hallucination'
  | 'grounded-vqa'
  | 'document-understanding'

export interface EvalTask {
  key: string
  name: string
  modelName: string
  modelVersion: string
  modelFamily: ModelFamily
  modality: ModelModality
  datasetType: DatasetType
  capability: ModelCapability
  datasetName: string
  taskType: EvalTaskType
  status: EvalStatus
  progress: number
  // Metrics
  accuracy?: number
  precision?: number
  recall?: number
  f1?: number
  bleu?: number
  rouge?: number
  passRate?: number
  winRate?: number
  hallucinationRate?: number
  groundedScore?: number
  ocrScore?: number
  docParseScore?: number
  // Additional
  totalSamples: number
  evalSamples: number
  duration: string
  createdBy: string
  createdAt: string
}

export interface EvalSample {
  key: string
  modelFamily: ModelFamily
  modality: ModelModality
  prompt?: string
  response?: string
  judgeVerdict?: string
  humanLabel?: string
  input: string
  expectedOutput: string
  actualOutput: string
  isCorrect: boolean
  confidence: number
}

export interface EvalComparison {
  modelName: string
  version: string
  modelFamily: ModelFamily
  modality: ModelModality
  accuracy: number
  f1: number
  precision: number
  recall: number
  passRate?: number
  winRate?: number
  hallucinationRate?: number
  groundedScore?: number
  latency: string
  params: string
}

export const EVAL_STATUS_COLORS: Record<EvalStatus, string> = {
  Running: 'processing',
  Completed: 'success',
  Failed: 'error',
  Pending: 'default',
}

export const EVAL_TASK_TYPE_LABELS: Record<EvalTaskType, string> = {
  classification: '分类',
  generation: '生成',
  extraction: '抽取',
  qa: '问答',
  'instruction-following': '指令遵循',
  hallucination: '幻觉评测',
  'grounded-vqa': '有依据视觉问答',
  'document-understanding': '文档理解',
}
