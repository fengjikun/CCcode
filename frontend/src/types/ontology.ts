export interface ObjectType {
  id: number
  name: string
  displayName: string
  description?: string
  icon?: string
  color?: string
}

export interface Property {
  id: number
  name: string
  displayName: string
  dataType: string
  required: boolean
  defaultValue?: string
  sortOrder: number
}

export interface LinkType {
  id: number
  name: string
  displayName: string
  sourceObjectTypeId: number
  targetObjectTypeId: number
  cardinality: string
  description?: string
}

export interface ActionType {
  id: number
  name: string
  displayName: string
  description?: string
  status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED'
  targetObjectTypeId?: number | null
  triggerType?: string
  triggerConfigJson?: string
  exceptionPolicy?: string
  exceptionConfigJson?: string
  validationRulesJson?: string
}

export interface ActionParameter {
  id: number
  name: string
  displayName: string
  dataType: string
  required: boolean
  defaultValue?: string
  sortOrder: number
}

export interface ActionRule {
  id: number
  ruleType: string
  targetObjectTypeName?: string
  targetLinkTypeName?: string
  propertyMappingsJson?: string
  conditionJson?: string
  sortOrder: number
}

export interface ExecutionRecord {
  id: number
  status: string
  executedAt: string
  durationMs?: number
  errorMessage?: string
  outputDataJson?: string
}

export interface ValidationRule {
  name: string
  condition: string
  message: string
}

export interface OntologyFunction {
  id: number
  name: string
  displayName: string
  description?: string
  status: string
  scriptType: string
  scriptContent?: string
}
