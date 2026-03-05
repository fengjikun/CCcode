import type {
  ActionDefinition,
  ActionStatus,
  EntityPropertyConfig,
  EntityTypeConfig,
  ExtractionRun,
  FunctionDefinition,
  FunctionStatus,
  OntologyVersion,
  ProjectDetail,
  ProjectDocument,
  ProjectSummary,
  RelationTypeConfig,
  ReviewItem,
  ReviewStatus,
  SchemaConfig,
  SkillConfig,
} from '../types/projectMvp'

const STORAGE_KEY = 'ontology_mvp_projects_v2'
const LATENCY_MS = 180
const RUN_COMPLETE_MS = 1500
const PROPERTY_DATA_TYPES: EntityPropertyConfig['dataType'][] = [
  'STRING',
  'INTEGER',
  'FLOAT',
  'BOOLEAN',
  'DATE',
  'DATETIME',
  'JSON',
  'TEXT',
]

type Store = {
  projects: ProjectDetail[]
}

function defaultSkillConfigs(): SkillConfig[] {
  return [
    {
      id: 'skill_data_processing',
      code: 'data_processing',
      name: '数据处理',
      description: '负责清洗、切分、归一化文档内容',
      enabled: true,
      prompt: '先做文档清洗与结构化切分，输出标准化片段并保留证据位置。',
      source: 'built_in',
      tags: ['openclaw-bundled'],
      blocked: true,
      missing: 'bin:op',
    },
    {
      id: 'skill_graph_synthesis',
      code: 'graph_synthesis',
      name: '图谱合成',
      description: '负责实体关系抽取与对齐入图',
      enabled: true,
      prompt: '基于范围配置抽取实体关系，进行本体对齐，输出可审核候选结果。',
      source: 'built_in',
      tags: ['openclaw-bundled'],
      blocked: false,
      missing: '',
    },
  ]
}

function nowIso(): string {
  return new Date().toISOString()
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms)
  })
}

function normalizeSkillList(skillsLike: any[]): SkillConfig[] {
  const defaults = defaultSkillConfigs()
  const sourceSkills = Array.isArray(skillsLike) ? skillsLike : []
  const byCode = new Map<string, any>()
  sourceSkills.forEach((item: any) => {
    if (typeof item?.code === 'string') {
      byCode.set(item.code, item)
    }
  })

  const builtIns = defaults.map(skill => {
    const raw = byCode.get(skill.code)
    if (!raw || typeof raw !== 'object') return skill
    return {
      ...skill,
      enabled: typeof raw.enabled === 'boolean' ? raw.enabled : skill.enabled,
      prompt: typeof raw.prompt === 'string' ? raw.prompt : skill.prompt,
      blocked: typeof raw.blocked === 'boolean' ? raw.blocked : skill.blocked,
      missing: typeof raw.missing === 'string' ? raw.missing : skill.missing,
    }
  })

  const customSkills: SkillConfig[] = sourceSkills
    .filter((item: any) => item && (item.code === 'custom' || item.source === 'uploaded'))
    .map((item: any) => ({
      id: typeof item.id === 'string' ? item.id : makeId('skill'),
      code: 'custom',
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : '自定义 Skill',
      description: typeof item.description === 'string' ? item.description : '',
      enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
      prompt: typeof item.prompt === 'string' ? item.prompt : '',
      source: 'uploaded',
      tags: Array.isArray(item.tags) ? item.tags : ['user-uploaded'],
      blocked: Boolean(item.blocked),
      missing: typeof item.missing === 'string' ? item.missing : '',
      fileName: typeof item.fileName === 'string' ? item.fileName : '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso(),
    }))

  return [...builtIns, ...customSkills]
}

function normalizeEntityProperties(propertiesLike: any[]): EntityPropertyConfig[] {
  const source = Array.isArray(propertiesLike) ? propertiesLike : []
  return source
    .filter((item: any) => item && typeof item === 'object' && typeof item.name === 'string')
    .map((item: any, index: number) => {
      const normalizedDataType = (
        typeof item.dataType === 'string' && PROPERTY_DATA_TYPES.includes(item.dataType as EntityPropertyConfig['dataType'])
          ? item.dataType
          : 'STRING'
      ) as EntityPropertyConfig['dataType']

      return {
        id: typeof item.id === 'string' ? item.id : makeId('prop'),
        name: item.name.trim(),
        displayName: typeof item.displayName === 'string' && item.displayName.trim() ? item.displayName.trim() : item.name.trim(),
        dataType: normalizedDataType,
        required: Boolean(item.required),
        defaultValue: typeof item.defaultValue === 'string' ? item.defaultValue : '',
        description: typeof item.description === 'string' ? item.description : '',
        sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
      }
    })
}

function normalizeEntityTypes(entityTypesLike: any[]): EntityTypeConfig[] {
  const source = Array.isArray(entityTypesLike) ? entityTypesLike : []
  return source
    .filter((item: any) => item && typeof item === 'object' && typeof item.name === 'string')
    .map((item: any) => ({
      id: typeof item.id === 'string' ? item.id : makeId('ent'),
      name: item.name.trim(),
      description: typeof item.description === 'string' ? item.description : '',
      properties: normalizeEntityProperties(item.properties),
    }))
}

function normalizeSchemaConfig(schemaLike: any): SchemaConfig {
  return {
    entityTypes: normalizeEntityTypes(schemaLike?.entityTypes),
    relationTypes: Array.isArray(schemaLike?.relationTypes) ? schemaLike.relationTypes : [],
    entityScope: typeof schemaLike?.entityScope === 'string' ? schemaLike.entityScope : '',
    relationScope: typeof schemaLike?.relationScope === 'string' ? schemaLike.relationScope : '',
    skills: normalizeSkillList(schemaLike?.skills),
    updatedAt: typeof schemaLike?.updatedAt === 'string' ? schemaLike.updatedAt : nowIso(),
  }
}

function normalizeStore(storeLike: any): Store {
  const projects = Array.isArray(storeLike?.projects) ? storeLike.projects : []
  return {
    projects: projects.map((project: any) => ({
      ...project,
      documents: Array.isArray(project?.documents) ? project.documents : [],
      runs: Array.isArray(project?.runs) ? project.runs : [],
      versions: Array.isArray(project?.versions) ? project.versions : [],
      actions: Array.isArray(project?.actions) ? project.actions : [],
      functions: Array.isArray(project?.functions) ? project.functions : [],
      schemaConfig: normalizeSchemaConfig(project?.schemaConfig),
    })),
  }
}

function readStore(): Store {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seeded = seedStore()
    writeStore(seeded)
    return seeded
  }

  try {
    const parsed = JSON.parse(raw) as Store
    if (!parsed.projects || !Array.isArray(parsed.projects)) {
      throw new Error('invalid store')
    }
    const normalized = normalizeStore(parsed)
    writeStore(normalized)
    return normalized
  } catch {
    const seeded = seedStore()
    writeStore(seeded)
    return seeded
  }
}

function writeStore(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function mutateStore<T>(updater: (store: Store) => T): T {
  const store = readStore()
  const result = updater(store)
  writeStore(store)
  return result
}

function ensureProject(store: Store, projectId: string): ProjectDetail {
  const project = store.projects.find(item => item.id === projectId)
  if (!project) {
    throw new Error('项目不存在或已删除')
  }
  return project
}

function toSummary(project: ProjectDetail): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    documentCount: project.documents.length,
    versionCount: project.versions.length,
    latestRunStatus: project.runs[0]?.status,
  }
}

function normalizeText(value: string): string {
  return value.trim()
}

function updateProjectTime(project: ProjectDetail): void {
  project.updatedAt = nowIso()
}

function generateReviewItems(project: ProjectDetail): ReviewItem[] {
  const enabledDocs = project.documents.filter(doc => doc.enabled)
  const sourceDocs = enabledDocs.length > 0 ? enabledDocs : [{ name: '文档内容片段' }]

  const entityItems: ReviewItem[] = []
  for (const doc of sourceDocs) {
    for (const entityType of project.schemaConfig.entityTypes) {
      entityItems.push({
        id: makeId('review'),
        kind: 'ENTITY',
        title: `${entityType.name}::候选_${doc.name.replace(/\s+/g, '_').slice(0, 16)}`,
        evidence: `${doc.name} 中出现与 ${entityType.name} 相关描述，需确认是否复用已有实体。`,
        confidence: Number((0.74 + Math.random() * 0.2).toFixed(2)),
        status: 'PENDING',
      })
    }
  }

  const relationItems: ReviewItem[] = []
  for (const doc of sourceDocs) {
    for (const relationType of project.schemaConfig.relationTypes) {
      relationItems.push({
        id: makeId('review'),
        kind: 'RELATION',
        title: `${relationType.domain} -[${relationType.name}]-> ${relationType.range}`,
        evidence: `${doc.name} 中发现 ${relationType.name} 关系的语义证据，待审核。`,
        confidence: Number((0.7 + Math.random() * 0.22).toFixed(2)),
        status: 'PENDING',
      })
    }
  }

  return [...entityItems, ...relationItems].slice(0, 36)
}

function recalcRunStats(run: ExtractionRun): void {
  run.candidateEntityCount = run.reviewItems.filter(item => item.kind === 'ENTITY').length
  run.candidateRelationCount = run.reviewItems.filter(item => item.kind === 'RELATION').length
  run.pendingReviewCount = run.reviewItems.filter(item => item.status === 'PENDING').length
}

function completeRunAsync(projectId: string, runId: string): void {
  window.setTimeout(() => {
    mutateStore(store => {
      const project = ensureProject(store, projectId)
      const run = project.runs.find(item => item.id === runId)
      if (!run || run.status !== 'RUNNING') {
        return
      }
      run.status = 'COMPLETED'
      run.progress = 100
      run.completedAt = nowIso()
      recalcRunStats(run)
      updateProjectTime(project)
    })
  }, RUN_COMPLETE_MS)
}

function defaultSchema(): SchemaConfig {
  return {
    entityTypes: [
      {
        id: makeId('ent'),
        name: 'Device',
        description: '设备实体',
        properties: [
          { id: makeId('prop'), name: 'model', displayName: '设备型号', dataType: 'STRING', required: true, defaultValue: '', description: '', sortOrder: 0 },
          { id: makeId('prop'), name: 'serial_no', displayName: '序列号', dataType: 'STRING', required: false, defaultValue: '', description: '', sortOrder: 1 },
        ],
      },
      {
        id: makeId('ent'),
        name: 'FaultPhenomenon',
        description: '故障现象',
        properties: [
          { id: makeId('prop'), name: 'alarm_code', displayName: '报警码', dataType: 'STRING', required: false, defaultValue: '', description: '', sortOrder: 0 },
          { id: makeId('prop'), name: 'severity', displayName: '严重级别', dataType: 'STRING', required: false, defaultValue: '', description: '', sortOrder: 1 },
        ],
      },
      {
        id: makeId('ent'),
        name: 'Checkpoint',
        description: '排查点',
        properties: [
          { id: makeId('prop'), name: 'step_no', displayName: '步骤编号', dataType: 'INTEGER', required: false, defaultValue: '', description: '', sortOrder: 0 },
        ],
      },
      {
        id: makeId('ent'),
        name: 'Cause',
        description: '故障原因',
        properties: [
          { id: makeId('prop'), name: 'root_cause', displayName: '根因描述', dataType: 'TEXT', required: true, defaultValue: '', description: '', sortOrder: 0 },
        ],
      },
      {
        id: makeId('ent'),
        name: 'Solution',
        description: '解决方案',
        properties: [
          { id: makeId('prop'), name: 'operation', displayName: '操作说明', dataType: 'TEXT', required: true, defaultValue: '', description: '', sortOrder: 0 },
          { id: makeId('prop'), name: 'duration_min', displayName: '预计耗时(分钟)', dataType: 'INTEGER', required: false, defaultValue: '', description: '', sortOrder: 1 },
        ],
      },
    ],
    relationTypes: [
      { id: makeId('rel'), name: 'located_in', domain: 'FaultPhenomenon', range: 'Device', description: '现象位于设备' },
      { id: makeId('rel'), name: 'requires_check', domain: 'FaultPhenomenon', range: 'Checkpoint', description: '现象需要排查点' },
      { id: makeId('rel'), name: 'indicates', domain: 'Checkpoint', range: 'Cause', description: '排查点发现原因' },
      { id: makeId('rel'), name: 'resolved_by', domain: 'Cause', range: 'Solution', description: '原因对应解决方案' },
    ],
    entityScope: '仅抽取与设备故障诊断相关的设备、现象、排查点、原因、方案实体。',
    relationScope: '仅抽取配置的关系类型，关系必须满足 domain/range 约束。',
    skills: defaultSkillConfigs(),
    updatedAt: nowIso(),
  }
}

function makeSeedReviewItemsA(): ReviewItem[] {
  return [
    { id: makeId('review'), kind: 'ENTITY', title: 'Device::A型激光切割机', evidence: '“A型激光切割机开机时提示W轴限位报警”', confidence: 0.98, status: 'APPROVED' },
    { id: makeId('review'), kind: 'ENTITY', title: 'FaultPhenomenon::W轴限位报警', evidence: '文档标题与正文多次出现 “W轴限位报警”', confidence: 0.97, status: 'APPROVED' },
    { id: makeId('review'), kind: 'ENTITY', title: 'Checkpoint::检查IO端口限位点位', evidence: '“检查IO端口中的W正限位/W负限位”', confidence: 0.9, status: 'APPROVED' },
    { id: makeId('review'), kind: 'ENTITY', title: 'Cause::点位常闭常开配置错误', evidence: '“点位没有紫色背景色，说明配置错误”', confidence: 0.88, status: 'APPROVED' },
    { id: makeId('review'), kind: 'ENTITY', title: 'Solution::恢复常闭状态并保存', evidence: '“将点位改回常闭状态后保存即可”', confidence: 0.95, status: 'APPROVED' },
    { id: makeId('review'), kind: 'RELATION', title: 'FaultPhenomenon -[located_in]-> Device', evidence: '报警与 A型激光切割机绑定描述清晰', confidence: 0.94, status: 'APPROVED' },
    { id: makeId('review'), kind: 'RELATION', title: 'FaultPhenomenon -[requires_check]-> Checkpoint', evidence: '文本给出明确排查步骤', confidence: 0.92, status: 'APPROVED' },
    { id: makeId('review'), kind: 'RELATION', title: 'Checkpoint -[indicates]-> Cause', evidence: '排查结果直接指向点位配置错误', confidence: 0.85, status: 'APPROVED' },
    { id: makeId('review'), kind: 'RELATION', title: 'Cause -[resolved_by]-> Solution', evidence: '原因与解决方案一一对应', confidence: 0.93, status: 'APPROVED' },
  ]
}

function makeSeedReviewItemsB(): ReviewItem[] {
  return [
    { id: makeId('review'), kind: 'ENTITY', title: 'Device::B型切割机', evidence: '“B型切割机在复位后仍报警”', confidence: 0.89, status: 'APPROVED' },
    { id: makeId('review'), kind: 'ENTITY', title: 'FaultPhenomenon::开机就报', evidence: '文档中描述“开机即报警”', confidence: 0.87, status: 'APPROVED' },
    { id: makeId('review'), kind: 'ENTITY', title: 'Checkpoint::检查限位开关安装位置', evidence: '“确认限位开关安装是否偏移”', confidence: 0.82, status: 'PENDING' },
    { id: makeId('review'), kind: 'ENTITY', title: 'Cause::传感器线缆虚接', evidence: '“排查发现传感器线缆接触不稳定”', confidence: 0.79, status: 'APPROVED' },
    { id: makeId('review'), kind: 'ENTITY', title: 'Solution::重新压接并加固线缆', evidence: '“重新压接端子并固定线缆”', confidence: 0.84, status: 'APPROVED' },
    { id: makeId('review'), kind: 'RELATION', title: 'FaultPhenomenon -[located_in]-> Device', evidence: '现象与 B 型设备存在上下文对应', confidence: 0.88, status: 'APPROVED' },
    { id: makeId('review'), kind: 'RELATION', title: 'FaultPhenomenon -[requires_check]-> Checkpoint', evidence: '步骤建议中给出排查点', confidence: 0.81, status: 'PENDING' },
    { id: makeId('review'), kind: 'RELATION', title: 'Checkpoint -[indicates]-> Cause', evidence: '排查点与原因关联较弱', confidence: 0.68, status: 'REJECTED' },
    { id: makeId('review'), kind: 'RELATION', title: 'Cause -[resolved_by]-> Solution', evidence: '描述中存在解决动作', confidence: 0.86, status: 'APPROVED' },
  ]
}

function makeSeedReviewItemsC(): ReviewItem[] {
  return [
    { id: makeId('review'), kind: 'ENTITY', title: 'Device::C型切割机', evidence: '设备清单中存在 C 型切割机描述', confidence: 0.86, status: 'PENDING' },
    { id: makeId('review'), kind: 'ENTITY', title: 'FaultPhenomenon::回零失败', evidence: '“设备上电后回零失败”', confidence: 0.83, status: 'PENDING' },
    { id: makeId('review'), kind: 'ENTITY', title: 'Checkpoint::检查伺服驱动告警码', evidence: '建议读取伺服驱动错误码', confidence: 0.88, status: 'PENDING' },
    { id: makeId('review'), kind: 'ENTITY', title: 'Cause::参数组版本不一致', evidence: '不同轴参数版本不一致', confidence: 0.76, status: 'PENDING' },
    { id: makeId('review'), kind: 'ENTITY', title: 'Solution::统一参数组并重启', evidence: '“统一参数组版本后重启设备”', confidence: 0.85, status: 'PENDING' },
    { id: makeId('review'), kind: 'RELATION', title: 'FaultPhenomenon -[requires_check]-> Checkpoint', evidence: '现象对应建议排查项', confidence: 0.84, status: 'PENDING' },
    { id: makeId('review'), kind: 'RELATION', title: 'Checkpoint -[indicates]-> Cause', evidence: '检查结果可能指向参数版本问题', confidence: 0.74, status: 'PENDING' },
    { id: makeId('review'), kind: 'RELATION', title: 'Cause -[resolved_by]-> Solution', evidence: '原因与修复动作存在匹配', confidence: 0.82, status: 'PENDING' },
  ]
}

function seedStore(): Store {
  const createdAt = nowIso()
  const schema = defaultSchema()
  const runAItems = makeSeedReviewItemsA()
  const runBItems = makeSeedReviewItemsB()
  const runCItems = makeSeedReviewItemsC()

  const runA: ExtractionRun = {
    id: makeId('run'),
    status: 'COMPLETED',
    progress: 100,
    createdAt: isoMinutesAgo(2400),
    completedAt: isoMinutesAgo(2380),
    candidateEntityCount: 0,
    candidateRelationCount: 0,
    pendingReviewCount: 0,
    reviewItems: runAItems,
  }
  recalcRunStats(runA)

  const runB: ExtractionRun = {
    id: makeId('run'),
    status: 'COMPLETED',
    progress: 100,
    createdAt: isoMinutesAgo(780),
    completedAt: isoMinutesAgo(760),
    candidateEntityCount: 0,
    candidateRelationCount: 0,
    pendingReviewCount: 0,
    reviewItems: runBItems,
  }
  recalcRunStats(runB)

  const runC: ExtractionRun = {
    id: makeId('run'),
    status: 'COMPLETED',
    progress: 100,
    createdAt: isoMinutesAgo(18),
    completedAt: isoMinutesAgo(8),
    candidateEntityCount: 0,
    candidateRelationCount: 0,
    pendingReviewCount: 0,
    reviewItems: runCItems,
  }
  recalcRunStats(runC)

  const version1: OntologyVersion = {
    id: makeId('ver'),
    version: 'v1',
    label: '首版故障诊断本体',
    createdAt: isoMinutesAgo(2360),
    sourceRunId: runA.id,
    entityCount: runA.reviewItems.filter(item => item.kind === 'ENTITY' && item.status === 'APPROVED').length,
    relationCount: runA.reviewItems.filter(item => item.kind === 'RELATION' && item.status === 'APPROVED').length,
  }

  const version2: OntologyVersion = {
    id: makeId('ver'),
    version: 'v2',
    label: '扩展B型设备场景',
    createdAt: isoMinutesAgo(720),
    sourceRunId: runB.id,
    entityCount: runB.reviewItems.filter(item => item.kind === 'ENTITY' && item.status === 'APPROVED').length,
    relationCount: runB.reviewItems.filter(item => item.kind === 'RELATION' && item.status === 'APPROVED').length,
  }

  const demoProject: ProjectDetail = {
    id: makeId('proj'),
    name: '设备故障本体原型',
    description: '用于前端流程评审：项目级文档上传、全量抽取、审核与版本发布',
    createdAt,
    updatedAt: nowIso(),
    currentVersionId: version2.id,
    documents: [
      {
        id: makeId('doc'),
        name: '示例故障手册.md',
        fileType: 'md',
        size: 20480,
        status: 'READY',
        enabled: true,
        uploadedAt: isoMinutesAgo(2600),
      },
      {
        id: makeId('doc'),
        name: '设备报警排查指南.docx',
        fileType: 'docx',
        size: 156432,
        status: 'READY',
        enabled: true,
        uploadedAt: isoMinutesAgo(2300),
      },
      {
        id: makeId('doc'),
        name: '历史检修记录汇总.md',
        fileType: 'md',
        size: 98320,
        status: 'READY',
        enabled: false,
        uploadedAt: isoMinutesAgo(800),
      },
    ],
    schemaConfig: schema,
    runs: [runC, runB, runA],
    versions: [version2, version1],
    actions: [
      { id: makeId('act'), name: '采集设备参数', description: '自动采集 PLC 参数', status: 'ACTIVE' },
      { id: makeId('act'), name: '拉取IO点位快照', description: '采集正/负限位点位状态', status: 'ACTIVE' },
      { id: makeId('act'), name: '生成排查建议单', description: '按本体关系自动生成排查步骤', status: 'DRAFT' },
    ],
    functions: [
      {
        id: makeId('fn'),
        name: 'normalize_entity_name',
        description: '实体名称规范化函数',
        scriptContent: 'def run(value):\n    return value.strip().lower()',
        status: 'ACTIVE',
      },
      {
        id: makeId('fn'),
        name: 'merge_alias_candidates',
        description: '合并别名候选实体',
        scriptContent: 'def run(candidates):\n    return sorted(candidates, key=lambda x: x.get("score", 0), reverse=True)',
        status: 'DRAFT',
      },
    ],
  }

  return { projects: [demoProject] }
}

function getExt(name: string): 'docx' | 'md' {
  const lower = name.toLowerCase()
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.md')) return 'md'
  throw new Error('仅支持 .docx 或 .md 文档')
}

export async function listProjects(): Promise<ProjectSummary[]> {
  await sleep(LATENCY_MS)
  const store = readStore()
  const items = store.projects
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toSummary)
  return clone(items)
}

export async function createProject(name: string, description?: string): Promise<ProjectSummary> {
  const normalized = normalizeText(name)
  if (!normalized) {
    throw new Error('项目名称不能为空')
  }

  const result = mutateStore(store => {
    if (store.projects.some(item => item.name === normalized)) {
      throw new Error('项目名称已存在')
    }

    const createdAt = nowIso()
    const project: ProjectDetail = {
      id: makeId('proj'),
      name: normalized,
      description: normalizeText(description || ''),
      createdAt,
      updatedAt: createdAt,
      currentVersionId: undefined,
      documents: [],
      schemaConfig: {
        entityTypes: [],
        relationTypes: [],
        entityScope: '',
        relationScope: '',
        skills: defaultSkillConfigs().map(skill => ({ ...skill, prompt: '' })),
        updatedAt: createdAt,
      },
      runs: [],
      versions: [],
      actions: [],
      functions: [],
    }

    store.projects.unshift(project)
    return toSummary(project)
  })

  await sleep(LATENCY_MS)
  return clone(result)
}

export async function deleteProject(projectId: string): Promise<void> {
  mutateStore(store => {
    const index = store.projects.findIndex(item => item.id === projectId)
    if (index < 0) {
      throw new Error('项目不存在或已删除')
    }
    store.projects.splice(index, 1)
  })
  await sleep(LATENCY_MS)
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetail> {
  await sleep(LATENCY_MS)
  const store = readStore()
  const project = store.projects.find(item => item.id === projectId)
  if (!project) {
    throw new Error('项目不存在或已删除')
  }
  return clone(project)
}

export async function uploadProjectDocument(projectId: string, file: File): Promise<ProjectDocument> {
  const result = mutateStore(store => {
    const project = ensureProject(store, projectId)
    const doc: ProjectDocument = {
      id: makeId('doc'),
      name: file.name,
      fileType: getExt(file.name),
      size: file.size,
      status: 'READY',
      enabled: true,
      uploadedAt: nowIso(),
    }
    project.documents.unshift(doc)
    updateProjectTime(project)
    return doc
  })

  await sleep(LATENCY_MS)
  return clone(result)
}

export async function deleteProjectDocument(projectId: string, documentId: string): Promise<void> {
  mutateStore(store => {
    const project = ensureProject(store, projectId)
    const index = project.documents.findIndex(item => item.id === documentId)
    if (index < 0) {
      throw new Error('文档不存在')
    }
    project.documents.splice(index, 1)
    updateProjectTime(project)
  })
  await sleep(LATENCY_MS)
}

export async function setProjectDocumentEnabled(
  projectId: string,
  documentId: string,
  enabled: boolean,
): Promise<void> {
  mutateStore(store => {
    const project = ensureProject(store, projectId)
    const doc = project.documents.find(item => item.id === documentId)
    if (!doc) {
      throw new Error('文档不存在')
    }
    doc.enabled = enabled
    updateProjectTime(project)
  })
  await sleep(LATENCY_MS)
}

export async function createEntityType(
  projectId: string,
  name: string,
  description?: string,
): Promise<EntityTypeConfig> {
  const normalized = normalizeText(name)
  if (!normalized) {
    throw new Error('实体类型名称不能为空')
  }

  const result = mutateStore(store => {
    const project = ensureProject(store, projectId)
    if (project.schemaConfig.entityTypes.some(item => item.name === normalized)) {
      throw new Error('实体类型已存在')
    }
    const entityType: EntityTypeConfig = {
      id: makeId('ent'),
      name: normalized,
      description: normalizeText(description || ''),
      properties: [],
    }
    project.schemaConfig.entityTypes.push(entityType)
    project.schemaConfig.updatedAt = nowIso()
    updateProjectTime(project)
    return entityType
  })

  await sleep(LATENCY_MS)
  return clone(result)
}

export async function removeEntityType(projectId: string, entityTypeId: string): Promise<void> {
  mutateStore(store => {
    const project = ensureProject(store, projectId)
    const index = project.schemaConfig.entityTypes.findIndex(item => item.id === entityTypeId)
    if (index < 0) {
      throw new Error('实体类型不存在')
    }
    const removed = project.schemaConfig.entityTypes[index]
    project.schemaConfig.entityTypes.splice(index, 1)
    project.schemaConfig.relationTypes = project.schemaConfig.relationTypes.filter(
      item => item.domain !== removed.name && item.range !== removed.name,
    )
    project.schemaConfig.updatedAt = nowIso()
    updateProjectTime(project)
  })
  await sleep(LATENCY_MS)
}

export async function createEntityProperty(
  projectId: string,
  entityTypeId: string,
  payload: {
    name: string
    displayName?: string
    dataType?: EntityPropertyConfig['dataType']
    required?: boolean
    defaultValue?: string
    description?: string
    sortOrder?: number
  },
): Promise<EntityPropertyConfig> {
  const propertyName = normalizeText(payload.name)
  if (!propertyName) {
    throw new Error('属性名称不能为空')
  }

  const result = mutateStore(store => {
    const project = ensureProject(store, projectId)
    const entity = project.schemaConfig.entityTypes.find(item => item.id === entityTypeId)
    if (!entity) {
      throw new Error('实体类型不存在')
    }
    if (entity.properties.some(item => item.name === propertyName)) {
      throw new Error('属性名称已存在')
    }

    const property: EntityPropertyConfig = {
      id: makeId('prop'),
      name: propertyName,
      displayName: normalizeText(payload.displayName || '') || propertyName,
      dataType: payload.dataType || 'STRING',
      required: Boolean(payload.required),
      defaultValue: normalizeText(payload.defaultValue || ''),
      description: normalizeText(payload.description || ''),
      sortOrder: typeof payload.sortOrder === 'number' ? payload.sortOrder : entity.properties.length,
    }

    entity.properties.push(property)
    entity.properties.sort((a, b) => a.sortOrder - b.sortOrder)
    project.schemaConfig.updatedAt = nowIso()
    updateProjectTime(project)
    return property
  })

  await sleep(LATENCY_MS)
  return clone(result)
}

export async function removeEntityProperty(
  projectId: string,
  entityTypeId: string,
  propertyId: string,
): Promise<void> {
  mutateStore(store => {
    const project = ensureProject(store, projectId)
    const entity = project.schemaConfig.entityTypes.find(item => item.id === entityTypeId)
    if (!entity) {
      throw new Error('实体类型不存在')
    }
    const index = entity.properties.findIndex(item => item.id === propertyId)
    if (index < 0) {
      throw new Error('属性不存在')
    }
    entity.properties.splice(index, 1)
    project.schemaConfig.updatedAt = nowIso()
    updateProjectTime(project)
  })
  await sleep(LATENCY_MS)
}

export async function createRelationType(
  projectId: string,
  relation: { name: string; domain: string; range: string; description?: string },
): Promise<RelationTypeConfig> {
  const relationName = normalizeText(relation.name)
  if (!relationName) {
    throw new Error('关系类型名称不能为空')
  }

  const result = mutateStore(store => {
    const project = ensureProject(store, projectId)
    const hasDomain = project.schemaConfig.entityTypes.some(item => item.name === relation.domain)
    const hasRange = project.schemaConfig.entityTypes.some(item => item.name === relation.range)
    if (!hasDomain || !hasRange) {
      throw new Error('关系的 domain/range 必须来自实体类型')
    }
    if (project.schemaConfig.relationTypes.some(item => item.name === relationName)) {
      throw new Error('关系类型已存在')
    }

    const relationType: RelationTypeConfig = {
      id: makeId('rel'),
      name: relationName,
      domain: relation.domain,
      range: relation.range,
      description: normalizeText(relation.description || ''),
    }
    project.schemaConfig.relationTypes.push(relationType)
    project.schemaConfig.updatedAt = nowIso()
    updateProjectTime(project)
    return relationType
  })

  await sleep(LATENCY_MS)
  return clone(result)
}

export async function removeRelationType(projectId: string, relationTypeId: string): Promise<void> {
  mutateStore(store => {
    const project = ensureProject(store, projectId)
    const index = project.schemaConfig.relationTypes.findIndex(item => item.id === relationTypeId)
    if (index < 0) {
      throw new Error('关系类型不存在')
    }
    project.schemaConfig.relationTypes.splice(index, 1)
    project.schemaConfig.updatedAt = nowIso()
    updateProjectTime(project)
  })
  await sleep(LATENCY_MS)
}

export async function updateSchemaPrompts(
  projectId: string,
  payload: {
    entityScope: string
    relationScope: string
    skills: SkillConfig[]
  },
): Promise<SchemaConfig> {
  const result = mutateStore(store => {
    const project = ensureProject(store, projectId)
    project.schemaConfig.entityScope = payload.entityScope
    project.schemaConfig.relationScope = payload.relationScope
    project.schemaConfig.skills = normalizeSkillList(payload.skills)
    project.schemaConfig.updatedAt = nowIso()
    updateProjectTime(project)
    return project.schemaConfig
  })

  await sleep(LATENCY_MS)
  return clone(result)
}

export async function uploadCustomSkill(projectId: string, file: File): Promise<SkillConfig> {
  const lower = file.name.toLowerCase()
  if (!lower.endsWith('.zip')) {
    throw new Error('仅支持上传 zip 格式的 Skill 包')
  }

  const baseName = file.name.replace(/\.[^/.]+$/, '')

  const result = mutateStore(store => {
    const project = ensureProject(store, projectId)
    const current = Array.isArray(project.schemaConfig.skills)
      ? project.schemaConfig.skills
      : defaultSkillConfigs()

    const customSkill: SkillConfig = {
      id: makeId('skill'),
      code: 'custom',
      name: baseName || `自定义Skill_${current.length + 1}`,
      description: '用户上传的 Skill 包（zip），目录结构参考 skills/ontology-generator。',
      enabled: true,
      prompt: '',
      source: 'uploaded',
      tags: ['user-uploaded', 'zip-skill'],
      blocked: false,
      missing: '',
      fileName: file.name,
      createdAt: nowIso(),
    }

    project.schemaConfig.skills = normalizeSkillList([...current, customSkill])
    project.schemaConfig.updatedAt = nowIso()
    updateProjectTime(project)
    return customSkill
  })

  await sleep(LATENCY_MS)
  return clone(result)
}

export async function removeCustomSkill(projectId: string, skillId: string): Promise<void> {
  mutateStore(store => {
    const project = ensureProject(store, projectId)
    const current = Array.isArray(project.schemaConfig.skills)
      ? project.schemaConfig.skills
      : defaultSkillConfigs()

    const target = current.find(skill => skill.id === skillId)
    if (!target) {
      throw new Error('Skill 不存在')
    }
    if (target.source !== 'uploaded') {
      throw new Error('内置 Skill 不允许删除')
    }

    project.schemaConfig.skills = current.filter(skill => skill.id !== skillId)
    project.schemaConfig.updatedAt = nowIso()
    updateProjectTime(project)
  })
  await sleep(LATENCY_MS)
}

export async function runProjectExtraction(projectId: string): Promise<ExtractionRun> {
  const run = mutateStore(store => {
    const project = ensureProject(store, projectId)
    const enabledDocs = project.documents.filter(item => item.enabled)
    if (enabledDocs.length === 0) {
      throw new Error('请至少启用一个文档后再执行抽取')
    }
    if (project.schemaConfig.entityTypes.length === 0) {
      throw new Error('请先配置实体类型')
    }
    const skills = Array.isArray(project.schemaConfig.skills)
      ? project.schemaConfig.skills
      : defaultSkillConfigs()
    if (!skills.some(skill => skill.enabled && !skill.blocked)) {
      throw new Error('请至少启用一个 Skill')
    }

    const reviewItems = generateReviewItems(project)
    const extractionRun: ExtractionRun = {
      id: makeId('run'),
      status: 'RUNNING',
      progress: 15,
      createdAt: nowIso(),
      candidateEntityCount: reviewItems.filter(item => item.kind === 'ENTITY').length,
      candidateRelationCount: reviewItems.filter(item => item.kind === 'RELATION').length,
      pendingReviewCount: reviewItems.length,
      reviewItems,
    }

    project.runs.unshift(extractionRun)
    updateProjectTime(project)
    return extractionRun
  })

  completeRunAsync(projectId, run.id)
  await sleep(LATENCY_MS)
  return clone(run)
}

export async function updateRunReviewItem(
  projectId: string,
  runId: string,
  itemId: string,
  status: ReviewStatus,
): Promise<ReviewItem> {
  const result = mutateStore(store => {
    const project = ensureProject(store, projectId)
    const run = project.runs.find(item => item.id === runId)
    if (!run) {
      throw new Error('抽取任务不存在')
    }
    const reviewItem = run.reviewItems.find(item => item.id === itemId)
    if (!reviewItem) {
      throw new Error('审核项不存在')
    }
    reviewItem.status = status
    recalcRunStats(run)
    updateProjectTime(project)
    return reviewItem
  })

  await sleep(LATENCY_MS)
  return clone(result)
}

export async function publishRunVersion(
  projectId: string,
  runId: string,
  label: string,
): Promise<OntologyVersion> {
  const version = mutateStore(store => {
    const project = ensureProject(store, projectId)
    const run = project.runs.find(item => item.id === runId)
    if (!run) {
      throw new Error('抽取任务不存在')
    }
    if (run.status !== 'COMPLETED') {
      throw new Error('请等待抽取任务完成后再发布')
    }

    const versionIndex = project.versions.length + 1
    const approvedEntities = run.reviewItems.filter(item => item.kind === 'ENTITY' && item.status === 'APPROVED').length
    const approvedRelations = run.reviewItems.filter(item => item.kind === 'RELATION' && item.status === 'APPROVED').length

    const ontologyVersion: OntologyVersion = {
      id: makeId('ver'),
      version: `v${versionIndex}`,
      label: normalizeText(label) || `本体版本 v${versionIndex}`,
      createdAt: nowIso(),
      sourceRunId: run.id,
      entityCount: approvedEntities,
      relationCount: approvedRelations,
    }
    project.versions.unshift(ontologyVersion)
    project.currentVersionId = ontologyVersion.id
    updateProjectTime(project)
    return ontologyVersion
  })

  await sleep(LATENCY_MS)
  return clone(version)
}

export async function createProjectAction(
  projectId: string,
  payload: { name: string; description?: string; status?: ActionStatus },
): Promise<ActionDefinition> {
  const normalizedName = normalizeText(payload.name)
  if (!normalizedName) {
    throw new Error('动作名称不能为空')
  }

  const action = mutateStore(store => {
    const project = ensureProject(store, projectId)
    const item: ActionDefinition = {
      id: makeId('act'),
      name: normalizedName,
      description: normalizeText(payload.description || ''),
      status: payload.status || 'DRAFT',
    }
    project.actions.unshift(item)
    updateProjectTime(project)
    return item
  })

  await sleep(LATENCY_MS)
  return clone(action)
}

export async function setActionStatus(
  projectId: string,
  actionId: string,
  status: ActionStatus,
): Promise<void> {
  mutateStore(store => {
    const project = ensureProject(store, projectId)
    const action = project.actions.find(item => item.id === actionId)
    if (!action) {
      throw new Error('动作不存在')
    }
    action.status = status
    updateProjectTime(project)
  })
  await sleep(LATENCY_MS)
}

export async function deleteProjectAction(projectId: string, actionId: string): Promise<void> {
  mutateStore(store => {
    const project = ensureProject(store, projectId)
    const index = project.actions.findIndex(item => item.id === actionId)
    if (index < 0) {
      throw new Error('动作不存在')
    }
    project.actions.splice(index, 1)
    updateProjectTime(project)
  })
  await sleep(LATENCY_MS)
}

export async function createProjectFunction(
  projectId: string,
  payload: { name: string; description?: string; scriptContent: string; status?: FunctionStatus },
): Promise<FunctionDefinition> {
  const normalizedName = normalizeText(payload.name)
  if (!normalizedName) {
    throw new Error('函数名称不能为空')
  }

  const fn = mutateStore(store => {
    const project = ensureProject(store, projectId)
    const item: FunctionDefinition = {
      id: makeId('fn'),
      name: normalizedName,
      description: normalizeText(payload.description || ''),
      scriptContent: payload.scriptContent,
      status: payload.status || 'DRAFT',
    }
    project.functions.unshift(item)
    updateProjectTime(project)
    return item
  })

  await sleep(LATENCY_MS)
  return clone(fn)
}

export async function setFunctionStatus(
  projectId: string,
  functionId: string,
  status: FunctionStatus,
): Promise<void> {
  mutateStore(store => {
    const project = ensureProject(store, projectId)
    const fn = project.functions.find(item => item.id === functionId)
    if (!fn) {
      throw new Error('函数不存在')
    }
    fn.status = status
    updateProjectTime(project)
  })
  await sleep(LATENCY_MS)
}

export async function deleteProjectFunction(projectId: string, functionId: string): Promise<void> {
  mutateStore(store => {
    const project = ensureProject(store, projectId)
    const index = project.functions.findIndex(item => item.id === functionId)
    if (index < 0) {
      throw new Error('函数不存在')
    }
    project.functions.splice(index, 1)
    updateProjectTime(project)
  })
  await sleep(LATENCY_MS)
}
