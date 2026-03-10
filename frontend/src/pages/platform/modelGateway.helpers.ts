import { MODEL_FAMILY_LABELS, MODEL_MODALITY_LABELS } from '../../types/modelCenter'
import type { ModelCapability, ModelFamily, ModelModality } from '../../types/modelCenter'

function formatCompactNumber(value: number, unit: 'K' | 'M'): string {
  const divisor = unit === 'M' ? 1_000_000 : 1_000
  return `${(value / divisor).toFixed(1)}${unit}`
}

export function formatGatewayQuota(input: { rpm: number; tpm: number }): string {
  return `${formatCompactNumber(input.rpm, 'K')} RPM / ${formatCompactNumber(input.tpm, 'M')} TPM`
}

export function summarizeGatewayCapability(input: {
  modelFamily: ModelFamily
  modality: ModelModality
  capability: ModelCapability
}): string {
  return `${MODEL_FAMILY_LABELS[input.modelFamily]} / ${MODEL_MODALITY_LABELS[input.modality]} / ${input.capability}`
}
