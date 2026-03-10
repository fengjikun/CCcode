import type { ModelModality } from '../../types/modelCenter'

function formatCompactNumber(value: number, unit: 'K' | 'M'): string {
  const divisor = unit === 'M' ? 1_000_000 : 1_000
  return `${(value / divisor).toFixed(1)}${unit}`
}

export function formatDatasetScale(input: {
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

export function summarizeDatasetSample(sample: Record<string, unknown>): string {
  const messages = sample.messages
  if (Array.isArray(messages)) {
    const roles = messages
      .map(item => (typeof item === 'object' && item && 'role' in item ? String(item.role) : null))
      .filter(Boolean)
      .join('+')
    return `${roles} ${messages.length} turns`
  }

  if ('chosen' in sample && 'rejected' in sample) return 'preference pair'
  if ('image' in sample && 'question' in sample) return 'vision question answering'
  if ('image' in sample && 'ocr_text' in sample) return 'document parsing sample'
  return 'generic sample'
}
