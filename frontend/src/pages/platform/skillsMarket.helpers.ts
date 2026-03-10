import type {
  Skill,
  SkillCategory,
  SkillCoverageLevel,
  SkillIndustry,
  SkillMarketType,
  SkillsMarketStore,
} from '../../types/skill'

export interface SkillsMarketFilters {
  query: string
  category: SkillCategory | 'all'
  marketType: SkillMarketType | 'all'
  industry: SkillIndustry | 'all'
  phase: string | 'all'
  coverageLevel: SkillCoverageLevel | 'all'
}

function matchesQuery(skill: Skill, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const haystack = [
    skill.displayName,
    skill.name,
    skill.description,
    skill.recommendationReason,
    skill.phase,
    ...skill.tags,
    ...skill.sourceOntologyNames,
    ...skill.recommendedFor,
    ...skill.capabilities,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalized)
}

export function filterSkills(skills: Skill[], filters: SkillsMarketFilters): Skill[] {
  return skills.filter((skill) => {
    if (filters.category !== 'all' && skill.category !== filters.category) return false
    if (filters.marketType !== 'all' && skill.marketType !== filters.marketType) return false
    if (filters.industry !== 'all' && skill.industry !== filters.industry) return false
    if (filters.phase !== 'all' && skill.phase !== filters.phase) return false
    if (filters.coverageLevel !== 'all' && skill.coverageLevel !== filters.coverageLevel) return false
    return matchesQuery(skill, filters.query)
  })
}

export function getFeaturedSkills(skills: Skill[], limit = 6): Skill[] {
  return [...skills]
    .filter((skill) => skill.featured)
    .sort((a, b) => b.recommendedScore - a.recommendedScore || b.installs - a.installs)
    .slice(0, limit)
}

export function summarizeMarketStats(store: SkillsMarketStore) {
  return store.insightStats
}

export function collectPhaseOptions(skills: Skill[]): string[] {
  return [...new Set(skills.map((skill) => skill.phase))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}
