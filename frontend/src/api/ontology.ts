import { fetchJSON } from './client'
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

const API = '/api/ontology'

// Object Types
export function getObjectTypes(): Promise<ObjectType[]> {
  return fetchJSON(`${API}/object-types`)
}

export function createObjectType(data: Partial<ObjectType>): Promise<ObjectType> {
  return fetchJSON(`${API}/object-types`, 'POST', data)
}

export function deleteObjectType(id: number): Promise<void> {
  return fetchJSON(`${API}/object-types/${id}`, 'DELETE')
}

// Properties
export function getProperties(otId: number): Promise<Property[]> {
  return fetchJSON(`${API}/object-types/${otId}/properties`)
}

export function createProperty(otId: number, data: Partial<Property>): Promise<Property> {
  return fetchJSON(`${API}/object-types/${otId}/properties`, 'POST', data)
}

export function deleteProperty(id: number): Promise<void> {
  return fetchJSON(`${API}/properties/${id}`, 'DELETE')
}

// Link Types
export function getLinkTypes(): Promise<LinkType[]> {
  return fetchJSON(`${API}/link-types`)
}

export function createLinkType(data: Partial<LinkType>): Promise<LinkType> {
  return fetchJSON(`${API}/link-types`, 'POST', data)
}

export function deleteLinkType(id: number): Promise<void> {
  return fetchJSON(`${API}/link-types/${id}`, 'DELETE')
}

export function deleteAllSchema(): Promise<void> {
  return fetchJSON(`${API}/schema`, 'DELETE')
}

// Action Types
export function getActionTypes(): Promise<ActionType[]> {
  return fetchJSON(`${API}/action-types`)
}

export function getActionType(id: number): Promise<ActionType> {
  return fetchJSON(`${API}/action-types/${id}`)
}

export function createActionType(data: Partial<ActionType>): Promise<ActionType> {
  return fetchJSON(`${API}/action-types`, 'POST', data)
}

export function updateActionType(id: number, data: Partial<ActionType>): Promise<ActionType> {
  return fetchJSON(`${API}/action-types/${id}`, 'PUT', data)
}

export function deleteActionType(id: number): Promise<void> {
  return fetchJSON(`${API}/action-types/${id}`, 'DELETE')
}

// Action Parameters
export function getActionParameters(atId: number): Promise<ActionParameter[]> {
  return fetchJSON(`${API}/action-types/${atId}/parameters`)
}

export function createActionParameter(atId: number, data: Partial<ActionParameter>): Promise<ActionParameter> {
  return fetchJSON(`${API}/action-types/${atId}/parameters`, 'POST', data)
}

export function deleteActionParameter(id: number): Promise<void> {
  return fetchJSON(`${API}/parameters/${id}`, 'DELETE')
}

// Action Rules
export function getActionRules(atId: number): Promise<ActionRule[]> {
  return fetchJSON(`${API}/action-types/${atId}/rules`)
}

export function createActionRule(atId: number, data: Partial<ActionRule>): Promise<ActionRule> {
  return fetchJSON(`${API}/action-types/${atId}/rules`, 'POST', data)
}

export function deleteActionRule(id: number): Promise<void> {
  return fetchJSON(`${API}/rules/${id}`, 'DELETE')
}

// Execution
export function getExecutions(atId: number): Promise<ExecutionRecord[]> {
  return fetchJSON(`${API}/action-types/${atId}/executions`)
}

export function executeAction(atId: number, params: Record<string, unknown>): Promise<ExecutionRecord> {
  return fetchJSON(`${API}/action-types/${atId}/execute`, 'POST', params)
}

// Functions
export function getFunctions(): Promise<OntologyFunction[]> {
  return fetchJSON(`${API}/functions`)
}

export function createFunction(data: Partial<OntologyFunction>): Promise<OntologyFunction> {
  return fetchJSON(`${API}/functions`, 'POST', data)
}

export function updateFunction(id: number, data: Partial<OntologyFunction>): Promise<OntologyFunction> {
  return fetchJSON(`${API}/functions/${id}`, 'PUT', data)
}

export function deleteFunction(id: number): Promise<void> {
  return fetchJSON(`${API}/functions/${id}`, 'DELETE')
}

export function executeFunction(id: number): Promise<ExecutionRecord> {
  return fetchJSON(`${API}/functions/${id}/execute`, 'POST', {})
}
