import { describe, expect, it } from 'vitest'

import { formatGatewayQuota, summarizeGatewayCapability } from './modelGateway.helpers'

describe('modelGateway helpers', () => {
  it('formats rpm and tpm quotas compactly', () => {
    expect(formatGatewayQuota({ rpm: 180000, tpm: 24000000 })).toBe('180.0K RPM / 24.0M TPM')
  })

  it('summarizes capability and modality in one line', () => {
    expect(
      summarizeGatewayCapability({
        modelFamily: 'VL',
        modality: 'image-text',
        capability: 'document-parsing',
      }),
    ).toBe('视觉语言模型 / 图文 / document-parsing')
  })
})
