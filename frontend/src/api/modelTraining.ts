import type { TrainingJob, TrainingProject, Framework, TrainMethod, BaseModel, TrainingStatus } from '../types/modelTraining'
import { delay, rand } from './mockConfig'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function generateLossCurve(points: number, startVal: number, endVal: number): number[] {
  const curve: number[] = []
  for (let i = 0; i < points; i++) {
    const ratio = i / Math.max(points - 1, 1)
    const base = startVal - (startVal - endVal) * (1 - Math.exp(-3 * ratio))
    const noise = (Math.random() - 0.5) * 0.03 * (1 - ratio)
    curve.push(Math.max(0.01, parseFloat((base + noise).toFixed(4))))
  }
  return curve
}

function generateLrCurve(points: number, peakLr: number, warmupRatio: number): number[] {
  const curve: number[] = []
  const warmupSteps = Math.max(1, Math.floor(points * warmupRatio))
  for (let i = 0; i < points; i++) {
    const lr = i < warmupSteps
      ? peakLr * (i / warmupSteps)
      : peakLr * 0.5 * (1 + Math.cos(Math.PI * ((i - warmupSteps) / Math.max(points - warmupSteps, 1))))
    curve.push(parseFloat(lr.toExponential(2)))
  }
  return curve
}

function buildTrainingLogs(job: Pick<TrainingJob, 'name' | 'status' | 'baseModel' | 'datasetName' | 'tokenCount' | 'imageCount' | 'trainStage' | 'totalSteps' | 'gpu'>): string[] {
  const logs = [
    '[2026-03-10 08:00:01] INFO  Initializing distributed training runtime...',
    `[2026-03-10 08:00:04] INFO  Loading base model ${job.baseModel} weights...`,
    `[2026-03-10 08:00:08] INFO  Loading corpus ${job.datasetName} | tokens=${job.tokenCount.toLocaleString()} | images=${job.imageCount.toLocaleString()}`,
    `[2026-03-10 08:00:10] INFO  Preparing ${job.trainStage.toUpperCase()} adapters and optimizer states...`,
    `[2026-03-10 08:00:12] INFO  GPU allocation ready on ${job.gpu}`,
    `[2026-03-10 08:02:11] INFO  Step 120/${job.totalSteps} | train_loss=1.8421 | grad_norm=0.92 | lr=1.50e-05`,
    `[2026-03-10 08:18:35] INFO  Step 980/${job.totalSteps} | eval/judge_pass_rate=0.781 | eval/grounded_score=0.744`,
    `[2026-03-10 08:18:37] INFO  Checkpoint saved: checkpoints/${job.name}/step-980`,
  ]

  if (job.status === 'Running') {
    logs.push(`[2026-03-10 08:42:10] INFO  Step 2180/${job.totalSteps} | tokens/s=5180 | images/s=3.2 | ETA=2h 10m`)
  }
  if (job.status === 'Completed') {
    logs.push(`[2026-03-10 10:12:44] INFO  Final eval complete | judge_pass_rate=0.918 | hallucination_rate=0.039`)
    logs.push(`[2026-03-10 10:12:45] INFO  Final checkpoint merged: checkpoints/${job.name}/final-merged`)
  }
  if (job.status === 'Failed') {
    logs.push('[2026-03-10 08:44:18] ERROR NCCL communicator aborted during all_reduce step')
    logs.push('[2026-03-10 08:44:18] ERROR Training run marked as failed; please retry from latest checkpoint')
  }
  if (job.status === 'Queued') {
    return ['[2026-03-10 11:32:00] INFO  Run queued. Waiting for available H100 worker group...']
  }
  return logs
}

export function buildDefaultTrainingProjects(): TrainingProject[] {
  return [
    {
      key: 'tp-llm-sft',
      name: 'deepseek-r1-factory-sft',
      displayName: 'Factory Copilot SFT',
      description: '工业问答与 SOP 执行助手监督微调项目',
      modelFamily: 'LLM',
      modality: 'text',
      trainStage: 'sft',
      capability: 'reasoning',
      datasetType: 'conversation',
      alignmentTags: ['工业知识增强', '长上下文'],
      dataSource: 'corpus://factory-copilot-dialog-sft-v2',
      framework: 'Transformers',
      gpu: '8 x H100 80GB',
      jobs: 6,
      bestMetric: 'Judge Pass 91.8%',
      createdAt: '2026-02-20',
      trainMethod: 'sft',
      baseModel: 'DeepSeek-R1-Distill-32B',
      datasetName: 'factory_copilot_dialog_sft_v2',
      contextWindow: 32768,
      tokenCount: 148000000,
      imageCount: 0,
      loraRank: 64,
      hyperParams: {
        learningRate: 1.5e-5,
        batchSize: 64,
        epochs: 3,
        warmupSteps: 400,
        maxSeqLen: 32768,
      },
    },
    {
      key: 'tp-vl-qlora',
      name: 'qwen2.5-vl-inspection-assistant',
      displayName: 'Inspection VL Assistant',
      description: '巡检图像问答与缺陷解释多模态微调项目',
      modelFamily: 'VL',
      modality: 'image-text',
      trainStage: 'qlora',
      capability: 'vision-language-understanding',
      datasetType: 'vqa',
      alignmentTags: ['图像理解', '安全对齐'],
      dataSource: 'corpus://inspection-vqa-v3',
      framework: 'Transformers',
      gpu: '4 x H100 80GB',
      jobs: 4,
      bestMetric: 'Grounded VQA 88.4%',
      createdAt: '2026-02-24',
      trainMethod: 'qlora',
      baseModel: 'Qwen2.5-VL-32B-Instruct',
      datasetName: 'inspection_vqa_v3',
      contextWindow: 16384,
      tokenCount: 32000000,
      imageCount: 48000,
      loraRank: 32,
      hyperParams: {
        learningRate: 2e-5,
        batchSize: 24,
        epochs: 2,
        warmupSteps: 300,
        maxSeqLen: 16384,
      },
    },
    {
      key: 'tp-vl-doc',
      name: 'qwen-doc-parser-lora',
      displayName: 'Doc Parser LoRA',
      description: '票据、工单与检修文档解析能力 LoRA 强化项目',
      modelFamily: 'VL',
      modality: 'image-text',
      trainStage: 'lora',
      capability: 'document-parsing',
      datasetType: 'image-caption',
      alignmentTags: ['OCR增强', '文档解析'],
      dataSource: 'corpus://doc-parse-caption-v2',
      framework: 'Transformers',
      gpu: '2 x A100 80GB',
      jobs: 3,
      bestMetric: 'Doc Parse 90.1%',
      createdAt: '2026-03-01',
      trainMethod: 'lora',
      baseModel: 'Qwen2.5-VL-7B-Instruct',
      datasetName: 'doc_parse_caption_v2',
      contextWindow: 8192,
      tokenCount: 21000000,
      imageCount: 125000,
      loraRank: 16,
      hyperParams: {
        learningRate: 2.5e-5,
        batchSize: 16,
        epochs: 3,
        warmupSteps: 180,
        maxSeqLen: 8192,
      },
    },
    {
      key: 'tp-llm-dpo',
      name: 'factory-copilot-dpo-alignment',
      displayName: 'Factory Copilot DPO',
      description: '工业问答拒答边界与事实性偏好对齐项目',
      modelFamily: 'LLM',
      modality: 'text',
      trainStage: 'dpo',
      capability: 'chat',
      datasetType: 'preference',
      alignmentTags: ['安全对齐', '事实性增强'],
      dataSource: 'corpus://factory-safety-preference-v1',
      framework: 'PyTorch',
      gpu: '8 x A100 80GB',
      jobs: 2,
      bestMetric: 'Win Rate 66.2%',
      createdAt: '2026-03-04',
      trainMethod: 'dpo',
      baseModel: 'Qwen2.5-72B-Instruct',
      datasetName: 'factory_safety_preference_v1',
      contextWindow: 32768,
      tokenCount: 42000000,
      imageCount: 0,
      hyperParams: {
        learningRate: 7e-6,
        batchSize: 32,
        epochs: 2,
        warmupSteps: 120,
        maxSeqLen: 32768,
      },
    },
  ]
}

export function buildDefaultTrainingJobs(projects: TrainingProject[] = buildDefaultTrainingProjects()): TrainingJob[] {
  const projectMap = new Map(projects.map(project => [project.key, project]))

  const buildJob = (
    key: string,
    projectKey: string,
    status: TrainingStatus,
    progress: number,
    epoch: string,
    bestMetric: string,
    metricName: string,
    startedAt: string,
    duration: string,
    totalSteps: number,
    currentStep: number,
    gpuMemUsage: string,
    gpuUtil: string,
  ): TrainingJob => {
    const project = projectMap.get(projectKey)!
    const name = `${project.name}-run-${key}`
    return {
      key,
      name,
      projectName: project.name,
      modelFamily: project.modelFamily,
      modality: project.modality,
      trainStage: project.trainStage,
      capability: project.capability,
      datasetType: project.datasetType,
      datasetName: project.datasetName,
      baseModel: project.baseModel,
      alignmentTags: project.alignmentTags,
      checkpoint: `checkpoints/${name}/latest`,
      contextWindow: project.contextWindow,
      loraRank: project.loraRank,
      tokenCount: project.tokenCount,
      imageCount: project.imageCount,
      dataSource: project.dataSource,
      framework: project.framework,
      gpu: project.gpu,
      status,
      progress,
      epoch,
      bestMetric,
      metricName,
      startedAt,
      duration,
      createdBy: '模型平台团队',
      learningRate: project.hyperParams.learningRate,
      batchSize: project.hyperParams.batchSize,
      warmupSteps: project.hyperParams.warmupSteps,
      totalSteps,
      currentStep,
      trainLoss: status === 'Queued' ? [] : generateLossCurve(Math.max(Math.ceil(progress / 2), 12), 2.12, 0.23),
      valLoss: status === 'Queued' ? [] : generateLossCurve(Math.max(Math.ceil(progress / 2), 12), 2.31, 0.29),
      lrHistory: status === 'Queued' ? [] : generateLrCurve(Math.max(Math.ceil(progress / 2), 12), project.hyperParams.learningRate, 0.05),
      gpuMemUsage,
      gpuUtil,
      logs: buildTrainingLogs({
        name,
        status,
        baseModel: project.baseModel,
        datasetName: project.datasetName,
        tokenCount: project.tokenCount,
        imageCount: project.imageCount,
        trainStage: project.trainStage,
        totalSteps,
        gpu: project.gpu,
      }),
    }
  }

  return [
    buildJob('1', 'tp-llm-sft', 'Completed', 100, '3/3', '91.8%', 'Judge Pass Rate', '2026-03-10 08:00', '2h 12m', 4800, 4800, '612/640 GB', '94%'),
    buildJob('2', 'tp-vl-qlora', 'Running', 62, '2/2', '88.4%', 'Grounded VQA', '2026-03-10 11:00', '1h 18m', 3600, 2240, '278/320 GB', '89%'),
    buildJob('3', 'tp-vl-doc', 'Queued', 0, '0/3', '—', 'Doc Parse Score', '—', '—', 4200, 0, '—', '—'),
    buildJob('4', 'tp-llm-dpo', 'Failed', 41, '1/2', '63.1%', 'Win Rate', '2026-03-09 23:10', '54m', 2600, 1066, '498/640 GB', '81%'),
  ]
}

const MOCK_PROJECTS: TrainingProject[] = buildDefaultTrainingProjects()
const MOCK_JOBS: TrainingJob[] = buildDefaultTrainingJobs(MOCK_PROJECTS)

export async function listTrainingJobs(): Promise<TrainingJob[]> {
  await delay(rand(300, 600))
  return clone(MOCK_JOBS)
}

export async function listTrainingProjects(): Promise<TrainingProject[]> {
  await delay(rand(300, 600))
  return clone(MOCK_PROJECTS)
}

export async function getJobDetail(key: string): Promise<TrainingJob | undefined> {
  await delay(rand(200, 400))
  const job = MOCK_JOBS.find(item => item.key === key)
  return job ? clone(job) : undefined
}

export async function startTraining(projectKey: string): Promise<TrainingJob> {
  await delay(rand(500, 1000))
  const project = MOCK_PROJECTS.find(item => item.key === projectKey)
  const newJob: TrainingJob = {
    key: `job-${Date.now()}`,
    name: `${project?.name ?? 'unknown-model'}-run-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`,
    projectName: project?.name ?? 'unknown-model',
    modelFamily: project?.modelFamily ?? 'LLM',
    modality: project?.modality ?? 'text',
    trainStage: project?.trainStage ?? 'sft',
    capability: project?.capability ?? 'chat',
    datasetType: project?.datasetType ?? 'conversation',
    datasetName: project?.datasetName ?? '',
    baseModel: project?.baseModel ?? 'DeepSeek-R1-Distill-32B',
    alignmentTags: project?.alignmentTags ?? ['工业知识增强'],
    checkpoint: `checkpoints/${project?.name ?? 'unknown-model'}/bootstrap`,
    contextWindow: project?.contextWindow ?? 8192,
    loraRank: project?.loraRank,
    tokenCount: project?.tokenCount ?? 12000000,
    imageCount: project?.imageCount ?? 0,
    dataSource: project?.dataSource ?? '',
    framework: project?.framework ?? 'Transformers',
    gpu: project?.gpu ?? '4 x A100 80GB',
    status: 'Running',
    progress: 0,
    epoch: `0/${project?.hyperParams.epochs ?? 2}`,
    bestMetric: '—',
    metricName: 'Judge Pass Rate',
    startedAt: new Date().toLocaleString('zh-CN'),
    duration: '0m',
    createdBy: '当前用户',
    learningRate: project?.hyperParams.learningRate ?? 1.5e-5,
    batchSize: project?.hyperParams.batchSize ?? 16,
    warmupSteps: project?.hyperParams.warmupSteps ?? 100,
    totalSteps: 3200,
    currentStep: 0,
    trainLoss: [],
    valLoss: [],
    lrHistory: [],
    gpuMemUsage: '0/0 GB',
    gpuUtil: '0%',
    logs: ['[2026-03-10 12:30:00] INFO  Training run created. Waiting for worker bootstrap...'],
  }
  MOCK_JOBS.unshift(newJob)
  return clone(newJob)
}

export async function stopTraining(jobKey: string): Promise<TrainingJob | undefined> {
  await delay(rand(300, 600))
  const job = MOCK_JOBS.find(item => item.key === jobKey)
  if (!job) return undefined
  job.status = 'Stopped'
  job.logs.push('[2026-03-10 12:31:20] WARN  Run stopped by operator request.')
  return clone(job)
}

export async function createTrainingProject(input: {
  name: string
  description: string
  dataSource: string
  framework: Framework
  gpu: string
  baseModel?: BaseModel
  trainMethod?: TrainMethod
  datasetName?: string
  hyperParams?: { learningRate: number; batchSize: number; epochs: number; warmupSteps: number; maxSeqLen: number }
}): Promise<TrainingProject> {
  await delay(rand(400, 700))
  const project: TrainingProject = {
    key: `tp-${Date.now()}`,
    name: input.name,
    displayName: input.name,
    description: input.description,
    modelFamily: input.baseModel?.includes('VL') ? 'VL' : 'LLM',
    modality: input.baseModel?.includes('VL') ? 'image-text' : 'text',
    trainStage: input.trainMethod ?? 'sft',
    capability: input.baseModel?.includes('VL') ? 'vision-language-understanding' : 'chat',
    datasetType: 'conversation',
    alignmentTags: ['工业知识增强'],
    dataSource: input.dataSource,
    framework: input.framework,
    gpu: input.gpu,
    jobs: 0,
    bestMetric: '—',
    createdAt: new Date().toISOString().slice(0, 10),
    trainMethod: input.trainMethod ?? 'sft',
    baseModel: input.baseModel ?? 'DeepSeek-R1-Distill-32B',
    datasetName: input.datasetName ?? '',
    contextWindow: input.hyperParams?.maxSeqLen ?? 8192,
    tokenCount: 12000000,
    imageCount: 0,
    loraRank: input.trainMethod === 'lora' || input.trainMethod === 'qlora' ? 16 : undefined,
    hyperParams: input.hyperParams ?? {
      learningRate: 2e-5,
      batchSize: 16,
      epochs: 2,
      warmupSteps: 100,
      maxSeqLen: 8192,
    },
  }
  MOCK_PROJECTS.unshift(project)
  return clone(project)
}

export interface TrainingStats {
  projects: number
  totalJobs: number
  running: number
  completed: number
  gpuUtilization: string
  avgTrainTime: string
}

export async function getTrainingStats(): Promise<TrainingStats> {
  await delay(rand(200, 400))
  const running = MOCK_JOBS.filter(job => job.status === 'Running').length
  const completed = MOCK_JOBS.filter(job => job.status === 'Completed').length
  return {
    projects: MOCK_PROJECTS.length,
    totalJobs: MOCK_JOBS.length,
    running,
    completed,
    gpuUtilization: '81%',
    avgTrainTime: '1h 47m',
  }
}
