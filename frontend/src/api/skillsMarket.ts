import {
  type OntologyFunctionItemLike,
  type OntologySkillMapping,
  type Skill,
  type SkillCategory,
  type SkillScriptFile,
  type SkillsMarketInsightStats,
  type SkillsMarketStore,
  type SkillStatus,
  type SkillTemplateFile,
} from '../types/skill'
import { buildDefaultSkillsMarketStore } from '../mocks/skills/skillGenerator'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'skills-market'

const DEFAULT_STORE: SkillsMarketStore = buildDefaultSkillsMarketStore()

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase()
}

function normalizeSkill(skill: Partial<Skill>): Skill {
  const now = nowIso()
  return {
    id: skill.id || `sk-${Date.now()}`,
    name: skill.name || 'custom-skill',
    displayName: skill.displayName || skill.name || '未命名 Skill',
    category: skill.category || 'development',
    status: skill.status || 'Draft',
    description: skill.description || '',
    instructions: skill.instructions || '',
    reference: skill.reference,
    templates: skill.templates || [],
    scripts: skill.scripts || [],
    dependencies: skill.dependencies,
    tags: skill.tags || [],
    installs: skill.installs || 0,
    marketType: skill.marketType || 'general',
    industry: skill.industry || 'general',
    phase: skill.phase || '未分配',
    featured: skill.featured || false,
    recommendedScore: skill.recommendedScore || 60,
    usageCount: skill.usageCount || 0,
    successRate: skill.successRate ?? 98.5,
    avgLatencyMs: skill.avgLatencyMs ?? 640,
    sourceOntologyCodes: skill.sourceOntologyCodes || [],
    sourceOntologyNames: skill.sourceOntologyNames || [],
    recommendedFor: skill.recommendedFor || [],
    capabilities: skill.capabilities || [],
    coverageLevel: skill.coverageLevel || 'optional',
    recommendationReason: skill.recommendationReason || '该 Skill 来自旧版或自定义数据，当前未补充本体映射说明。',
    author: skill.author || 'Unknown',
    createdAt: skill.createdAt || now,
    updatedAt: skill.updatedAt || now,
  }
}

function normalizeStoreShape(store: Partial<SkillsMarketStore>): SkillsMarketStore {
  const normalizedSkills = (store.skills || []).map((skill) => normalizeSkill(skill))
  return recalcStoreMeta({
    skills: normalizedSkills,
    importableFunctions: store.importableFunctions || DEFAULT_STORE.importableFunctions,
    featuredSkillIds: store.featuredSkillIds || [],
    industryBuckets: store.industryBuckets || [],
    ontologySkillMappings: store.ontologySkillMappings || [],
    insightStats: store.insightStats || {
      totalSkills: normalizedSkills.length,
      businessSkills: normalizedSkills.filter((skill) => skill.marketType === 'business').length,
      generalSkills: normalizedSkills.filter((skill) => skill.marketType === 'general').length,
      coveredOntologies: new Set(normalizedSkills.flatMap((skill) => skill.sourceOntologyCodes)).size,
      coveredIndustries: new Set(normalizedSkills.map((skill) => skill.industry)).size,
    },
  })
}

function needsLegacyUpgrade(store: Partial<SkillsMarketStore>): boolean {
  const skills = store.skills || []
  const hasBusinessSkills = skills.some((skill) => skill.marketType === 'business')
  return !store.ontologySkillMappings?.length || !hasBusinessSkills
}

function mergeLegacyStoreIntoDefaults(store: Partial<SkillsMarketStore>): SkillsMarketStore {
  const defaultStore = normalizeStoreShape(DEFAULT_STORE)
  const defaultSkillKeys = new Set(
    defaultStore.skills.flatMap((skill) => [normalizeSkillName(skill.id), normalizeSkillName(skill.name), normalizeSkillName(skill.displayName)]),
  )

  const legacySkills = (store.skills || [])
    .map((skill) => normalizeSkill(skill))
    .filter((skill) => {
      const keys = [normalizeSkillName(skill.id), normalizeSkillName(skill.name), normalizeSkillName(skill.displayName)]
      return !keys.some((key) => defaultSkillKeys.has(key))
    })

  const defaultImportKeys = new Set(
    defaultStore.importableFunctions.flatMap((item) => [normalizeSkillName(item.id), normalizeSkillName(item.name)]),
  )
  const mergedImportableFunctions = [
    ...defaultStore.importableFunctions,
    ...((store.importableFunctions || []).filter((item) => {
      const keys = [normalizeSkillName(item.id), normalizeSkillName(item.name)]
      return !keys.some((key) => defaultImportKeys.has(key))
    })),
  ]

  return normalizeStoreShape({
    ...defaultStore,
    skills: [...defaultStore.skills, ...legacySkills],
    importableFunctions: mergedImportableFunctions,
  })
}

async function loadStore(): Promise<SkillsMarketStore> {
  const store = await ensureMockStore<SkillsMarketStore>(STORE_KEY, DEFAULT_STORE)
  if (needsLegacyUpgrade(store)) {
    const migrated = mergeLegacyStoreIntoDefaults(store)
    await saveStore(migrated)
    return migrated
  }
  return normalizeStoreShape(store)
}

async function saveStore(store: SkillsMarketStore): Promise<void> {
  await setMockStore(STORE_KEY, store)
}

function buildCustomSkill(input: {
  name: string
  displayName: string
  category: SkillCategory
  description: string
  instructions: string
  reference?: string
  templates?: SkillTemplateFile[]
  scripts?: SkillScriptFile[]
  dependencies?: string
  tags?: string[]
}): Skill {
  const now = nowIso()
  return {
    id: `sk-${Date.now()}`,
    name: input.name,
    displayName: input.displayName,
    category: input.category,
    status: 'Draft',
    description: input.description,
    instructions: input.instructions,
    reference: input.reference,
    templates: input.templates || [],
    scripts: input.scripts || [],
    dependencies: input.dependencies,
    tags: input.tags || [],
    installs: 0,
    marketType: 'general',
    industry: 'general',
    phase: '自定义',
    featured: false,
    recommendedScore: 60,
    usageCount: 0,
    successRate: 98.5,
    avgLatencyMs: 640,
    sourceOntologyCodes: [],
    sourceOntologyNames: [],
    recommendedFor: ['自定义编排'],
    capabilities: ['自定义流程'],
    coverageLevel: 'optional',
    recommendationReason: '该 Skill 为用户在 Skills Hub 中自定义创建，当前未绑定具体本体。',
    author: 'Current User',
    createdAt: now,
    updatedAt: now,
  }
}

function recalcStoreMeta(store: SkillsMarketStore): SkillsMarketStore {
  const skills = [...store.skills].sort(
    (a, b) => b.recommendedScore - a.recommendedScore || b.installs - a.installs,
  )
  const insightStats: SkillsMarketInsightStats = {
    totalSkills: skills.length,
    businessSkills: skills.filter((skill) => skill.marketType === 'business').length,
    generalSkills: skills.filter((skill) => skill.marketType === 'general').length,
    coveredOntologies: new Set(skills.flatMap((skill) => skill.sourceOntologyCodes)).size,
    coveredIndustries: new Set(skills.map((skill) => skill.industry)).size,
  }

  return {
    ...store,
    skills,
    featuredSkillIds: skills.filter((skill) => skill.featured).slice(0, 8).map((skill) => skill.id),
    insightStats,
  }
}

export async function listSkills(): Promise<Skill[]> {
  return (await loadStore()).skills
}

export async function listOntologySkillMappings(): Promise<OntologySkillMapping[]> {
  return (await loadStore()).ontologySkillMappings
}

export async function getSkillsMarketInsightStats(): Promise<SkillsMarketInsightStats> {
  return (await loadStore()).insightStats
}

export async function getSkill(id: string): Promise<Skill | null> {
  return (await loadStore()).skills.find((skill) => skill.id === id) ?? null
}

export async function createSkill(input: {
  name: string
  displayName: string
  category: SkillCategory
  description: string
  instructions: string
  reference?: string
  templates?: SkillTemplateFile[]
  scripts?: SkillScriptFile[]
  dependencies?: string
  tags?: string[]
}): Promise<Skill> {
  const store = await loadStore()
  const skill = buildCustomSkill(input)
  const nextStore = recalcStoreMeta({ ...store, skills: [...store.skills, skill] })
  await saveStore(nextStore)
  return skill
}

export async function updateSkill(
  id: string,
  patch: Partial<
    Pick<
      Skill,
      | 'displayName'
      | 'description'
      | 'instructions'
      | 'reference'
      | 'status'
      | 'category'
      | 'dependencies'
      | 'templates'
      | 'scripts'
      | 'tags'
      | 'featured'
      | 'phase'
      | 'recommendationReason'
    >
  >,
): Promise<Skill | null> {
  const store = await loadStore()
  const idx = store.skills.findIndex((skill) => skill.id === id)
  if (idx < 0) return null

  store.skills[idx] = {
    ...store.skills[idx],
    ...patch,
    updatedAt: nowIso(),
  }

  const nextStore = recalcStoreMeta(store)
  await saveStore(nextStore)
  return nextStore.skills[idx]
}

export async function deleteSkill(id: string): Promise<void> {
  const store = await loadStore()
  const nextStore = recalcStoreMeta({
    ...store,
    skills: store.skills.filter((skill) => skill.id !== id),
  })
  await saveStore(nextStore)
}

export async function toggleSkillStatus(id: string): Promise<Skill | null> {
  const store = await loadStore()
  const idx = store.skills.findIndex((skill) => skill.id === id)
  if (idx < 0) return null

  const current = store.skills[idx].status
  const next: SkillStatus = current === 'Active' ? 'Disabled' : 'Active'
  store.skills[idx] = { ...store.skills[idx], status: next, updatedAt: nowIso() }
  const nextStore = recalcStoreMeta(store)
  await saveStore(nextStore)
  return nextStore.skills[idx]
}

export async function resetSkills(): Promise<void> {
  await setMockStore(STORE_KEY, DEFAULT_STORE)
}

export type OntologyFunctionItem = OntologyFunctionItemLike

export async function listImportableFunctions(): Promise<OntologyFunctionItem[]> {
  return (await loadStore()).importableFunctions
}

export function filterImportableFunctions(functions: OntologyFunctionItem[], skills: Skill[]): OntologyFunctionItem[] {
  const existing = new Set(
    skills.flatMap((skill) => [normalizeSkillName(skill.name), normalizeSkillName(skill.displayName)]),
  )
  return functions.filter((fn) => !existing.has(normalizeSkillName(fn.name)))
}

export async function importFunctionAsSkill(fn: OntologyFunctionItem): Promise<Skill> {
  const imported = buildCustomSkill({
    name: fn.name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''),
    displayName: fn.description.split('，')[0] || fn.name,
    category: 'domain-expert',
    description: `从本体项目「${fn.projectName}」导入的 Function。${fn.description}`,
    instructions: `# ${fn.name}\n\n\`\`\`python\n${fn.scriptContent}\n\`\`\``,
    scripts: [{ name: `${fn.name}.py`, description: '从本体 Function 导入' }],
    tags: ['本体导入', fn.projectName, fn.name],
  })
  imported.marketType = 'business'
  imported.industry = 'general'
  imported.phase = '本体导入'
  imported.status = 'Active'
  imported.recommendedScore = 72
  imported.usageCount = 128
  imported.sourceOntologyCodes = [fn.projectId]
  imported.sourceOntologyNames = [fn.projectName]
  imported.recommendedFor = [`${fn.projectName} Function 导入`]
  imported.capabilities = ['函数封装', '执行入口']
  imported.coverageLevel = 'enhanced'
  imported.recommendationReason = `该 Skill 由「${fn.projectName}」中的 Function 直接导入，可继续扩展为业务流程节点。`

  const store = await loadStore()
  const nextStore = recalcStoreMeta({ ...store, skills: [...store.skills, imported] })
  await saveStore(nextStore)
  return imported
}
