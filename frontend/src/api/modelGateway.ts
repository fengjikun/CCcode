import type { RegisteredModel, GatewayRoute, DeployConfig } from '../types/modelGateway'
import { delay, rand } from './mockConfig'

const MOCK_MODELS: RegisteredModel[] = [
  {
    key: '1', name: 'purchase-order-classifier', displayName: '采购订单分类', version: 'v2.1.0',
    stage: 'Production', accuracy: '95.3%', framework: 'PyTorch',
    endpoint: '/api/v1/models/purchase-classifier', qps: 4200,
    latencyP50: '32ms', latencyP99: '85ms', lastDeployed: '2025-03-08',
    description: '基于 BERT 的采购订单自动分类模型，支持 12 种采购类目', trainedFrom: '采购智能分类项目',
    evalAccuracy: '95.3', evalF1: '94.8', replicas: 4, gpuType: 'A100-40GB', createdAt: '2025-02-20',
  },
  {
    key: '2', name: 'equipment-fault-predictor', displayName: '设备故障预测', version: 'v1.8.2',
    stage: 'Production', accuracy: '92.7%', framework: 'TensorFlow',
    endpoint: '/api/v1/models/fault-predictor', qps: 2800,
    latencyP50: '45ms', latencyP99: '120ms', lastDeployed: '2025-03-07',
    description: 'LSTM 时序模型，预测设备未来 7 天故障概率', trainedFrom: '设备健康管理项目',
    evalAccuracy: '92.7', evalF1: '91.5', replicas: 3, gpuType: 'A100-40GB', createdAt: '2025-01-15',
  },
  {
    key: '3', name: 'demand-forecaster', displayName: '需求预测', version: 'v3.0.1',
    stage: 'Staging', accuracy: '88.4%', framework: 'scikit-learn',
    endpoint: '/api/v1/models/demand-forecast', qps: 560,
    latencyP50: '18ms', latencyP99: '42ms', lastDeployed: '2025-03-06',
    description: 'XGBoost 集成模型，支持 SKU 级别的需求预测', trainedFrom: '供应链需求预测项目',
    evalAccuracy: '88.4', evalF1: '87.2', replicas: 2, gpuType: 'V100-16GB', createdAt: '2025-03-01',
  },
  {
    key: '4', name: 'sentiment-analyzer', displayName: '情感分析', version: 'v1.2.0',
    stage: 'Production', accuracy: '91.2%', framework: 'Transformers',
    endpoint: '/api/v1/models/sentiment', qps: 3600,
    latencyP50: '55ms', latencyP99: '150ms', lastDeployed: '2025-03-05',
    description: '基于 RoBERTa 的多维情感分析模型，支持正/负/中性分类', trainedFrom: '客户反馈分析项目',
    evalAccuracy: '91.2', evalF1: '90.8', replicas: 3, gpuType: 'A100-40GB', createdAt: '2025-02-10',
  },
  {
    key: '5', name: 'churn-predictor', displayName: '流失预测', version: 'v2.0.0',
    stage: 'Canary', accuracy: '89.1%', framework: 'PyTorch',
    endpoint: '/api/v1/models/churn', qps: 180,
    latencyP50: '28ms', latencyP99: '65ms', lastDeployed: '2025-03-08',
    description: '深度学习用户流失预测模型，融合行为序列与画像特征', trainedFrom: '用户增长分析项目',
    evalAccuracy: '89.1', evalF1: '88.3', replicas: 2, gpuType: 'V100-16GB', createdAt: '2025-03-05',
  },
  {
    key: '6', name: 'supplier-risk-scorer', displayName: '供应商风险评分', version: 'v1.1.0',
    stage: 'Production', accuracy: '87.2%', framework: 'scikit-learn',
    endpoint: '/api/v1/models/supplier-risk', qps: 420,
    latencyP50: '12ms', latencyP99: '28ms', lastDeployed: '2025-03-04',
    description: 'Gradient Boosting 供应商风险评分模型，覆盖财务/交付/质量三维度', trainedFrom: '供应商管理项目',
    evalAccuracy: '87.2', evalF1: '86.5', replicas: 2, gpuType: 'T4-16GB', createdAt: '2025-02-01',
  },
  {
    key: '7', name: 'quality-classifier', displayName: '质量分类', version: 'v1.0.0',
    stage: 'Archived', accuracy: '83.5%', framework: 'PyTorch',
    endpoint: '/api/v1/models/quality', qps: 0,
    latencyP50: '—', latencyP99: '—', lastDeployed: '2025-02-15',
    description: '产品质量分类模型（已归档），被 v2.0 替代', trainedFrom: '质量管控项目',
    evalAccuracy: '83.5', evalF1: '82.0', replicas: 0, gpuType: 'T4-16GB', createdAt: '2024-12-01',
  },
]

const MOCK_ROUTES: GatewayRoute[] = [
  { key: '1', path: '/api/v1/models/purchase-classifier', model: 'purchase-order-classifier', version: 'v2.1.0', weight: 100, rateLimit: 5000, status: 'Active' },
  { key: '2', path: '/api/v1/models/fault-predictor', model: 'equipment-fault-predictor', version: 'v1.8.2', weight: 100, rateLimit: 3000, status: 'Active' },
  { key: '3', path: '/api/v1/models/churn', model: 'churn-predictor', version: 'v1.5.0', weight: 90, rateLimit: 1000, status: 'Active' },
  { key: '4', path: '/api/v1/models/churn', model: 'churn-predictor', version: 'v2.0.0', weight: 10, rateLimit: 1000, status: 'Active' },
  { key: '5', path: '/api/v1/models/sentiment', model: 'sentiment-analyzer', version: 'v1.2.0', weight: 100, rateLimit: 4000, status: 'Active' },
  { key: '6', path: '/api/v1/models/supplier-risk', model: 'supplier-risk-scorer', version: 'v1.1.0', weight: 100, rateLimit: 500, status: 'Active' },
]

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
  const active = MOCK_MODELS.filter(m => m.stage !== 'Archived')
  const totalQps = active.reduce((s, m) => s + m.qps, 0)
  return {
    deployedModels: active.length,
    totalQps: totalQps >= 1000 ? `${(totalQps / 1000).toFixed(1)}K` : `${totalQps}`,
    avgLatency: '45ms',
    availability: '99.8%',
    productionCount: MOCK_MODELS.filter(m => m.stage === 'Production').length,
    canaryCount: MOCK_MODELS.filter(m => m.stage === 'Canary').length,
    stagingCount: MOCK_MODELS.filter(m => m.stage === 'Staging').length,
  }
}

/** 模拟部署模型 */
export async function deployModel(_key: string, _config: DeployConfig): Promise<{ success: boolean; message: string }> {
  await delay(800)
  return { success: true, message: '模型部署任务已提交，预计 2 分钟内完成。' }
}

/** 模拟阶段推进 */
export async function promoteModel(_key: string, _fromStage: string, _toStage: string): Promise<{ success: boolean; message: string }> {
  await delay(600)
  return { success: true, message: `模型已从 ${_fromStage} 推进到 ${_toStage}。` }
}

/** 模拟回滚 */
export async function rollbackModel(_key: string): Promise<{ success: boolean; message: string }> {
  await delay(500)
  return { success: true, message: '模型已回滚到上一版本。' }
}

/** 模拟更新灰度流量权重 */
export async function updateTrafficWeight(_routeKey: string, _weight: number): Promise<{ success: boolean; message: string }> {
  await delay(400)
  return { success: true, message: `流量权重已更新为 ${_weight}%。` }
}

/** 运行监控 mock 数据 */
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
    todayRequests: 128453,
    successRate: '99.87%',
    avgLatency: '42ms',
    p99Latency: '138ms',
  }
}

export async function getHourlyTraffic(): Promise<HourlyTraffic[]> {
  await delay(rand(200, 400))
  return [
    { hour: '06:00', requests: 3200 },
    { hour: '07:00', requests: 8500 },
    { hour: '08:00', requests: 15400 },
    { hour: '09:00', requests: 22800 },
    { hour: '10:00', requests: 26100 },
    { hour: '11:00', requests: 24500 },
    { hour: '12:00', requests: 18900 },
  ]
}

export async function getRecentErrors(): Promise<RecentError[]> {
  await delay(rand(200, 400))
  return [
    { key: '1', time: '12:34:21', model: 'demand-forecaster', errorCode: 503, errorMessage: 'Service Unavailable - 模型副本扩容中' },
    { key: '2', time: '12:28:05', model: 'sentiment-analyzer', errorCode: 429, errorMessage: 'Rate Limit Exceeded - QPS 超过阈值 4000' },
    { key: '3', time: '12:15:33', model: 'churn-predictor', errorCode: 504, errorMessage: 'Gateway Timeout - 推理耗时超过 5s' },
    { key: '4', time: '11:58:12', model: 'equipment-fault-predictor', errorCode: 400, errorMessage: 'Bad Request - 输入特征维度不匹配 (expected 128, got 64)' },
    { key: '5', time: '11:42:07', model: 'purchase-order-classifier', errorCode: 500, errorMessage: 'Internal Error - CUDA OOM on replica-2' },
  ]
}
