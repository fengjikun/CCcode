import { describe, expect, it } from 'vitest'

import { buildTargetEntityOptions, normalizeTargetEntityValues } from './ActionsTab.helpers'

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
    expect(normalizeTargetEntityValues('et-fd-007', entityTypes)).toEqual(['et-fd-007'])
  })

  it('maps a legacy numeric target entity id to the matching string option value', () => {
    expect(normalizeTargetEntityValues(1, entityTypes)).toEqual(['1'])
  })

  it('preserves multiple valid target entity ids and removes duplicates', () => {
    expect(normalizeTargetEntityValues(['et-fd-007', 1, 'et-fd-007'], entityTypes)).toEqual(['et-fd-007', '1'])
  })

  it('clears invalid target entity values', () => {
    expect(normalizeTargetEntityValues(Number.NaN, entityTypes)).toEqual([])
    expect(normalizeTargetEntityValues('missing', entityTypes)).toEqual([])
  })
})
