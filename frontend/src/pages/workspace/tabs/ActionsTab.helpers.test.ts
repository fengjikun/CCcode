import { describe, expect, it } from 'vitest'

import { buildTargetEntityOptions, normalizeTargetEntityValue } from './ActionsTab.helpers'

describe('ActionsTab target entity helpers', () => {
  const entityTypes = [
    { id: 'et-fd-007', name: '零部件', properties: [] },
    { id: '1', name: '设备', properties: [] },
  ]

  it('preserves string entity ids when building select options', () => {
    expect(buildTargetEntityOptions(entityTypes)).toEqual([
      { label: '零部件', value: 'et-fd-007' },
      { label: '设备', value: '1' },
    ])
  })

  it('keeps an existing string target entity id selected', () => {
    expect(normalizeTargetEntityValue('et-fd-007', entityTypes)).toBe('et-fd-007')
  })

  it('maps a legacy numeric target entity id to the matching string option value', () => {
    expect(normalizeTargetEntityValue(1, entityTypes)).toBe('1')
  })

  it('clears invalid target entity values', () => {
    expect(normalizeTargetEntityValue(Number.NaN, entityTypes)).toBeUndefined()
    expect(normalizeTargetEntityValue('missing', entityTypes)).toBeUndefined()
  })
})
