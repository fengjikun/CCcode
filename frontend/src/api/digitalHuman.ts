import { ONTOLOGY_CATALOG } from '../mocks/skills/ontologyCatalog'
import type { DigitalHuman, DigitalHumanType } from '../types/digitalHuman'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'digital-humans'
const SEED_VERSION = 2

interface DHStore {
  items: DigitalHuman[]
  seedVersion?: number
}

export interface CreateDigitalHumanInput
  extends Pick<
    DigitalHuman,
    | 'name'
    | 'type'
    | 'description'
    | 'projectId'
    | 'ontologyCode'
    | 'ontologyName'
    | 'ontologyIndustry'
    | 'ontologyPhase'
    | 'agentScene'
    | 'trainingType'
  > {}

interface SeedSpec {
  id: string
  code: string
  name: string
  type: DigitalHumanType
  description: string
}

const SEED_SPECS: SeedSpec[] = [
  { id: 'dh-default-device-fault', code: '0.0.1', name: '设备运维诊断专员', type: 'fault-repair', description: '面向设备告警、故障根因定位与维修建议输出的数字员工入口。' },
  { id: 'dh-default-design-compliance', code: '1.1.4', name: '工程合规审查专员', type: 'engineering-design', description: '结合设计标准与法规约束，辅助图纸、规范和方案审查。' },
  { id: 'dh-default-resource-matching', code: '1.2.7', name: '制造资源匹配专员', type: 'process-optimization', description: '根据工艺能力、设备精度和产线条件完成资源筛选与匹配。' },
  { id: 'dh-default-production-scheduling', code: '1.3.12', name: '生产排产调度专员', type: 'process-optimization', description: '处理插单、重排产、节拍优化与生产资源协同。' },
  { id: 'dh-default-replenishment', code: '1.4.18', name: '供应链补货协同专员', type: 'bom-analysis', description: '围绕库存阈值、补货时点和供应商协同生成执行建议。' },
  { id: 'dh-default-contract-risk', code: '1.5.24', name: '合同法务风控专员', type: 'operation-decision', description: '扫描销售合同与条款约束，识别高风险点和合规问题。' },
  { id: 'dh-default-repair-guide', code: '1.6.27', name: '维修作业指引专员', type: 'fault-repair', description: '根据故障类型自动输出 SOP、工具清单与维修步骤。' },
  { id: 'dh-default-product-planning', code: '2.1.1', name: '选品规划分析专员', type: 'store-matching', description: '根据品类架构与缺口分析，生成商品规划与上新建议。' },
  { id: 'dh-default-traceability', code: '2.2.9', name: '供应链溯源专员', type: 'operation-decision', description: '面向原料、供应商和链路证据进行透明化追溯。' },
  { id: 'dh-default-clearance', code: '2.3.12', name: '临期库存处置专员', type: 'store-matching', description: '针对临期库存做清货节奏、折扣策略与处置建议。' },
  { id: 'dh-default-delivery-dispatch', code: '2.3.15', name: '即时配送调度专员', type: 'store-matching', description: '围绕骑手负载、时效与收益做动态运力调度。' },
  { id: 'dh-default-shelf-optimization', code: '2.4.16', name: '门店货架优化专员', type: 'store-matching', description: '基于货架图谱与关联购买数据优化陈列布局。' },
  { id: 'dh-default-staff-scheduling', code: '2.4.20', name: '门店排班协同专员', type: 'store-matching', description: '根据客流波峰、技能和跨店需求生成排班方案。' },
  { id: 'dh-default-member-growth', code: '2.5.22', name: '会员运营增长专员', type: 'operation-decision', description: '连接会员画像、标签与营销动作，提升复购与转化。' },
  { id: 'dh-default-shopping-guide', code: '2.6.31', name: '智慧导购服务专员', type: 'store-matching', description: '承接商品问答、直播导购和售前咨询的服务入口。' },
  { id: 'dh-default-triage', code: '3.1.1', name: '预诊分诊专员', type: 'operation-decision', description: '根据主诉和症状快速推荐科室、优先级与初步判断。' },
  { id: 'dh-default-medication-review', code: '3.1.3', name: '用药安全审查专员', type: 'operation-decision', description: '检查处方冲突、禁忌联用和用药安全风险。' },
  { id: 'dh-default-surgery-scheduler', code: '3.2.6', name: '手术排程协同专员', type: 'operation-decision', description: '综合手术室、洁净等级与资源冲突完成排程。' },
  { id: 'dh-default-medical-maintenance', code: '3.2.9', name: '医疗设备主动维保专员', type: 'fault-repair', description: '面向大型医疗设备的监测、预警和维保闭环。' },
  { id: 'dh-default-followup', code: '3.4.15', name: '患者随访服务专员', type: 'operation-decision', description: '根据出院节点和疗程安排自动发起随访触达。' },
  { id: 'dh-default-medical-qc', code: '3.5.19', name: '病历质控专员', type: 'data-ops', description: '实时检查病历书写完整性、逻辑性与合规要求。' },
  { id: 'dh-default-route-planning', code: '4.1.1', name: '路网路径规划专员', type: 'process-optimization', description: '结合路网拓扑和实时状态完成路径规划与避让。' },
  { id: 'dh-default-conflict-resolution', code: '4.3.9', name: '交通安全避碰专员', type: 'process-optimization', description: '识别轨迹冲突并生成安全避碰与调度策略。' },
  { id: 'dh-default-fulfillment', code: '4.4.11', name: '运输履约督办专员', type: 'operation-decision', description: '跟踪运输单履约节点，预判延误并触发督办。' },
  { id: 'dh-default-dynamic-pricing', code: '4.6.15', name: '动态定价决策专员', type: 'operation-decision', description: '根据供需比和流量变化生成收益最大化定价策略。' },
  { id: 'dh-default-cashflow', code: '5.1.2', name: '现金流预警专员', type: 'tax-planning', description: '从资金风险和现金流预测出发提供预警和调度建议。' },
  { id: 'dh-default-talent-matching', code: '5.2.4', name: '技能组队调度专员', type: 'operation-decision', description: '根据任务属性和技能图谱自动组建最佳项目团队。' },
  { id: 'dh-default-root-insight', code: '5.5.10', name: '经营归因洞察专员', type: 'data-ops', description: '针对 KPI 异常波动进行归因分析和经营洞察生成。' },
  { id: 'dh-default-regulation-review', code: '5.6.12', name: '法规审查专员', type: 'operation-decision', description: '面向法规库、合同与政策规则做法务审查与合规提示。' },
]

function toProjectId(code: string) {
  return `proj-${code.replace(/\./g, '')}`
}

function buildSeedItem(spec: SeedSpec): DigitalHuman {
  const entry = ONTOLOGY_CATALOG.find(item => item.code === spec.code)
  if (!entry) {
    const now = new Date().toISOString()
    return {
      id: spec.id,
      name: spec.name,
      type: spec.type,
      description: spec.description,
      createdAt: now,
      updatedAt: now,
    }
  }

  return {
    id: spec.id,
    name: spec.name,
    type: spec.type,
    description: spec.description,
    projectId: toProjectId(entry.code),
    ontologyCode: entry.code,
    ontologyName: entry.name,
    ontologyIndustry: entry.industry,
    ontologyPhase: entry.phase,
    agentScene: entry.agentScene,
    trainingType: entry.trainingType,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-03-01T00:00:00.000Z',
  }
}

const DEFAULT_ITEMS = SEED_SPECS.map(buildSeedItem)

const DEFAULT_STORE: DHStore = {
  items: DEFAULT_ITEMS,
  seedVersion: SEED_VERSION,
}

async function loadStore(): Promise<DHStore> {
  const store = await ensureMockStore<DHStore>(STORE_KEY, DEFAULT_STORE)
  if ((store.seedVersion ?? 0) >= SEED_VERSION) return store

  const existingIds = new Set(store.items.map(item => item.id))
  const seeded = [...store.items]
  for (const item of DEFAULT_ITEMS) {
    if (!existingIds.has(item.id)) seeded.push(item)
  }

  const nextStore: DHStore = { items: seeded, seedVersion: SEED_VERSION }
  await setMockStore(STORE_KEY, nextStore)
  return nextStore
}

async function saveStore(store: DHStore): Promise<void> {
  await setMockStore(STORE_KEY, { ...store, seedVersion: SEED_VERSION })
}

export async function listDigitalHumans(): Promise<DigitalHuman[]> {
  return (await loadStore()).items
}

export async function createDigitalHuman(input: CreateDigitalHumanInput): Promise<DigitalHuman>
export async function createDigitalHuman(
  name: string,
  type: DigitalHumanType,
  description?: string,
): Promise<DigitalHuman>
export async function createDigitalHuman(
  inputOrName: CreateDigitalHumanInput | string,
  type?: DigitalHumanType,
  description?: string,
): Promise<DigitalHuman> {
  const input: CreateDigitalHumanInput = typeof inputOrName === 'string'
    ? { name: inputOrName, type: type ?? 'fault-repair', description }
    : inputOrName
  const now = new Date().toISOString()
  const dh: DigitalHuman = {
    id: `dh-${Date.now()}`,
    ...input,
    createdAt: now,
    updatedAt: now,
  }
  const store = await loadStore()
  store.items.push(dh)
  await saveStore(store)
  return dh
}

export async function updateDigitalHuman(
  id: string,
  patch: Partial<Pick<DigitalHuman, 'name' | 'description' | 'projectId'>>,
): Promise<DigitalHuman | null> {
  const store = await loadStore()
  const idx = store.items.findIndex(d => d.id === id)
  if (idx < 0) return null
  store.items[idx] = { ...store.items[idx], ...patch, updatedAt: new Date().toISOString() }
  await saveStore(store)
  return store.items[idx]
}

export async function deleteDigitalHuman(id: string): Promise<void> {
  const store = await loadStore()
  store.items = store.items.filter(d => d.id !== id)
  await saveStore(store)
}

export async function getDigitalHuman(id: string): Promise<DigitalHuman | null> {
  return (await loadStore()).items.find(d => d.id === id) ?? null
}
