import type { EvalSample, EvalTask, EvalTaskType } from '../../types/modelEvaluation'

type EvalMetricInput = Pick<EvalTask, 'taskType' | 'passRate' | 'groundedScore' | 'docParseScore' | 'hallucinationRate' | 'winRate'>

const METRIC_LABELS: Partial<Record<EvalTaskType, string>> = {
  'instruction-following': 'Pass Rate',
  hallucination: 'Hallucination',
  'grounded-vqa': 'Grounded Score',
  'document-understanding': 'Doc Parse',
}

export function getPrimaryEvalMetric(task: EvalMetricInput): { label: string; value: string } {
  if (task.taskType === 'grounded-vqa' && task.groundedScore !== undefined) {
    return { label: 'Grounded Score', value: `${task.groundedScore.toFixed(1)}%` }
  }
  if (task.taskType === 'document-understanding' && task.docParseScore !== undefined) {
    return { label: 'Doc Parse', value: `${task.docParseScore.toFixed(1)}%` }
  }
  if (task.taskType === 'hallucination' && task.hallucinationRate !== undefined) {
    return { label: 'Hallucination', value: `${task.hallucinationRate.toFixed(1)}%` }
  }
  if (task.passRate !== undefined) {
    return { label: METRIC_LABELS[task.taskType] ?? 'Pass Rate', value: `${task.passRate.toFixed(1)}%` }
  }
  if (task.winRate !== undefined) {
    return { label: 'Win Rate', value: `${task.winRate.toFixed(1)}%` }
  }
  return { label: 'Score', value: '—' }
}

export function summarizeEvalSample(sample: Pick<EvalSample, 'judgeVerdict' | 'humanLabel'>): string {
  if (sample.judgeVerdict && sample.humanLabel) {
    return `Judge: ${sample.judgeVerdict} / Human: ${sample.humanLabel}`
  }
  if (sample.judgeVerdict) return `Judge: ${sample.judgeVerdict}`
  if (sample.humanLabel) return `Human: ${sample.humanLabel}`
  return 'No review labels'
}
