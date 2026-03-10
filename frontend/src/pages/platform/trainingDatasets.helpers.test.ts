import { describe, expect, it } from 'vitest'

import { formatDatasetScale, summarizeDatasetSample } from './trainingDatasets.helpers'

describe('trainingDatasets helpers', () => {
  it('formats text corpora using token counts', () => {
    expect(formatDatasetScale({ modality: 'text', tokenCount: 42000000, imageCount: 0 })).toBe('42.0M tokens')
  })

  it('formats vl corpora using image and token counts', () => {
    expect(formatDatasetScale({ modality: 'image-text', tokenCount: 32000000, imageCount: 48000 })).toBe('48.0K images / 32.0M tokens')
  })

  it('summarizes conversation samples from messages', () => {
    expect(
      summarizeDatasetSample({
        messages: [
          { role: 'system', content: '你是工厂助手' },
          { role: 'user', content: '如何处理高温报警？' },
        ],
      }),
    ).toBe('system+user 2 turns')
  })
})
