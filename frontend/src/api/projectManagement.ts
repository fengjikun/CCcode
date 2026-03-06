import { fetchJSON, fetchMultipart } from './client'
import type {
  ActionDefinition,
  AiInsightRun,
  ActionStatus,
  DataSourceExtractMode,
  DataSourceSyncMode,
  DataSourceType,
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
} from '../types/projectMvp'

type ApiRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED'
type ApiDocumentStatus = 'READY' | 'FAILED' | 'PROCESSING'

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

function mapRunStatus(status: ApiRunStatus): ExtractionRun['status'] {
  if (status === 'RUNNING') return 'RUNNING'
  if (status === 'COMPLETED') return 'COMPLETED'
  return 'FAILED'
}

function mapDocumentStatus(status: ApiDocumentStatus): ProjectDocument['status'] {
  if (status === 'READY') return 'READY'
  return 'FAILED'
}

function mapProjectDocument(doc: any): ProjectDocument {
  const fileType = String(doc.fileType || '').toLowerCase()
  return {
    id: String(doc.id),
    name: String(doc.name || ''),
    fileType: fileType === 'docx' || fileType === 'md' || fileType === 'xlsx' ? fileType : 'md',
    size: Number(doc.size || 0),
    status: mapDocumentStatus(doc.status as ApiDocumentStatus),
    enabled: Boolean(doc.enabled),
    uploadedAt: String(doc.uploadedAt || new Date().toISOString()),
  }
}

function mapDataSource(row: any): StructuredDataSource {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    type: row.type as DataSourceType,
    host: String(row.host || ''),
    port: Number(row.port || 0),
    database: String(row.database || ''),
    schema: String(row.schema || ''),
    username: String(row.username || ''),
    password: '',
    sslEnabled: Boolean(row.sslEnabled),
    enabled: Boolean(row.enabled),
    extractMode: row.extractMode as DataSourceExtractMode,
    tables: Array.isArray(row.tables) ? row.tables.map((item: unknown) => String(item)) : [],
    customSql: String(row.customSql || ''),
    rowLimit: Number(row.rowLimit || 10000),
    syncMode: row.syncMode as DataSourceSyncMode,
    incrementalColumn: String(row.incrementalColumn || ''),
    status: row.status as StructuredDataSource['status'],
    lastTestAt: row.lastTestAt ? String(row.lastTestAt) : undefined,
    lastError: String(row.lastError || ''),
    createdAt: String(row.createdAt || new Date().toISOString()),
    updatedAt: String(row.updatedAt || new Date().toISOString()),
  }
}

function mapProperty(item: any): EntityPropertyConfig {
  return {
    id: String(item.id),
    name: String(item.name || ''),
    displayName: String(item.displayName || item.name || ''),
    dataType: item.dataType as EntityPropertyConfig['dataType'],
    required: Boolean(item.required),
    defaultValue: String(item.defaultValue || ''),
    description: String(item.description || ''),
    sortOrder: Number(item.sortOrder || 0),
  }
}

function mapEntityType(item: any): EntityTypeConfig {
  return {
    id: String(item.id),
    name: String(item.name || ''),
    description: String(item.description || ''),
    properties: Array.isArray(item.properties) ? item.properties.map(mapProperty) : [],
  }
}

function mapRelationType(item: any): RelationTypeConfig {
  return {
    id: String(item.id),
    name: String(item.name || ''),
    domain: String(item.domain || ''),
    range: String(item.range || ''),
    description: String(item.description || ''),
    properties: Array.isArray(item.properties) ? item.properties.map(mapProperty) : [],
  }
}

function mapSkill(item: any): SkillConfig {
  return {
    id: String(item.id),
    code: item.code as SkillConfig['code'],
    name: String(item.name || ''),
    description: String(item.description || ''),
    enabled: Boolean(item.enabled),
    prompt: String(item.prompt || ''),
    source: item.source as SkillConfig['source'],
    tags: Array.isArray(item.tags) ? item.tags.map((x: unknown) => String(x)) : [],
    blocked: Boolean(item.blocked),
    missing: String(item.missing || ''),
    fileName: String(item.fileName || ''),
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
  }
}

function mapSchemaConfig(item: any): SchemaConfig {
  return {
    entityTypes: Array.isArray(item.entityTypes) ? item.entityTypes.map(mapEntityType) : [],
    relationTypes: Array.isArray(item.relationTypes) ? item.relationTypes.map(mapRelationType) : [],
    entityScope: String(item.entityScope || ''),
    relationScope: String(item.relationScope || ''),
    skills: Array.isArray(item.skills) ? item.skills.map(mapSkill) : [],
    updatedAt: String(item.updatedAt || new Date().toISOString()),
  }
}

function mapReviewItem(item: any): ReviewItem {
  return {
    id: String(item.id),
    kind: item.kind as ReviewItem['kind'],
    title: String(item.title || ''),
    evidence: String(item.evidence || ''),
    confidence: Number(item.confidence || 0),
    status: item.status as ReviewItem['status'],
  }
}

function mapRun(item: any): ExtractionRun {
  return {
    id: String(item.id),
    status: mapRunStatus(item.status as ApiRunStatus),
    progress: Number(item.progress || 0),
    createdAt: String(item.createdAt || new Date().toISOString()),
    completedAt: item.completedAt ? String(item.completedAt) : undefined,
    candidateEntityCount: Number(item.candidateEntityCount || 0),
    candidateRelationCount: Number(item.candidateRelationCount || 0),
    pendingReviewCount: Number(item.pendingReviewCount || 0),
    stage: item.stage ? String(item.stage) : undefined,
    currentDocument: item.currentDocument ? String(item.currentDocument) : undefined,
    logs: Array.isArray(item.logs) ? item.logs.map((x: unknown) => String(x)) : [],
    errorMessage: item.errorMessage ? String(item.errorMessage) : undefined,
    reviewItems: Array.isArray(item.reviewItems) ? item.reviewItems.map(mapReviewItem) : [],
  }
}

function mapAiInsightRun(item: any): AiInsightRun {
  return {
    id: String(item.id),
    status: item.status as AiInsightRun['status'],
    progress: Number(item.progress || 0),
    createdAt: String(item.createdAt || new Date().toISOString()),
    completedAt: item.completedAt ? String(item.completedAt) : undefined,
    scannedDocumentCount: Number(item.scannedDocumentCount || 0),
    addedEntityCount: Number(item.addedEntityCount || 0),
    addedRelationCount: Number(item.addedRelationCount || 0),
    addedEntityNames: Array.isArray(item.addedEntityNames) ? item.addedEntityNames.map((x: unknown) => String(x)) : [],
    addedRelationNames: Array.isArray(item.addedRelationNames) ? item.addedRelationNames.map((x: unknown) => String(x)) : [],
    warnings: Array.isArray(item.warnings) ? item.warnings.map((x: unknown) => String(x)) : [],
    stage: item.stage ? String(item.stage) : undefined,
    currentDocument: item.currentDocument ? String(item.currentDocument) : undefined,
    logs: Array.isArray(item.logs) ? item.logs.map((x: unknown) => String(x)) : [],
    errorMessage: item.errorMessage ? String(item.errorMessage) : undefined,
  }
}

function mapVersion(item: any): OntologyVersion {
  return {
    id: String(item.id),
    version: String(item.version || ''),
    label: String(item.label || ''),
    createdAt: String(item.createdAt || new Date().toISOString()),
    sourceRunId: String(item.sourceRunId || ''),
    entityCount: Number(item.entityCount || 0),
    relationCount: Number(item.relationCount || 0),
  }
}

function mapAction(item: any): ActionDefinition {
  return {
    id: String(item.id),
    name: String(item.name || ''),
    description: String(item.description || ''),
    status: item.status as ActionStatus,
  }
}

function mapFunction(item: any): FunctionDefinition {
  return {
    id: String(item.id),
    name: String(item.name || ''),
    description: String(item.description || ''),
    scriptContent: String(item.scriptContent || ''),
    status: item.status as FunctionStatus,
  }
}

function mapProjectSummary(item: any): ProjectSummary {
  return {
    id: String(item.id),
    name: String(item.name || ''),
    description: String(item.description || ''),
    createdAt: String(item.createdAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || new Date().toISOString()),
    documentCount: Number(item.documentCount || 0),
    versionCount: Number(item.versionCount || 0),
    latestRunStatus: item.latestRunStatus ? mapRunStatus(item.latestRunStatus as ApiRunStatus) : undefined,
  }
}

function mapProjectDetail(item: any): ProjectDetail {
  return {
    id: String(item.id),
    name: String(item.name || ''),
    description: String(item.description || ''),
    createdAt: String(item.createdAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || new Date().toISOString()),
    currentVersionId: item.currentVersionId ? String(item.currentVersionId) : undefined,
    documents: Array.isArray(item.documents) ? item.documents.map(mapProjectDocument) : [],
    dataSources: Array.isArray(item.dataSources) ? item.dataSources.map(mapDataSource) : [],
    schemaConfig: mapSchemaConfig(item.schemaConfig || {}),
    aiInsightRun: item.aiInsightRun ? mapAiInsightRun(item.aiInsightRun) : undefined,
    runs: Array.isArray(item.runs) ? item.runs.map(mapRun) : [],
    versions: Array.isArray(item.versions) ? item.versions.map(mapVersion) : [],
    actions: Array.isArray(item.actions) ? item.actions.map(mapAction) : [],
    functions: Array.isArray(item.functions) ? item.functions.map(mapFunction) : [],
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const rows = await fetchJSON<any[]>('/api/projects')
  return rows.map(mapProjectSummary)
}

export async function createProject(name: string, description?: string): Promise<ProjectSummary> {
  const row = await fetchJSON<any>('/api/projects', 'POST', { name, description: description || '' })
  return mapProjectSummary(row)
}

export async function deleteProject(projectId: string): Promise<void> {
  await fetchJSON(`/api/projects/${projectId}`, 'DELETE')
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetail> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}`)
  return mapProjectDetail(row)
}

export async function uploadProjectDocument(projectId: string, file: File): Promise<ProjectDocument> {
  const form = new FormData()
  form.append('file', file)
  const row = await fetchMultipart<any>(`/api/projects/${projectId}/documents`, form, 'POST')
  return mapProjectDocument(row)
}

export async function deleteProjectDocument(projectId: string, documentId: string): Promise<void> {
  await fetchJSON(`/api/projects/${projectId}/documents/${documentId}`, 'DELETE')
}

export async function setProjectDocumentEnabled(
  projectId: string,
  documentId: string,
  enabled: boolean,
): Promise<ProjectDocument> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/documents/${documentId}`, 'PATCH', { enabled })
  return mapProjectDocument(row)
}

export async function createProjectDataSource(
  projectId: string,
  payload: DataSourcePayload,
): Promise<StructuredDataSource> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/data-sources`, 'POST', payload)
  return mapDataSource(row)
}

export async function updateProjectDataSource(
  projectId: string,
  dataSourceId: string,
  payload: DataSourcePayload,
): Promise<StructuredDataSource> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/data-sources/${dataSourceId}`, 'PUT', payload)
  return mapDataSource(row)
}

export async function deleteProjectDataSource(projectId: string, dataSourceId: string): Promise<void> {
  await fetchJSON(`/api/projects/${projectId}/data-sources/${dataSourceId}`, 'DELETE')
}

export async function setProjectDataSourceEnabled(
  projectId: string,
  dataSourceId: string,
  enabled: boolean,
): Promise<StructuredDataSource> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/data-sources/${dataSourceId}`, 'PATCH', { enabled })
  return mapDataSource(row)
}

export async function testProjectDataSourceConnection(
  projectId: string,
  dataSourceId: string,
): Promise<{ status: 'SUCCESS' | 'FAILED'; testedAt: string; message: string }> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/data-sources/${dataSourceId}/test-connection`, 'POST')
  return {
    status: row.status as 'SUCCESS' | 'FAILED',
    testedAt: String(row.testedAt || new Date().toISOString()),
    message: String(row.message || ''),
  }
}

export async function createEntityType(
  projectId: string,
  name: string,
  description?: string,
  properties?: Array<{
    id?: string
    name: string
    displayName?: string
    dataType?: EntityPropertyConfig['dataType']
    required?: boolean
    defaultValue?: string
    description?: string
    sortOrder?: number
  }>,
): Promise<EntityTypeConfig> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/schema/entity-types`, 'POST', {
    name,
    description: description || '',
    properties: Array.isArray(properties) ? properties : [],
  })
  return mapEntityType(row)
}

export async function updateEntityType(
  projectId: string,
  entityTypeId: string,
  payload: {
    name: string
    description?: string
    properties?: Array<{
      id?: string
      name: string
      displayName?: string
      dataType?: EntityPropertyConfig['dataType']
      required?: boolean
      defaultValue?: string
      description?: string
      sortOrder?: number
    }>
  },
): Promise<EntityTypeConfig> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/schema/entity-types/${entityTypeId}`, 'PUT', payload)
  return mapEntityType(row)
}

export async function removeEntityType(projectId: string, entityTypeId: string): Promise<void> {
  await fetchJSON(`/api/projects/${projectId}/schema/entity-types/${entityTypeId}`, 'DELETE')
}

export async function createRelationType(
  projectId: string,
  relation: {
    name: string
    domain: string
    range: string
    description?: string
    properties?: Array<{
      id?: string
      name: string
      displayName?: string
      dataType?: EntityPropertyConfig['dataType']
      required?: boolean
      defaultValue?: string
      description?: string
      sortOrder?: number
    }>
  },
): Promise<RelationTypeConfig> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/schema/relation-types`, 'POST', relation)
  return mapRelationType(row)
}

export async function updateRelationType(
  projectId: string,
  relationTypeId: string,
  payload: {
    name: string
    domain: string
    range: string
    description?: string
    properties?: Array<{
      id?: string
      name: string
      displayName?: string
      dataType?: EntityPropertyConfig['dataType']
      required?: boolean
      defaultValue?: string
      description?: string
      sortOrder?: number
    }>
  },
): Promise<RelationTypeConfig> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/schema/relation-types/${relationTypeId}`, 'PUT', payload)
  return mapRelationType(row)
}

export async function removeRelationType(projectId: string, relationTypeId: string): Promise<void> {
  await fetchJSON(`/api/projects/${projectId}/schema/relation-types/${relationTypeId}`, 'DELETE')
}

export async function updateSchemaPrompts(
  projectId: string,
  payload: {
    entityScope: string
    relationScope: string
    skills: SkillConfig[]
  },
): Promise<SchemaConfig> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/schema/prompts`, 'PATCH', payload)
  return mapSchemaConfig(row)
}

export async function uploadCustomSkill(projectId: string, file: File): Promise<SkillConfig> {
  const form = new FormData()
  form.append('file', file)
  const row = await fetchMultipart<any>(`/api/projects/${projectId}/skills/upload`, form, 'POST')
  return mapSkill(row)
}

export async function removeCustomSkill(projectId: string, skillId: string): Promise<void> {
  await fetchJSON(`/api/projects/${projectId}/skills/${skillId}`, 'DELETE')
}

export async function runAiSchemaInsight(projectId: string): Promise<AiInsightRun> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/schema/ai-insight`, 'POST')
  return mapAiInsightRun(row)
}

export async function runProjectExtraction(projectId: string): Promise<ExtractionRun> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/runs`, 'POST')
  return mapRun(row)
}

export async function updateRunReviewItem(
  projectId: string,
  runId: string,
  itemId: string,
  status: ReviewStatus,
): Promise<ReviewItem> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/runs/${runId}/review-items/${itemId}`, 'PATCH', { status })
  return mapReviewItem(row)
}

export async function publishRunVersion(
  projectId: string,
  runId: string,
  label: string,
): Promise<OntologyVersion> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/runs/${runId}/publish`, 'POST', {
    label,
    notes: '',
  })
  return mapVersion(row)
}

export async function createProjectAction(
  projectId: string,
  payload: { name: string; description?: string; status?: ActionStatus },
): Promise<ActionDefinition> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/actions`, 'POST', payload)
  return mapAction(row)
}

export async function setActionStatus(
  projectId: string,
  actionId: string,
  status: ActionStatus,
): Promise<void> {
  await fetchJSON(`/api/projects/${projectId}/actions/${actionId}`, 'PATCH', { status })
}

export async function deleteProjectAction(projectId: string, actionId: string): Promise<void> {
  await fetchJSON(`/api/projects/${projectId}/actions/${actionId}`, 'DELETE')
}

export async function createProjectFunction(
  projectId: string,
  payload: { name: string; description?: string; scriptContent: string; status?: FunctionStatus },
): Promise<FunctionDefinition> {
  const row = await fetchJSON<any>(`/api/projects/${projectId}/functions`, 'POST', payload)
  return mapFunction(row)
}

export async function setFunctionStatus(
  projectId: string,
  functionId: string,
  status: FunctionStatus,
): Promise<void> {
  await fetchJSON(`/api/projects/${projectId}/functions/${functionId}`, 'PATCH', { status })
}

export async function deleteProjectFunction(projectId: string, functionId: string): Promise<void> {
  await fetchJSON(`/api/projects/${projectId}/functions/${functionId}`, 'DELETE')
}
