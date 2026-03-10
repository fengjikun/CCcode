import { delay, rand } from './mockConfig'
import type {
  CreateGatewayApiKeyInput,
  DeployConfig,
  GatewayApiKey,
  GatewayIssuedSecret,
  GatewayRoute,
  GatewayUsageLog,
  GatewayUsageSummary,
  RegisteredModel,
} from '../types/modelGateway'

const TODAY = '2026-03-10'

function cloneModels(models: RegisteredModel[]): RegisteredModel[] {
  return models.map(model => ({ ...model }))
}

function cloneRoutes(routes: GatewayRoute[]): GatewayRoute[] {
  return routes.map(route => ({ ...route }))
}

function cloneApiKeys(keys: GatewayApiKey[]): GatewayApiKey[] {
  return keys.map(key => ({
    ...key,
    linkedModels: [...key.linkedModels],
    scopes: [...key.scopes],
    ipWhitelist: [...key.ipWhitelist],
  }))
}

function cloneUsageLogs(logs: GatewayUsageLog[]): GatewayUsageLog[] {
  return logs.map(log => ({ ...log }))
}

function issueSecret(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`
}

function deriveKeyPrefix(name: string): string {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `dx_${normalized.slice(0, 10) || 'gateway'}`
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))
  return sorted[index]
}

function formatMs(value: number): string {
  return `${(value / 1000).toFixed(1)}s`
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

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
      lastDeployed: TODAY,
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

export function buildDefaultGatewayApiKeys(): GatewayApiKey[] {
  return [
    {
      key: 'api-key-1',
      name: '产线 Copilot 生产凭证',
      prefix: 'dx_prod_copilot',
      owner: 'factory.ops',
      linkedModels: ['deepexi-factory-copilot-dpo', 'deepexi-factory-copilot-sft'],
      scopes: ['chat:completions', 'responses:create', 'metrics:read'],
      rateLimitRpm: 2400,
      monthlyQuota: 22_000_000,
      status: 'Active',
      ipWhitelist: ['10.10.8.0/24', '10.10.9.18'],
      lastUsedAt: '2026-03-10 12:36',
      createdAt: '2026-02-18',
      expiresAt: '2026-06-30',
      lastRotatedAt: '2026-03-01',
    },
    {
      key: 'api-key-2',
      name: '视觉巡检灰度凭证',
      prefix: 'dx_canary_vl',
      owner: 'inspection.bot',
      linkedModels: ['deepexi-vl-inspection-assistant'],
      scopes: ['vision:understand', 'metrics:read'],
      rateLimitRpm: 480,
      monthlyQuota: 3_800_000,
      status: 'ExpiringSoon',
      ipWhitelist: ['172.16.32.0/24'],
      lastUsedAt: '2026-03-10 12:31',
      createdAt: '2026-02-26',
      expiresAt: '2026-03-18',
      lastRotatedAt: '2026-02-26',
    },
    {
      key: 'api-key-3',
      name: '文档解析批处理',
      prefix: 'dx_doc_batch',
      owner: 'doc.pipeline',
      linkedModels: ['deepexi-doc-parser-lora'],
      scopes: ['documents:parse'],
      rateLimitRpm: 300,
      monthlyQuota: 1_500_000,
      status: 'Disabled',
      ipWhitelist: ['10.88.10.12'],
      lastUsedAt: '2026-03-08 18:20',
      createdAt: '2026-03-01',
      lastRotatedAt: '2026-03-01',
    },
  ]
}

export function buildDefaultGatewayUsageLogs(): GatewayUsageLog[] {
  return [
    { key: 'log-1', timestamp: '2026-03-10 12:36:44', requestId: 'req_gw_8f30', apiKeyName: '产线 Copilot 生产凭证', model: 'deepexi-factory-copilot-dpo', routePath: '/chat/completions', requester: 'workorder-assistant', status: 'Success', httpStatus: 200, latencyMs: 920, inputTokens: 2980, outputTokens: 620, region: 'cn-sha' },
    { key: 'log-2', timestamp: '2026-03-10 12:35:19', requestId: 'req_gw_8f2f', apiKeyName: '产线 Copilot 生产凭证', model: 'deepexi-factory-copilot-sft', routePath: '/responses', requester: 'ops-copilot', status: 'Success', httpStatus: 200, latencyMs: 1260, inputTokens: 2140, outputTokens: 508, region: 'cn-sha' },
    { key: 'log-3', timestamp: '2026-03-10 12:34:21', requestId: 'req_gw_8f2e', apiKeyName: '文档解析批处理', model: 'deepexi-doc-parser-lora', routePath: '/doc/parse', requester: 'doc-batch-worker', status: 'ClientError', httpStatus: 422, latencyMs: 610, inputTokens: 440, outputTokens: 0, region: 'cn-sha', errorMessage: 'Document image too large for current preprocessing policy' },
    { key: 'log-4', timestamp: '2026-03-10 12:33:16', requestId: 'req_gw_8f2d', apiKeyName: '视觉巡检灰度凭证', model: 'deepexi-vl-inspection-assistant', routePath: '/vl/understand', requester: 'inspection-edge-07', status: 'Success', httpStatus: 200, latencyMs: 2480, inputTokens: 1220, outputTokens: 188, region: 'cn-bj' },
    { key: 'log-5', timestamp: '2026-03-10 12:28:05', requestId: 'req_gw_8f2c', apiKeyName: '视觉巡检灰度凭证', model: 'deepexi-vl-inspection-assistant', routePath: '/vl/understand', requester: 'inspection-edge-03', status: 'RateLimited', httpStatus: 429, latencyMs: 210, inputTokens: 90, outputTokens: 0, region: 'cn-bj', errorMessage: 'Image understanding RPM quota exceeded on canary route' },
    { key: 'log-6', timestamp: '2026-03-10 12:24:43', requestId: 'req_gw_8f2b', apiKeyName: '产线 Copilot 生产凭证', model: 'deepexi-factory-copilot-dpo', routePath: '/chat/completions', requester: 'mes-shift-summary', status: 'Success', httpStatus: 200, latencyMs: 1160, inputTokens: 1820, outputTokens: 420, region: 'cn-sha' },
    { key: 'log-7', timestamp: '2026-03-10 12:19:52', requestId: 'req_gw_8f2a', apiKeyName: '产线 Copilot 生产凭证', model: 'deepexi-factory-copilot-sft', routePath: '/responses', requester: 'ops-copilot', status: 'ServerError', httpStatus: 504, latencyMs: 8010, inputTokens: 3200, outputTokens: 0, region: 'cn-sha', errorMessage: 'Judge reranking path timed out after 8s' },
    { key: 'log-8', timestamp: '2026-03-10 12:12:16', requestId: 'req_gw_8f29', apiKeyName: '文档解析批处理', model: 'deepexi-doc-parser-lora', routePath: '/doc/parse', requester: 'ticket-importer', status: 'Success', httpStatus: 200, latencyMs: 1740, inputTokens: 680, outputTokens: 236, region: 'cn-sha' },
    { key: 'log-9', timestamp: '2026-03-10 11:58:31', requestId: 'req_gw_8f28', apiKeyName: '视觉巡检灰度凭证', model: 'deepexi-vl-inspection-assistant', routePath: '/vl/understand', requester: 'inspection-edge-03', status: 'Success', httpStatus: 200, latencyMs: 2210, inputTokens: 1160, outputTokens: 192, region: 'cn-bj' },
    { key: 'log-10', timestamp: '2026-03-10 11:46:08', requestId: 'req_gw_8f27', apiKeyName: '产线 Copilot 生产凭证', model: 'deepexi-factory-copilot-dpo', routePath: '/chat/completions', requester: 'alarm-triage', status: 'Success', httpStatus: 200, latencyMs: 880, inputTokens: 1460, outputTokens: 388, region: 'cn-sha' },
    { key: 'log-11', timestamp: '2026-03-10 11:31:44', requestId: 'req_gw_8f26', apiKeyName: '文档解析批处理', model: 'deepexi-doc-parser-lora', routePath: '/doc/parse', requester: 'ticket-importer', status: 'Success', httpStatus: 200, latencyMs: 1680, inputTokens: 710, outputTokens: 244, region: 'cn-sha' },
    { key: 'log-12', timestamp: '2026-03-10 10:54:22', requestId: 'req_gw_8f25', apiKeyName: '产线 Copilot 生产凭证', model: 'deepexi-factory-copilot-sft', routePath: '/responses', requester: 'knowledge-bot', status: 'Success', httpStatus: 200, latencyMs: 1350, inputTokens: 2240, outputTokens: 540, region: 'cn-sz' },
  ]
}

let mockModels = cloneModels(buildDefaultRegisteredModels())
let mockRoutes = cloneRoutes(buildDefaultGatewayRoutes())
let mockApiKeys = cloneApiKeys(buildDefaultGatewayApiKeys())
let mockUsageLogs = cloneUsageLogs(buildDefaultGatewayUsageLogs())

function getModelByKey(key: string): RegisteredModel | undefined {
  return mockModels.find(model => model.key === key)
}

function getRouteByPath(path: string): GatewayRoute | undefined {
  return mockRoutes.find(route => route.path === path)
}

function syncRoutesFromModels(): void {
  mockRoutes = mockRoutes.map(route => {
    const model = mockModels.find(item => item.name === route.model)
    if (!model) return route
    return {
      ...route,
      version: model.version,
      rateLimit: Math.round(model.rpm / 45),
      status: model.stage === 'Archived' ? 'Disabled' : 'Active',
    }
  })
}

function appendUsageLog(log: GatewayUsageLog): void {
  mockUsageLogs = [log, ...mockUsageLogs].slice(0, 60)
}

function buildGatewayStats() {
  const active = mockModels.filter(model => model.stage !== 'Archived')
  const totalQps = active.reduce((sum, model) => sum + model.qps, 0)
  return {
    deployedModels: active.length,
    totalQps: totalQps >= 1000 ? `${(totalQps / 1000).toFixed(1)}K` : `${totalQps}`,
    avgLatency: formatMs(average(mockUsageLogs.map(log => log.latencyMs)) || 1500),
    availability: formatPercent((mockUsageLogs.filter(log => log.status === 'Success').length / Math.max(mockUsageLogs.length, 1)) * 100),
    productionCount: mockModels.filter(model => model.stage === 'Production').length,
    canaryCount: mockModels.filter(model => model.stage === 'Canary').length,
    stagingCount: mockModels.filter(model => model.stage === 'Staging').length,
  }
}

function buildUsageSummary(): GatewayUsageSummary {
  const totalRequests = mockUsageLogs.length
  const successCount = mockUsageLogs.filter(log => log.status === 'Success').length
  const tokenTotal = mockUsageLogs.reduce((sum, log) => sum + log.inputTokens + log.outputTokens, 0)
  return {
    totalRequests,
    successRate: formatPercent((successCount / Math.max(totalRequests, 1)) * 100),
    avgLatency: formatMs(average(mockUsageLogs.map(log => log.latencyMs))),
    p95Latency: formatMs(percentile(mockUsageLogs.map(log => log.latencyMs), 0.95)),
    totalTokens: tokenTotal,
    activeApiKeys: mockApiKeys.filter(key => key.status !== 'Disabled').length,
  }
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

export async function listModels(): Promise<RegisteredModel[]> {
  await delay(rand(180, 360))
  return cloneModels(mockModels)
}

export async function listRoutes(): Promise<GatewayRoute[]> {
  await delay(rand(180, 360))
  return cloneRoutes(mockRoutes)
}

export async function getGatewayStats(): Promise<GatewayStats> {
  await delay(rand(180, 360))
  return buildGatewayStats()
}

export async function deployModel(key: string, config: DeployConfig): Promise<{ success: boolean; message: string }> {
  await delay(500)
  const model = getModelByKey(key)
  if (!model) return { success: false, message: '未找到目标服务。' }

  model.replicas = config.replicas
  model.gpuType = config.gpuType
  model.rpm = Math.max(1000, config.maxQps)
  model.qps = Math.max(50, Math.round(config.maxQps / 40))
  model.stage = config.targetStage
  model.lastDeployed = TODAY

  const route = getRouteByPath(model.endpoint)
  if (route) {
    route.model = model.name
    route.version = model.version
    route.rateLimit = Math.round(config.maxQps / 45)
    route.weight = config.targetStage === 'Canary' ? config.canaryWeight : 100
    route.status = 'Active'
  }

  appendUsageLog({
    key: `log-deploy-${Date.now()}`,
    timestamp: `${TODAY} 12:40:00`,
    requestId: `evt_gw_${Math.random().toString(36).slice(2, 8)}`,
    apiKeyName: 'system-control-plane',
    model: model.name,
    routePath: model.endpoint,
    requester: 'gateway-release-controller',
    status: 'Success',
    httpStatus: 200,
    latencyMs: 420,
    inputTokens: 0,
    outputTokens: 0,
    region: 'cn-sha',
  })

  syncRoutesFromModels()
  return { success: true, message: `推理服务已发布到 ${config.targetStage}，配置已生效。` }
}

export async function promoteModel(key: string, fromStage: string, toStage: string): Promise<{ success: boolean; message: string }> {
  await delay(400)
  const model = getModelByKey(key)
  if (!model) return { success: false, message: '未找到目标服务。' }

  model.stage = toStage as RegisteredModel['stage']
  model.lastDeployed = TODAY

  const route = getRouteByPath(model.endpoint)
  if (route) {
    route.weight = toStage === 'Canary' ? Math.max(route.weight, 20) : 100
  }

  syncRoutesFromModels()
  return { success: true, message: `服务版本已从 ${fromStage} 推进到 ${toStage}。` }
}

export async function rollbackModel(key: string): Promise<{ success: boolean; message: string }> {
  await delay(320)
  const model = getModelByKey(key)
  if (!model) return { success: false, message: '未找到目标服务。' }

  if (model.stage === 'Production') model.stage = 'Canary'
  else if (model.stage === 'Canary') model.stage = 'Staging'
  else model.stage = 'Archived'

  model.lastDeployed = TODAY

  const route = getRouteByPath(model.endpoint)
  if (route) {
    route.weight = model.stage === 'Canary' ? 20 : model.stage === 'Archived' ? 0 : 100
    route.status = model.stage === 'Archived' ? 'Disabled' : 'Active'
  }

  return { success: true, message: '服务版本已回滚到上一稳定阶段。' }
}

export async function updateTrafficWeight(routeKey: string, weight: number): Promise<{ success: boolean; message: string }> {
  await delay(240)
  const route = mockRoutes.find(item => item.key === routeKey)
  if (!route) return { success: false, message: '未找到能力路由。' }

  route.weight = weight
  return { success: true, message: `灰度流量权重已更新为 ${weight}%。` }
}

export async function listApiKeys(): Promise<GatewayApiKey[]> {
  await delay(rand(180, 360))
  return cloneApiKeys(mockApiKeys)
}

export async function createApiKey(input: CreateGatewayApiKeyInput): Promise<{ success: boolean; message: string; issued: GatewayIssuedSecret }> {
  await delay(500)
  const prefix = deriveKeyPrefix(input.name)
  const key = `api-key-${Date.now()}`
  const issued = {
    key,
    name: input.name,
    prefix,
    secret: issueSecret(prefix),
  }

  mockApiKeys = [
    {
      key,
      name: input.name,
      prefix,
      owner: input.owner,
      linkedModels: [...input.linkedModels],
      scopes: [...input.scopes],
      rateLimitRpm: input.rateLimitRpm,
      monthlyQuota: input.monthlyQuota,
      status: 'Active',
      ipWhitelist: [...input.ipWhitelist],
      lastUsedAt: '尚未使用',
      createdAt: TODAY,
      expiresAt: input.expiresAt,
      lastRotatedAt: TODAY,
    },
    ...mockApiKeys,
  ]

  return { success: true, message: 'API Key 已创建，请立即保存明文密钥。', issued }
}

export async function toggleApiKeyStatus(key: string, nextStatus: GatewayApiKey['status']): Promise<{ success: boolean; message: string }> {
  await delay(240)
  const target = mockApiKeys.find(item => item.key === key)
  if (!target) return { success: false, message: '未找到 API Key。' }

  target.status = nextStatus
  return { success: true, message: nextStatus === 'Disabled' ? 'API Key 已禁用。' : 'API Key 已启用。' }
}

export async function rotateApiKey(key: string): Promise<{ success: boolean; message: string; issued: GatewayIssuedSecret | null }> {
  await delay(400)
  const target = mockApiKeys.find(item => item.key === key)
  if (!target) return { success: false, message: '未找到 API Key。', issued: null }

  target.lastRotatedAt = TODAY
  const issued = {
    key: target.key,
    name: target.name,
    prefix: target.prefix,
    secret: issueSecret(target.prefix),
  }
  return { success: true, message: 'API Key 已轮换，新密钥已签发。', issued }
}

export async function getGatewayUsageSummary(): Promise<GatewayUsageSummary> {
  await delay(rand(180, 360))
  return buildUsageSummary()
}

export async function listUsageLogs(): Promise<GatewayUsageLog[]> {
  await delay(rand(180, 360))
  return cloneUsageLogs(mockUsageLogs)
}

export async function getMonitoringStats(): Promise<MonitoringStats> {
  await delay(rand(180, 360))
  const summary = buildUsageSummary()
  return {
    todayRequests: summary.totalRequests,
    successRate: summary.successRate,
    avgLatency: summary.avgLatency,
    p99Latency: formatMs(percentile(mockUsageLogs.map(log => log.latencyMs), 0.99)),
  }
}

export async function getHourlyTraffic(): Promise<HourlyTraffic[]> {
  await delay(rand(180, 360))
  const bucket = new Map<string, number>()
  for (const log of mockUsageLogs) {
    const hour = log.timestamp.slice(11, 13)
    bucket.set(`${hour}:00`, (bucket.get(`${hour}:00`) ?? 0) + 1)
  }
  return [...bucket.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([hour, requests]) => ({ hour, requests }))
}

export async function getRecentErrors(): Promise<RecentError[]> {
  await delay(rand(180, 360))
  return mockUsageLogs
    .filter(log => log.status !== 'Success')
    .slice(0, 5)
    .map(log => ({
      key: log.key,
      time: log.timestamp.slice(11),
      model: log.model,
      errorCode: log.httpStatus,
      errorMessage: log.errorMessage ?? 'Unknown error',
    }))
}
