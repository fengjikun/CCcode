import type { EvalTask, EvalSample, EvalComparison, EvalTaskType } from '../types/modelEvaluation'
import { delay, rand } from './mockConfig'

export function buildDefaultEvalTasks(): EvalTask[] {
  return [
    {
      key: 'eval-1',
      name: 'eval-factory-copilot-instruction-v2',
      modelName: 'deepseek-r1-factory-sft',
      modelVersion: 'v2026.03.10',
      modelFamily: 'LLM',
      modality: 'text',
      datasetType: 'conversation',
      capability: 'reasoning',
      datasetName: 'factory_copilot_dialog_sft_v2',
      taskType: 'instruction-following',
      status: 'Completed',
      progress: 100,
      accuracy: 91.8,
      precision: 90.9,
      recall: 92.1,
      f1: 91.5,
      passRate: 91.8,
      winRate: 64.3,
      hallucinationRate: 3.9,
      groundedScore: 88.6,
      totalSamples: 1200,
      evalSamples: 1200,
      duration: '14m 21s',
      createdBy: '模型平台团队',
      createdAt: '2026-03-10',
    },
    {
      key: 'eval-2',
      name: 'eval-inspection-grounded-vqa-v3',
      modelName: 'qwen2.5-vl-inspection-assistant',
      modelVersion: 'v2026.03.09',
      modelFamily: 'VL',
      modality: 'image-text',
      datasetType: 'vqa',
      capability: 'vision-language-understanding',
      datasetName: 'inspection_vqa_v3',
      taskType: 'grounded-vqa',
      status: 'Completed',
      progress: 100,
      accuracy: 88.4,
      precision: 87.6,
      recall: 88.9,
      f1: 88.1,
      passRate: 88.4,
      groundedScore: 90.2,
      ocrScore: 84.2,
      totalSamples: 2400,
      evalSamples: 2400,
      duration: '18m 02s',
      createdBy: '模型平台团队',
      createdAt: '2026-03-10',
    },
    {
      key: 'eval-3',
      name: 'eval-doc-parser-understanding-v1',
      modelName: 'qwen-doc-parser-lora',
      modelVersion: 'v2026.03.08',
      modelFamily: 'VL',
      modality: 'image-text',
      datasetType: 'image-caption',
      capability: 'document-parsing',
      datasetName: 'doc_parse_caption_v2',
      taskType: 'document-understanding',
      status: 'Running',
      progress: 57,
      accuracy: 86.7,
      precision: 85.5,
      recall: 87.1,
      f1: 86.2,
      groundedScore: 87.3,
      docParseScore: 89.7,
      ocrScore: 91.4,
      totalSamples: 1600,
      evalSamples: 912,
      duration: '9m 17s',
      createdBy: '模型平台团队',
      createdAt: '2026-03-10',
    },
    {
      key: 'eval-4',
      name: 'eval-factory-copilot-hallucination-v1',
      modelName: 'factory-copilot-dpo-alignment',
      modelVersion: 'v2026.03.07',
      modelFamily: 'LLM',
      modality: 'text',
      datasetType: 'preference',
      capability: 'chat',
      datasetName: 'factory_safety_preference_v1',
      taskType: 'hallucination',
      status: 'Completed',
      progress: 100,
      accuracy: 94.1,
      precision: 93.4,
      recall: 94.0,
      f1: 93.7,
      passRate: 94.1,
      winRate: 66.2,
      hallucinationRate: 2.8,
      totalSamples: 900,
      evalSamples: 900,
      duration: '7m 44s',
      createdBy: '模型平台团队',
      createdAt: '2026-03-09',
    },
  ]
}

export function buildDefaultEvalSamples(): EvalSample[] {
  return [
    {
      key: 'sample-1',
      modelFamily: 'LLM',
      modality: 'text',
      prompt: '给出处理空压机高温告警的第一步操作。',
      response: '先执行停机前安全确认，并检查冷却回路与风扇状态。',
      judgeVerdict: '通过',
      humanLabel: 'grounded',
      input: '给出处理空压机高温告警的第一步操作。',
      expectedOutput: '先进行安全确认和冷却回路检查。',
      actualOutput: '先执行停机前安全确认，并检查冷却回路与风扇状态。',
      isCorrect: true,
      confidence: 0.95,
    },
    {
      key: 'sample-2',
      modelFamily: 'VL',
      modality: 'image-text',
      prompt: '根据巡检图，说明异常位置。',
      response: '右上区域控制柜出现 92C 告警，散热风扇状态异常。',
      judgeVerdict: '通过',
      humanLabel: 'grounded-vqa',
      input: 'inspection-case-001.png + 图中异常位置是什么？',
      expectedOutput: '温度告警出现在右上区域，且风扇停止。',
      actualOutput: '右上区域控制柜出现 92C 告警，散热风扇状态异常。',
      isCorrect: true,
      confidence: 0.91,
    },
    {
      key: 'sample-3',
      modelFamily: 'VL',
      modality: 'image-text',
      prompt: '阅读检修工单图片并抽取故障现象。',
      response: '伺服驱动过流。',
      judgeVerdict: '待人工复核',
      humanLabel: 'doc-parse',
      input: 'repair-ticket-20260308.jpg + 提取故障现象',
      expectedOutput: '伺服驱动过流',
      actualOutput: '伺服驱动过流',
      isCorrect: true,
      confidence: 0.87,
    },
  ]
}

export function buildDefaultEvalComparisons(): Record<string, EvalComparison[]> {
  return {
    'deepseek-r1-factory-sft': [
      {
        modelName: 'deepseek-r1-factory-sft',
        version: 'v2026.02.28',
        modelFamily: 'LLM',
        modality: 'text',
        accuracy: 88.6,
        f1: 88.0,
        precision: 87.4,
        recall: 88.9,
        passRate: 88.6,
        winRate: 58.1,
        hallucinationRate: 5.6,
        latency: '1.8s',
        params: '32B',
      },
      {
        modelName: 'deepseek-r1-factory-sft',
        version: 'v2026.03.10',
        modelFamily: 'LLM',
        modality: 'text',
        accuracy: 91.8,
        f1: 91.5,
        precision: 90.9,
        recall: 92.1,
        passRate: 91.8,
        winRate: 64.3,
        hallucinationRate: 3.9,
        latency: '1.6s',
        params: '32B',
      },
    ],
    'qwen2.5-vl-inspection-assistant': [
      {
        modelName: 'qwen2.5-vl-inspection-assistant',
        version: 'v2026.03.03',
        modelFamily: 'VL',
        modality: 'image-text',
        accuracy: 84.7,
        f1: 84.1,
        precision: 83.5,
        recall: 84.8,
        passRate: 84.7,
        groundedScore: 86.5,
        latency: '2.4s',
        params: '32B',
      },
      {
        modelName: 'qwen2.5-vl-inspection-assistant',
        version: 'v2026.03.09',
        modelFamily: 'VL',
        modality: 'image-text',
        accuracy: 88.4,
        f1: 88.1,
        precision: 87.6,
        recall: 88.9,
        passRate: 88.4,
        groundedScore: 90.2,
        latency: '2.1s',
        params: '32B',
      },
    ],
  }
}

const MOCK_TASKS: EvalTask[] = buildDefaultEvalTasks()
const MOCK_SAMPLES: EvalSample[] = buildDefaultEvalSamples()
const MOCK_COMPARISONS: Record<string, EvalComparison[]> = buildDefaultEvalComparisons()

export async function listEvalTasks(): Promise<EvalTask[]> {
  await delay(rand(300, 600))
  return MOCK_TASKS
}

export async function getEvalDetail(key: string): Promise<EvalTask | undefined> {
  await delay(rand(200, 400))
  return MOCK_TASKS.find(task => task.key === key)
}

export async function getEvalSamples(_key: string): Promise<EvalSample[]> {
  await delay(rand(300, 500))
  return MOCK_SAMPLES
}

export async function getEvalComparisons(modelName: string): Promise<EvalComparison[]> {
  await delay(rand(200, 400))
  return MOCK_COMPARISONS[modelName] ?? MOCK_COMPARISONS['deepseek-r1-factory-sft']!
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
    modelFamily: input.modelName.includes('vl') || input.modelName.includes('doc') ? 'VL' : 'LLM',
    modality: input.modelName.includes('vl') || input.modelName.includes('doc') ? 'image-text' : 'text',
    datasetType: input.taskType === 'grounded-vqa' || input.taskType === 'document-understanding' ? 'vqa' : 'conversation',
    capability: input.taskType === 'grounded-vqa' ? 'vision-language-understanding' : 'chat',
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

export async function getConfusionMatrix(_key: string): Promise<ConfusionMatrixData> {
  await delay(rand(300, 500))
  return {
    labels: [],
    data: [],
  }
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
  const completed = MOCK_TASKS.filter(task => task.status === 'Completed')
  const accuracies = completed.map(task => task.passRate ?? task.accuracy).filter((value): value is number => value !== undefined)
  const f1s = completed.map(task => task.groundedScore ?? task.f1).filter((value): value is number => value !== undefined)
  return {
    totalTasks: MOCK_TASKS.length,
    completed: completed.length,
    running: MOCK_TASKS.filter(task => task.status === 'Running').length,
    avgAccuracy: accuracies.length > 0 ? `${(accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length).toFixed(1)}%` : '—',
    avgF1: f1s.length > 0 ? `${(f1s.reduce((sum, value) => sum + value, 0) / f1s.length).toFixed(1)}%` : '—',
  }
}
