import { describe, expect, it } from 'vitest'

import { buildDefaultSkillsMarketStore } from '../../mocks/skills/skillGenerator'
import { filterSkills, getFeaturedSkills, summarizeMarketStats } from './skillsMarket.helpers'

describe('skillsMarket helpers', () => {
  it('returns featured skills sorted by recommendation score', () => {
    const store = buildDefaultSkillsMarketStore()

    const featured = getFeaturedSkills(store.skills, 6)

    expect(featured).toHaveLength(6)
    expect(featured[0].recommendedScore).toBeGreaterThanOrEqual(featured[1].recommendedScore)
  })

  it('filters by market type, industry, phase, and search text', () => {
    const store = buildDefaultSkillsMarketStore()

    const filtered = filterSkills(store.skills, {
      marketType: 'business',
      industry: 'manufacturing',
      phase: '生产',
      query: '故障',
      category: 'all',
      coverageLevel: 'all',
    })

    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every((skill) => skill.marketType === 'business')).toBe(true)
    expect(filtered.every((skill) => skill.industry === 'manufacturing')).toBe(true)
  })

  it('summarizes business, general, ontology, and industry coverage metrics', () => {
    const store = buildDefaultSkillsMarketStore()

    const stats = summarizeMarketStats(store)

    expect(stats.businessSkills).toBeGreaterThan(0)
    expect(stats.generalSkills).toBeGreaterThan(0)
    expect(stats.coveredOntologies).toBeGreaterThan(100)
  })
})
