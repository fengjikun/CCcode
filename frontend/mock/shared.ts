import type { IncomingHttpHeaders, ServerResponse } from 'node:http'
import type { CurrentUser, LoginResponse } from '../src/types/auth'
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

type IdKey =
  | 'objectType'
  | 'property'
  | 'linkType'
  | 'actionType'
  | 'actionParameter'
  | 'actionRule'
  | 'execution'
  | 'function'

interface OntologyStore {
  objectTypes: ObjectType[]
  propertiesByObjectType: Record<number, Property[]>
  linkTypes: LinkType[]
  actionTypes: ActionType[]
  actionParametersByActionType: Record<number, ActionParameter[]>
  actionRulesByActionType: Record<number, ActionRule[]>
  executionsByActionType: Record<number, ExecutionRecord[]>
  functions: OntologyFunction[]
  nextIds: Record<IdKey, number>
}

const ADMIN_USER: CurrentUser = { id: 1, username: 'admin' }
export const MOCK_ACCESS_TOKEN = 'mock-admin-token'

function objectTypesSeed(): ObjectType[] {
  return [
    { id: 1, name: 'device', displayName: '设备', description: '产线中的设备主实体', icon: 'DeploymentUnitOutlined', color: '#2563eb' },
    { id: 2, name: 'fault', displayName: '故障现象', description: '设备异常、报警或缺陷', icon: 'AlertOutlined', color: '#dc2626' },
    { id: 3, name: 'solution', displayName: '处理方案', description: '故障修复与闭环动作', icon: 'ToolOutlined', color: '#059669' },
  ]
}

function propertiesSeed(): Record<number, Property[]> {
  return {
    1: [
      { id: 1, name: 'deviceCode', displayName: '设备编码', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 2, name: 'lineName', displayName: '产线', dataType: 'STRING', required: false, sortOrder: 2 },
    ],
    2: [
      { id: 3, name: 'alarmCode', displayName: '报警码', dataType: 'STRING', required: false, sortOrder: 1 },
      { id: 4, name: 'severity', displayName: '严重级别', dataType: 'STRING', required: true, sortOrder: 2 },
    ],
    3: [
      { id: 5, name: 'owner', displayName: '责任人', dataType: 'STRING', required: false, sortOrder: 1 },
    ],
  }
}

function linkTypesSeed(): LinkType[] {
  return [
    {
      id: 1,
      name: 'has_fault',
      displayName: '发生故障',
      sourceObjectTypeId: 1,
      targetObjectTypeId: 2,
      cardinality: 'ONE_TO_MANY',
      description: '设备与故障现象的关联',
    },
    {
      id: 2,
      name: 'resolved_by',
      displayName: '处理方案',
      sourceObjectTypeId: 2,
      targetObjectTypeId: 3,
      cardinality: 'ONE_TO_MANY',
      description: '故障与处理方案的闭环关系',
    },
  ]
}

function actionTypesSeed(): ActionType[] {
  return [
    {
      id: 1,
      name: 'dispatch_repair',
      displayName: '派发维修工单',
      description: '根据故障现象自动创建维修任务',
      status: 'ACTIVE',
      targetObjectTypeId: 2,
      triggerType: 'MANUAL',
    },
  ]
}

function actionParametersSeed(): Record<number, ActionParameter[]> {
  return {
    1: [
      { id: 1, name: 'workorderOwner', displayName: '工单负责人', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 2, name: 'priority', displayName: '优先级', dataType: 'STRING', required: true, defaultValue: 'P2', sortOrder: 2 },
    ],
  }
}

function actionRulesSeed(): Record<number, ActionRule[]> {
  return {
    1: [
      {
        id: 1,
        ruleType: 'CREATE_OBJECT',
        targetObjectTypeName: 'solution',
        propertyMappingsJson: JSON.stringify({ owner: '{{workorderOwner}}' }),
        conditionJson: JSON.stringify({ severity: ['high', 'critical'] }),
        sortOrder: 1,
      },
    ],
  }
}

function executionsSeed(): Record<number, ExecutionRecord[]> {
  return {
    1: [
      {
        id: 1,
        status: 'SUCCESS',
        executedAt: '2026-03-10T09:30:00.000Z',
        durationMs: 620,
        outputDataJson: JSON.stringify({ createdWorkorderId: 'WO-20260310-001' }),
      },
    ],
  }
}

function functionsSeed(): OntologyFunction[] {
  return [
    {
      id: 1,
      name: 'summarize_fault_context',
      displayName: '总结故障上下文',
      description: '提炼当前故障的关键信息，供动作触发前确认',
      status: 'ACTIVE',
      scriptType: 'PYTHON',
      scriptContent: 'def main(context):\n    return {"summary": "mock summary"}\n',
    },
  ]
}

function nextIdsSeed(): Record<IdKey, number> {
  return {
    objectType: 4,
    property: 6,
    linkType: 3,
    actionType: 2,
    actionParameter: 3,
    actionRule: 2,
    execution: 2,
    function: 2,
  }
}

function createOntologyStore(): OntologyStore {
  return {
    objectTypes: objectTypesSeed(),
    propertiesByObjectType: propertiesSeed(),
    linkTypes: linkTypesSeed(),
    actionTypes: actionTypesSeed(),
    actionParametersByActionType: actionParametersSeed(),
    actionRulesByActionType: actionRulesSeed(),
    executionsByActionType: executionsSeed(),
    functions: functionsSeed(),
    nextIds: nextIdsSeed(),
  }
}

let ontologyStore = createOntologyStore()
const mockStores = new Map<string, unknown>()

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function nextId(key: IdKey): number {
  const id = ontologyStore.nextIds[key]
  ontologyStore.nextIds[key] += 1
  return id
}

export function getOntologyStore(): OntologyStore {
  return ontologyStore
}

export function resetOntologySchema(): void {
  ontologyStore.objectTypes = []
  ontologyStore.propertiesByObjectType = {}
  ontologyStore.linkTypes = []
}

export function removeObjectType(id: number): void {
  ontologyStore.objectTypes = ontologyStore.objectTypes.filter(item => item.id !== id)
  delete ontologyStore.propertiesByObjectType[id]
  ontologyStore.linkTypes = ontologyStore.linkTypes.filter(
    item => item.sourceObjectTypeId !== id && item.targetObjectTypeId !== id,
  )
  ontologyStore.actionTypes = ontologyStore.actionTypes.map(item => (
    item.targetObjectTypeId === id ? { ...item, targetObjectTypeId: null } : item
  ))
}

export function buildLoginResponse(): LoginResponse {
  return {
    accessToken: MOCK_ACCESS_TOKEN,
    tokenType: 'bearer',
    expiresIn: 60 * 60 * 24,
    user: clone(ADMIN_USER),
  }
}

export function getAdminUser(): CurrentUser {
  return clone(ADMIN_USER)
}

export function readBearerToken(headers: IncomingHttpHeaders): string | null {
  const raw = headers.authorization
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value?.startsWith('Bearer ')) {
    return null
  }
  return value.slice('Bearer '.length)
}

export function sendJSON(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function ensureMockStore<T>(namespace: string, defaults: T): T {
  if (!mockStores.has(namespace)) {
    mockStores.set(namespace, clone(defaults))
  }
  return clone(mockStores.get(namespace) as T)
}

export function getMockStore<T>(namespace: string): T | undefined {
  const value = mockStores.get(namespace)
  if (value === undefined) {
    return undefined
  }
  return clone(value as T)
}

export function setMockStore<T>(namespace: string, value: T): T {
  mockStores.set(namespace, clone(value))
  return clone(value)
}

export function deleteMockStore(namespace: string): void {
  mockStores.delete(namespace)
}
