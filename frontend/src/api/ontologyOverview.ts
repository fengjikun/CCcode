import type { ObjectTypeSummary, LinkTypeSummary, ActionDefinition } from '../types/ontologyOverview'
import { fetchJSON } from './client'

const OVERVIEW_BASE = '/api/ontology/overview'

export interface OntologyStats {
  objectTypes: number
  totalProperties: number
  linkTypes: number
  actions: number
  totalRecords: string
  activeActions: number
}

export async function getOntologyStats(): Promise<OntologyStats> {
  const data = await fetchJSON<Record<string, any>>(`${OVERVIEW_BASE}/stats`)
  return {
    objectTypes: Number(data.objectTypes ?? data.objectTypesCount ?? 0),
    totalProperties: Number(data.totalProperties ?? 0),
    linkTypes: Number(data.linkTypes ?? data.linkTypesCount ?? 0),
    actions: Number(data.actions ?? data.actionsCount ?? 0),
    totalRecords: String(data.totalRecords ?? '0'),
    activeActions: Number(data.activeActions ?? 0),
  }
}

export async function getObjectTypes(): Promise<ObjectTypeSummary[]> {
  return fetchJSON<ObjectTypeSummary[]>(`${OVERVIEW_BASE}/object-types`)
}

export async function getLinkTypes(): Promise<LinkTypeSummary[]> {
  return fetchJSON<LinkTypeSummary[]>(`${OVERVIEW_BASE}/link-types`)
}

export async function getActions(): Promise<ActionDefinition[]> {
  return fetchJSON<ActionDefinition[]>(`${OVERVIEW_BASE}/actions`)
}
