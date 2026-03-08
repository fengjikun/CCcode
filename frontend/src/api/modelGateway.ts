import type { RegisteredModel, GatewayRoute } from '../types/modelGateway'

const MOCK_MODELS: RegisteredModel[] = [
  { key: '1', name: 'purchase-order-classifier', displayName: '采购订单分类', version: 'v2.1.0', stage: 'Production', accuracy: '95.3%', framework: 'PyTorch', endpoint: '/api/v1/models/purchase-classifier', qps: 4200, latencyP50: '32ms', latencyP99: '85ms', lastDeployed: '2025-03-08' },
  { key: '2', name: 'equipment-fault-predictor', displayName: '设备故障预测', version: 'v1.8.2', stage: 'Production', accuracy: '92.7%', framework: 'TensorFlow', endpoint: '/api/v1/models/fault-predictor', qps: 2800, latencyP50: '45ms', latencyP99: '120ms', lastDeployed: '2025-03-07' },
  { key: '3', name: 'demand-forecaster', displayName: '需求预测', version: 'v3.0.1', stage: 'Staging', accuracy: '88.4%', framework: 'scikit-learn', endpoint: '/api/v1/models/demand-forecast', qps: 560, latencyP50: '18ms', latencyP99: '42ms', lastDeployed: '2025-03-06' },
  { key: '4', name: 'sentiment-analyzer', displayName: '情感分析', version: 'v1.2.0', stage: 'Production', accuracy: '91.2%', framework: 'Transformers', endpoint: '/api/v1/models/sentiment', qps: 3600, latencyP50: '55ms', latencyP99: '150ms', lastDeployed: '2025-03-05' },
  { key: '5', name: 'churn-predictor', displayName: '流失预测', version: 'v2.0.0', stage: 'Canary', accuracy: '89.1%', framework: 'PyTorch', endpoint: '/api/v1/models/churn', qps: 180, latencyP50: '28ms', latencyP99: '65ms', lastDeployed: '2025-03-08' },
  { key: '6', name: 'supplier-risk-scorer', displayName: '供应商风险评分', version: 'v1.1.0', stage: 'Production', accuracy: '87.2%', framework: 'scikit-learn', endpoint: '/api/v1/models/supplier-risk', qps: 420, latencyP50: '12ms', latencyP99: '28ms', lastDeployed: '2025-03-04' },
  { key: '7', name: 'quality-classifier', displayName: '质量分类', version: 'v1.0.0', stage: 'Archived', accuracy: '83.5%', framework: 'PyTorch', endpoint: '/api/v1/models/quality', qps: 0, latencyP50: '—', latencyP99: '—', lastDeployed: '2025-02-15' },
]

const MOCK_ROUTES: GatewayRoute[] = [
  { key: '1', path: '/api/v1/models/purchase-classifier', model: 'purchase-order-classifier', version: 'v2.1.0', weight: 100, rateLimit: 5000, status: 'Active' },
  { key: '2', path: '/api/v1/models/fault-predictor', model: 'equipment-fault-predictor', version: 'v1.8.2', weight: 100, rateLimit: 3000, status: 'Active' },
  { key: '3', path: '/api/v1/models/churn', model: 'churn-predictor', version: 'v1.5.0', weight: 90, rateLimit: 1000, status: 'Active' },
  { key: '4', path: '/api/v1/models/churn', model: 'churn-predictor', version: 'v2.0.0', weight: 10, rateLimit: 1000, status: 'Active' },
  { key: '5', path: '/api/v1/models/sentiment', model: 'sentiment-analyzer', version: 'v1.2.0', weight: 100, rateLimit: 4000, status: 'Active' },
  { key: '6', path: '/api/v1/models/supplier-risk', model: 'supplier-risk-scorer', version: 'v1.1.0', weight: 100, rateLimit: 500, status: 'Active' },
]

export function listModels(): RegisteredModel[] {
  return MOCK_MODELS
}

export function listRoutes(): GatewayRoute[] {
  return MOCK_ROUTES
}

export interface GatewayStats {
  deployedModels: number
  totalQps: string
  avgLatency: string
  availability: string
  productionCount: number
  canaryCount: number
}

export function getGatewayStats(): GatewayStats {
  const active = MOCK_MODELS.filter(m => m.stage !== 'Archived')
  const totalQps = active.reduce((s, m) => s + m.qps, 0)
  return {
    deployedModels: active.length,
    totalQps: totalQps >= 1000 ? `${(totalQps / 1000).toFixed(1)}K` : `${totalQps}`,
    avgLatency: '45ms',
    availability: '99.8%',
    productionCount: MOCK_MODELS.filter(m => m.stage === 'Production').length,
    canaryCount: MOCK_MODELS.filter(m => m.stage === 'Canary').length,
  }
}
