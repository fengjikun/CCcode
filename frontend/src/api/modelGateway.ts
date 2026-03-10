import type { RegisteredModel, GatewayRoute, DeployConfig } from '../types/modelGateway'
import { delay, rand } from './mockConfig'

export function buildDefaultRegisteredModels(): RegisteredModel[] {
  return [
    {
      key: 'model-1',
      name: 'deepexi-factory-copilot-sft',
      displayName: 'Deepexi Factory Copilot',
      modelFamily: 'LLM',
      modality: 'text',
      capability: 'reasoning',
      version: 'v2026.03.10',
      stage: 'Production',
      accuracy: '91.8%',
      framework: 'Transformers',
      endpoint: '/responses',
      qps: 4200,
      rpm: 180000,
      tpm: 24000000,
      contextWindow: 32768,
      maxOutputTokens: 8192,
      supportsImageInput: false,
      latencyP50: '1.2s',
      latencyP99: '3.8s',
      lastDeployed: '2026-03-10',
      description: '工业知识增强问答与流程执行模型。',
      trainedFrom: 'deepexi-factory-copilot-sft',
      evalAccuracy: '91.8',
      evalF1: '88.6',
      replicas: 6,
      gpuType: 'H100-80GB',
      createdAt: '2026-02-20',
    },
    {
      key: 'model-2',
      name: 'deepexi-vl-inspection-assistant',
      displayName: 'Deepexi Inspection VL Assistant',
      modelFamily: 'VL',
      modality: 'image-text',
      capability: 'vision-language-understanding',
      version: 'v2026.03.09',
      stage: 'Canary',
      accuracy: '88.4%',
      framework: 'Transformers',
      endpoint: '/vl/understand',
      qps: 860,
      rpm: 28000,
      tpm: 4200000,
      contextWindow: 16384,
      maxOutputTokens: 4096,
      supportsImageInput: true,
      latencyP50: '2.1s',
      latencyP99: '5.9s',
      lastDeployed: '2026-03-09',
      description: '设备巡检图像问答与 grounded diagnosis 模型。',
      trainedFrom: 'deepexi-vl-inspection-assistant',
      evalAccuracy: '88.4',
      evalF1: '90.2',
      replicas: 3,
      gpuType: 'H100-80GB',
      createdAt: '2026-02-24',
    },
    {
      key: 'model-3',
      name: 'deepexi-doc-parser-lora',
      displayName: 'Deepexi Doc Parser',
      modelFamily: 'VL',
      modality: 'image-text',
      capability: 'document-parsing',
      version: 'v2026.03.08',
      stage: 'Staging',
      accuracy: '89.7%',
      framework: 'Transformers',
      endpoint: '/doc/parse',
      qps: 620,
      rpm: 24000,
      tpm: 3600000,
      contextWindow: 8192,
      maxOutputTokens: 2048,
      supportsImageInput: true,
      latencyP50: '1.8s',
      latencyP99: '4.2s',
      lastDeployed: '2026-03-08',
      description: '票据与检修文档解析增强模型。',
      trainedFrom: 'deepexi-doc-parser-lora',
      evalAccuracy: '89.7',
      evalF1: '91.4',
      replicas: 2,
      gpuType: 'A100-80GB',
      createdAt: '2026-03-01',
    },
    {
      key: 'model-4',
      name: 'deepexi-factory-copilot-dpo',
      displayName: 'Deepexi Factory Copilot DPO',
      modelFamily: 'LLM',
      modality: 'text',
      capability: 'chat',
      version: 'v2026.03.07',
      stage: 'Production',
      accuracy: '94.1%',
      framework: 'PyTorch',
      endpoint: '/chat/completions',
      qps: 3600,
      rpm: 160000,
      tpm: 18000000,
      contextWindow: 32768,
      maxOutputTokens: 6144,
      supportsImageInput: false,
      latencyP50: '1.0s',
      latencyP99: '3.2s',
      lastDeployed: '2026-03-07',
      description: '强化拒答边界与事实性回答的对齐模型。',
      trainedFrom: 'deepexi-factory-copilot-dpo',
      evalAccuracy: '94.1',
      evalF1: '97.2',
      replicas: 5,
      gpuType: 'A100-80GB',
      createdAt: '2026-03-04',
    },
  ]
}

export function buildDefaultGatewayRoutes(): GatewayRoute[] {
  return [
    { key: 'route-1', path: '/chat/completions', model: 'deepexi-factory-copilot-dpo', modelFamily: 'LLM', modality: 'text', capability: 'chat', version: 'v2026.03.07', weight: 100, rateLimit: 4000, status: 'Active' },
    { key: 'route-2', path: '/responses', model: 'deepexi-factory-copilot-sft', modelFamily: 'LLM', modality: 'text', capability: 'reasoning', version: 'v2026.03.10', weight: 100, rateLimit: 4500, status: 'Active' },
    { key: 'route-3', path: '/vl/understand', model: 'deepexi-vl-inspection-assistant', modelFamily: 'VL', modality: 'image-text', capability: 'vision-language-understanding', version: 'v2026.03.09', weight: 20, rateLimit: 900, status: 'Active' },
    { key: 'route-4', path: '/doc/parse', model: 'deepexi-doc-parser-lora', modelFamily: 'VL', modality: 'image-text', capability: 'document-parsing', version: 'v2026.03.08', weight: 100, rateLimit: 800, status: 'Active' },
  ]
}

const MOCK_MODELS: RegisteredModel[] = buildDefaultRegisteredModels()
const MOCK_ROUTES: GatewayRoute[] = buildDefaultGatewayRoutes()

export async function listModels(): Promise<RegisteredModel[]> {
  await delay(rand(300, 600))
  return MOCK_MODELS
}

export async function listRoutes(): Promise<GatewayRoute[]> {
  await delay(rand(200, 400))
  return MOCK_ROUTES
}

export interface GatewayStats {
  deployedModels: number
  totalQps: string
  avgLatency: string
  availability: string
  productionCount: number
  canaryCount: number
  stagingCount: number
}

export async function getGatewayStats(): Promise<GatewayStats> {
  await delay(rand(200, 400))
  const active = MOCK_MODELS.filter(model => model.stage !== 'Archived')
  const totalQps = active.reduce((sum, model) => sum + model.qps, 0)
  return {
    deployedModels: active.length,
    totalQps: totalQps >= 1000 ? `${(totalQps / 1000).toFixed(1)}K` : `${totalQps}`,
    avgLatency: '1.5s',
    availability: '99.92%',
    productionCount: MOCK_MODELS.filter(model => model.stage === 'Production').length,
    canaryCount: MOCK_MODELS.filter(model => model.stage === 'Canary').length,
    stagingCount: MOCK_MODELS.filter(model => model.stage === 'Staging').length,
  }
}

export async function deployModel(_key: string, _config: DeployConfig): Promise<{ success: boolean; message: string }> {
  await delay(800)
  return { success: true, message: '推理服务发布任务已提交，预计 2 分钟内完成。' }
}

export async function promoteModel(_key: string, fromStage: string, toStage: string): Promise<{ success: boolean; message: string }> {
  await delay(600)
  return { success: true, message: `服务版本已从 ${fromStage} 推进到 ${toStage}。` }
}

export async function rollbackModel(_key: string): Promise<{ success: boolean; message: string }> {
  await delay(500)
  return { success: true, message: '服务版本已回滚到上一稳定版本。' }
}

export async function updateTrafficWeight(_routeKey: string, weight: number): Promise<{ success: boolean; message: string }> {
  await delay(400)
  return { success: true, message: `灰度流量权重已更新为 ${weight}%。` }
}

export interface MonitoringStats {
  todayRequests: number
  successRate: string
  avgLatency: string
  p99Latency: string
}

export interface HourlyTraffic {
  hour: string
  requests: number
}

export interface RecentError {
  key: string
  time: string
  model: string
  errorCode: number
  errorMessage: string
}

export async function getMonitoringStats(): Promise<MonitoringStats> {
  await delay(rand(200, 400))
  return {
    todayRequests: 248453,
    successRate: '99.92%',
    avgLatency: '1.5s',
    p99Latency: '4.8s',
  }
}

export async function getHourlyTraffic(): Promise<HourlyTraffic[]> {
  await delay(rand(200, 400))
  return [
    { hour: '06:00', requests: 5600 },
    { hour: '07:00', requests: 13200 },
    { hour: '08:00', requests: 22400 },
    { hour: '09:00', requests: 31800 },
    { hour: '10:00', requests: 34600 },
    { hour: '11:00', requests: 33400 },
    { hour: '12:00', requests: 28600 },
  ]
}

export async function getRecentErrors(): Promise<RecentError[]> {
  await delay(rand(200, 400))
  return [
    { key: '1', time: '12:34:21', model: 'deepexi-doc-parser-lora', errorCode: 422, errorMessage: 'Document image too large for current preprocessing policy' },
    { key: '2', time: '12:28:05', model: 'deepexi-vl-inspection-assistant', errorCode: 429, errorMessage: 'Image understanding RPM quota exceeded on canary route' },
    { key: '3', time: '12:15:33', model: 'deepexi-factory-copilot-sft', errorCode: 504, errorMessage: 'Judge reranking path timed out after 8s' },
    { key: '4', time: '11:58:12', model: 'deepexi-factory-copilot-dpo', errorCode: 400, errorMessage: 'Input tool schema rejected by responses API validator' },
  ]
}
