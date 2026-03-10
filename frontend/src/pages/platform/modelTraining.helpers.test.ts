import { describe, expect, it } from 'vitest'

import { formatTrainingScale, getTrainingFacetSummary } from './modelTraining.helpers'

describe('modelTraining helpers', () => {
  it('formats text-only corpora by token count', () => {
    expect(formatTrainingScale({ modality: 'text', tokenCount: 148000000, imageCount: 0 })).toBe('148.0M tokens')
  })

  it('formats vl corpora with both images and tokens', () => {
    expect(formatTrainingScale({ modality: 'image-text', tokenCount: 32000000, imageCount: 48000 })).toBe('48.0K images / 32.0M tokens')
  })

  it('builds a concise facet summary for training rows', () => {
    expect(
      getTrainingFacetSummary({
        modelFamily: 'VL',
        trainStage: 'qlora',
        datasetType: 'vqa',
      }),
    ).toBe('视觉语言模型 / QLoRA / 视觉问答')
  })
})
