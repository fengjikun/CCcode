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
const BUSINESS_VARIANTS_PER_ONTOLOGY = 1
const EXTRA_BUSINESS_VARIANT_ONTOLOGY_COUNT = 44
const GENERAL_TEMPLATE_BY_ID = new Map(GENERAL_SKILL_TEMPLATES.map((template) => [template.id, template]))
const FAULT_DIAGNOSIS_CODE = '0.0.1'
const EXTRA_BUSINESS_VARIANT_CODES = new Set(
  [...ONTOLOGY_CATALOG]
    .sort((a, b) => b.dataCount - a.dataCount || a.code.localeCompare(b.code, 'zh-CN'))
    .slice(0, EXTRA_BUSINESS_VARIANT_ONTOLOGY_COUNT)
    .map((ontology) => ontology.code),
)

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
  if (ontology.code === FAULT_DIAGNOSIS_CODE) {
    return '该 Skill 覆盖故障受理、症状归并、根因定位、排查路径生成和处置建议输出，是制造场景里最核心的诊断入口。'
  }
  return `该 Skill 直接承接「${ontology.name}」在${ontology.phase}场景下的 Agent 需求，围绕 ${capabilities.slice(0, 2).join('、')} 提供核心能力。`
}

function buildBusinessInstructions(ontology: OntologyCatalogEntry, capabilities: string[]): string {
  if (ontology.code !== FAULT_DIAGNOSIS_CODE) {
    return [
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
    ].join('\n')
  }

  return [
    '# 故障诊断本体专家技能',
    '',
    '> **适用场景**：设备状态监测、报警研判、停机排查、维修建议生成',
    '> **目标**：把现场故障从“现象描述”推进到“根因定位 + 排查路径 + 处置方案”',
    '',
    '## 核心能力',
    '- 故障现象标准化归并',
    '- 故障模式与根因链匹配',
    '- 检查点优先级排序',
    '- 处置建议与工单建议生成',
    '',
    '## 输入要求',
    '- 设备编号、产线/工位、时间窗口',
    '- 报警码、传感器波动、巡检记录、维修历史',
    '- 当前现象描述，例如温升、异响、振动超限、停机',
    '',
    '## 执行流程',
    '1. 受理故障上下文：识别设备、部件、报警码和当前工况。',
    '2. 现象归一：把自然语言现象映射到本体中的故障现象、子现象和参数异常。',
    '3. 根因候选生成：结合历史案例、因果链路和部件寿命，产出 3-5 个候选根因。',
    '4. 排查路径规划：给出优先检查点、推荐顺序、每一步需要验证的证据。',
    '5. 处置方案生成：输出临时止损动作、正式维修动作、风险提示和复机条件。',
    '6. 沉淀闭环：将本次故障的现象、原因、方案回写为知识资产。',
    '',
    '## 输出格式',
    '### 1. 故障摘要',
    '- 设备/部件',
    '- 故障等级',
    '- 当前影响范围',
    '',
    '### 2. 根因候选',
    '- 候选根因',
    '- 置信度',
    '- 关键证据',
    '',
    '### 3. 排查路径',
    '- Step 1: 优先检查项',
    '- Step 2: 二级验证项',
    '- Step 3: 复核项',
    '',
    '### 4. 处置建议',
    '- 立即动作',
    '- 维修动作',
    '- 预防建议',
    '',
    '## 约束',
    '- 不在证据不足时直接输出唯一根因，必须给出候选集和置信度。',
    '- 不跳过安全检查项，涉及停机、温升、漏油、电气异常时优先输出风险提示。',
    '- 若缺少关键参数，必须明确列出待补充数据项。',
  ].join('\n')
}

function buildBusinessReference(ontology: OntologyCatalogEntry): string {
  if (ontology.code !== FAULT_DIAGNOSIS_CODE) {
    return `本体编码：${ontology.code}\n业务阶段：${ontology.phase}\n训练方向：${ontology.trainingType}`
  }

  return [
    '本体编码：0.0.1',
    '业务阶段：生产',
    '训练方向：分析类',
    '诊断对象：设备、部件、故障现象、子现象、检查点、根因、处置方案、参数',
    '推荐输入：设备台账 / 报警日志 / 点检记录 / 维修工单 / 传感器时序 / 历史案例',
    '关键判断链路：现象 -> 子现象 -> 检查点 -> 根因 -> 方案',
    '高频输出：根因候选、排查路径、处置建议、复机条件、预防项',
  ].join('\n')
}

function buildBusinessSkill(ontology: OntologyCatalogEntry): Skill {
  const hash = stableHash(ontology.code + ontology.name)
  const capabilities = inferCapabilities(ontology)
  const installs = 1200 + Math.round(ontology.dataCount * 0.7) + (hash % 320) + (ontology.code === FAULT_DIAGNOSIS_CODE ? 900 : 0)
  const usageCount = 1800 + ontology.dataCount + (hash % 1500)
  const successRate = Number((96 + (hash % 34) / 10).toFixed(1))
  const avgLatencyMs = 620 + (hash % 760)
  const recommendedScore = ontology.code === FAULT_DIAGNOSIS_CODE
    ? 100
    : clamp(78 + Math.floor(ontology.dataCount / 1400) + (hash % 10), 78, 99)
  const codeSlug = codeToSlug(ontology.code)

  return {
    id: `skill-biz-${codeSlug}`,
    name: `business-skill-${codeSlug}`,
    displayName: `${ontology.name}专家技能`,
    category: inferBusinessCategory(ontology),
    status: 'Active',
    description: `${SKILL_INDUSTRY_LABELS[ontology.industry]} · ${ontology.phase}场景业务 Skill，服务于 ${ontology.agentScene}`,
    instructions: buildBusinessInstructions(ontology, capabilities),
    reference: buildBusinessReference(ontology),
    templates: ontology.code === FAULT_DIAGNOSIS_CODE
      ? [
        { name: `${codeSlug}-diagnosis-playbook.md`, description: '故障诊断排查剧本模板' },
        { name: `${codeSlug}-repair-report.md`, description: '维修处置报告模板' },
      ]
      : [{ name: `${codeSlug}-playbook.md`, description: '业务 Skill 操作模板' }],
    scripts: ontology.code === FAULT_DIAGNOSIS_CODE
      ? [
        { name: `${codeSlug}-symptom-normalizer.py`, description: '故障现象归一化脚本' },
        { name: `${codeSlug}-root-cause-ranker.py`, description: '根因候选排序脚本' },
      ]
      : [{ name: `${codeSlug}-executor.py`, description: '业务规则执行脚本' }],
    dependencies: 'ontology-workspace, recommendation-engine',
    tags: [ontology.name, SKILL_INDUSTRY_LABELS[ontology.industry], ontology.phase, ontology.trainingType],
    installs,
    marketType: 'business',
    industry: ontology.industry,
    phase: ontology.phase,
    featured: ontology.code === FAULT_DIAGNOSIS_CODE || ontology.dataCount >= 8500,
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

function buildBusinessVariantSkill(
  ontology: OntologyCatalogEntry,
  template: (typeof GENERAL_SKILL_TEMPLATES)[number],
  variantIndex: number,
): Skill {
  const codeSlug = codeToSlug(ontology.code)
  const hash = stableHash(`${ontology.code}:${template.id}:${variantIndex}`)
  const recommendedScore = clamp((template.featureWeight || 70) - 6 + Math.floor(ontology.dataCount / 2400) + (hash % 8), 68, 95)

  return {
    id: `skill-biz-plus-${codeSlug}-${variantIndex + 1}-${template.id.replace(/^g-/, '')}`,
    name: `${template.name}-${codeSlug}`,
    displayName: `${ontology.name}${template.displayName}`,
    category: inferBusinessCategory(ontology),
    status: 'Active',
    description: `基于「${ontology.name}」沉淀的业务变体 Skill，围绕 ${ontology.agentScene} 提供 ${template.displayName} 能力。`,
    instructions: [
      `# ${ontology.name}${template.displayName}`,
      '',
      `> **业务母本体**：${ontology.name}（${ontology.code}）`,
      `> **能力基底**：${template.displayName}`,
      `> **核心场景**：${ontology.agentScene}`,
      '',
      '## 派生能力',
      ...template.capabilities.map((item) => `- ${item}`),
      '',
      '## 执行流程',
      '1. 读取当前本体定义、业务阶段和 Agent 场景。',
      '2. 在本体业务语义下执行分析、编排或校验链路。',
      '3. 输出可直接被业务流程消费的结构化结果。',
    ].join('\n'),
    reference: `本体编码：${ontology.code}\n派生能力：${template.displayName}\n业务阶段：${ontology.phase}\n训练方向：${ontology.trainingType}`,
    templates: template.templates || [],
    scripts: template.scripts || [],
    dependencies: template.dependencies,
    tags: [...new Set([...template.tags, ontology.name, SKILL_INDUSTRY_LABELS[ontology.industry], ontology.phase])],
    installs: 960 + Math.round(ontology.dataCount * 0.28) + (hash % 260),
    marketType: 'business',
    industry: ontology.industry,
    phase: ontology.phase,
    featured: Boolean(template.featured) && (ontology.code === '0.0.1' || ontology.dataCount >= 8500),
    recommendedScore,
    usageCount: 1500 + Math.round(ontology.dataCount * 0.62) + (hash % 960),
    successRate: Number((95 + (hash % 30) / 10).toFixed(1)),
    avgLatencyMs: 560 + (hash % 520),
    sourceOntologyCodes: [ontology.code],
    sourceOntologyNames: [ontology.name],
    recommendedFor: [ontology.agentScene],
    capabilities: [...new Set([...inferCapabilities(ontology), ...template.capabilities])].slice(0, 4),
    coverageLevel: 'enhanced',
    recommendationReason: `该业务 Skill 由「${ontology.name}」直接派生，针对 ${ontology.agentScene} 增补了 ${template.displayName} 能力。`,
    author: 'DeepexiOS',
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  }
}

function buildPlatformGeneralSkill(
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
    recommendationReason: `该平台级通用 Skill 已覆盖 ${linkedOntologies.length} 个本体，适合作为跨行业能力底座复用。`,
    author: 'DeepexiOS',
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP,
  }
}

function buildOntologyDerivedSkills() {
  const templateUsage = new Map<string, OntologyCatalogEntry[]>()
  const businessVariantsByCode = new Map<string, Skill[]>()
  const platformTemplateIdsByCode = new Map<string, string[]>()

  for (const ontology of ONTOLOGY_CATALOG) {
    const relatedTemplateIds = mapGeneralTemplatesForOntology(ontology)
    platformTemplateIdsByCode.set(ontology.code, relatedTemplateIds)

    for (const templateId of relatedTemplateIds) {
      const list = templateUsage.get(templateId) || []
      list.push(ontology)
      templateUsage.set(templateId, list)
    }

    const variantCount = BUSINESS_VARIANTS_PER_ONTOLOGY + (EXTRA_BUSINESS_VARIANT_CODES.has(ontology.code) ? 1 : 0)
    const businessVariantSkills = relatedTemplateIds
      .slice(0, variantCount)
      .map((templateId, index) => buildBusinessVariantSkill(ontology, GENERAL_TEMPLATE_BY_ID.get(templateId)!, index))

    businessVariantsByCode.set(ontology.code, businessVariantSkills)
  }

  return {
    businessVariantSkills: [...businessVariantsByCode.values()].flat(),
    businessVariantsByCode,
    platformTemplateIdsByCode,
    templateUsage,
  }
}

function buildOntologySkillMappings(
  businessSkills: Skill[],
  businessVariantsByCode: Map<string, Skill[]>,
  platformTemplateIdsByCode: Map<string, string[]>,
) {
  const businessByCode = new Map(businessSkills.map((skill) => [skill.sourceOntologyCodes[0], skill]))
  const mappings: OntologySkillMapping[] = ONTOLOGY_CATALOG.map((ontology) => {
    const variantIds = businessVariantsByCode.get(ontology.code)?.map((skill) => skill.id) || []
    const platformIds = platformTemplateIdsByCode.get(ontology.code) || []
    return {
      ontologyCode: ontology.code,
      ontologyName: ontology.name,
      skillIds: [...new Set([businessByCode.get(ontology.code)!.id, ...variantIds, ...platformIds])],
    }
  })
  return mappings
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
  const {
    businessVariantSkills,
    businessVariantsByCode,
    platformTemplateIdsByCode,
    templateUsage,
  } = buildOntologyDerivedSkills()
  const platformGeneralSkills = GENERAL_SKILL_TEMPLATES
    .map((template) => {
      const linkedOntologies = templateUsage.get(template.id)
      return linkedOntologies && linkedOntologies.length > 0 ? buildPlatformGeneralSkill(template, linkedOntologies) : null
    })
    .filter((skill): skill is Skill => Boolean(skill))
  const mappings = buildOntologySkillMappings(businessSkills, businessVariantsByCode, platformTemplateIdsByCode)

  const skills = [...businessSkills, ...businessVariantSkills, ...platformGeneralSkills].sort(
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
