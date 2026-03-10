/**
 * L6 模型网关类型定义
 */

import type { ModelFamily, ModelModality } from './modelCenter'

export type ModelStage = 'Production' | 'Staging' | 'Archived' | 'Canary'

export interface RegisteredModel {
  key: string
  name: string
  displayName: string
  modelFamily?: ModelFamily
  modality?: ModelModality
  version: string
  stage: ModelStage
  accuracy: string
  framework: string
  endpoint: string
  qps: number
  latencyP50: string
  latencyP99: string
  lastDeployed: string
  description: string
  trainedFrom: string
  evalAccuracy: string
  evalF1: string
  replicas: number
  gpuType: string
  createdAt: string
}

export interface GatewayRoute {
  key: string
  path: string
  model: string
  modelFamily?: ModelFamily
  modality?: ModelModality
  version: string
  weight: number
  rateLimit: number
  status: 'Active' | 'Disabled'
}

export interface DeployConfig {
  replicas: number
  gpuType: string
  maxQps: number
  canaryWeight: number // 0-100
}

export const MODEL_STAGE_COLORS: Record<ModelStage, string> = {
  Production: 'green',
  Staging: 'orange',
  Archived: 'default',
  Canary: 'blue',
}
