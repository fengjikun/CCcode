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

import { delay, rand } from './mockConfig'

const STORAGE_KEY = 'deepexios_ontology_v2'
const DATA_VERSION = 2

/* ---------- 持久化 ---------- */

interface OntologyStore {
  _v?: number
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
      { id: 1, name: 'Equipment', displayName: '设备', description: '生产设备实体，如激光切割机、数控机床等', icon: '🔧', color: '#1890ff' },
      { id: 2, name: 'Phenomenon', displayName: '故障现象', description: '设备运行中可观察到的异常现象', icon: '⚠️', color: '#ff4d4f' },
      { id: 3, name: 'SubPhenomenon', displayName: '子现象', description: '故障现象的细分表现形式', icon: '🔍', color: '#fa541c' },
      { id: 4, name: 'Checkpoint', displayName: '检查点', description: '故障排查时需要检查的关键项目', icon: '✅', color: '#52c41a' },
      { id: 5, name: 'Cause', displayName: '故障原因', description: '导致故障现象的根本原因', icon: '🎯', color: '#722ed1' },
      { id: 6, name: 'Solution', displayName: '解决方案', description: '针对故障原因的修复方案和步骤', icon: '💡', color: '#13c2c2' },
      { id: 7, name: 'Component', displayName: '部件', description: '设备的组成部件和模块', icon: '⚙️', color: '#2f54eb' },
      { id: 8, name: 'Parameter', displayName: '参数', description: '设备运行的可监测参数和指标', icon: '📊', color: '#fa8c16' },
    ],
    properties: {
      1: [
        { id: 101, name: 'model', displayName: '型号', dataType: 'STRING', required: true, sortOrder: 1 },
        { id: 102, name: 'manufacturer', displayName: '制造商', dataType: 'STRING', required: false, sortOrder: 2 },
        { id: 103, name: 'description', displayName: '描述', dataType: 'STRING', required: false, sortOrder: 3 },
      ],
      2: [
        { id: 201, name: 'code', displayName: '故障码', dataType: 'STRING', required: true, sortOrder: 1 },
        { id: 202, name: 'description', displayName: '描述', dataType: 'STRING', required: true, sortOrder: 2 },
      ],
      3: [
        { id: 301, name: 'description', displayName: '描述', dataType: 'STRING', required: true, sortOrder: 1 },
      ],
      4: [
        { id: 401, name: 'priority', displayName: '优先级', dataType: 'INTEGER', required: true, sortOrder: 1 },
        { id: 402, name: 'method', displayName: '检查方法', dataType: 'STRING', required: true, sortOrder: 2 },
        { id: 403, name: 'expectedValue', displayName: '期望值', dataType: 'STRING', required: true, sortOrder: 3 },
        { id: 404, name: 'description', displayName: '描述', dataType: 'STRING', required: false, sortOrder: 4 },
      ],
      5: [
        { id: 501, name: 'description', displayName: '描述', dataType: 'STRING', required: true, sortOrder: 1 },
      ],
      6: [
        { id: 601, name: 'steps', displayName: '操作步骤', dataType: 'STRING', required: true, sortOrder: 1 },
        { id: 602, name: 'estimatedTime', displayName: '预计耗时', dataType: 'STRING', required: false, sortOrder: 2 },
        { id: 603, name: 'effectiveness', displayName: '有效性', dataType: 'STRING', required: false, sortOrder: 3 },
        { id: 604, name: 'riskLevel', displayName: '风险等级', dataType: 'STRING', required: false, sortOrder: 4 },
      ],
      7: [
        { id: 701, name: 'description', displayName: '描述', dataType: 'STRING', required: true, sortOrder: 1 },
      ],
      8: [
        { id: 801, name: 'dataType', displayName: '数据类型', dataType: 'STRING', required: true, sortOrder: 1 },
        { id: 802, name: 'source', displayName: '数据来源', dataType: 'STRING', required: true, sortOrder: 2 },
        { id: 803, name: 'unit', displayName: '单位', dataType: 'STRING', required: false, sortOrder: 3 },
        { id: 804, name: 'opcUaPath', displayName: 'OPC-UA路径', dataType: 'STRING', required: false, sortOrder: 4 },
      ],
    },
    linkTypes: [
      { id: 1, name: 'prone_to', displayName: '易发故障', sourceObjectTypeId: 1, targetObjectTypeId: 2, cardinality: 'ONE_TO_MANY', description: '设备易发生的故障现象' },
      { id: 2, name: 'contains', displayName: '包含子现象', sourceObjectTypeId: 2, targetObjectTypeId: 3, cardinality: 'ONE_TO_MANY', description: '故障现象包含的细分子现象' },
      { id: 3, name: 'needs_check', displayName: '需要检查', sourceObjectTypeId: 2, targetObjectTypeId: 4, cardinality: 'ONE_TO_MANY', description: '故障现象/子现象需要的检查项' },
      { id: 4, name: 'discovers', displayName: '发现异常', sourceObjectTypeId: 4, targetObjectTypeId: 3, cardinality: 'ONE_TO_MANY', description: '检查点可发现的子现象' },
      { id: 5, name: 'located_at', displayName: '定位部件', sourceObjectTypeId: 3, targetObjectTypeId: 7, cardinality: 'MANY_TO_ONE', description: '子现象/检查点关联的设备部件' },
      { id: 6, name: 'caused_by', displayName: '原因归因', sourceObjectTypeId: 3, targetObjectTypeId: 5, cardinality: 'MANY_TO_ONE', description: '子现象由该原因导致' },
      { id: 7, name: 'solved_by', displayName: '推荐方案', sourceObjectTypeId: 5, targetObjectTypeId: 6, cardinality: 'ONE_TO_MANY', description: '故障原因的推荐解决方案' },
      { id: 8, name: 'supports', displayName: '参数支撑', sourceObjectTypeId: 8, targetObjectTypeId: 4, cardinality: 'MANY_TO_ONE', description: '参数为检查点提供数据支撑' },
    ],
    actionTypes: [
      {
        id: 1, name: 'auto_diagnose', displayName: '自动故障诊断',
        description: '基于设备报警信号自动触发故障诊断流程，匹配知识图谱中的故障模式', status: 'ACTIVE',
        targetObjectTypeId: 2, triggerType: 'EVENT', triggerConfigJson: '{"event":"device.alarm","source":"opc_ua"}',
        exceptionPolicy: 'RETRY', validationRulesJson: '[{"name":"alarm_code_check","condition":"alarm_code matches ALM-*","message":"报警码格式必须为 ALM- 前缀"}]',
      },
      {
        id: 2, name: 'generate_work_order', displayName: '生成维修工单',
        description: '诊断完成后自动生成维修工单，包含检查清单和修复方案', status: 'ACTIVE',
        targetObjectTypeId: 6, triggerType: 'EVENT', triggerConfigJson: '{"event":"diagnosis.completed"}',
        exceptionPolicy: 'RETRY',
      },
      {
        id: 3, name: 'check_spare_parts', displayName: '备件库存检查',
        description: '维修工单生成时自动检查所需备件库存', status: 'DRAFT',
        targetObjectTypeId: 7, triggerType: 'MANUAL',
      },
    ],
    actionParameters: {
      1: [
        { id: 11, name: 'equipmentId', displayName: '设备ID', dataType: 'STRING', required: true, sortOrder: 1 },
        { id: 12, name: 'alarmCode', displayName: '报警码', dataType: 'STRING', required: true, sortOrder: 2 },
        { id: 13, name: 'severity', displayName: '严重程度', dataType: 'STRING', required: true, defaultValue: 'MEDIUM', sortOrder: 3 },
      ],
      2: [
        { id: 21, name: 'diagnosisId', displayName: '诊断记录ID', dataType: 'INTEGER', required: true, sortOrder: 1 },
        { id: 22, name: 'priority', displayName: '工单优先级', dataType: 'STRING', required: true, sortOrder: 2 },
      ],
    },
    actionRules: {
      1: [
        { id: 11, ruleType: 'CREATE', targetObjectTypeName: 'Checkpoint', sortOrder: 1, propertyMappingsJson: '{"alarmCode":"$alarmCode","severity":"$severity"}' },
      ],
    },
    functions: [
      { id: 1, name: 'match_fault_pattern', displayName: '故障模式匹配', description: '在知识图谱中匹配故障现象对应的故障模式和根因', status: 'ACTIVE', scriptType: 'PYTHON', scriptContent: 'def match_fault_pattern(alarm_code, symptoms):\n    \"\"\"匹配故障模式\"\"\"\n    # 基于图谱的故障模式匹配\n    patterns = graph.query(f"MATCH (p:Phenomenon)-[:contains]->(sp:SubPhenomenon) WHERE p.code = \'{alarm_code}\' RETURN sp")\n    return rank_by_similarity(patterns, symptoms)' },
      { id: 2, name: 'calc_repair_priority', displayName: '维修优先级计算', description: '综合设备重要性、故障严重度、生产影响计算维修优先级', status: 'ACTIVE', scriptType: 'PYTHON', scriptContent: 'def calc_repair_priority(severity, equipment_class, production_impact):\n    weights = {"CRITICAL": 1.0, "HIGH": 0.8, "MEDIUM": 0.5, "LOW": 0.2}\n    score = weights.get(severity, 0.5) * 0.4 + equipment_class * 0.3 + production_impact * 0.3\n    return "P1" if score > 0.8 else "P2" if score > 0.5 else "P3"' },
      { id: 3, name: 'generate_checkpoint_list', displayName: '生成检查清单', description: '根据故障现象自动生成按优先级排序的检查清单', status: 'ACTIVE', scriptType: 'PYTHON', scriptContent: 'def generate_checkpoint_list(phenomenon_id):\n    checkpoints = graph.query(\n        f"MATCH (p:Phenomenon)-[:needs_check]->(cp:Checkpoint) WHERE p.id = \'{phenomenon_id}\' RETURN cp ORDER BY cp.priority"\n    )\n    return [{"step": i+1, "name": cp.label, "method": cp.method} for i, cp in enumerate(checkpoints)]' },
    ],
    idSeq: 1000,
    _v: DATA_VERSION,
  }
}

function load(): OntologyStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) { const s = defaultStore(); save(s); return s }
    const parsed = JSON.parse(raw)
    if (parsed._v !== DATA_VERSION) { const s = defaultStore(); save(s); return s }
    return parsed
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
