import { describe, expect, it } from 'vitest'

import { ONTOLOGY_CATALOG } from './ontologyCatalog'
import { buildDefaultSkillsMarketStore } from './skillGenerator'

describe('skillGenerator market model', () => {
  it('generates business and general skills with ontology mapping metadata', () => {
    const store = buildDefaultSkillsMarketStore()

    expect(store.skills.some((skill) => skill.marketType === 'business')).toBe(true)
    expect(store.skills.some((skill) => skill.marketType === 'general')).toBe(true)
    expect(store.skills.every((skill) => Array.isArray(skill.sourceOntologyCodes))).toBe(true)
  })

  it('covers all ontology presets with at least one business skill and two mapped skills', () => {
    const store = buildDefaultSkillsMarketStore()

    expect(store.ontologySkillMappings).toHaveLength(ONTOLOGY_CATALOG.length)
    expect(store.ontologySkillMappings.every((item) => item.skillIds.length >= 2)).toBe(true)
  })
})
