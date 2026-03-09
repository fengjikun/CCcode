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

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
const rand = (min: number, max: number) => min + Math.random() * (max - min)

const STORAGE_KEY = 'deepexios_ontology'

/* ---------- 持久化 ---------- */

interface OntologyStore {
  objectTypes: ObjectType[]
  properties: Record<number, Property[]>
  linkTypes: LinkType[]
  actionTypes: ActionType[]
  actionParameters: Record<number, ActionParameter[]>
  actionRules: Record<number, ActionRule[]>
  functions: OntologyFunction[]
  idSeq: number
}

function defaultStore(): OntologyStore {
  return {
    objectTypes: [
      { id: 1, name: 'Equipment', displayName: '设备', description: '生产设备实体', icon: '🔧', color: '#1890ff' },
      { id: 2, name: 'Part', displayName: '零部件', description: '设备零部件', icon: '⚙️', color: '#52c41a' },
      { id: 3, name: 'FaultRecord', displayName: '故障记录', description: '设备故障历史', icon: '⚠️', color: '#ff4d4f' },
      { id: 4, name: 'MaintenancePlan', displayName: '维保计划', description: '设备维护保养计划', icon: '📋', color: '#722ed1' },
      { id: 5, name: 'Supplier', displayName: '供应商', description: '零部件供应商', icon: '🏭', color: '#fa8c16' },
    ],
    properties: {
      1: [
        { id: 101, name: 'model', displayName: '型号', dataType: 'STRING', required: true, sortOrder: 1 },
        { id: 102, name: 'serialNumber', displayName: '序列号', dataType: 'STRING', required: true, sortOrder: 2 },
        { id: 103, name: 'runningHours', displayName: '运行时长(h)', dataType: 'INTEGER', required: false, sortOrder: 3 },
        { id: 104, name: 'location', displayName: '安装位置', dataType: 'STRING', required: false, sortOrder: 4 },
      ],
      2: [
        { id: 201, name: 'partNumber', displayName: '零件号', dataType: 'STRING', required: true, sortOrder: 1 },
        { id: 202, name: 'lifespan', displayName: '设计寿命(h)', dataType: 'INTEGER', required: false, sortOrder: 2 },
      ],
      3: [
        { id: 301, name: 'faultCode', displayName: '故障码', dataType: 'STRING', required: true, sortOrder: 1 },
        { id: 302, name: 'severity', displayName: '严重程度', dataType: 'STRING', required: true, sortOrder: 2 },
        { id: 303, name: 'occurredAt', displayName: '发生时间', dataType: 'DATETIME', required: true, sortOrder: 3 },
      ],
    },
    linkTypes: [
      { id: 1, name: 'has_part', displayName: '包含零件', sourceObjectTypeId: 1, targetObjectTypeId: 2, cardinality: 'ONE_TO_MANY', description: '设备包含零部件' },
      { id: 2, name: 'has_fault', displayName: '发生故障', sourceObjectTypeId: 1, targetObjectTypeId: 3, cardinality: 'ONE_TO_MANY', description: '设备发生的故障记录' },
      { id: 3, name: 'supplied_by', displayName: '供应商供货', sourceObjectTypeId: 2, targetObjectTypeId: 5, cardinality: 'MANY_TO_ONE', description: '零部件供应关系' },
      { id: 4, name: 'maintenance_for', displayName: '维保对象', sourceObjectTypeId: 4, targetObjectTypeId: 1, cardinality: 'MANY_TO_ONE', description: '维保计划关联设备' },
    ],
    actionTypes: [
      {
        id: 1, name: 'create_fault_record', displayName: '创建故障记录',
        description: '当设备发生故障时自动创建记录', status: 'ACTIVE',
        targetObjectTypeId: 3, triggerType: 'EVENT', triggerConfigJson: '{"event":"device.alarm"}',
        exceptionPolicy: 'RETRY', validationRulesJson: '[{"name":"severity_check","condition":"severity in [LOW,MEDIUM,HIGH,CRITICAL]","message":"严重程度必须为有效值"}]',
      },
      {
        id: 2, name: 'schedule_maintenance', displayName: '计划维保',
        description: '根据运行时长自动安排维保计划', status: 'ACTIVE',
        targetObjectTypeId: 4, triggerType: 'SCHEDULE', triggerConfigJson: '{"cron":"0 8 * * 1"}',
        exceptionPolicy: 'IGNORE',
      },
      {
        id: 3, name: 'notify_supplier', displayName: '通知供应商',
        description: '零件库存不足时通知供应商', status: 'DRAFT',
        targetObjectTypeId: 5, triggerType: 'MANUAL',
      },
    ],
    actionParameters: {
      1: [
        { id: 11, name: 'equipmentId', displayName: '设备ID', dataType: 'INTEGER', required: true, sortOrder: 1 },
        { id: 12, name: 'faultCode', displayName: '故障码', dataType: 'STRING', required: true, sortOrder: 2 },
        { id: 13, name: 'severity', displayName: '严重程度', dataType: 'STRING', required: true, defaultValue: 'MEDIUM', sortOrder: 3 },
      ],
      2: [
        { id: 21, name: 'equipmentId', displayName: '设备ID', dataType: 'INTEGER', required: true, sortOrder: 1 },
        { id: 22, name: 'maintenanceType', displayName: '维保类型', dataType: 'STRING', required: true, sortOrder: 2 },
      ],
    },
    actionRules: {
      1: [
        { id: 11, ruleType: 'CREATE', targetObjectTypeName: 'FaultRecord', sortOrder: 1, propertyMappingsJson: '{"faultCode":"$faultCode","severity":"$severity"}' },
      ],
    },
    functions: [
      { id: 1, name: 'calc_mtbf', displayName: '计算 MTBF', description: '计算设备平均故障间隔时间', status: 'ACTIVE', scriptType: 'PYTHON', scriptContent: 'def calc_mtbf(total_hours, fault_count):\n    return total_hours / max(fault_count, 1)' },
      { id: 2, name: 'predict_failure', displayName: '故障预测', description: '基于历史数据预测下次故障时间', status: 'ACTIVE', scriptType: 'PYTHON', scriptContent: 'def predict_failure(history):\n    # 简单线性预测\n    intervals = [history[i+1] - history[i] for i in range(len(history)-1)]\n    avg = sum(intervals) / len(intervals)\n    return history[-1] + avg' },
      { id: 3, name: 'check_inventory', displayName: '库存检查', description: '检查零部件库存是否充足', status: 'DRAFT', scriptType: 'SQL', scriptContent: 'SELECT part_number, stock_qty FROM inventory WHERE stock_qty < min_stock_level' },
    ],
    idSeq: 1000,
  }
}

function load(): OntologyStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) { const s = defaultStore(); save(s); return s }
    return JSON.parse(raw)
  } catch {
    const s = defaultStore(); save(s); return s
  }
}

function save(store: OntologyStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function nextId(): number {
  const s = load()
  s.idSeq++
  save(s)
  return s.idSeq
}

/* ---------- Object Types ---------- */

export async function getObjectTypes(): Promise<ObjectType[]> {
  await delay(rand(200, 400))
  return load().objectTypes
}

export async function createObjectType(data: Partial<ObjectType>): Promise<ObjectType> {
  await delay(rand(300, 600))
  const s = load()
  const ot: ObjectType = {
    id: nextId(), name: data.name ?? '', displayName: data.displayName ?? data.name ?? '',
    description: data.description, icon: data.icon, color: data.color,
  }
  s.objectTypes.push(ot); save(s)
  return ot
}

export async function deleteObjectType(id: number): Promise<void> {
  await delay(rand(200, 400))
  const s = load()
  s.objectTypes = s.objectTypes.filter(o => o.id !== id)
  delete s.properties[id]
  save(s)
}

/* ---------- Properties ---------- */

export async function getProperties(otId: number): Promise<Property[]> {
  await delay(rand(200, 350))
  return load().properties[otId] ?? []
}

export async function createProperty(otId: number, data: Partial<Property>): Promise<Property> {
  await delay(rand(300, 500))
  const s = load()
  const prop: Property = {
    id: nextId(), name: data.name ?? '', displayName: data.displayName ?? data.name ?? '',
    dataType: data.dataType ?? 'STRING', required: data.required ?? false,
    defaultValue: data.defaultValue, sortOrder: data.sortOrder ?? 0,
  }
  if (!s.properties[otId]) s.properties[otId] = []
  s.properties[otId].push(prop); save(s)
  return prop
}

export async function deleteProperty(id: number): Promise<void> {
  await delay(rand(200, 400))
  const s = load()
  for (const key of Object.keys(s.properties)) {
    s.properties[Number(key)] = s.properties[Number(key)].filter(p => p.id !== id)
  }
  save(s)
}

/* ---------- Link Types ---------- */

export async function getLinkTypes(): Promise<LinkType[]> {
  await delay(rand(200, 400))
  return load().linkTypes
}

export async function createLinkType(data: Partial<LinkType>): Promise<LinkType> {
  await delay(rand(300, 600))
  const s = load()
  const lt: LinkType = {
    id: nextId(), name: data.name ?? '', displayName: data.displayName ?? data.name ?? '',
    sourceObjectTypeId: data.sourceObjectTypeId ?? 0, targetObjectTypeId: data.targetObjectTypeId ?? 0,
    cardinality: data.cardinality ?? 'ONE_TO_MANY', description: data.description,
  }
  s.linkTypes.push(lt); save(s)
  return lt
}

export async function deleteLinkType(id: number): Promise<void> {
  await delay(rand(200, 400))
  const s = load()
  s.linkTypes = s.linkTypes.filter(l => l.id !== id)
  save(s)
}

export async function deleteAllSchema(): Promise<void> {
  await delay(rand(300, 600))
  const s = load()
  s.objectTypes = []; s.properties = {}; s.linkTypes = []
  save(s)
}

/* ---------- Action Types ---------- */

export async function getActionTypes(): Promise<ActionType[]> {
  await delay(rand(200, 400))
  return load().actionTypes
}

export async function getActionType(id: number): Promise<ActionType> {
  await delay(rand(200, 350))
  return load().actionTypes.find(a => a.id === id) ?? load().actionTypes[0]
}

export async function createActionType(data: Partial<ActionType>): Promise<ActionType> {
  await delay(rand(300, 600))
  const s = load()
  const at: ActionType = {
    id: nextId(), name: data.name ?? '', displayName: data.displayName ?? data.name ?? '',
    description: data.description, status: data.status ?? 'DRAFT',
    targetObjectTypeId: data.targetObjectTypeId, triggerType: data.triggerType,
    triggerConfigJson: data.triggerConfigJson, exceptionPolicy: data.exceptionPolicy,
    exceptionConfigJson: data.exceptionConfigJson, validationRulesJson: data.validationRulesJson,
  }
  s.actionTypes.push(at); save(s)
  return at
}

export async function updateActionType(id: number, data: Partial<ActionType>): Promise<ActionType> {
  await delay(rand(300, 500))
  const s = load()
  const idx = s.actionTypes.findIndex(a => a.id === id)
  if (idx >= 0) { s.actionTypes[idx] = { ...s.actionTypes[idx], ...data }; save(s) }
  return s.actionTypes[idx] ?? { id, name: '', displayName: '', status: 'DRAFT' }
}

export async function deleteActionType(id: number): Promise<void> {
  await delay(rand(200, 400))
  const s = load()
  s.actionTypes = s.actionTypes.filter(a => a.id !== id)
  delete s.actionParameters[id]; delete s.actionRules[id]
  save(s)
}

/* ---------- Action Parameters ---------- */

export async function getActionParameters(atId: number): Promise<ActionParameter[]> {
  await delay(rand(200, 350))
  return load().actionParameters[atId] ?? []
}

export async function createActionParameter(atId: number, data: Partial<ActionParameter>): Promise<ActionParameter> {
  await delay(rand(300, 500))
  const s = load()
  const ap: ActionParameter = {
    id: nextId(), name: data.name ?? '', displayName: data.displayName ?? data.name ?? '',
    dataType: data.dataType ?? 'STRING', required: data.required ?? false,
    defaultValue: data.defaultValue, sortOrder: data.sortOrder ?? 0,
  }
  if (!s.actionParameters[atId]) s.actionParameters[atId] = []
  s.actionParameters[atId].push(ap); save(s)
  return ap
}

export async function deleteActionParameter(id: number): Promise<void> {
  await delay(rand(200, 400))
  const s = load()
  for (const key of Object.keys(s.actionParameters)) {
    s.actionParameters[Number(key)] = s.actionParameters[Number(key)].filter(p => p.id !== id)
  }
  save(s)
}

/* ---------- Action Rules ---------- */

export async function getActionRules(atId: number): Promise<ActionRule[]> {
  await delay(rand(200, 350))
  return load().actionRules[atId] ?? []
}

export async function createActionRule(atId: number, data: Partial<ActionRule>): Promise<ActionRule> {
  await delay(rand(300, 500))
  const s = load()
  const ar: ActionRule = {
    id: nextId(), ruleType: data.ruleType ?? 'CREATE',
    targetObjectTypeName: data.targetObjectTypeName, targetLinkTypeName: data.targetLinkTypeName,
    propertyMappingsJson: data.propertyMappingsJson, conditionJson: data.conditionJson,
    sortOrder: data.sortOrder ?? 0,
  }
  if (!s.actionRules[atId]) s.actionRules[atId] = []
  s.actionRules[atId].push(ar); save(s)
  return ar
}

export async function deleteActionRule(id: number): Promise<void> {
  await delay(rand(200, 400))
  const s = load()
  for (const key of Object.keys(s.actionRules)) {
    s.actionRules[Number(key)] = s.actionRules[Number(key)].filter(r => r.id !== id)
  }
  save(s)
}

/* ---------- Execution ---------- */

export async function getExecutions(_atId: number): Promise<ExecutionRecord[]> {
  await delay(rand(200, 400))
  return [
    { id: 1, status: 'SUCCESS', executedAt: '2025-03-08T14:30:00Z', durationMs: 245, outputDataJson: '{"recordId": 1001}' },
    { id: 2, status: 'SUCCESS', executedAt: '2025-03-07T10:15:00Z', durationMs: 312, outputDataJson: '{"recordId": 1000}' },
    { id: 3, status: 'FAILED', executedAt: '2025-03-06T08:00:00Z', durationMs: 1520, errorMessage: '目标设备不存在' },
  ]
}

export async function executeAction(_atId: number, _params: Record<string, unknown>): Promise<ExecutionRecord> {
  await delay(rand(1500, 3000)) // 模拟 Action 执行延迟
  return {
    id: nextId(), status: 'SUCCESS',
    executedAt: new Date().toISOString(), durationMs: Math.floor(rand(200, 800)),
    outputDataJson: JSON.stringify({ message: '执行成功', affectedRows: Math.floor(rand(1, 5)) }),
  }
}

/* ---------- Functions ---------- */

export async function getFunctions(): Promise<OntologyFunction[]> {
  await delay(rand(200, 400))
  return load().functions
}

export async function createFunction(data: Partial<OntologyFunction>): Promise<OntologyFunction> {
  await delay(rand(300, 600))
  const s = load()
  const fn: OntologyFunction = {
    id: nextId(), name: data.name ?? '', displayName: data.displayName ?? data.name ?? '',
    description: data.description, status: data.status ?? 'DRAFT',
    scriptType: data.scriptType ?? 'PYTHON', scriptContent: data.scriptContent,
  }
  s.functions.push(fn); save(s)
  return fn
}

export async function updateFunction(id: number, data: Partial<OntologyFunction>): Promise<OntologyFunction> {
  await delay(rand(300, 500))
  const s = load()
  const idx = s.functions.findIndex(f => f.id === id)
  if (idx >= 0) { s.functions[idx] = { ...s.functions[idx], ...data }; save(s) }
  return s.functions[idx] ?? { id, name: '', displayName: '', status: 'DRAFT', scriptType: 'PYTHON' }
}

export async function deleteFunction(id: number): Promise<void> {
  await delay(rand(200, 400))
  const s = load()
  s.functions = s.functions.filter(f => f.id !== id)
  save(s)
}

export async function executeFunction(_id: number): Promise<ExecutionRecord> {
  await delay(rand(1500, 3000)) // 模拟函数执行延迟
  return {
    id: nextId(), status: 'SUCCESS',
    executedAt: new Date().toISOString(), durationMs: Math.floor(rand(100, 600)),
    outputDataJson: JSON.stringify({ result: Math.floor(rand(100, 9999)), unit: 'hours' }),
  }
}
