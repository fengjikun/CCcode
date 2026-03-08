import type { TrainingJob, TrainingProject, Framework } from '../types/modelTraining'

const MOCK_JOBS: TrainingJob[] = [
  { key: '1', name: 'run-2025030801', projectName: 'purchase-order-classifier', dataSource: 'ontology://PurchaseOrder/output', framework: 'PyTorch', gpu: 'V100 - 16GB', status: 'Completed', progress: 100, epoch: '50/50', bestMetric: '95.3%', metricName: 'Accuracy', startedAt: '2025-03-08 09:00', duration: '2h 15m', createdBy: '李工' },
  { key: '2', name: 'run-2025030802', projectName: 'equipment-fault-predictor', dataSource: 'ontology://Equipment/output', framework: 'TensorFlow', gpu: 'A100 - 40GB', status: 'Running', progress: 68, epoch: '34/50', bestMetric: '91.8%', metricName: 'F1-Score', startedAt: '2025-03-08 11:30', duration: '1h 42m', createdBy: '张工' },
  { key: '3', name: 'run-2025030803', projectName: 'demand-forecaster', dataSource: 'ontology://Inventory/output', framework: 'scikit-learn', gpu: 'CPU Only', status: 'Completed', progress: 100, epoch: '—', bestMetric: '88.4%', metricName: 'MAPE', startedAt: '2025-03-08 08:00', duration: '45m', createdBy: '王工' },
  { key: '4', name: 'run-2025030804', projectName: 'sentiment-analyzer', dataSource: 'ontology://Customer/output', framework: 'Transformers', gpu: 'A100 - 40GB', status: 'Queued', progress: 0, epoch: '0/30', bestMetric: '—', metricName: 'Accuracy', startedAt: '—', duration: '—', createdBy: '赵工' },
  { key: '5', name: 'run-2025030705', projectName: 'churn-predictor', dataSource: 'ontology://Customer/output', framework: 'PyTorch', gpu: 'V100 - 16GB', status: 'Failed', progress: 42, epoch: '21/50', bestMetric: '—', metricName: 'AUC', startedAt: '2025-03-07 22:00', duration: '1h 10m', createdBy: '李工' },
  { key: '6', name: 'run-2025030706', projectName: 'supplier-risk-scorer', dataSource: 'ontology://Supplier/output', framework: 'scikit-learn', gpu: 'CPU Only', status: 'Completed', progress: 100, epoch: '—', bestMetric: '87.2%', metricName: 'AUC', startedAt: '2025-03-07 14:00', duration: '32m', createdBy: '王工' },
]

const MOCK_PROJECTS: TrainingProject[] = [
  { key: '1', name: 'purchase-order-classifier', description: '采购订单分类模型', dataSource: 'ontology://PurchaseOrder/output', framework: 'PyTorch', gpu: 'V100 - 16GB', jobs: 12, bestMetric: '95.3%', createdAt: '2024-11-15' },
  { key: '2', name: 'equipment-fault-predictor', description: '设备故障预测模型', dataSource: 'ontology://Equipment/output', framework: 'TensorFlow', gpu: 'A100 - 40GB', jobs: 8, bestMetric: '92.7%', createdAt: '2024-12-01' },
  { key: '3', name: 'demand-forecaster', description: '需求预测模型', dataSource: 'ontology://Inventory/output', framework: 'scikit-learn', gpu: 'CPU Only', jobs: 5, bestMetric: '88.4%', createdAt: '2025-01-10' },
  { key: '4', name: 'sentiment-analyzer', description: '客户情感分析模型', dataSource: 'ontology://Customer/output', framework: 'Transformers', gpu: 'A100 - 40GB', jobs: 3, bestMetric: '91.2%', createdAt: '2025-02-01' },
  { key: '5', name: 'churn-predictor', description: '客户流失预测模型', dataSource: 'ontology://Customer/output', framework: 'PyTorch', gpu: 'V100 - 16GB', jobs: 6, bestMetric: '85.6%', createdAt: '2025-01-20' },
  { key: '6', name: 'supplier-risk-scorer', description: '供应商风险评估模型', dataSource: 'ontology://Supplier/output', framework: 'scikit-learn', gpu: 'CPU Only', jobs: 4, bestMetric: '87.2%', createdAt: '2025-02-15' },
]

export function listTrainingJobs(): TrainingJob[] {
  return MOCK_JOBS
}

export function listTrainingProjects(): TrainingProject[] {
  return MOCK_PROJECTS
}

export function createTrainingProject(input: {
  name: string
  description: string
  dataSource: string
  framework: Framework
  gpu: string
}): TrainingProject {
  return {
    key: `tp-${Date.now()}`,
    ...input,
    jobs: 0,
    bestMetric: '—',
    createdAt: new Date().toISOString().slice(0, 10),
  }
}

export interface TrainingStats {
  projects: number
  totalJobs: number
  running: number
  completed: number
  gpuUtilization: string
  avgTrainTime: string
}

export function getTrainingStats(): TrainingStats {
  return {
    projects: MOCK_PROJECTS.length,
    totalJobs: MOCK_JOBS.length,
    running: MOCK_JOBS.filter(j => j.status === 'Running').length,
    completed: MOCK_JOBS.filter(j => j.status === 'Completed').length,
    gpuUtilization: '72%',
    avgTrainTime: '1h 28m',
  }
}
