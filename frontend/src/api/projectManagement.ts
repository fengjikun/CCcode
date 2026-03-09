import type {
  ActionDefinition,
  AiInsightRun,
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
  StructuredDataSource,
  VersionItem,
  DataSourceType,
  DataSourceExtractMode,
  DataSourceSyncMode,
} from '../types/projectMvp'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
const rand = (min: number, max: number) => min + Math.random() * (max - min)

const STORAGE_KEY = 'deepexios_projects'

/* ========== 持久化存储 ========== */

interface ProjectStore {
  projects: ProjectDetail[]
  idSeq: number
}

function defaultProjects(): ProjectDetail[] {
  return [
    {
      id: 'proj-001',
      name: '设备故障知识图谱',
      category: '制造业',
      description: '基于设备维修手册与历史故障记录构建的故障知识图谱，用于辅助智能诊断。',
      createdAt: '2025-01-15T08:00:00.000Z',
      updatedAt: '2025-03-08T14:30:00.000Z',
      documents: [
        { id: 'doc-001', name: 'CNC数控机床维修手册.docx', fileType: 'docx', size: 2458624, status: 'READY', enabled: true, uploadedAt: '2025-01-15T08:30:00.000Z' },
        { id: 'doc-002', name: '离心泵故障诊断指南.docx', fileType: 'docx', size: 1835008, status: 'READY', enabled: true, uploadedAt: '2025-01-16T09:15:00.000Z' },
        { id: 'doc-003', name: '电机常见故障手册.md', fileType: 'md', size: 524288, status: 'READY', enabled: true, uploadedAt: '2025-01-20T14:00:00.000Z' },
        { id: 'doc-004', name: '设备编码规范.xlsx', fileType: 'xlsx', size: 153600, status: 'READY', enabled: false, uploadedAt: '2025-02-01T10:00:00.000Z' },
      ],
      dataSources: [
        {
          id: 'ds-001', name: '设备主数据库', type: 'MYSQL', host: '10.0.1.100', port: 3306,
          database: 'equipment_db', username: 'reader', password: '', sslEnabled: false,
          enabled: true, extractMode: 'TABLE', tables: ['equipment', 'fault_records', 'parts'],
          rowLimit: 50000, syncMode: 'INCREMENTAL', incrementalColumn: 'updated_at',
          status: 'SUCCESS', lastTestAt: '2025-03-08T10:00:00.000Z', lastError: '',
          createdAt: '2025-02-01T10:00:00.000Z', updatedAt: '2025-03-08T10:00:00.000Z',
        },
      ],
      schemaConfig: {
        entityTypes: [
          {
            id: 'et-001', name: '设备', description: '生产设备实体',
            properties: [
              { id: 'ep-001', name: 'model', displayName: '型号', dataType: 'STRING', required: true, sortOrder: 1 },
              { id: 'ep-002', name: 'serialNumber', displayName: '序列号', dataType: 'STRING', required: true, sortOrder: 2 },
              { id: 'ep-003', name: 'location', displayName: '安装位置', dataType: 'STRING', required: false, sortOrder: 3 },
              { id: 'ep-004', name: 'runningHours', displayName: '运行时长', dataType: 'INTEGER', required: false, sortOrder: 4 },
            ],
          },
          {
            id: 'et-002', name: '故障模式', description: '设备故障分类',
            properties: [
              { id: 'ep-011', name: 'faultCode', displayName: '故障码', dataType: 'STRING', required: true, sortOrder: 1 },
              { id: 'ep-012', name: 'category', displayName: '故障类别', dataType: 'STRING', required: true, sortOrder: 2 },
              { id: 'ep-013', name: 'severity', displayName: '严重程度', dataType: 'STRING', required: true, sortOrder: 3 },
            ],
          },
          {
            id: 'et-003', name: '维修方案', description: '故障维修解决方案',
            properties: [
              { id: 'ep-021', name: 'title', displayName: '方案名称', dataType: 'STRING', required: true, sortOrder: 1 },
              { id: 'ep-022', name: 'estimatedTime', displayName: '预估时间', dataType: 'STRING', required: false, sortOrder: 2 },
              { id: 'ep-023', name: 'steps', displayName: '修复步骤', dataType: 'TEXT', required: true, sortOrder: 3 },
            ],
          },
          {
            id: 'et-004', name: '零部件', description: '设备零部件',
            properties: [
              { id: 'ep-031', name: 'partNumber', displayName: '零件号', dataType: 'STRING', required: true, sortOrder: 1 },
              { id: 'ep-032', name: 'specification', displayName: '规格', dataType: 'STRING', required: false, sortOrder: 2 },
              { id: 'ep-033', name: 'lifespan', displayName: '设计寿命(h)', dataType: 'INTEGER', required: false, sortOrder: 3 },
            ],
          },
        ],
        relationTypes: [
          { id: 'rt-001', name: '发生故障', domain: '设备', range: '故障模式', description: '设备发生的故障类型', properties: [] },
          { id: 'rt-002', name: '推荐方案', domain: '故障模式', range: '维修方案', description: '故障对应的修复方案', properties: [] },
          { id: 'rt-003', name: '涉及部件', domain: '故障模式', range: '零部件', description: '故障涉及的零部件', properties: [] },
          { id: 'rt-004', name: '包含零件', domain: '设备', range: '零部件', description: '设备包含的零部件', properties: [] },
        ],
        entityScope: '工业设备维护领域的设备、故障、维修相关实体',
        relationScope: '设备-故障-方案-零部件之间的关联关系',
        skills: [
          {
            id: 'sk-001', code: 'data_processing', name: '数据预处理', enabled: true,
            prompt: '提取文档中的设备型号、故障现象、维修步骤等结构化信息',
            source: 'built_in', tags: ['extraction', 'nlp'],
          },
          {
            id: 'sk-002', code: 'graph_synthesis', name: '图谱合成', enabled: true,
            prompt: '将提取的实体和关系构建为知识图谱',
            source: 'built_in', tags: ['graph', 'synthesis'],
          },
        ],
        updatedAt: '2025-03-08T14:30:00.000Z',
      },
      runs: [
        {
          id: 'run-001', status: 'COMPLETED', progress: 100,
          createdAt: '2025-03-05T10:00:00.000Z', completedAt: '2025-03-05T10:15:00.000Z',
          candidateEntityCount: 48, candidateRelationCount: 32, pendingReviewCount: 0,
          stage: '完成', logs: ['提取完成，共发现 48 个实体，32 个关系'], warnings: [],
          reviewItems: [
            { id: 'ri-001', kind: 'ENTITY', title: 'CNC-A3 数控铣床', evidence: '维修手册第2章', confidence: 0.95, status: 'APPROVED' },
            { id: 'ri-002', kind: 'ENTITY', title: '主轴轴承 7014C', evidence: '维修手册第5章', confidence: 0.92, status: 'APPROVED' },
            { id: 'ri-003', kind: 'RELATION', title: 'CNC-A3 → 包含零件 → 主轴轴承 7014C', evidence: '维修手册BOM表', confidence: 0.88, status: 'APPROVED' },
            { id: 'ri-004', kind: 'ENTITY', title: 'PUMP-B7 离心泵', evidence: '诊断指南第1章', confidence: 0.93, status: 'APPROVED' },
            { id: 'ri-005', kind: 'RELATION', title: 'PUMP-B7 → 发生故障 → 叶轮汽蚀', evidence: '诊断指南第3章', confidence: 0.85, status: 'PENDING' },
          ],
        },
      ],
      versions: [
        { id: 'ver-001', version: 'v1.0', label: '初始版本', createdAt: '2025-03-05T10:20:00.000Z', sourceRunId: 'run-001', entityCount: 45, relationCount: 30 },
      ],
      actions: [
        {
          id: 'act-001', name: 'create_fault_record', displayName: '创建故障记录',
          description: '设备告警时自动创建故障记录', status: 'ACTIVE',
          triggerType: 'EVENT', triggerConfigJson: '{"event":"device.alarm"}',
          exceptionPolicy: 'RETRY', parametersJson: '[{"name":"deviceId","type":"STRING"},{"name":"faultCode","type":"STRING"}]',
        },
        {
          id: 'act-002', name: 'notify_maintenance', displayName: '通知维修团队',
          description: '高优先级故障自动通知维修组长', status: 'DRAFT',
          triggerType: 'MANUAL',
        },
      ],
      functions: [
        {
          id: 'fn-001', name: 'calc_mtbf', description: '计算设备平均故障间隔时间',
          scriptContent: 'def calc_mtbf(total_hours, fault_count):\n    return total_hours / max(fault_count, 1)',
          status: 'ACTIVE',
        },
        {
          id: 'fn-002', name: 'predict_next_failure', description: '基于历史数据预测下次故障时间',
          scriptContent: 'def predict(history):\n    intervals = [h[i+1]-h[i] for i in range(len(h)-1)]\n    return history[-1] + sum(intervals)/len(intervals)',
          status: 'DRAFT',
        },
      ],
    },
    {
      id: 'proj-002',
      name: '供应链采购本体',
      category: '制造业',
      description: '采购订单、供应商、物料、合同等供应链核心实体的本体模型。',
      createdAt: '2025-02-01T10:00:00.000Z',
      updatedAt: '2025-03-07T16:00:00.000Z',
      documents: [
        { id: 'doc-011', name: '采购管理规范V3.docx', fileType: 'docx', size: 1572864, status: 'READY', enabled: true, uploadedAt: '2025-02-01T10:30:00.000Z' },
        { id: 'doc-012', name: '供应商评审标准.md', fileType: 'md', size: 327680, status: 'READY', enabled: true, uploadedAt: '2025-02-05T14:00:00.000Z' },
      ],
      dataSources: [],
      schemaConfig: {
        entityTypes: [
          {
            id: 'et-011', name: '采购订单', description: '采购订单实体',
            properties: [
              { id: 'ep-111', name: 'orderNumber', displayName: '订单号', dataType: 'STRING', required: true, sortOrder: 1 },
              { id: 'ep-112', name: 'amount', displayName: '金额', dataType: 'FLOAT', required: true, sortOrder: 2 },
              { id: 'ep-113', name: 'status', displayName: '状态', dataType: 'STRING', required: true, sortOrder: 3 },
            ],
          },
          {
            id: 'et-012', name: '供应商', description: '物料供应商',
            properties: [
              { id: 'ep-121', name: 'companyName', displayName: '公司名称', dataType: 'STRING', required: true, sortOrder: 1 },
              { id: 'ep-122', name: 'rating', displayName: '评级', dataType: 'STRING', required: false, sortOrder: 2 },
            ],
          },
          {
            id: 'et-013', name: '物料', description: '采购物料',
            properties: [
              { id: 'ep-131', name: 'materialCode', displayName: '物料编码', dataType: 'STRING', required: true, sortOrder: 1 },
              { id: 'ep-132', name: 'unitPrice', displayName: '单价', dataType: 'FLOAT', required: true, sortOrder: 2 },
            ],
          },
        ],
        relationTypes: [
          { id: 'rt-011', name: '供应', domain: '供应商', range: '物料', description: '供应商提供物料', properties: [] },
          { id: 'rt-012', name: '包含物料', domain: '采购订单', range: '物料', description: '订单包含物料', properties: [] },
        ],
        entityScope: '供应链采购领域的订单、供应商、物料实体',
        relationScope: '采购-供应-物料之间的关联关系',
        skills: [],
        updatedAt: '2025-03-07T16:00:00.000Z',
      },
      runs: [],
      versions: [],
      actions: [],
      functions: [],
    },
    {
      id: 'proj-003',
      name: '客户服务知识库',
      category: '服务业',
      description: '客户咨询FAQ、服务流程、产品知识等客服领域的知识图谱。',
      createdAt: '2025-02-20T09:00:00.000Z',
      updatedAt: '2025-03-06T11:30:00.000Z',
      documents: [
        { id: 'doc-021', name: '产品FAQ汇编.docx', fileType: 'docx', size: 983040, status: 'READY', enabled: true, uploadedAt: '2025-02-20T09:30:00.000Z' },
      ],
      dataSources: [],
      schemaConfig: {
        entityTypes: [
          {
            id: 'et-021', name: '问题', description: '客户咨询问题',
            properties: [
              { id: 'ep-211', name: 'question', displayName: '问题内容', dataType: 'TEXT', required: true, sortOrder: 1 },
              { id: 'ep-212', name: 'category', displayName: '分类', dataType: 'STRING', required: true, sortOrder: 2 },
            ],
          },
          {
            id: 'et-022', name: '解答', description: '标准解答',
            properties: [
              { id: 'ep-221', name: 'answer', displayName: '解答内容', dataType: 'TEXT', required: true, sortOrder: 1 },
            ],
          },
        ],
        relationTypes: [
          { id: 'rt-021', name: '对应解答', domain: '问题', range: '解答', description: '问题的标准解答', properties: [] },
        ],
        entityScope: '客户服务领域的FAQ和知识库',
        relationScope: '问题-解答映射关系',
        skills: [],
        updatedAt: '2025-03-06T11:30:00.000Z',
      },
      runs: [],
      versions: [],
      actions: [],
      functions: [],
    },
  ]
}

function loadStore(): ProjectStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const s: ProjectStore = { projects: defaultProjects(), idSeq: 5000 }
      saveStore(s)
      return s
    }
    return JSON.parse(raw)
  } catch {
    const s: ProjectStore = { projects: defaultProjects(), idSeq: 5000 }
    saveStore(s)
    return s
  }
}

function saveStore(store: ProjectStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function nextId(): string {
  const s = loadStore()
  s.idSeq++
  saveStore(s)
  return String(s.idSeq)
}

function findProject(projectId: string): { store: ProjectStore; project: ProjectDetail; index: number } {
  const store = loadStore()
  const index = store.projects.findIndex(p => p.id === projectId)
  if (index < 0) throw new Error(`项目不存在：${projectId}`)
  return { store, project: store.projects[index], index }
}

/* ========== Projects ========== */

export async function listProjects(): Promise<ProjectSummary[]> {
  await delay(rand(300, 600))
  return loadStore().projects.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    documentCount: p.documents.length,
    versionCount: p.versions.length,
    latestRunStatus: p.runs.length > 0 ? p.runs[p.runs.length - 1].status : undefined,
  }))
}

export async function createProject(name: string, description?: string, category?: string): Promise<ProjectSummary> {
  await delay(rand(400, 700))
  const store = loadStore()
  const now = new Date().toISOString()
  const project: ProjectDetail = {
    id: `proj-${nextId()}`,
    name,
    category: category || '',
    description: description || '',
    createdAt: now,
    updatedAt: now,
    documents: [],
    dataSources: [],
    schemaConfig: { entityTypes: [], relationTypes: [], entityScope: '', relationScope: '', skills: [], updatedAt: now },
    runs: [],
    versions: [],
    actions: [],
    functions: [],
  }
  store.projects.unshift(project)
  saveStore(store)
  return {
    id: project.id, name: project.name, category: project.category,
    description: project.description, createdAt: project.createdAt, updatedAt: project.updatedAt,
    documentCount: 0, versionCount: 0,
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  await delay(rand(300, 500))
  const store = loadStore()
  store.projects = store.projects.filter(p => p.id !== projectId)
  saveStore(store)
}

export async function updateProject(projectId: string, name: string, description?: string, category?: string): Promise<ProjectSummary> {
  await delay(rand(300, 600))
  const { store, project, index } = findProject(projectId)
  project.name = name
  project.description = description || ''
  project.category = category || ''
  project.updatedAt = new Date().toISOString()
  store.projects[index] = project
  saveStore(store)
  return {
    id: project.id, name: project.name, category: project.category,
    description: project.description, createdAt: project.createdAt, updatedAt: project.updatedAt,
    documentCount: project.documents.length, versionCount: project.versions.length,
  }
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetail> {
  await delay(rand(400, 700))
  const { project } = findProject(projectId)
  return project
}

/* ========== Documents ========== */

export async function uploadProjectDocument(projectId: string, file: File): Promise<ProjectDocument> {
  // 模拟文件上传延迟，根据文件大小调整
  await delay(rand(800, 1500))
  const { store, project, index } = findProject(projectId)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'md'
  const doc: ProjectDocument = {
    id: `doc-${nextId()}`,
    name: file.name,
    fileType: ext === 'docx' || ext === 'xlsx' ? ext : 'md',
    size: file.size,
    status: 'READY',
    enabled: true,
    uploadedAt: new Date().toISOString(),
  }
  project.documents.push(doc)
  project.updatedAt = new Date().toISOString()
  store.projects[index] = project
  saveStore(store)
  return doc
}

export async function deleteProjectDocument(projectId: string, documentId: string): Promise<void> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  project.documents = project.documents.filter(d => d.id !== documentId)
  project.updatedAt = new Date().toISOString()
  store.projects[index] = project
  saveStore(store)
}

export async function setProjectDocumentEnabled(
  projectId: string, documentId: string, enabled: boolean,
): Promise<ProjectDocument> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  const doc = project.documents.find(d => d.id === documentId)
  if (doc) doc.enabled = enabled
  store.projects[index] = project
  saveStore(store)
  return doc!
}

/* ========== Data Sources ========== */

interface DataSourcePayload {
  name: string
  type: DataSourceType
  host: string
  port: number
  database: string
  schema?: string
  username: string
  password?: string
  sslEnabled: boolean
  enabled: boolean
  extractMode: DataSourceExtractMode
  tables?: string[]
  customSql?: string
  rowLimit: number
  syncMode: DataSourceSyncMode
  incrementalColumn?: string
}

export async function createProjectDataSource(
  projectId: string, payload: DataSourcePayload,
): Promise<StructuredDataSource> {
  await delay(rand(400, 700))
  const { store, project, index } = findProject(projectId)
  const now = new Date().toISOString()
  const ds: StructuredDataSource = {
    id: `ds-${nextId()}`,
    ...payload,
    password: '',
    tables: payload.tables ?? [],
    customSql: payload.customSql ?? '',
    incrementalColumn: payload.incrementalColumn ?? '',
    status: 'UNKNOWN',
    lastError: '',
    createdAt: now,
    updatedAt: now,
  }
  project.dataSources.push(ds)
  store.projects[index] = project
  saveStore(store)
  return ds
}

export async function updateProjectDataSource(
  projectId: string, dataSourceId: string, payload: DataSourcePayload,
): Promise<StructuredDataSource> {
  await delay(rand(300, 600))
  const { store, project, index } = findProject(projectId)
  const dsIdx = project.dataSources.findIndex(d => d.id === dataSourceId)
  if (dsIdx >= 0) {
    project.dataSources[dsIdx] = {
      ...project.dataSources[dsIdx],
      ...payload,
      password: '',
      tables: payload.tables ?? [],
      updatedAt: new Date().toISOString(),
    }
  }
  store.projects[index] = project
  saveStore(store)
  return project.dataSources[dsIdx]
}

export async function deleteProjectDataSource(projectId: string, dataSourceId: string): Promise<void> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  project.dataSources = project.dataSources.filter(d => d.id !== dataSourceId)
  store.projects[index] = project
  saveStore(store)
}

export async function setProjectDataSourceEnabled(
  projectId: string, dataSourceId: string, enabled: boolean,
): Promise<StructuredDataSource> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  const ds = project.dataSources.find(d => d.id === dataSourceId)
  if (ds) ds.enabled = enabled
  store.projects[index] = project
  saveStore(store)
  return ds!
}

export async function testProjectDataSourceConnection(
  projectId: string, dataSourceId: string,
): Promise<{ status: 'SUCCESS' | 'FAILED'; testedAt: string; message: string }> {
  // 模拟数据库连接测试 (1-2s)
  await delay(rand(1000, 2000))
  const { store, project, index } = findProject(projectId)
  const ds = project.dataSources.find(d => d.id === dataSourceId)
  const now = new Date().toISOString()
  const success = Math.random() > 0.15 // 85% 成功率
  if (ds) {
    ds.status = success ? 'SUCCESS' : 'FAILED'
    ds.lastTestAt = now
    ds.lastError = success ? '' : '连接超时：无法连接到数据库服务器'
    store.projects[index] = project
    saveStore(store)
  }
  return {
    status: success ? 'SUCCESS' : 'FAILED',
    testedAt: now,
    message: success ? '连接成功' : '连接超时：无法连接到数据库服务器',
  }
}

/* ========== Schema - Entity Types ========== */

export async function createEntityType(
  projectId: string,
  name: string,
  description?: string,
  properties?: Array<{
    id?: string; name: string; displayName?: string;
    dataType?: EntityPropertyConfig['dataType']; required?: boolean;
    defaultValue?: string; description?: string; sortOrder?: number;
  }>,
): Promise<EntityTypeConfig> {
  await delay(rand(300, 600))
  const { store, project, index } = findProject(projectId)
  const et: EntityTypeConfig = {
    id: `et-${nextId()}`,
    name,
    description: description || '',
    properties: (properties ?? []).map((p, i) => ({
      id: p.id || `ep-${nextId()}`,
      name: p.name,
      displayName: p.displayName || p.name,
      dataType: p.dataType || 'STRING',
      required: p.required ?? false,
      defaultValue: p.defaultValue,
      description: p.description,
      sortOrder: p.sortOrder ?? i,
    })),
  }
  project.schemaConfig.entityTypes.push(et)
  project.schemaConfig.updatedAt = new Date().toISOString()
  store.projects[index] = project
  saveStore(store)
  return et
}

export async function updateEntityType(
  projectId: string,
  entityTypeId: string,
  payload: {
    name: string; description?: string;
    properties?: Array<{
      id?: string; name: string; displayName?: string;
      dataType?: EntityPropertyConfig['dataType']; required?: boolean;
      defaultValue?: string; description?: string; sortOrder?: number;
    }>;
  },
): Promise<EntityTypeConfig> {
  await delay(rand(300, 600))
  const { store, project, index } = findProject(projectId)
  const etIdx = project.schemaConfig.entityTypes.findIndex(e => e.id === entityTypeId)
  if (etIdx >= 0) {
    const existing = project.schemaConfig.entityTypes[etIdx]
    project.schemaConfig.entityTypes[etIdx] = {
      ...existing,
      name: payload.name,
      description: payload.description || '',
      properties: payload.properties
        ? payload.properties.map((p, i) => ({
            id: p.id || `ep-${nextId()}`,
            name: p.name,
            displayName: p.displayName || p.name,
            dataType: p.dataType || 'STRING',
            required: p.required ?? false,
            defaultValue: p.defaultValue,
            description: p.description,
            sortOrder: p.sortOrder ?? i,
          }))
        : existing.properties,
    }
    project.schemaConfig.updatedAt = new Date().toISOString()
    store.projects[index] = project
    saveStore(store)
  }
  return project.schemaConfig.entityTypes[etIdx]
}

export async function removeEntityType(projectId: string, entityTypeId: string): Promise<void> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  project.schemaConfig.entityTypes = project.schemaConfig.entityTypes.filter(e => e.id !== entityTypeId)
  project.schemaConfig.updatedAt = new Date().toISOString()
  store.projects[index] = project
  saveStore(store)
}

/* ========== Schema - Relation Types ========== */

export async function createRelationType(
  projectId: string,
  relation: {
    name: string; domain: string; range: string; description?: string;
    properties?: Array<{
      id?: string; name: string; displayName?: string;
      dataType?: EntityPropertyConfig['dataType']; required?: boolean;
      defaultValue?: string; description?: string; sortOrder?: number;
    }>;
  },
): Promise<RelationTypeConfig> {
  await delay(rand(300, 600))
  const { store, project, index } = findProject(projectId)
  const rt: RelationTypeConfig = {
    id: `rt-${nextId()}`,
    name: relation.name,
    domain: relation.domain,
    range: relation.range,
    description: relation.description || '',
    properties: (relation.properties ?? []).map((p, i) => ({
      id: p.id || `ep-${nextId()}`,
      name: p.name,
      displayName: p.displayName || p.name,
      dataType: p.dataType || 'STRING',
      required: p.required ?? false,
      defaultValue: p.defaultValue,
      description: p.description,
      sortOrder: p.sortOrder ?? i,
    })),
  }
  project.schemaConfig.relationTypes.push(rt)
  project.schemaConfig.updatedAt = new Date().toISOString()
  store.projects[index] = project
  saveStore(store)
  return rt
}

export async function updateRelationType(
  projectId: string,
  relationTypeId: string,
  payload: {
    name: string; domain: string; range: string; description?: string;
    properties?: Array<{
      id?: string; name: string; displayName?: string;
      dataType?: EntityPropertyConfig['dataType']; required?: boolean;
      defaultValue?: string; description?: string; sortOrder?: number;
    }>;
  },
): Promise<RelationTypeConfig> {
  await delay(rand(300, 600))
  const { store, project, index } = findProject(projectId)
  const rtIdx = project.schemaConfig.relationTypes.findIndex(r => r.id === relationTypeId)
  if (rtIdx >= 0) {
    const existing = project.schemaConfig.relationTypes[rtIdx]
    project.schemaConfig.relationTypes[rtIdx] = {
      ...existing,
      name: payload.name,
      domain: payload.domain,
      range: payload.range,
      description: payload.description || '',
      properties: payload.properties
        ? payload.properties.map((p, i) => ({
            id: p.id || `ep-${nextId()}`,
            name: p.name,
            displayName: p.displayName || p.name,
            dataType: p.dataType || 'STRING',
            required: p.required ?? false,
            defaultValue: p.defaultValue,
            description: p.description,
            sortOrder: p.sortOrder ?? i,
          }))
        : existing.properties,
    }
    project.schemaConfig.updatedAt = new Date().toISOString()
    store.projects[index] = project
    saveStore(store)
  }
  return project.schemaConfig.relationTypes[rtIdx]
}

export async function removeRelationType(projectId: string, relationTypeId: string): Promise<void> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  project.schemaConfig.relationTypes = project.schemaConfig.relationTypes.filter(r => r.id !== relationTypeId)
  project.schemaConfig.updatedAt = new Date().toISOString()
  store.projects[index] = project
  saveStore(store)
}

export async function clearProjectSchema(projectId: string): Promise<void> {
  await delay(rand(300, 500))
  const { store, project, index } = findProject(projectId)
  project.schemaConfig.entityTypes = []
  project.schemaConfig.relationTypes = []
  project.schemaConfig.updatedAt = new Date().toISOString()
  store.projects[index] = project
  saveStore(store)
}

export async function updateSchemaPrompts(
  projectId: string,
  payload: { entityScope: string; relationScope: string; skills: SkillConfig[] },
): Promise<SchemaConfig> {
  await delay(rand(300, 600))
  const { store, project, index } = findProject(projectId)
  project.schemaConfig.entityScope = payload.entityScope
  project.schemaConfig.relationScope = payload.relationScope
  project.schemaConfig.skills = payload.skills
  project.schemaConfig.updatedAt = new Date().toISOString()
  store.projects[index] = project
  saveStore(store)
  return project.schemaConfig
}

/* ========== Skills ========== */

export async function uploadCustomSkill(projectId: string, _file: File): Promise<SkillConfig> {
  await delay(rand(1000, 2000)) // 模拟技能包上传解析
  const { store, project, index } = findProject(projectId)
  const skill: SkillConfig = {
    id: `sk-${nextId()}`,
    code: 'custom',
    name: `自定义技能_${Date.now()}`,
    description: '用户上传的自定义技能包',
    enabled: true,
    prompt: '',
    source: 'uploaded',
    tags: ['custom'],
    fileName: _file.name,
    metadata: {
      packageFormat: 'zip',
      packageSize: _file.size,
      packageEntries: Math.floor(rand(3, 8)),
      hasSkillMd: true,
    },
    createdAt: new Date().toISOString(),
  }
  project.schemaConfig.skills.push(skill)
  store.projects[index] = project
  saveStore(store)
  return skill
}

export async function removeCustomSkill(projectId: string, skillId: string): Promise<void> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  project.schemaConfig.skills = project.schemaConfig.skills.filter(s => s.id !== skillId)
  store.projects[index] = project
  saveStore(store)
}

/* ========== AI Schema Insight (模拟AI大模型分析) ========== */

export async function runAiSchemaInsight(projectId: string): Promise<AiInsightRun> {
  // 模拟 AI 模型调用 (3-5 秒)
  await delay(rand(3000, 5000))
  const { store, project, index } = findProject(projectId)
  const now = new Date().toISOString()

  const newEntityNames = ['检测指标', '维修工具', '安全规程'].filter(() => Math.random() > 0.3)
  const newRelationNames = ['使用工具', '遵循规程'].filter(() => Math.random() > 0.3)

  // 把 AI 洞察到的实体类型加入 schema
  for (const name of newEntityNames) {
    if (!project.schemaConfig.entityTypes.find(e => e.name === name)) {
      project.schemaConfig.entityTypes.push({
        id: `et-${nextId()}`,
        name,
        description: `AI 自动发现的实体类型：${name}`,
        properties: [
          { id: `ep-${nextId()}`, name: 'name', displayName: '名称', dataType: 'STRING', required: true, sortOrder: 1 },
        ],
      })
    }
  }

  const aiRun: AiInsightRun = {
    id: `ai-${nextId()}`,
    status: 'COMPLETED',
    progress: 100,
    createdAt: now,
    completedAt: now,
    scannedDocumentCount: project.documents.filter(d => d.enabled).length,
    addedEntityCount: newEntityNames.length,
    addedRelationCount: newRelationNames.length,
    addedEntityNames: newEntityNames,
    addedRelationNames: newRelationNames,
    warnings: [],
    logs: [
      '开始扫描项目文档...',
      `已加载 ${project.documents.filter(d => d.enabled).length} 个文档`,
      '正在使用 AI 模型分析文档结构...',
      `发现 ${newEntityNames.length} 个新实体类型`,
      `发现 ${newRelationNames.length} 个新关系类型`,
      '分析完成',
    ],
  }

  project.aiInsightRun = aiRun
  project.schemaConfig.updatedAt = now
  store.projects[index] = project
  saveStore(store)
  return aiRun
}

/* ========== Extraction Run (模拟AI抽取) ========== */

export async function runProjectExtraction(projectId: string): Promise<ExtractionRun> {
  // 模拟 AI 抽取过程 (3-6 秒)
  await delay(rand(3000, 6000))
  const { store, project, index } = findProject(projectId)
  const now = new Date().toISOString()

  const entityCount = Math.floor(rand(15, 60))
  const relationCount = Math.floor(rand(8, 35))

  const reviewItems: ReviewItem[] = []
  const entityNames = ['CNC-A3 数控铣床', '主轴轴承', '变频器模块', '润滑系统', '冷却泵', '伺服电机', '导轨', '丝杠', '刀库', '控制面板']
  const relationNames = ['包含零件', '发生故障', '推荐方案', '涉及部件', '维保关联']

  for (let i = 0; i < Math.min(entityCount, 10); i++) {
    reviewItems.push({
      id: `ri-${nextId()}`,
      kind: 'ENTITY',
      title: entityNames[i % entityNames.length] + (i >= entityNames.length ? ` #${i}` : ''),
      evidence: `文档第${Math.floor(rand(1, 20))}页`,
      confidence: parseFloat(rand(0.75, 0.98).toFixed(2)),
      status: Math.random() > 0.3 ? 'PENDING' : 'APPROVED',
    })
  }
  for (let i = 0; i < Math.min(relationCount, 5); i++) {
    reviewItems.push({
      id: `ri-${nextId()}`,
      kind: 'RELATION',
      title: `${entityNames[i]} → ${relationNames[i % relationNames.length]} → ${entityNames[(i + 1) % entityNames.length]}`,
      evidence: `文档第${Math.floor(rand(1, 20))}页`,
      confidence: parseFloat(rand(0.70, 0.95).toFixed(2)),
      status: 'PENDING',
    })
  }

  const run: ExtractionRun = {
    id: `run-${nextId()}`,
    status: 'COMPLETED',
    progress: 100,
    createdAt: now,
    completedAt: now,
    candidateEntityCount: entityCount,
    candidateRelationCount: relationCount,
    pendingReviewCount: reviewItems.filter(r => r.status === 'PENDING').length,
    stage: '完成',
    logs: [
      '开始抽取任务...',
      `加载 Schema 定义：${project.schemaConfig.entityTypes.length} 个实体类型，${project.schemaConfig.relationTypes.length} 个关系类型`,
      `处理文档 1/${project.documents.filter(d => d.enabled).length}...`,
      '使用 AI 模型进行实体识别...',
      '使用 AI 模型进行关系抽取...',
      `抽取完成：${entityCount} 个实体，${relationCount} 个关系`,
      `待审核项 ${reviewItems.filter(r => r.status === 'PENDING').length} 个`,
    ],
    warnings: [],
    reviewItems,
  }

  project.runs.push(run)
  project.updatedAt = now
  store.projects[index] = project
  saveStore(store)
  return run
}

/* ========== Review Items ========== */

export async function updateRunReviewItem(
  projectId: string, runId: string, itemId: string, status: ReviewStatus,
): Promise<ReviewItem> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  const run = project.runs.find(r => r.id === runId)
  if (run) {
    const item = run.reviewItems.find(r => r.id === itemId)
    if (item) {
      item.status = status
      run.pendingReviewCount = run.reviewItems.filter(r => r.status === 'PENDING').length
      store.projects[index] = project
      saveStore(store)
      return item
    }
  }
  throw new Error('审核项不存在')
}

export async function batchUpdateRunReviewItems(
  projectId: string, runId: string, itemIds: string[], status: ReviewStatus,
): Promise<{ updatedCount: number; pendingReviewCount: number }> {
  await delay(rand(400, 800))
  const { store, project, index } = findProject(projectId)
  const run = project.runs.find(r => r.id === runId)
  let updatedCount = 0
  if (run) {
    for (const item of run.reviewItems) {
      if (itemIds.includes(item.id)) {
        item.status = status
        updatedCount++
      }
    }
    run.pendingReviewCount = run.reviewItems.filter(r => r.status === 'PENDING').length
    store.projects[index] = project
    saveStore(store)
    return { updatedCount, pendingReviewCount: run.pendingReviewCount }
  }
  return { updatedCount: 0, pendingReviewCount: 0 }
}

/* ========== Versions ========== */

export async function publishRunVersion(
  projectId: string, runId: string, label: string,
): Promise<OntologyVersion> {
  await delay(rand(500, 1000))
  const { store, project, index } = findProject(projectId)
  const versionNum = project.versions.length + 1
  const version: OntologyVersion = {
    id: `ver-${nextId()}`,
    version: `v${versionNum}.0`,
    label,
    createdAt: new Date().toISOString(),
    sourceRunId: runId,
    entityCount: project.runs.find(r => r.id === runId)?.candidateEntityCount ?? 0,
    relationCount: project.runs.find(r => r.id === runId)?.candidateRelationCount ?? 0,
  }
  project.versions.push(version)
  project.currentVersionId = version.id
  store.projects[index] = project
  saveStore(store)
  return version
}

export async function getVersionItems(projectId: string, versionId: string): Promise<VersionItem[]> {
  await delay(rand(300, 600))
  const { project } = findProject(projectId)
  const version = project.versions.find(v => v.id === versionId)
  if (!version) return []

  // 从对应 run 获取 approved 的 review items
  const run = project.runs.find(r => r.id === version.sourceRunId)
  if (!run) return []

  return run.reviewItems
    .filter(r => r.status === 'APPROVED')
    .map(r => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      evidence: r.evidence,
      confidence: r.confidence,
    }))
}

/* ========== Actions ========== */

export async function createProjectAction(
  projectId: string,
  payload: { name: string; description?: string; status?: ActionStatus },
): Promise<ActionDefinition> {
  await delay(rand(300, 600))
  const { store, project, index } = findProject(projectId)
  const action: ActionDefinition = {
    id: `act-${nextId()}`,
    name: payload.name,
    description: payload.description || '',
    status: payload.status || 'DRAFT',
  }
  project.actions.push(action)
  store.projects[index] = project
  saveStore(store)
  return action
}

export async function setActionStatus(
  projectId: string, actionId: string, status: ActionStatus,
): Promise<void> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  const action = project.actions.find(a => a.id === actionId)
  if (action) action.status = status
  store.projects[index] = project
  saveStore(store)
}

export async function deleteProjectAction(projectId: string, actionId: string): Promise<void> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  project.actions = project.actions.filter(a => a.id !== actionId)
  store.projects[index] = project
  saveStore(store)
}

export async function updateProjectAction(
  projectId: string, actionId: string, payload: Partial<ActionDefinition>,
): Promise<ActionDefinition> {
  await delay(rand(300, 600))
  const { store, project, index } = findProject(projectId)
  const actIdx = project.actions.findIndex(a => a.id === actionId)
  if (actIdx >= 0) {
    project.actions[actIdx] = { ...project.actions[actIdx], ...payload }
    store.projects[index] = project
    saveStore(store)
  }
  return project.actions[actIdx]
}

/* ========== Functions ========== */

export async function createProjectFunction(
  projectId: string,
  payload: { name: string; description?: string; scriptContent: string; status?: FunctionStatus },
): Promise<FunctionDefinition> {
  await delay(rand(300, 600))
  const { store, project, index } = findProject(projectId)
  const fn: FunctionDefinition = {
    id: `fn-${nextId()}`,
    name: payload.name,
    description: payload.description || '',
    scriptContent: payload.scriptContent,
    status: payload.status || 'DRAFT',
  }
  project.functions.push(fn)
  store.projects[index] = project
  saveStore(store)
  return fn
}

export async function setFunctionStatus(
  projectId: string, functionId: string, status: FunctionStatus,
): Promise<void> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  const fn = project.functions.find(f => f.id === functionId)
  if (fn) fn.status = status
  store.projects[index] = project
  saveStore(store)
}

export async function updateProjectFunction(
  projectId: string, functionId: string,
  payload: { name: string; description?: string; scriptContent: string },
): Promise<FunctionDefinition> {
  await delay(rand(300, 600))
  const { store, project, index } = findProject(projectId)
  const fnIdx = project.functions.findIndex(f => f.id === functionId)
  if (fnIdx >= 0) {
    project.functions[fnIdx] = { ...project.functions[fnIdx], ...payload }
    store.projects[index] = project
    saveStore(store)
  }
  return project.functions[fnIdx]
}

export async function deleteProjectFunction(projectId: string, functionId: string): Promise<void> {
  await delay(rand(200, 400))
  const { store, project, index } = findProject(projectId)
  project.functions = project.functions.filter(f => f.id !== functionId)
  store.projects[index] = project
  saveStore(store)
}
