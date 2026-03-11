import { describe, expect, it } from 'vitest'

import { ONTOLOGY_CATALOG } from './ontologyCatalog'
import { buildDefaultSkillsMarketStore } from './skillGenerator'

describe('skillGenerator market model', () => {
  it('generates business and general skills with ontology mapping metadata', () => {
    const store = buildDefaultSkillsMarketStore()

    expect(store.skills.some((skill) => skill.marketType === 'business')).toBe(true)
    expect(store.skills.some((skill) => skill.marketType === 'general')).toBe(true)
    expect(store.skills.every((skill) => Array.isArray(skill.sourceOntologyCodes))).toBe(true)
    expect(store.skills.length).toBeGreaterThanOrEqual(ONTOLOGY_CATALOG.length * 2)
    expect(store.skills.length).toBeLessThanOrEqual(ONTOLOGY_CATALOG.length * 3)
    expect(store.insightStats.businessSkills).toBe(260)
    expect(store.insightStats.businessSkills).toBeGreaterThan(store.insightStats.generalSkills)
  })

  it('covers all ontology presets with at least one business skill and two mapped skills', () => {
    const store = buildDefaultSkillsMarketStore()

    expect(store.ontologySkillMappings).toHaveLength(ONTOLOGY_CATALOG.length)
    expect(store.ontologySkillMappings.every((item) => item.skillIds.length >= 2)).toBe(true)
  })

  it('keeps the fault diagnosis expert skill as the top featured recommendation with detailed instructions', () => {
    const store = buildDefaultSkillsMarketStore()
    const skill = store.skills.find((item) => item.displayName === '故障诊断本体专家技能')

    expect(skill).toBeDefined()
    expect(skill?.recommendedScore).toBe(100)
    expect(skill?.instructions).toContain('## 执行流程')
    expect(skill?.instructions).toContain('根因候选生成')
    expect(skill?.instructions).toContain('## 输出格式')
  })

  it('does not append numeric suffixes to generated business variant display names', () => {
    const store = buildDefaultSkillsMarketStore()

    expect(
      store.skills.some((skill) => skill.id.startsWith('skill-biz-plus-') && / \d+$/.test(skill.displayName)),
    ).toBe(false)
  })
})
