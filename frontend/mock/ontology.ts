import type { MockMethod } from 'vite-plugin-mock'
import type {
  ActionParameter,
  ActionRule,
  ActionType,
  ExecutionRecord,
  LinkType,
  ObjectType,
  OntologyFunction,
  Property,
} from '../src/types/ontology'
import { clone, getOntologyStore, nextId, removeObjectType, resetOntologySchema } from './shared'

function parseNumericId(value: unknown): number {
  return Number(value)
}

function defaultString(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim()
  return text || fallback
}

function sortOrderFor<T extends { sortOrder: number }>(items: T[]): number {
  return items.length + 1
}

function buildObjectType(body: Partial<ObjectType>): ObjectType {
  return {
    id: nextId('objectType'),
    name: defaultString(body.name, `object_type_${Date.now()}`),
    displayName: defaultString(body.displayName, defaultString(body.name, '未命名实体')),
    description: body.description,
    icon: body.icon,
    color: body.color,
  }
}

function buildProperty(body: Partial<Property>, current: Property[]): Property {
  return {
    id: nextId('property'),
    name: defaultString(body.name, `property_${Date.now()}`),
    displayName: defaultString(body.displayName, defaultString(body.name, '未命名属性')),
    dataType: defaultString(body.dataType, 'STRING'),
    required: Boolean(body.required),
    defaultValue: body.defaultValue,
    sortOrder: Number(body.sortOrder ?? sortOrderFor(current)),
  }
}

function buildLinkType(body: Partial<LinkType>): LinkType {
  return {
    id: nextId('linkType'),
    name: defaultString(body.name, `link_type_${Date.now()}`),
    displayName: defaultString(body.displayName, defaultString(body.name, '未命名关系')),
    sourceObjectTypeId: Number(body.sourceObjectTypeId ?? 0),
    targetObjectTypeId: Number(body.targetObjectTypeId ?? 0),
    cardinality: defaultString(body.cardinality, 'ONE_TO_MANY'),
    description: body.description,
  }
}

function buildActionType(body: Partial<ActionType>): ActionType {
  return {
    id: nextId('actionType'),
    name: defaultString(body.name, `action_type_${Date.now()}`),
    displayName: defaultString(body.displayName, defaultString(body.name, '未命名动作')),
    description: body.description,
    status: (body.status ?? 'DRAFT') as ActionType['status'],
    targetObjectTypeId: body.targetObjectTypeId ?? null,
    triggerType: body.triggerType,
    triggerConfigJson: body.triggerConfigJson,
    exceptionPolicy: body.exceptionPolicy,
    exceptionConfigJson: body.exceptionConfigJson,
    validationRulesJson: body.validationRulesJson,
  }
}

function buildActionParameter(body: Partial<ActionParameter>, current: ActionParameter[]): ActionParameter {
  return {
    id: nextId('actionParameter'),
    name: defaultString(body.name, `param_${Date.now()}`),
    displayName: defaultString(body.displayName, defaultString(body.name, '未命名参数')),
    dataType: defaultString(body.dataType, 'STRING'),
    required: Boolean(body.required),
    defaultValue: body.defaultValue,
    sortOrder: Number(body.sortOrder ?? sortOrderFor(current)),
  }
}

function buildActionRule(body: Partial<ActionRule>, current: ActionRule[]): ActionRule {
  return {
    id: nextId('actionRule'),
    ruleType: defaultString(body.ruleType, 'CREATE_OBJECT'),
    targetObjectTypeName: body.targetObjectTypeName,
    targetLinkTypeName: body.targetLinkTypeName,
    propertyMappingsJson: body.propertyMappingsJson,
    conditionJson: body.conditionJson,
    sortOrder: Number(body.sortOrder ?? sortOrderFor(current)),
  }
}

function buildFunction(body: Partial<OntologyFunction>): OntologyFunction {
  return {
    id: nextId('function'),
    name: defaultString(body.name, `function_${Date.now()}`),
    displayName: defaultString(body.displayName, defaultString(body.name, '未命名函数')),
    description: body.description,
    status: defaultString(body.status, 'DRAFT'),
    scriptType: defaultString(body.scriptType, 'PYTHON'),
    scriptContent: body.scriptContent,
  }
}

function buildExecution(output: Record<string, unknown>): ExecutionRecord {
  return {
    id: nextId('execution'),
    status: 'SUCCESS',
    executedAt: new Date().toISOString(),
    durationMs: 300 + Math.round(Math.random() * 700),
    outputDataJson: JSON.stringify(output),
  }
}

const mocks: MockMethod[] = [
  {
    url: '/api/ontology/object-types',
    method: 'get',
    response() {
      return clone(getOntologyStore().objectTypes)
    },
  },
  {
    url: '/api/ontology/object-types',
    method: 'post',
    response({ body }) {
      const store = getOntologyStore()
      const created = buildObjectType(body)
      store.objectTypes.push(created)
      store.propertiesByObjectType[created.id] = []
      return clone(created)
    },
  },
  {
    url: '/api/ontology/object-types/:id',
    method: 'delete',
    response({ query }) {
      removeObjectType(parseNumericId(query.id))
      return null
    },
  },
  {
    url: '/api/ontology/object-types/:otId/properties',
    method: 'get',
    response({ query }) {
      const store = getOntologyStore()
      return clone(store.propertiesByObjectType[parseNumericId(query.otId)] ?? [])
    },
  },
  {
    url: '/api/ontology/object-types/:otId/properties',
    method: 'post',
    response({ query, body }) {
      const store = getOntologyStore()
      const objectTypeId = parseNumericId(query.otId)
      const current = store.propertiesByObjectType[objectTypeId] ?? []
      const created = buildProperty(body, current)
      store.propertiesByObjectType[objectTypeId] = [...current, created]
      return clone(created)
    },
  },
  {
    url: '/api/ontology/properties/:id',
    method: 'delete',
    response({ query }) {
      const propertyId = parseNumericId(query.id)
      const store = getOntologyStore()
      Object.keys(store.propertiesByObjectType).forEach(key => {
        const objectTypeId = Number(key)
        store.propertiesByObjectType[objectTypeId] = store.propertiesByObjectType[objectTypeId]
          .filter(item => item.id !== propertyId)
      })
      return null
    },
  },
  {
    url: '/api/ontology/link-types',
    method: 'get',
    response() {
      return clone(getOntologyStore().linkTypes)
    },
  },
  {
    url: '/api/ontology/link-types',
    method: 'post',
    response({ body }) {
      const store = getOntologyStore()
      const created = buildLinkType(body)
      store.linkTypes.push(created)
      return clone(created)
    },
  },
  {
    url: '/api/ontology/link-types/:id',
    method: 'delete',
    response({ query }) {
      const linkTypeId = parseNumericId(query.id)
      const store = getOntologyStore()
      store.linkTypes = store.linkTypes.filter(item => item.id !== linkTypeId)
      return null
    },
  },
  {
    url: '/api/ontology/schema',
    method: 'delete',
    response() {
      resetOntologySchema()
      return null
    },
  },
  {
    url: '/api/ontology/action-types',
    method: 'get',
    response() {
      return clone(getOntologyStore().actionTypes)
    },
  },
  {
    url: '/api/ontology/action-types/:id',
    method: 'get',
    response({ query }) {
      const store = getOntologyStore()
      const actionTypeId = parseNumericId(query.id)
      return clone(store.actionTypes.find(item => item.id === actionTypeId) ?? null)
    },
  },
  {
    url: '/api/ontology/action-types',
    method: 'post',
    response({ body }) {
      const store = getOntologyStore()
      const created = buildActionType(body)
      store.actionTypes.push(created)
      store.actionParametersByActionType[created.id] = []
      store.actionRulesByActionType[created.id] = []
      store.executionsByActionType[created.id] = []
      return clone(created)
    },
  },
  {
    url: '/api/ontology/action-types/:id',
    method: 'put',
    response({ query, body }) {
      const store = getOntologyStore()
      const actionTypeId = parseNumericId(query.id)
      const current = store.actionTypes.find(item => item.id === actionTypeId)
      if (!current) {
        return null
      }
      Object.assign(current, body)
      return clone(current)
    },
  },
  {
    url: '/api/ontology/action-types/:id',
    method: 'delete',
    response({ query }) {
      const store = getOntologyStore()
      const actionTypeId = parseNumericId(query.id)
      store.actionTypes = store.actionTypes.filter(item => item.id !== actionTypeId)
      delete store.actionParametersByActionType[actionTypeId]
      delete store.actionRulesByActionType[actionTypeId]
      delete store.executionsByActionType[actionTypeId]
      return null
    },
  },
  {
    url: '/api/ontology/action-types/:atId/parameters',
    method: 'get',
    response({ query }) {
      const store = getOntologyStore()
      return clone(store.actionParametersByActionType[parseNumericId(query.atId)] ?? [])
    },
  },
  {
    url: '/api/ontology/action-types/:atId/parameters',
    method: 'post',
    response({ query, body }) {
      const store = getOntologyStore()
      const actionTypeId = parseNumericId(query.atId)
      const current = store.actionParametersByActionType[actionTypeId] ?? []
      const created = buildActionParameter(body, current)
      store.actionParametersByActionType[actionTypeId] = [...current, created]
      return clone(created)
    },
  },
  {
    url: '/api/ontology/parameters/:id',
    method: 'delete',
    response({ query }) {
      const parameterId = parseNumericId(query.id)
      const store = getOntologyStore()
      Object.keys(store.actionParametersByActionType).forEach(key => {
        const actionTypeId = Number(key)
        store.actionParametersByActionType[actionTypeId] = store.actionParametersByActionType[actionTypeId]
          .filter(item => item.id !== parameterId)
      })
      return null
    },
  },
  {
    url: '/api/ontology/action-types/:atId/rules',
    method: 'get',
    response({ query }) {
      const store = getOntologyStore()
      return clone(store.actionRulesByActionType[parseNumericId(query.atId)] ?? [])
    },
  },
  {
    url: '/api/ontology/action-types/:atId/rules',
    method: 'post',
    response({ query, body }) {
      const store = getOntologyStore()
      const actionTypeId = parseNumericId(query.atId)
      const current = store.actionRulesByActionType[actionTypeId] ?? []
      const created = buildActionRule(body, current)
      store.actionRulesByActionType[actionTypeId] = [...current, created]
      return clone(created)
    },
  },
  {
    url: '/api/ontology/rules/:id',
    method: 'delete',
    response({ query }) {
      const ruleId = parseNumericId(query.id)
      const store = getOntologyStore()
      Object.keys(store.actionRulesByActionType).forEach(key => {
        const actionTypeId = Number(key)
        store.actionRulesByActionType[actionTypeId] = store.actionRulesByActionType[actionTypeId]
          .filter(item => item.id !== ruleId)
      })
      return null
    },
  },
  {
    url: '/api/ontology/action-types/:atId/executions',
    method: 'get',
    response({ query }) {
      const store = getOntologyStore()
      return clone(store.executionsByActionType[parseNumericId(query.atId)] ?? [])
    },
  },
  {
    url: '/api/ontology/action-types/:atId/execute',
    method: 'post',
    response({ query, body }) {
      const store = getOntologyStore()
      const actionTypeId = parseNumericId(query.atId)
      const created = buildExecution({ actionTypeId, params: body, result: 'mock action executed' })
      const current = store.executionsByActionType[actionTypeId] ?? []
      store.executionsByActionType[actionTypeId] = [created, ...current]
      return clone(created)
    },
  },
  {
    url: '/api/ontology/functions',
    method: 'get',
    response() {
      return clone(getOntologyStore().functions)
    },
  },
  {
    url: '/api/ontology/functions',
    method: 'post',
    response({ body }) {
      const store = getOntologyStore()
      const created = buildFunction(body)
      store.functions.push(created)
      return clone(created)
    },
  },
  {
    url: '/api/ontology/functions/:id',
    method: 'put',
    response({ query, body }) {
      const store = getOntologyStore()
      const functionId = parseNumericId(query.id)
      const current = store.functions.find(item => item.id === functionId)
      if (!current) {
        return null
      }
      Object.assign(current, body)
      return clone(current)
    },
  },
  {
    url: '/api/ontology/functions/:id',
    method: 'delete',
    response({ query }) {
      const store = getOntologyStore()
      const functionId = parseNumericId(query.id)
      store.functions = store.functions.filter(item => item.id !== functionId)
      return null
    },
  },
  {
    url: '/api/ontology/functions/:id/execute',
    method: 'post',
    response({ query }) {
      const functionId = parseNumericId(query.id)
      return clone(buildExecution({ functionId, result: 'mock function executed' }))
    },
  },
]

export default mocks
