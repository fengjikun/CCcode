/**
 * L3 本体概览类型定义
 */

export interface ObjectTypeSummary {
  key: string
  name: string
  displayName: string
  properties: number
  actions: number
  links: number
  backingDataset: string
  status: 'Active' | 'Draft' | 'Deprecated'
  recordCount: number
  updatedAt: string
}

export interface LinkTypeSummary {
  key: string
  name: string
  sourceType: string
  targetType: string
  cardinality: string
  description: string
}

export interface ActionDefinition {
  key: string
  name: string
  objectType: string
  parameters: number
  preconditions: number
  effects: number
  status: 'Active' | 'Draft'
  callCount: number
}
