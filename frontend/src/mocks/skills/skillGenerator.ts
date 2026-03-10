import type {
  OntologyFunctionItemLike,
  OntologySkillMapping,
  Skill,
  SkillCategory,
  SkillIndustry,
  SkillsMarketInsightStats,
  SkillsMarketStore,
} from '../../types/skill'
import { SKILL_INDUSTRY_LABELS } from '../../types/skill'
import { ONTOLOGY_CATALOG, type OntologyCatalogEntry } from './ontologyCatalog'
import { GENERAL_SKILL_TEMPLATES } from './skillTemplates'

const BASE_TIMESTAMP = '2026-03-10T09:00:00.000Z'

const TRAINING_TYPE_GENERAL_MAP: Record<string, string[]> = {
  分析类: ['g-data-cleaning', 'g-root-cause', 'g-report-generation'],
  执行类: ['g-workflow-orchestration', 'g-alert-notification', 'g-work-order'],
  决策类: ['g-decision-support', 'g-kpi-attribution', 'g-risk-scoring'],
  治理类: ['g-compliance-review', 'g-data-validation', 'g-document-parsing'],
}

function stableHash(input: string): number {
  let hash = 0
  for (const char of input) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000003
  }
  return hash
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeNameSegment(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function codeToSlug(code: string): string {
  return normalizeNameSegment(code.replace(/\./g, '-'))
}

function inferBusinessCategory(ontology: OntologyCatalogEntry): SkillCategory {
  if (ontology.industry === 'general') return 'enterprise'
  if (ontology.trainingType === '分析类') return 'data-analysis'
  if (ontology.trainingType === '治理类') return 'enterprise'
  if (ontology.phase.includes('销售') || ontology.phase.includes('运营') || ontology.phase.includes('供应')) {
    return 'enterprise'
  }
  return 'domain-expert'
}

function inferCapabilities(ontology: OntologyCatalogEntry): string[] {
  const text = `${ontology.name} ${ontology.phase} ${ontology.agentScene} ${ontology.trainingType} ${ontology.triple}`
  const capabilities = new Set<string>()

  if (text.includes('故障') || text.includes('诊断') || text.includes('根因')) {
    capabilities.add('根因分析')
    capabilities.add('处置建议')
  }
  if (text.includes('合同') || text.includes('合规') || text.includes('法规') || text.includes('政策')) {
    capabilities.add('合规审查')
    capabilities.add('规则校验')
  }
  if (text.includes('调度') || text.includes('排程') || text.includes('排班') || text.includes('补货')) {
    capabilities.add('流程编排')
    capabilities.add('资源调度')
  }
  if (text.includes('图谱') || text.includes('知识') || text.includes('本体') || text.includes('语义')) {
    capabilities.add('知识检索')
    capabilities.add('图谱融合')
  }
  if (text.includes('影像') || text.includes('图像')) {
    capabilities.add('图文报告')
  }

  if (ontology.trainingType === '分析类') capabilities.add('分析洞察')
  if (ontology.trainingType === '决策类') capabilities.add('决策支持')
  if (ontology.trainingType === '执行类') capabilities.add('执行落地')
  if (ontology.trainingType === '治理类') capabilities.add('治理校验')

  if (capabilities.size === 0) {
    capabilities.add('流程理解')
    capabilities.add('业务建议')
  }
  return [...capabilities].slice(0, 4)
}

function buildBusinessReason(ontology: OntologyCatalogEntry, capabilities: string[]): string {
  return `该 Skill 直接承接「${ontology.name}」在${ontology.phase}场景下的 Agent 需求，围绕 ${capabilities.slice(0, 2).join('、')} 提供核心能力。`
}

function buildBusinessSkill(ontology: OntologyCatalogEntry): Skill {
  const hash = stableHash(ontology.code + ontology.name)
  const capabilities = inferCapabilities(ontology)
  const installs = 1200 + Math.round(ontology.dataCount * 0.7) + (hash % 320)
  const usageCount = 1800 + ontology.dataCount + (hash % 1500)
  const successRate = Number((96 + (hash % 34) / 10).toFixed(1))
  const avgLatencyMs = 620 + (hash % 760)
  const recommendedScore = clamp(78 + Math.floor(ontology.dataCount / 1400) + (hash % 10), 78, 99)
  const codeSlug = codeToSlug(ontology.code)

  return {
    id: `skill-biz-${codeSlug}`,
    name: `business-skill-${codeSlug}`,
    displayName: `${ontology.name}专家技能`,
    category: inferBusinessCategory(ontology),
    status: 'Active',
    description: `${SKILL_INDUSTRY_LABELS[ontology.industry]} · ${ontology.phase}场景业务 Skill，服务于 ${ontology.agentScene}`,
    instructions: [
      `# ${ontology.name}专家技能`,
      '',
      `> **适用场景**：${ontology.agentScene}`,
      '',
      '## 核心能力',
      ...capabilities.map((item) => `- ${item}`),
      '',
      '## 执行流程',
      '1. 读取本体定义与业务上下文。',
      '2. 结合场景规则组织诊断、分析或执行建议。',
      '3. 输出结构化结论与下一步动作。',
    ].join('\n'),
    reference: `本体编码：${ontology.code}\n业务阶段：${ontology.phase}\n训练方向：${ontology.trainingType}`,
    templates: [{ name: `${codeSlug}-playbook.md`, description: '业务 Skill 操作模板' }],
    scripts: [{ name: `${codeSlug}-executor.py`, description: '业务规则执行脚本' }],
    dependencies: 'ontology-workspace, recommendation-engine',
    tags: [ontology.name, SKILL_INDUSTRY_LABELS[ontology.industry], ontology.phase, ontology.trainingType],
    installs,
    marketType: 'business',
    industry: ontology.industry,
    phase: ontology.phase,
    featured: ontology.code === '0.0.1' || ontology.dataCount >= 8500,
    recommendedScore,
    usageCount,
    successRate,
    avgLatencyMs,
    sourceOntologyCodes: [ontology.code],
    sourceOntologyNames: [ontology.name],
    recommendedFor: [ontology.agentScene],
    capabilities,
    coverageLevel: 'core',
    recommendationReason: buildBusinessReason(ontology, capabilities),
    author: 'DeepexiOS',
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  }
}

function scoreTemplateForOntology(
  ontology: OntologyCatalogEntry,
  template: (typeof GENERAL_SKILL_TEMPLATES)[number],
): number {
  const text = `${ontology.name} ${ontology.phase} ${ontology.agentScene} ${ontology.trainingType} ${ontology.triple}`.toLowerCase()
  let score = 0

  for (const keyword of template.keywords) {
    if (text.includes(keyword.toLowerCase())) score += 3
  }
  if (template.industries?.includes(ontology.industry)) score += 2
  if (!template.industries || template.industries.length === 0) score += 1
  if (template.phases?.some((phase) => ontology.phase.includes(phase))) score += 2
  if ((TRAINING_TYPE_GENERAL_MAP[ontology.trainingType] || []).includes(template.id)) score += 4
  return score
}

function mapGeneralTemplatesForOntology(ontology: OntologyCatalogEntry): string[] {
  const ranked = GENERAL_SKILL_TEMPLATES
    .map((template) => ({ template, score: scoreTemplateForOntology(ontology, template) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.template.displayName.localeCompare(b.template.displayName))

  const selected = new Set<string>((TRAINING_TYPE_GENERAL_MAP[ontology.trainingType] || []).slice(0, 2))
  for (const item of ranked) {
    if (selected.size >= 4) break
    selected.add(item.template.id)
  }
  if (selected.size < 2) {
    selected.add('g-data-cleaning')
    selected.add('g-graph-synthesis')
  }
  return [...selected].slice(0, 4)
}

function buildGeneralSkill(
  template: (typeof GENERAL_SKILL_TEMPLATES)[number],
  linkedOntologies: OntologyCatalogEntry[],
): Skill {
  const combinedNames = linkedOntologies.map((item) => item.name)
  const combinedCodes = linkedOntologies.map((item) => item.code)
  const linkedScenes = [...new Set(linkedOntologies.map((item) => item.agentScene))].slice(0, 6)
  const hash = stableHash(template.id + combinedCodes.join('|'))
  const recommendedScore = clamp((template.featureWeight || 70) + Math.floor(linkedOntologies.length / 8), 70, 98)

  return {
    id: template.id,
    name: template.name,
    displayName: template.displayName,
    category: template.category,
    status: 'Active',
    description: template.description,
    instructions: [
      `# ${template.displayName}`,
      '',
      '## 适用能力',
      ...template.capabilities.map((item) => `- ${item}`),
      '',
      '## 执行流程',
      '1. 读取输入资料与上下文。',
      '2. 执行通用能力处理链路。',
      '3. 输出结构化结果并沉淀复用资产。',
    ].join('\n'),
    reference: `覆盖本体数：${linkedOntologies.length}\n关联行业：${[...new Set(linkedOntologies.map((item) => SKILL_INDUSTRY_LABELS[item.industry]))].join('、')}`,
    templates: template.templates || [],
    scripts: template.scripts || [],
    dependencies: template.dependencies,
    tags: [...template.tags, ...combinedNames.slice(0, 4)],
    installs: 2800 + linkedOntologies.length * 35 + (hash % 400),
    marketType: 'general',
    industry: 'general',
    phase: '跨行业',
    featured: Boolean(template.featured),
    recommendedScore,
    usageCount: 4200 + linkedOntologies.length * 48 + (hash % 800),
    successRate: Number((95.5 + (hash % 36) / 10).toFixed(1)),
    avgLatencyMs: 520 + (hash % 540),
    sourceOntologyCodes: combinedCodes,
    sourceOntologyNames: combinedNames,
    recommendedFor: linkedScenes,
    capabilities: template.capabilities,
    coverageLevel: template.coverageLevel,
    recommendationReason: `该通用 Skill 已覆盖 ${linkedOntologies.length} 个本体，适合作为跨行业能力底座复用。`,
    author: 'DeepexiOS',
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  }
}

function buildOntologySkillMappings(businessSkills: Skill[]) {
  const businessByCode = new Map(businessSkills.map((skill) => [skill.sourceOntologyCodes[0], skill]))
  const templateUsage = new Map<string, OntologyCatalogEntry[]>()
  const mappings: OntologySkillMapping[] = ONTOLOGY_CATALOG.map((ontology) => {
    const relatedGeneralIds = mapGeneralTemplatesForOntology(ontology)
    for (const templateId of relatedGeneralIds) {
      const list = templateUsage.get(templateId) || []
      list.push(ontology)
      templateUsage.set(templateId, list)
    }
    return {
      ontologyCode: ontology.code,
      ontologyName: ontology.name,
      skillIds: [businessByCode.get(ontology.code)!.id, ...relatedGeneralIds],
    }
  })

  return { mappings, templateUsage }
}

function buildIndustryBuckets(mappings: OntologySkillMapping[]): SkillsMarketStore['industryBuckets'] {
  const skillIdsByIndustry = new Map<SkillIndustry, Set<string>>()
  for (const ontology of ONTOLOGY_CATALOG) {
    const bucket = skillIdsByIndustry.get(ontology.industry) || new Set<string>()
    const mapping = mappings.find((item) => item.ontologyCode === ontology.code)
    for (const skillId of mapping?.skillIds || []) bucket.add(skillId)
    skillIdsByIndustry.set(ontology.industry, bucket)
  }
  return [...skillIdsByIndustry.entries()].map(([industry, skillIds]) => ({
    industry,
    skillIds: [...skillIds],
  }))
}

function buildInsightStats(skills: Skill[]): SkillsMarketInsightStats {
  return {
    totalSkills: skills.length,
    businessSkills: skills.filter((skill) => skill.marketType === 'business').length,
    generalSkills: skills.filter((skill) => skill.marketType === 'general').length,
    coveredOntologies: new Set(skills.flatMap((skill) => skill.sourceOntologyCodes)).size,
    coveredIndustries: new Set(
      skills.flatMap((skill) => (skill.marketType === 'business' ? [skill.industry] : skill.sourceOntologyCodes.map((code) => {
        const ontology = ONTOLOGY_CATALOG.find((item) => item.code === code)
        return ontology?.industry || 'general'
      }))),
    ).size,
  }
}

function buildImportableFunctions(businessSkills: Skill[]): OntologyFunctionItemLike[] {
  return businessSkills.slice(0, 8).map((skill) => ({
    id: `fn-import-${skill.sourceOntologyCodes[0].replace(/\./g, '-')}`,
    name: `${skill.name.replace(/-/g, '_')}_entry`,
    projectName: skill.sourceOntologyNames[0],
    projectId: `proj-${skill.sourceOntologyCodes[0].replace(/\./g, '')}`,
    description: `从「${skill.sourceOntologyNames[0]}」导出的能力入口，适合继续封装为独立 Skill。`,
    scriptContent: [
      `def ${skill.name.replace(/-/g, '_')}_entry(context):`,
      '    """根据本体上下文返回推荐动作"""',
      '    return {',
      `        "ontology": "${skill.sourceOntologyNames[0]}",`,
      `        "capabilities": ${JSON.stringify(skill.capabilities, null, 8)},`,
      '    }',
    ].join('\n'),
    status: 'ACTIVE',
  }))
}

export function buildDefaultSkillsMarketStore(): SkillsMarketStore {
  const businessSkills = ONTOLOGY_CATALOG.map(buildBusinessSkill)
  const { mappings, templateUsage } = buildOntologySkillMappings(businessSkills)
  const generalSkills = GENERAL_SKILL_TEMPLATES
    .map((template) => {
      const linkedOntologies = templateUsage.get(template.id)
      return linkedOntologies && linkedOntologies.length > 0 ? buildGeneralSkill(template, linkedOntologies) : null
    })
    .filter((skill): skill is Skill => Boolean(skill))

  const skills = [...businessSkills, ...generalSkills].sort(
    (a, b) => b.recommendedScore - a.recommendedScore || b.installs - a.installs,
  )

  return {
    skills,
    importableFunctions: buildImportableFunctions(businessSkills),
    featuredSkillIds: skills.filter((skill) => skill.featured).slice(0, 8).map((skill) => skill.id),
    industryBuckets: buildIndustryBuckets(mappings),
    ontologySkillMappings: mappings,
    insightStats: buildInsightStats(skills),
  }
}
