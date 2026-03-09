import type { EvalTask, EvalSample, EvalComparison, EvalTaskType } from '../types/modelEvaluation'
import { delay, rand } from './mockConfig'

const MOCK_TASKS: EvalTask[] = [
  {
    key: '1', name: 'eval-purchase-order-v3', modelName: 'purchase-order-classifier', modelVersion: 'v3.2',
    datasetName: '采购订单测试集-2025Q1', taskType: 'classification', status: 'Completed', progress: 100,
    accuracy: 95.3, precision: 94.8, recall: 95.7, f1: 95.2,
    totalSamples: 2000, evalSamples: 2000, duration: '12m 34s', createdBy: '李工', createdAt: '2025-03-08',
  },
  {
    key: '2', name: 'eval-equipment-fault-v2', modelName: 'equipment-fault-predictor', modelVersion: 'v2.1',
    datasetName: '设备故障分类测试集', taskType: 'classification', status: 'Completed', progress: 100,
    accuracy: 92.7, precision: 91.5, recall: 93.2, f1: 92.3,
    totalSamples: 1500, evalSamples: 1500, duration: '8m 45s', createdBy: '张工', createdAt: '2025-03-08',
  },
  {
    key: '3', name: 'eval-sentiment-v1', modelName: 'sentiment-analyzer', modelVersion: 'v1.4',
    datasetName: '客户评论情感标注集', taskType: 'classification', status: 'Running', progress: 64,
    accuracy: undefined, precision: undefined, recall: undefined, f1: undefined,
    totalSamples: 3000, evalSamples: 1920, duration: '6m 12s', createdBy: '赵工', createdAt: '2025-03-09',
  },
  {
    key: '4', name: 'eval-demand-forecast-v4', modelName: 'demand-forecaster', modelVersion: 'v4.0',
    datasetName: '库存需求回归测试集', taskType: 'generation', status: 'Completed', progress: 100,
    accuracy: 88.4, precision: 87.9, recall: 88.8, f1: 88.3, bleu: 72.1, rouge: 78.5,
    totalSamples: 1200, evalSamples: 1200, duration: '5m 20s', createdBy: '王工', createdAt: '2025-03-07',
  },
  {
    key: '5', name: 'eval-churn-v2', modelName: 'churn-predictor', modelVersion: 'v2.0',
    datasetName: '客户流失预测测试集', taskType: 'classification', status: 'Failed', progress: 37,
    accuracy: undefined, precision: undefined, recall: undefined, f1: undefined,
    totalSamples: 1800, evalSamples: 666, duration: '3m 10s', createdBy: '李工', createdAt: '2025-03-09',
  },
  {
    key: '6', name: 'eval-supplier-risk-v1', modelName: 'supplier-risk-scorer', modelVersion: 'v1.2',
    datasetName: '供应商风险评估测试集', taskType: 'qa', status: 'Pending', progress: 0,
    totalSamples: 800, evalSamples: 0, duration: '—', createdBy: '王工', createdAt: '2025-03-09',
  },
]

const MOCK_SAMPLES: EvalSample[] = [
  { key: 's1', input: '设备编号: EQ-3021, 振动频率: 45Hz, 温度: 82°C, 运行时长: 12400h', expectedOutput: '轴承磨损', actualOutput: '轴承磨损', isCorrect: true, confidence: 0.96 },
  { key: 's2', input: '设备编号: EQ-1055, 振动频率: 12Hz, 温度: 35°C, 运行时长: 800h', expectedOutput: '正常', actualOutput: '正常', isCorrect: true, confidence: 0.99 },
  { key: 's3', input: '设备编号: EQ-2078, 振动频率: 68Hz, 温度: 105°C, 运行时长: 18200h', expectedOutput: '电机过热', actualOutput: '电机过热', isCorrect: true, confidence: 0.93 },
  { key: 's4', input: '设备编号: EQ-4012, 振动频率: 30Hz, 温度: 72°C, 运行时长: 9600h', expectedOutput: '润滑不足', actualOutput: '轴承磨损', isCorrect: false, confidence: 0.61 },
  { key: 's5', input: '设备编号: EQ-1190, 振动频率: 55Hz, 温度: 95°C, 运行时长: 15000h', expectedOutput: '齿轮故障', actualOutput: '齿轮故障', isCorrect: true, confidence: 0.88 },
  { key: 's6', input: '设备编号: EQ-3340, 振动频率: 8Hz, 温度: 28°C, 运行时长: 200h', expectedOutput: '正常', actualOutput: '正常', isCorrect: true, confidence: 0.98 },
  { key: 's7', input: '设备编号: EQ-2291, 振动频率: 42Hz, 温度: 88°C, 运行时长: 13500h', expectedOutput: '电机过热', actualOutput: '轴承磨损', isCorrect: false, confidence: 0.52 },
  { key: 's8', input: '设备编号: EQ-5010, 振动频率: 60Hz, 温度: 110°C, 运行时长: 20000h', expectedOutput: '电机过热', actualOutput: '电机过热', isCorrect: true, confidence: 0.95 },
  { key: 's9', input: '设备编号: EQ-1423, 振动频率: 25Hz, 温度: 65°C, 运行时长: 7200h', expectedOutput: '正常', actualOutput: '润滑不足', isCorrect: false, confidence: 0.48 },
  { key: 's10', input: '设备编号: EQ-3678, 振动频率: 50Hz, 温度: 92°C, 运行时长: 16800h', expectedOutput: '齿轮故障', actualOutput: '齿轮故障', isCorrect: true, confidence: 0.91 },
]

const MOCK_COMPARISONS: Record<string, EvalComparison[]> = {
  'equipment-fault-predictor': [
    { modelName: 'equipment-fault-predictor', version: 'v1.0', accuracy: 85.2, f1: 84.6, precision: 83.9, recall: 85.3, latency: '45ms', params: '12M' },
    { modelName: 'equipment-fault-predictor', version: 'v1.5', accuracy: 89.1, f1: 88.7, precision: 88.2, recall: 89.3, latency: '42ms', params: '15M' },
    { modelName: 'equipment-fault-predictor', version: 'v2.0', accuracy: 91.4, f1: 91.0, precision: 90.5, recall: 91.8, latency: '38ms', params: '18M' },
    { modelName: 'equipment-fault-predictor', version: 'v2.1', accuracy: 92.7, f1: 92.3, precision: 91.5, recall: 93.2, latency: '36ms', params: '18M' },
  ],
  'purchase-order-classifier': [
    { modelName: 'purchase-order-classifier', version: 'v2.0', accuracy: 90.1, f1: 89.8, precision: 89.5, recall: 90.2, latency: '28ms', params: '8M' },
    { modelName: 'purchase-order-classifier', version: 'v3.0', accuracy: 93.6, f1: 93.2, precision: 92.8, recall: 93.7, latency: '25ms', params: '10M' },
    { modelName: 'purchase-order-classifier', version: 'v3.2', accuracy: 95.3, f1: 95.2, precision: 94.8, recall: 95.7, latency: '24ms', params: '10M' },
  ],
}

export async function listEvalTasks(): Promise<EvalTask[]> {
  await delay(rand(300, 600))
  return MOCK_TASKS
}

export async function getEvalDetail(key: string): Promise<EvalTask | undefined> {
  await delay(rand(200, 400))
  return MOCK_TASKS.find(t => t.key === key)
}

export async function getEvalSamples(_key: string): Promise<EvalSample[]> {
  await delay(rand(300, 500))
  return MOCK_SAMPLES
}

export async function getEvalComparisons(modelName: string): Promise<EvalComparison[]> {
  await delay(rand(200, 400))
  return MOCK_COMPARISONS[modelName] ?? MOCK_COMPARISONS['equipment-fault-predictor']!
}

export async function createEvalTask(input: {
  name: string
  modelName: string
  modelVersion: string
  datasetName: string
  taskType: EvalTaskType
  evalSamples: number
}): Promise<EvalTask> {
  await delay(rand(400, 700))
  return {
    key: `eval-${Date.now()}`,
    ...input,
    status: 'Pending',
    progress: 0,
    totalSamples: input.evalSamples,
    duration: '—',
    createdBy: '当前用户',
    createdAt: new Date().toISOString().slice(0, 10),
  }
}

export interface ConfusionMatrixData {
  labels: string[]
  data: number[][]
}

export async function getConfusionMatrix(key: string): Promise<ConfusionMatrixData> {
  await delay(rand(300, 500))
  const matrices: Record<string, ConfusionMatrixData> = {
    '1': {
      labels: ['常规采购', '紧急采购', '框架协议', '竞价采购'],
      data: [
        [312, 5, 2, 1],
        [3, 289, 4, 2],
        [1, 3, 305, 0],
        [2, 1, 0, 278],
      ],
    },
    '2': {
      labels: ['正常', '轴承磨损', '电机过热', '齿轮故障', '润滑不足'],
      data: [
        [285, 3, 1, 0, 2],
        [5, 268, 2, 3, 8],
        [1, 4, 290, 1, 0],
        [0, 2, 1, 275, 1],
        [2, 12, 0, 1, 234],
      ],
    },
    '4': {
      labels: ['需求增长', '需求平稳', '需求下降'],
      data: [
        [198, 8, 3],
        [5, 312, 7],
        [2, 10, 185],
      ],
    },
  }
  return matrices[key] ?? matrices['2']!
}

export interface EvalStats {
  totalTasks: number
  completed: number
  running: number
  avgAccuracy: string
  avgF1: string
}

export async function getEvalStats(): Promise<EvalStats> {
  await delay(rand(200, 400))
  const completed = MOCK_TASKS.filter(t => t.status === 'Completed')
  const accuracies = completed.map(t => t.accuracy).filter((v): v is number => v !== undefined)
  const f1s = completed.map(t => t.f1).filter((v): v is number => v !== undefined)
  return {
    totalTasks: MOCK_TASKS.length,
    completed: completed.length,
    running: MOCK_TASKS.filter(t => t.status === 'Running').length,
    avgAccuracy: accuracies.length > 0 ? (accuracies.reduce((a, b) => a + b, 0) / accuracies.length).toFixed(1) + '%' : '—',
    avgF1: f1s.length > 0 ? (f1s.reduce((a, b) => a + b, 0) / f1s.length).toFixed(1) + '%' : '—',
  }
}
