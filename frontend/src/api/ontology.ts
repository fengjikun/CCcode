import type {
  ObjectType,
  Property,
  LinkType,
  ActionType,
  ActionParameter,
  ActionRule,
  ExecutionRecord,
  OntologyFunction,
} from '../types/ontology'

import { fetchJSON } from './client'

const ONTOLOGY_BASE = '/api/ontology'

type AnyRecord = Record<string, any>

function normalizeStatus(value: unknown): string {
  return String(value || '').toUpperCase() || 'SUCCESS'
}

function normalizeExecution(record: AnyRecord): ExecutionRecord {
  const output = record.outputDataJson
    ?? record.resultJson
    ?? (typeof record.result === 'string' ? record.result : undefined)

  const duration = record.durationMs ?? record.duration

  return {
    id: Number(record.id ?? 0),
    status: normalizeStatus(record.status),
    executedAt: record.executedAt ?? record.startedAt ?? new Date().toISOString(),
    durationMs: duration === undefined || duration === null ? undefined : Number(duration),
    errorMessage: record.errorMessage ?? record.error,
    outputDataJson: output,
  }
}

function normalizeActionType(action: AnyRecord): ActionType {
  return {
    id: Number(action.id ?? 0),
    name: String(action.name ?? ''),
    displayName: String(action.displayName ?? action.name ?? ''),
    description: action.description,
    status: normalizeStatus(action.status) as ActionType['status'],
    targetObjectTypeId: action.targetObjectTypeId ?? null,
    triggerType: action.triggerType,
    triggerConfigJson: action.triggerConfigJson,
    exceptionPolicy: action.exceptionPolicy,
    exceptionConfigJson: action.exceptionConfigJson,
    validationRulesJson: action.validationRulesJson,
  }
}

function normalizeFunction(fn: AnyRecord): OntologyFunction {
  return {
    id: Number(fn.id ?? 0),
    name: String(fn.name ?? ''),
    displayName: String(fn.displayName ?? fn.name ?? ''),
    description: fn.description,
    status: normalizeStatus(fn.status),
    scriptType: String(fn.scriptType || 'PYTHON').toUpperCase(),
    scriptContent: fn.scriptContent,
  }
}

/* ---------- Object Types ---------- */

export async function getObjectTypes(): Promise<ObjectType[]> {
  return fetchJSON<ObjectType[]>(`${ONTOLOGY_BASE}/object-types`)
}

export async function createObjectType(data: Partial<ObjectType>): Promise<ObjectType> {
  return fetchJSON<ObjectType>(`${ONTOLOGY_BASE}/object-types`, 'POST', data)
}

export async function deleteObjectType(id: number): Promise<void> {
  await fetchJSON<void>(`${ONTOLOGY_BASE}/object-types/${id}`, 'DELETE')
}

/* ---------- Properties ---------- */

export async function getProperties(otId: number): Promise<Property[]> {
  return fetchJSON<Property[]>(`${ONTOLOGY_BASE}/object-types/${otId}/properties`)
}

export async function createProperty(otId: number, data: Partial<Property>): Promise<Property> {
  return fetchJSON<Property>(`${ONTOLOGY_BASE}/object-types/${otId}/properties`, 'POST', data)
}

export async function deleteProperty(id: number): Promise<void> {
  await fetchJSON<void>(`${ONTOLOGY_BASE}/properties/${id}`, 'DELETE')
}

/* ---------- Link Types ---------- */

export async function getLinkTypes(): Promise<LinkType[]> {
  return fetchJSON<LinkType[]>(`${ONTOLOGY_BASE}/link-types`)
}

export async function createLinkType(data: Partial<LinkType>): Promise<LinkType> {
  return fetchJSON<LinkType>(`${ONTOLOGY_BASE}/link-types`, 'POST', data)
}

export async function deleteLinkType(id: number): Promise<void> {
  await fetchJSON<void>(`${ONTOLOGY_BASE}/link-types/${id}`, 'DELETE')
}

export async function deleteAllSchema(): Promise<void> {
  await fetchJSON<void>(`${ONTOLOGY_BASE}/schema`, 'DELETE')
}

/* ---------- Action Types ---------- */

export async function getActionTypes(): Promise<ActionType[]> {
  const data = await fetchJSON<ActionType[]>(`${ONTOLOGY_BASE}/action-types`)
  return data.map(normalizeActionType)
}

export async function getActionType(id: number): Promise<ActionType> {
  const data = await fetchJSON<ActionType>(`${ONTOLOGY_BASE}/action-types/${id}`)
  return normalizeActionType(data)
}

export async function createActionType(data: Partial<ActionType>): Promise<ActionType> {
  const created = await fetchJSON<ActionType>(`${ONTOLOGY_BASE}/action-types`, 'POST', data)
  return normalizeActionType(created)
}

export async function updateActionType(id: number, data: Partial<ActionType>): Promise<ActionType> {
  const updated = await fetchJSON<ActionType>(`${ONTOLOGY_BASE}/action-types/${id}`, 'PUT', data)
  return normalizeActionType(updated)
}

export async function deleteActionType(id: number): Promise<void> {
  await fetchJSON<void>(`${ONTOLOGY_BASE}/action-types/${id}`, 'DELETE')
}

/* ---------- Action Parameters ---------- */

export async function getActionParameters(atId: number): Promise<ActionParameter[]> {
  return fetchJSON<ActionParameter[]>(`${ONTOLOGY_BASE}/action-types/${atId}/parameters`)
}

export async function createActionParameter(atId: number, data: Partial<ActionParameter>): Promise<ActionParameter> {
  return fetchJSON<ActionParameter>(`${ONTOLOGY_BASE}/action-types/${atId}/parameters`, 'POST', data)
}

export async function deleteActionParameter(id: number): Promise<void> {
  await fetchJSON<void>(`${ONTOLOGY_BASE}/parameters/${id}`, 'DELETE')
}

/* ---------- Action Rules ---------- */

export async function getActionRules(atId: number): Promise<ActionRule[]> {
  return fetchJSON<ActionRule[]>(`${ONTOLOGY_BASE}/action-types/${atId}/rules`)
}

export async function createActionRule(atId: number, data: Partial<ActionRule>): Promise<ActionRule> {
  return fetchJSON<ActionRule>(`${ONTOLOGY_BASE}/action-types/${atId}/rules`, 'POST', data)
}

export async function deleteActionRule(id: number): Promise<void> {
  await fetchJSON<void>(`${ONTOLOGY_BASE}/rules/${id}`, 'DELETE')
}

/* ---------- Execution ---------- */

export async function getExecutions(atId: number): Promise<ExecutionRecord[]> {
  const data = await fetchJSON<AnyRecord[]>(`${ONTOLOGY_BASE}/action-types/${atId}/executions`)
  return data.map(normalizeExecution)
}

export async function executeAction(atId: number, params: Record<string, unknown>): Promise<ExecutionRecord> {
  const data = await fetchJSON<AnyRecord>(`${ONTOLOGY_BASE}/action-types/${atId}/execute`, 'POST', params)
  return normalizeExecution(data)
}

/* ---------- Functions ---------- */

export async function getFunctions(): Promise<OntologyFunction[]> {
  const data = await fetchJSON<AnyRecord[]>(`${ONTOLOGY_BASE}/functions`)
  return data.map(normalizeFunction)
}

export async function createFunction(data: Partial<OntologyFunction>): Promise<OntologyFunction> {
  const created = await fetchJSON<AnyRecord>(`${ONTOLOGY_BASE}/functions`, 'POST', data)
  return normalizeFunction(created)
}

export async function updateFunction(id: number, data: Partial<OntologyFunction>): Promise<OntologyFunction> {
  const updated = await fetchJSON<AnyRecord>(`${ONTOLOGY_BASE}/functions/${id}`, 'PUT', data)
  return normalizeFunction(updated)
}

export async function deleteFunction(id: number): Promise<void> {
  await fetchJSON<void>(`${ONTOLOGY_BASE}/functions/${id}`, 'DELETE')
}

export async function executeFunction(id: number): Promise<ExecutionRecord> {
  const data = await fetchJSON<AnyRecord>(`${ONTOLOGY_BASE}/functions/${id}/execute`, 'POST', {})
  return normalizeExecution(data)
}
