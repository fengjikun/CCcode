import type { TrainingJob, TrainingProject, Framework, TrainMethod, BaseModel } from '../types/modelTraining'

/** 生成模拟 loss 曲线：从 startVal 开始递减，带噪声 */
function generateLossCurve(points: number, startVal: number, endVal: number): number[] {
  const curve: number[] = []
  for (let i = 0; i < points; i++) {
    const ratio = i / (points - 1)
    const base = startVal - (startVal - endVal) * (1 - Math.exp(-3 * ratio))
    const noise = (Math.random() - 0.5) * 0.04 * (1 - ratio)
    curve.push(Math.max(0.01, parseFloat((base + noise).toFixed(4))))
  }
  return curve
}

/** 生成学习率 warmup + cosine decay 曲线 */
function generateLrCurve(points: number, peakLr: number, warmupRatio: number): number[] {
  const curve: number[] = []
  const warmupSteps = Math.floor(points * warmupRatio)
  for (let i = 0; i < points; i++) {
    let lr: number
    if (i < warmupSteps) {
      lr = peakLr * (i / warmupSteps)
    } else {
      const decay = (i - warmupSteps) / (points - warmupSteps)
      lr = peakLr * 0.5 * (1 + Math.cos(Math.PI * decay))
    }
    curve.push(parseFloat(lr.toExponential(2)))
  }
  return curve
}

function generateLogs(jobName: string, status: string, epoch: string, totalSteps: number): string[] {
  const lines: string[] = [
    `[2025-03-08 09:00:01] INFO  Initializing training environment...`,
    `[2025-03-08 09:00:02] INFO  Loading base model weights from checkpoint...`,
    `[2025-03-08 09:00:05] INFO  Model loaded successfully. Parameters: 7.2B (trainable: 18.4M via LoRA)`,
    `[2025-03-08 09:00:06] INFO  Loading dataset: purchase_orders_v3 (24,580 samples)`,
    `[2025-03-08 09:00:08] INFO  Dataset split: train=19,664 / val=2,458 / test=2,458`,
    `[2025-03-08 09:00:08] INFO  Hyperparameters: lr=2e-5, batch_size=16, warmup=100, max_seq_len=2048`,
    `[2025-03-08 09:00:09] INFO  Starting training for ${epoch.split('/')[1] || 50} epochs (${totalSteps} steps)...`,
    `[2025-03-08 09:00:10] INFO  [Epoch 1/50] Step 100/25000 | loss=2.3412 | lr=2.00e-05 | GPU mem=12.4/16.0 GB`,
    `[2025-03-08 09:15:30] INFO  [Epoch 5/50] Step 2500/25000 | loss=1.2845 | lr=1.95e-05 | GPU mem=12.6/16.0 GB`,
    `[2025-03-08 09:30:45] INFO  [Epoch 10/50] Step 5000/25000 | loss=0.8234 | lr=1.80e-05 | GPU mem=12.5/16.0 GB`,
    `[2025-03-08 09:45:12] INFO  [Epoch 15/50] Step 7500/25000 | loss=0.5621 | lr=1.55e-05 | GPU mem=12.4/16.0 GB`,
    `[2025-03-08 10:00:28] INFO  Checkpoint saved: models/checkpoint-epoch15-loss0.5621.pt`,
  ]

  if (status === 'Running') {
    lines.push(`[2025-03-08 10:15:43] INFO  [Epoch 20/50] Step 10000/25000 | loss=0.4102 | lr=1.25e-05 | GPU mem=12.6/16.0 GB`)
    lines.push(`[2025-03-08 10:30:55] INFO  Training in progress... ETA: 1h 12m`)
  } else if (status === 'Completed') {
    lines.push(`[2025-03-08 11:00:00] INFO  [Epoch 50/50] Step 25000/25000 | loss=0.1245 | lr=1.00e-07 | GPU mem=12.4/16.0 GB`)
    lines.push(`[2025-03-08 11:00:01] INFO  Training completed. Best val_loss=0.1892 at epoch 47`)
    lines.push(`[2025-03-08 11:00:02] INFO  Final model saved: models/${jobName}-final.pt`)
  } else if (status === 'Failed') {
    lines.push(`[2025-03-08 10:15:43] ERROR CUDA out of memory. Tried to allocate 2.4 GB. GPU 0 has 0.3 GB free.`)
    lines.push(`[2025-03-08 10:15:43] ERROR Training terminated due to OOM error. Consider reducing batch_size or max_seq_len.`)
  }

  return lines
}

const MOCK_JOBS: TrainingJob[] = [
  {
    key: '1', name: 'run-2025030801', projectName: 'purchase-order-classifier',
    dataSource: 'ontology://PurchaseOrder/output', framework: 'PyTorch', gpu: 'V100 - 16GB',
    status: 'Completed', progress: 100, epoch: '50/50', bestMetric: '95.3%', metricName: 'Accuracy',
    startedAt: '2025-03-08 09:00', duration: '2h 15m', createdBy: '李工',
    learningRate: 2e-5, batchSize: 16, warmupSteps: 100, totalSteps: 25000, currentStep: 25000,
    trainLoss: generateLossCurve(50, 2.35, 0.12),
    valLoss: generateLossCurve(50, 2.50, 0.19),
    lrHistory: generateLrCurve(50, 2e-5, 0.04),
    gpuMemUsage: '12.4/16.0 GB', gpuUtil: '92%',
    logs: generateLogs('run-2025030801', 'Completed', '50/50', 25000),
  },
  {
    key: '2', name: 'run-2025030802', projectName: 'equipment-fault-predictor',
    dataSource: 'ontology://Equipment/output', framework: 'TensorFlow', gpu: 'A100 - 40GB',
    status: 'Running', progress: 68, epoch: '34/50', bestMetric: '91.8%', metricName: 'F1-Score',
    startedAt: '2025-03-08 11:30', duration: '1h 42m', createdBy: '张工',
    learningRate: 3e-5, batchSize: 32, warmupSteps: 200, totalSteps: 15000, currentStep: 10200,
    trainLoss: generateLossCurve(34, 2.10, 0.38),
    valLoss: generateLossCurve(34, 2.28, 0.45),
    lrHistory: generateLrCurve(34, 3e-5, 0.06),
    gpuMemUsage: '28.6/40.0 GB', gpuUtil: '89%',
    logs: generateLogs('run-2025030802', 'Running', '34/50', 15000),
  },
  {
    key: '3', name: 'run-2025030803', projectName: 'demand-forecaster',
    dataSource: 'ontology://Inventory/output', framework: 'scikit-learn', gpu: 'CPU Only',
    status: 'Completed', progress: 100, epoch: '—', bestMetric: '88.4%', metricName: 'MAPE',
    startedAt: '2025-03-08 08:00', duration: '45m', createdBy: '王工',
    learningRate: 1e-3, batchSize: 64, warmupSteps: 0, totalSteps: 5000, currentStep: 5000,
    trainLoss: generateLossCurve(50, 1.80, 0.22),
    valLoss: generateLossCurve(50, 1.95, 0.28),
    lrHistory: generateLrCurve(50, 1e-3, 0.02),
    gpuMemUsage: '—', gpuUtil: '—',
    logs: generateLogs('run-2025030803', 'Completed', '—', 5000),
  },
  {
    key: '4', name: 'run-2025030804', projectName: 'sentiment-analyzer',
    dataSource: 'ontology://Customer/output', framework: 'Transformers', gpu: 'A100 - 40GB',
    status: 'Queued', progress: 0, epoch: '0/30', bestMetric: '—', metricName: 'Accuracy',
    startedAt: '—', duration: '—', createdBy: '赵工',
    learningRate: 2e-5, batchSize: 8, warmupSteps: 50, totalSteps: 18000, currentStep: 0,
    trainLoss: [], valLoss: [], lrHistory: [],
    gpuMemUsage: '—', gpuUtil: '—',
    logs: ['[2025-03-08 12:00:00] INFO  Job queued. Waiting for GPU resources...'],
  },
  {
    key: '5', name: 'run-2025030705', projectName: 'churn-predictor',
    dataSource: 'ontology://Customer/output', framework: 'PyTorch', gpu: 'V100 - 16GB',
    status: 'Failed', progress: 42, epoch: '21/50', bestMetric: '—', metricName: 'AUC',
    startedAt: '2025-03-07 22:00', duration: '1h 10m', createdBy: '李工',
    learningRate: 5e-5, batchSize: 32, warmupSteps: 100, totalSteps: 20000, currentStep: 8400,
    trainLoss: generateLossCurve(21, 2.20, 0.65),
    valLoss: generateLossCurve(21, 2.40, 0.72),
    lrHistory: generateLrCurve(21, 5e-5, 0.05),
    gpuMemUsage: '15.8/16.0 GB', gpuUtil: '98%',
    logs: generateLogs('run-2025030705', 'Failed', '21/50', 20000),
  },
  {
    key: '6', name: 'run-2025030706', projectName: 'supplier-risk-scorer',
    dataSource: 'ontology://Supplier/output', framework: 'scikit-learn', gpu: 'CPU Only',
    status: 'Completed', progress: 100, epoch: '—', bestMetric: '87.2%', metricName: 'AUC',
    startedAt: '2025-03-07 14:00', duration: '32m', createdBy: '王工',
    learningRate: 1e-4, batchSize: 64, warmupSteps: 0, totalSteps: 3000, currentStep: 3000,
    trainLoss: generateLossCurve(50, 1.60, 0.18),
    valLoss: generateLossCurve(50, 1.75, 0.24),
    lrHistory: generateLrCurve(50, 1e-4, 0.02),
    gpuMemUsage: '—', gpuUtil: '—',
    logs: generateLogs('run-2025030706', 'Completed', '—', 3000),
  },
]

const MOCK_PROJECTS: TrainingProject[] = [
  { key: '1', name: 'purchase-order-classifier', description: '采购订单分类模型', dataSource: 'ontology://PurchaseOrder/output', framework: 'PyTorch', gpu: 'V100 - 16GB', jobs: 12, bestMetric: '95.3%', createdAt: '2024-11-15', trainMethod: 'lora', baseModel: 'DeepSeek-V3', datasetName: 'purchase_orders_v3', hyperParams: { learningRate: 2e-5, batchSize: 16, epochs: 50, warmupSteps: 100, maxSeqLen: 2048 } },
  { key: '2', name: 'equipment-fault-predictor', description: '设备故障预测模型', dataSource: 'ontology://Equipment/output', framework: 'TensorFlow', gpu: 'A100 - 40GB', jobs: 8, bestMetric: '92.7%', createdAt: '2024-12-01', trainMethod: 'qlora', baseModel: 'Qwen-72B', datasetName: 'equipment_sensors_v2', hyperParams: { learningRate: 3e-5, batchSize: 32, epochs: 50, warmupSteps: 200, maxSeqLen: 4096 } },
  { key: '3', name: 'demand-forecaster', description: '需求预测模型', dataSource: 'ontology://Inventory/output', framework: 'scikit-learn', gpu: 'CPU Only', jobs: 5, bestMetric: '88.4%', createdAt: '2025-01-10', trainMethod: 'full', baseModel: 'GLM-4', datasetName: 'inventory_demand_v1', hyperParams: { learningRate: 1e-3, batchSize: 64, epochs: 100, warmupSteps: 0, maxSeqLen: 512 } },
  { key: '4', name: 'sentiment-analyzer', description: '客户情感分析模型', dataSource: 'ontology://Customer/output', framework: 'Transformers', gpu: 'A100 - 40GB', jobs: 3, bestMetric: '91.2%', createdAt: '2025-02-01', trainMethod: 'lora', baseModel: 'DeepSeek-R1', datasetName: 'customer_reviews_v4', hyperParams: { learningRate: 2e-5, batchSize: 8, epochs: 30, warmupSteps: 50, maxSeqLen: 2048 } },
  { key: '5', name: 'churn-predictor', description: '客户流失预测模型', dataSource: 'ontology://Customer/output', framework: 'PyTorch', gpu: 'V100 - 16GB', jobs: 6, bestMetric: '85.6%', createdAt: '2025-01-20', trainMethod: 'qlora', baseModel: 'Llama-3.1-70B', datasetName: 'customer_churn_v2', hyperParams: { learningRate: 5e-5, batchSize: 32, epochs: 50, warmupSteps: 100, maxSeqLen: 1024 } },
  { key: '6', name: 'supplier-risk-scorer', description: '供应商风险评估模型', dataSource: 'ontology://Supplier/output', framework: 'scikit-learn', gpu: 'CPU Only', jobs: 4, bestMetric: '87.2%', createdAt: '2025-02-15', trainMethod: 'full', baseModel: 'GLM-4', datasetName: 'supplier_data_v3', hyperParams: { learningRate: 1e-4, batchSize: 64, epochs: 80, warmupSteps: 0, maxSeqLen: 512 } },
]

export function listTrainingJobs(): TrainingJob[] {
  return MOCK_JOBS
}

export function listTrainingProjects(): TrainingProject[] {
  return MOCK_PROJECTS
}

export function getJobDetail(key: string): TrainingJob | undefined {
  return MOCK_JOBS.find(j => j.key === key)
}

export function startTraining(projectKey: string): TrainingJob {
  const project = MOCK_PROJECTS.find(p => p.key === projectKey)
  const newJob: TrainingJob = {
    key: `job-${Date.now()}`,
    name: `run-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(MOCK_JOBS.length + 1).padStart(2, '0')}`,
    projectName: project?.name ?? 'unknown-project',
    dataSource: project?.dataSource ?? '',
    framework: project?.framework ?? 'PyTorch',
    gpu: project?.gpu ?? 'V100 - 16GB',
    status: 'Running',
    progress: 0,
    epoch: `0/${project?.hyperParams.epochs ?? 50}`,
    bestMetric: '—',
    metricName: 'Accuracy',
    startedAt: new Date().toLocaleString('zh-CN'),
    duration: '0m',
    createdBy: '当前用户',
    learningRate: project?.hyperParams.learningRate ?? 2e-5,
    batchSize: project?.hyperParams.batchSize ?? 16,
    warmupSteps: project?.hyperParams.warmupSteps ?? 100,
    totalSteps: 10000,
    currentStep: 0,
    trainLoss: [],
    valLoss: [],
    lrHistory: [],
    gpuMemUsage: '0.0/16.0 GB',
    gpuUtil: '0%',
    logs: [`[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] INFO  Training job started. Initializing...`],
  }
  MOCK_JOBS.unshift(newJob)
  return newJob
}

export function stopTraining(jobKey: string): TrainingJob | undefined {
  const job = MOCK_JOBS.find(j => j.key === jobKey)
  if (job) {
    job.status = 'Stopped'
    job.logs.push(`[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] WARN  Training stopped by user.`)
  }
  return job
}

export function createTrainingProject(input: {
  name: string
  description: string
  dataSource: string
  framework: Framework
  gpu: string
  baseModel?: BaseModel
  trainMethod?: TrainMethod
  datasetName?: string
  hyperParams?: { learningRate: number; batchSize: number; epochs: number; warmupSteps: number; maxSeqLen: number }
}): TrainingProject {
  const project: TrainingProject = {
    key: `tp-${Date.now()}`,
    name: input.name,
    description: input.description,
    dataSource: input.dataSource,
    framework: input.framework,
    gpu: input.gpu,
    jobs: 0,
    bestMetric: '—',
    createdAt: new Date().toISOString().slice(0, 10),
    trainMethod: input.trainMethod ?? 'lora',
    baseModel: input.baseModel ?? 'DeepSeek-V3',
    datasetName: input.datasetName ?? '',
    hyperParams: input.hyperParams ?? { learningRate: 2e-5, batchSize: 16, epochs: 3, warmupSteps: 100, maxSeqLen: 2048 },
  }
  MOCK_PROJECTS.unshift(project)
  return project
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
