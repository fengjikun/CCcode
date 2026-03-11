import { beforeEach, describe, expect, it, vi } from 'vitest'

let storeValue: unknown

vi.mock('./mockStoreClient', () => ({
  ensureMockStore: async (_namespace: string, defaults: unknown) => {
    if (!storeValue) storeValue = structuredClone(defaults)
    return structuredClone(storeValue)
  },
  setMockStore: async (_namespace: string, value: unknown) => {
    storeValue = structuredClone(value)
    return structuredClone(storeValue)
  },
}))

describe('skillsMarket defaults', () => {
  beforeEach(() => {
    storeValue = undefined
  })

  it('loads a generated mixed market and preserves ontology metadata', async () => {
    const { listSkills } = await import('./skillsMarket')
    const { ONTOLOGY_CATALOG } = await import('../mocks/skills/ontologyCatalog')

    const skills = await listSkills()

    expect(skills.length).toBeGreaterThanOrEqual(ONTOLOGY_CATALOG.length * 2)
    expect(skills[0]).toHaveProperty('marketType')
    expect(skills.some((skill) => skill.sourceOntologyCodes.length > 0)).toBe(true)
  })

  it('exposes market insight stats and ontology mappings', async () => {
    const { getSkillsMarketInsightStats, listOntologySkillMappings } = await import('./skillsMarket')

    const stats = await getSkillsMarketInsightStats()
    const mappings = await listOntologySkillMappings()

    expect(stats.businessSkills).toBeGreaterThan(0)
    expect(stats.generalSkills).toBeGreaterThan(0)
    expect(stats.businessSkills).toBe(260)
    expect(stats.businessSkills).toBeGreaterThan(stats.generalSkills)
    expect(mappings.length).toBeGreaterThan(100)
  })

  it('normalizes legacy persisted skills missing new ontology metadata fields', async () => {
    storeValue = {
      skills: [
        {
          id: 'legacy-1',
          name: 'equipment-fault-diagnosis',
          displayName: '设备故障诊断专家',
          category: 'domain-expert',
          status: 'Active',
          description: '旧版 Skill',
          instructions: '# Legacy',
          templates: [],
          scripts: [],
          tags: ['设备运维'],
          installs: 12,
          author: 'Legacy User',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
        },
      ],
      importableFunctions: [],
    }

    const { getSkillsMarketInsightStats, listSkills } = await import('./skillsMarket')

    const skills = await listSkills()
    const stats = await getSkillsMarketInsightStats()
    const legacySkill = skills.find((skill) => skill.id === 'legacy-1')

    expect(legacySkill?.sourceOntologyNames).toEqual([])
    expect(legacySkill?.recommendedFor).toEqual([])
    expect(legacySkill?.capabilities).toEqual([])
    expect(legacySkill?.marketType).toBe('general')
    expect(stats.totalSkills).toBeGreaterThan(200)
  })

  it('upgrades legacy persisted market store to generated defaults when ontology mappings are missing', async () => {
    storeValue = {
      skills: [
        {
          id: 'legacy-1',
          name: 'equipment-fault-diagnosis',
          displayName: '设备故障诊断专家',
          category: 'domain-expert',
          status: 'Active',
          description: '旧版 Skill',
          instructions: '# Legacy',
          templates: [],
          scripts: [],
          tags: ['设备运维'],
          installs: 12,
          author: 'Legacy User',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
        },
      ],
      importableFunctions: [],
    }

    const { listSkills } = await import('./skillsMarket')

    const skills = await listSkills()

    expect(skills.length).toBeGreaterThan(200)
    expect(skills.some((skill) => skill.marketType === 'business')).toBe(true)
    expect(skills.some((skill) => skill.id.startsWith('skill-biz-plus-'))).toBe(true)
  })
})
