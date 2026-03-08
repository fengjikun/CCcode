/**
 * L6 模型网关类型定义
 */

export type ModelStage = 'Production' | 'Staging' | 'Archived' | 'Canary'

export interface RegisteredModel {
  key: string
  name: string
  displayName: string
  version: string
  stage: ModelStage
  accuracy: string
  framework: string
  endpoint: string
  qps: number
  latencyP50: string
  latencyP99: string
  lastDeployed: string
}

export interface GatewayRoute {
  key: string
  path: string
  model: string
  version: string
  weight: number
  rateLimit: number
  status: 'Active' | 'Disabled'
}

export const MODEL_STAGE_COLORS: Record<ModelStage, string> = {
  Production: 'green',
  Staging: 'orange',
  Archived: 'default',
  Canary: 'blue',
}
