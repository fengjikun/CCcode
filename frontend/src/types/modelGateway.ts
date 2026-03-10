/**
 * L6 模型网关类型定义
 */

import type { ModelCapability, ModelFamily, ModelModality } from './modelCenter'

export type ModelStage = 'Production' | 'Staging' | 'Archived' | 'Canary'

export interface RegisteredModel {
  key: string
  name: string
  displayName: string
  modelFamily: ModelFamily
  modality: ModelModality
  capability: ModelCapability
  version: string
  stage: ModelStage
  accuracy: string
  framework: string
  endpoint: string
  qps: number
  rpm: number
  tpm: number
  contextWindow: number
  maxOutputTokens: number
  supportsImageInput: boolean
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
  modelFamily: ModelFamily
  modality: ModelModality
  capability: ModelCapability
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
  targetStage: Exclude<ModelStage, 'Archived'>
}

export const MODEL_STAGE_COLORS: Record<ModelStage, string> = {
  Production: 'green',
  Staging: 'orange',
  Archived: 'default',
  Canary: 'blue',
}

export type ApiKeyScope =
  | 'chat:completions'
  | 'responses:create'
  | 'vision:understand'
  | 'documents:parse'
  | 'metrics:read'

export type GatewayApiKeyStatus = 'Active' | 'Disabled' | 'ExpiringSoon'

export interface GatewayApiKey {
  key: string
  name: string
  prefix: string
  owner: string
  linkedModels: string[]
  scopes: ApiKeyScope[]
  rateLimitRpm: number
  monthlyQuota: number
  status: GatewayApiKeyStatus
  ipWhitelist: string[]
  lastUsedAt: string
  createdAt: string
  expiresAt?: string
  lastRotatedAt: string
}

export interface CreateGatewayApiKeyInput {
  name: string
  owner: string
  linkedModels: string[]
  scopes: ApiKeyScope[]
  rateLimitRpm: number
  monthlyQuota: number
  ipWhitelist: string[]
  expiresAt?: string
}

export interface GatewayIssuedSecret {
  key: string
  name: string
  secret: string
  prefix: string
}

export type GatewayLogStatus = 'Success' | 'ClientError' | 'RateLimited' | 'ServerError'

export interface GatewayUsageLog {
  key: string
  timestamp: string
  requestId: string
  apiKeyName: string
  model: string
  routePath: string
  requester: string
  status: GatewayLogStatus
  httpStatus: number
  latencyMs: number
  inputTokens: number
  outputTokens: number
  region: string
  errorMessage?: string
}

export interface GatewayUsageSummary {
  totalRequests: number
  successRate: string
  avgLatency: string
  p95Latency: string
  totalTokens: number
  activeApiKeys: number
}
