import { DATASET_TYPE_LABELS, MODEL_FAMILY_LABELS, TRAIN_STAGE_LABELS } from '../../types/modelCenter'
import type { DatasetType, ModelModality, TrainStage, ModelFamily } from '../../types/modelCenter'

function formatCompactNumber(value: number, unit: 'K' | 'M'): string {
  const divisor = unit === 'M' ? 1_000_000 : 1_000
  return `${(value / divisor).toFixed(1)}${unit}`
}

export function formatTrainingScale(input: {
  modality: ModelModality
  tokenCount: number
  imageCount: number
}): string {
  const tokenLabel = input.tokenCount >= 1_000_000
    ? `${formatCompactNumber(input.tokenCount, 'M')} tokens`
    : `${formatCompactNumber(input.tokenCount, 'K')} tokens`

  if (input.modality === 'text') return tokenLabel

  const imageLabel = input.imageCount >= 1_000_000
    ? `${formatCompactNumber(input.imageCount, 'M')} images`
    : `${formatCompactNumber(input.imageCount, 'K')} images`
  return `${imageLabel} / ${tokenLabel}`
}

export function getTrainingFacetSummary(input: {
  modelFamily: ModelFamily
  trainStage: TrainStage
  datasetType: DatasetType
}): string {
  return [
    MODEL_FAMILY_LABELS[input.modelFamily],
    TRAIN_STAGE_LABELS[input.trainStage],
    DATASET_TYPE_LABELS[input.datasetType],
  ].join(' / ')
}
