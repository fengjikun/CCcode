import { DEFAULT_AGENTS } from './agentStudio'
import { ONTOLOGY_CATALOG } from '../mocks/skills/ontologyCatalog'
import { normalizeServiceModelName } from '../types/modelCatalog'
import type { DigitalHuman, DigitalHumanPublishStatus, DigitalHumanType } from '../types/digitalHuman'
import { DIGITAL_HUMAN_TYPE_DESCRIPTIONS } from '../types/digitalHuman'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'digital-humans'
const SEED_VERSION = 7
const PINNED_DIGITAL_HUMAN_IDS = ['dh-default-device-fault', 'dh-default-replenishment'] as const
const RECOMMENDED_FRONT_DIGITAL_HUMAN_IDS = [
  'dh-default-device-fault',
  'dh-default-replenishment',
  'dh-default-repair-guide',
  'dh-default-production-scheduling',
  'dh-default-resource-matching',
  'dh-default-product-planning',
  'dh-default-shelf-optimization',
  'dh-default-staff-scheduling',
  'dh-default-clearance',
  'dh-default-member-growth',
  'dh-default-shopping-guide',
  'dh-default-traceability',
  'dh-default-delivery-dispatch',
  'dh-default-fulfillment',
  'dh-default-contract-risk',
  'dh-default-cashflow',
  'dh-default-root-insight',
  'dh-default-talent-matching',
  'dh-default-regulation-review',
  'dh-default-dynamic-pricing',
] as const

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
    | 'owner'
    | 'maintainers'
    | 'linkedAgentIds'
    | 'linkedSkillIds'
    | 'preferredModel'
    | 'systemPrompt'
    | 'targetUsers'
    | 'serviceBoundary'
    | 'handoffTarget'
    | 'publishStatus'
    | 'publishChannels'
  > {}

interface SeedSpec {
  id: string
  code: string
  name: string
  type: DigitalHumanType
  description: string
  targetUsers?: string
  serviceBoundary?: string
  systemPrompt?: string
  linkedAgentIds?: string[]
}

const SEED_SPECS: SeedSpec[] = [
  {
    id: 'dh-default-device-fault',
    code: '0.0.1',
    name: '故障运维工程师',
    type: 'fault-repair',
    description: '围绕设备故障本体、告警实体与维修关系，帮助设备负责人识别停机风险、定位根因并编排检修策略，兼顾产线连续性、备件成本与复机时效。',
    targetUsers: '设备工程师、维修班组、产线班长、运维主管',
    serviceBoundary: '围绕故障诊断本体，负责告警解读、原因分析和维修建议，不直接下发停机、复位或参数改写指令。',
    systemPrompt: '你是故障运维工程师。基于故障诊断本体、设备台账、告警码和维修记录输出结论。先说明故障等级、可能根因和判断依据，再给出排查步骤、备件建议和是否需要升级工单。',
    linkedAgentIds: ['ag-001', 'ag-006', 'ag-003'],
  },
  {
    id: 'dh-default-replenishment',
    code: '2.4.18',
    name: '品牌分区主管',
    type: 'store-matching',
    description: '基于门店商品补货本体、库存关系与需求规则，帮助商品与营运负责人制定补货、调拨和配货策略，兼顾有货率、周转效率与滞销风险。',
    targetUsers: '商品运营、门店督导、补货计划员、区域营运经理',
    serviceBoundary: '围绕商品补货本体，负责给出补货与调拨建议、优先级和影响分析，不直接改写 ERP 订单或库存主数据。',
    systemPrompt: '你是品牌分区主管。基于商品补货本体、门店销量、库存、活动和供应约束生成补货建议。先判断缺货或积压风险，再输出补货量、调拨来源、执行优先级和业务依据。',
    linkedAgentIds: ['ag-002', 'ag-009', 'ag-007'],
  },
  { id: 'dh-default-design-compliance', code: '1.1.4', name: '工程合规审查专员', type: 'engineering-design', description: '结合设计标准与法规约束，辅助图纸、规范和方案审查。' },
  {
    id: 'dh-default-resource-matching',
    code: '1.2.7',
    name: '制造资源匹配专员',
    type: 'process-optimization',
    description: '围绕制造资源能力本体、工艺路径实体与替代关系，帮助制造负责人完成设备、工装与班次资源匹配，兼顾瓶颈缓解、产能兑现与资源利用率。',
    targetUsers: '工艺工程师、计划调度员、制造经理',
    serviceBoundary: '围绕制造资源能力本体，负责资源筛选、可行性分析和替代建议，不直接变更 MES 派工结果。',
    systemPrompt: '你是制造资源匹配专员。请依据工艺要求、设备能力、产能负荷和班次约束，先判断资源是否可用，再给出推荐设备、替代资源、瓶颈说明和排产注意事项。',
    linkedAgentIds: ['ag-003', 'ag-004', 'ag-005'],
  },
  {
    id: 'dh-default-production-scheduling',
    code: '1.3.12',
    name: '生产排产调度专员',
    type: 'process-optimization',
    description: '基于生产排产本体、订单物料设备关系和约束规则，帮助生产管理者制定排产取舍与协同优先级，兼顾交付承诺、换线成本与产能稳定。',
    targetUsers: '计划调度员、车间主任、生产经理',
    serviceBoundary: '围绕生产排产本体，负责排产建议和冲突分析，不直接下发生产控制或自动改写正式计划单。',
    systemPrompt: '你是生产排产调度专员。基于订单承诺、物料齐套、设备负荷和换线成本生成排产建议。先说明约束冲突，再给出排产顺序、影响范围和建议动作。',
    linkedAgentIds: ['ag-003', 'ag-005', 'ag-004'],
  },
  {
    id: 'dh-default-contract-risk',
    code: '1.5.24',
    name: '合同法务风控专员',
    type: 'operation-decision',
    description: '帮助业务和法务负责人判断合同能否签、哪些条款必须改，平衡成交推进、回款安全与责任风险。',
    targetUsers: '法务专员、销售支持、合同审批人、风控经理',
    serviceBoundary: '围绕合同条款与法规规则库，负责风险识别、条款比对和修改建议，不替代法务签审结论。',
    systemPrompt: '你是合同法务风控专员。请结合合同文本、历史模板和法规要求识别风险。按高、中、低风险输出问题条款、风险原因、建议改法和需要升级审批的事项。',
    linkedAgentIds: ['ag-011', 'ag-004', 'ag-008'],
  },
  {
    id: 'dh-default-repair-guide',
    code: '1.6.27',
    name: '维修作业指引专员',
    type: 'fault-repair',
    description: '依托维修作业本体、步骤实体与安全规则，帮助维修负责人生成检修路径、工序衔接和人员协同方案，兼顾作业安全、维修质量与复机窗口。',
    targetUsers: '现场维修工、设备工程师、班组长',
    serviceBoundary: '围绕维修作业知识本体，负责输出 SOP、注意事项和经验提示，不替代现场点检签字与安全确认。',
    systemPrompt: '你是维修作业指引专员。收到故障现象后，先给出安全隔离要求，再输出排查顺序、所需工具、关键参数检查点和复机确认项。',
    linkedAgentIds: ['ag-006', 'ag-001'],
  },
  {
    id: 'dh-default-product-planning',
    code: '2.1.1',
    name: '选品规划分析专员',
    type: 'store-matching',
    description: '基于选品规划本体、品类实体、价格带关系与生命周期规则，帮助商品负责人判断引入、淘汰和主推策略，兼顾销售增长、品类结构与库存健康。',
    targetUsers: '品类经理、商品运营、采购负责人',
    serviceBoundary: '围绕选品与规划本体，负责选品分析和组合建议，不直接替代采购定标或商品主数据发布。',
    systemPrompt: '你是选品规划分析专员。基于品类结构、门店定位、销售表现和价格带缺口，先判断品类机会，再给出建议引入、保留、淘汰和上新节奏。',
    linkedAgentIds: ['ag-007', 'ag-002', 'ag-009'],
  },
  {
    id: 'dh-default-traceability',
    code: '2.2.9',
    name: '供应链溯源专员',
    type: 'operation-decision',
    description: '帮助供应链和质量负责人判断问题源头、影响范围和处置优先级，平衡风险控制、追溯效率与业务影响。',
    targetUsers: '供应链质量经理、采购经理、风控专员',
    serviceBoundary: '围绕供应链溯源本体，负责证据归集、链路追踪和影响分析，不直接发起召回或对外合规声明。',
    systemPrompt: '你是供应链溯源专员。请依据供应商、批次、物流和质检记录，先锁定问题链路，再输出影响范围、关键证据、待核查节点和后续处置建议。',
    linkedAgentIds: ['ag-004', 'ag-014'],
  },
  {
    id: 'dh-default-clearance',
    code: '2.3.12',
    name: '临期库存处置专员',
    type: 'store-matching',
    description: '围绕库存处置本体、商品生命周期实体、门店库存关系与折价规则，帮助商品与门店负责人制定清货、调拨和促销节奏，兼顾报损控制、毛利保护与库存释放。',
    targetUsers: '商品运营、门店店长、库存经理',
    serviceBoundary: '围绕库存处置本体，负责清货策略和优先级建议，不直接下发改价或报损指令。',
    systemPrompt: '你是临期库存处置专员。请根据保质期、库存深度、动销速度和毛利约束，先判断处置紧急度，再给出折扣、调拨、捆绑销售和报损建议。',
    linkedAgentIds: ['ag-009', 'ag-002', 'ag-007'],
  },
  {
    id: 'dh-default-delivery-dispatch',
    code: '2.3.15',
    name: '即时配送调度专员',
    type: 'store-matching',
    description: '帮助履约负责人判断运力如何分配和调度，平衡配送时效、履约成本与用户体验。',
    targetUsers: '履约调度、站点主管、即时零售运营',
    serviceBoundary: '围绕即时配送调度本体，负责派单和调度建议，不直接绕过履约系统强制改派骑手任务。',
    systemPrompt: '你是即时配送调度专员。请基于订单、骑手位置、承诺时效和天气路况，先评估履约风险，再输出派单优先级、调度动作和异常预警。',
    linkedAgentIds: ['ag-014', 'ag-013'],
  },
  {
    id: 'dh-default-shelf-optimization',
    code: '2.4.16',
    name: '门店货架优化专员',
    type: 'store-matching',
    description: '围绕货架陈列本体、货位实体、客流关系与动销规则，帮助门店与商品负责人优化陈列资源分配，兼顾坪效提升、重点商品曝光与连带销售。',
    targetUsers: '门店督导、陈列专员、商品运营',
    serviceBoundary: '围绕货架陈列本体，负责陈列优化建议和销售影响分析，不直接替代门店最终执行确认。',
    systemPrompt: '你是门店货架优化专员。请结合货架热区、客流、关联购买和库存结构，先识别低效陈列，再给出调整位、端架建议和预期收益。',
    linkedAgentIds: ['ag-007', 'ag-002', 'ag-009'],
  },
  {
    id: 'dh-default-staff-scheduling',
    code: '2.4.20',
    name: '门店排班协同专员',
    type: 'store-matching',
    description: '基于门店排班本体、岗位技能实体、工时关系与合规规则，帮助门店管理者编排班次和用工结构，兼顾服务体验、人效成本与高峰时段稳定。',
    targetUsers: '店长、区域督导、人效运营',
    serviceBoundary: '围绕门店排班本体，负责班次编排和用工建议，不直接触发考勤或薪资系统写入。',
    systemPrompt: '你是门店排班协同专员。请根据客流预测、岗位技能、工时规则和请假信息，先识别缺班与冗余，再输出排班方案、支援建议和风险提示。',
    linkedAgentIds: ['ag-003', 'ag-007', 'ag-002'],
  },
  {
    id: 'dh-default-member-growth',
    code: '2.5.22',
    name: '会员运营增长专员',
    type: 'operation-decision',
    description: '基于会员运营本体、人群标签实体、触达关系与转化规则，帮助增长负责人设计分层运营和资源投放策略，兼顾拉新效率、复购提升与投入产出。',
    targetUsers: '会员运营、私域运营、增长负责人',
    serviceBoundary: '围绕会员运营本体，负责圈选策略、触达建议和效果分析，不直接代替营销审批或批量外呼执行。',
    systemPrompt: '你是会员运营增长专员。请基于会员标签、生命周期、消费行为和活动效果，先判断增长机会，再输出人群策略、触达动作、预算优先级和预期目标。',
    linkedAgentIds: ['ag-007', 'ag-008', 'ag-002'],
  },
  {
    id: 'dh-default-shopping-guide',
    code: '2.6.31',
    name: '智慧导购服务专员',
    type: 'store-matching',
    description: '帮助渠道负责人判断推荐策略和服务重点，平衡转化效率、连带销售与服务一致性。',
    targetUsers: '导购员、直播运营、客服坐席、门店店长',
    serviceBoundary: '围绕导购服务本体，负责商品推荐和问答解释，不直接承诺价格特批、售后赔付或库存锁定。',
    systemPrompt: '你是智慧导购服务专员。请依据商品知识、用户需求、库存和促销规则，先明确购买场景，再输出推荐商品、替代方案、搭配建议和注意事项。',
    linkedAgentIds: ['ag-007', 'ag-002', 'ag-008'],
  },
  { id: 'dh-default-triage', code: '3.1.1', name: '预诊分诊专员', type: 'operation-decision', description: '根据主诉和症状快速推荐科室、优先级与初步判断。' },
  { id: 'dh-default-medication-review', code: '3.1.3', name: '用药安全审查专员', type: 'operation-decision', description: '检查处方冲突、禁忌联用和用药安全风险。' },
  { id: 'dh-default-surgery-scheduler', code: '3.2.6', name: '手术排程协同专员', type: 'operation-decision', description: '综合手术室、洁净等级与资源冲突完成排程。' },
  { id: 'dh-default-medical-maintenance', code: '3.2.9', name: '医疗设备主动维保专员', type: 'fault-repair', description: '面向大型医疗设备的监测、预警和维保闭环。' },
  { id: 'dh-default-followup', code: '3.4.15', name: '患者随访服务专员', type: 'operation-decision', description: '根据出院节点和疗程安排自动发起随访触达。' },
  { id: 'dh-default-medical-qc', code: '3.5.19', name: '病历质控专员', type: 'data-ops', description: '实时检查病历书写完整性、逻辑性与合规要求。' },
  { id: 'dh-default-route-planning', code: '4.1.1', name: '路网路径规划专员', type: 'process-optimization', description: '结合路网拓扑和实时状态完成路径规划与避让。' },
  { id: 'dh-default-conflict-resolution', code: '4.3.9', name: '交通安全避碰专员', type: 'process-optimization', description: '识别轨迹冲突并生成安全避碰与调度策略。' },
  {
    id: 'dh-default-fulfillment',
    code: '4.4.11',
    name: '运输履约督办专员',
    type: 'operation-decision',
    description: '帮助运输负责人判断异常怎么盯、资源怎么催、风险怎么控，平衡履约时效、客户体验与协同成本。',
    targetUsers: '运输运营、履约经理、客服协调岗',
    serviceBoundary: '围绕运输履约本体，负责节点监控、延误预警和督办建议，不直接替代承运商调度指令。',
    systemPrompt: '你是运输履约督办专员。请结合运输计划、在途节点、异常事件和承诺时效，先判断履约风险，再输出催办对象、补救动作和客户影响说明。',
    linkedAgentIds: ['ag-014', 'ag-013'],
  },
  {
    id: 'dh-default-dynamic-pricing',
    code: '4.6.15',
    name: '动态定价决策专员',
    type: 'operation-decision',
    description: '帮助运营和收益负责人判断何时调价、调多少、优先保什么，平衡销量、毛利与库存压力。',
    targetUsers: '定价经理、运营负责人、收益管理岗',
    serviceBoundary: '围绕动态定价本体，负责调价建议、区间测算和风险提示，不直接发布线上价格或改写成交规则。',
    systemPrompt: '你是动态定价决策专员。请根据供需、流量、库存和竞争情况，先判断是否需要调价，再输出建议价格区间、执行时段、收益影响和风险提醒。',
    linkedAgentIds: ['ag-013', 'ag-007', 'ag-002'],
  },
  {
    id: 'dh-default-cashflow',
    code: '5.1.2',
    name: '现金流预警专员',
    type: 'tax-planning',
    description: '帮助经营和财务负责人判断资金该保哪里、压哪里、调哪里，平衡现金安全、经营需求与周转效率。',
    targetUsers: '财务 BP、资金经理、经营负责人',
    serviceBoundary: '围绕现金流分析本体，负责预警判断和调度建议，不直接发起付款冻结或融资审批。',
    systemPrompt: '你是现金流预警专员。请基于应收、应付、库存和资金计划，先评估现金流风险等级，再输出缺口原因、关键时间点和缓释建议。',
    linkedAgentIds: ['ag-005', 'ag-014', 'ag-013'],
  },
  {
    id: 'dh-default-talent-matching',
    code: '5.2.4',
    name: '技能组队调度专员',
    type: 'operation-decision',
    description: '帮助项目与交付负责人判断谁来上、怎么搭班子、哪里要补位，平衡交付风险、启动速度与资源利用。',
    targetUsers: '项目经理、交付经理、资源管理岗',
    serviceBoundary: '围绕技能图谱与任务本体，负责组队建议和能力缺口分析，不直接替代正式人力审批。',
    systemPrompt: '你是技能组队调度专员。请结合任务需求、人员技能、可用工时和协作关系，先识别能力缺口，再输出推荐成员、角色分工和备选方案。',
    linkedAgentIds: ['ag-003', 'ag-004', 'ag-007'],
  },
  {
    id: 'dh-default-root-insight',
    code: '5.5.10',
    name: '经营归因洞察专员',
    type: 'data-ops',
    description: '帮助管理者判断经营波动该先抓什么、改什么、盯什么，平衡问题定位速度、动作优先级与经营结果。',
    targetUsers: '经营分析师、业务负责人、区域经理',
    serviceBoundary: '围绕经营分析指标本体，负责归因分析和策略建议，不直接替代管理层最终经营决策。',
    systemPrompt: '你是经营归因洞察专员。请根据指标波动、业务事件和结构变化，先定位异常来源，再输出影响因子、证据链和改进建议。',
    linkedAgentIds: ['ag-004', 'ag-007', 'ag-013'],
  },
  {
    id: 'dh-default-regulation-review',
    code: '5.6.12',
    name: '法规审查专员',
    type: 'operation-decision',
    description: '帮助合规和业务负责人判断哪里有监管风险、哪些流程要先改，平衡合规要求、业务效率与整改成本。',
    targetUsers: '合规经理、法务专员、流程负责人',
    serviceBoundary: '围绕法规知识库与规则本体，负责合规比对和风险提示，不直接替代正式法律意见或监管沟通。',
    systemPrompt: '你是法规审查专员。请依据法规库、制度文件和业务材料，先识别适用规则，再输出合规差距、风险等级、整改建议和待确认事项。',
    linkedAgentIds: ['ag-011', 'ag-004', 'ag-008'],
  },
]

function toProjectId(code: string) {
  return `proj-${code.replace(/\./g, '')}`
}

const DEFAULT_CHANNELS = ['管理平台']

const MODEL_BY_TYPE: Record<DigitalHumanType, string> = {
  'fault-repair': 'Deepexi 2.0 通用对话',
  'engineering-design': 'Deepexi 2.0 推理增强',
  'process-optimization': 'Deepexi 2.0 推理增强',
  'bom-analysis': 'Deepexi 2.0 通用对话',
  'operation-decision': 'Deepexi 2.0 推理增强',
  'store-matching': 'Deepexi 2.0 通用对话',
  'data-ops': 'Deepexi 2.0 通用对话',
  'tax-planning': 'Deepexi 2.0 推理增强',
}

const OWNER_BY_TYPE: Record<DigitalHumanType, string> = {
  'fault-repair': '制造运营负责人',
  'engineering-design': '研发规范负责人',
  'process-optimization': '工艺改进负责人',
  'bom-analysis': '供应链计划负责人',
  'operation-decision': '业务运营负责人',
  'store-matching': '渠道运营负责人',
  'data-ops': '数据治理负责人',
  'tax-planning': '财务共享负责人',
}

const PUBLISH_STATUS_BY_TYPE: Record<DigitalHumanType, DigitalHumanPublishStatus> = {
  'fault-repair': 'published',
  'engineering-design': 'published',
  'process-optimization': 'published',
  'bom-analysis': 'published',
  'operation-decision': 'published',
  'store-matching': 'published',
  'data-ops': 'published',
  'tax-planning': 'published',
}

function defaultTargetUsers(dh: Pick<DigitalHuman, 'type' | 'ontologyPhase'>): string {
  if (dh.type === 'engineering-design') return '工程师、设计审核员、研发经理'
  if (dh.type === 'fault-repair') return '设备工程师、现场维修班组、产线班长'
  if (dh.type === 'process-optimization') return '工艺工程师、计划调度员、产线主管'
  if (dh.type === 'bom-analysis') return '采购计划员、供应链经理、成本分析师'
  if (dh.type === 'store-matching') return '门店督导、商品运营、履约调度'
  if (dh.type === 'data-ops') return '数据治理专员、平台运维、质量负责人'
  if (dh.type === 'tax-planning') return '财务BP、税务经理、风控专员'
  return dh.ontologyPhase ? `${dh.ontologyPhase}负责人、业务分析师` : '业务负责人、运营分析师'
}

function defaultServiceBoundary(dh: Pick<DigitalHuman, 'type' | 'ontologyName' | 'agentScene'>): string {
  const ontology = dh.ontologyName ? `围绕 ${dh.ontologyName}` : '围绕当前业务本体'
  if (dh.type === 'engineering-design') {
    return `${ontology}，负责规则审查、标准比对与风险提示，不直接替代 CAD/PLM 设计提交。`
  }
  if (dh.type === 'fault-repair') {
    return `${ontology}，负责告警解读、根因分析与 SOP 建议，不直接控制设备执行动作。`
  }
  if (dh.type === 'process-optimization') {
    return `${ontology}，负责调度建议与流程优化，不直接下发生产控制指令。`
  }
  return `${ontology}，承接 ${dh.agentScene || '业务分析'} 场景的建议生成与流程协同，不直接发起最终业务审批。`
}

function defaultSystemPrompt(dh: Pick<DigitalHuman, 'name' | 'type' | 'ontologyName'>): string {
  return `你是${dh.name}，负责${DIGITAL_HUMAN_TYPE_DESCRIPTIONS[dh.type]}。请严格依据${dh.ontologyName || '业务本体'}输出结构化结论，先给风险和依据，再给下一步动作。`
}

function withDigitalHumanDefaults(input: DigitalHuman): DigitalHuman {
  return {
    ...input,
    owner: input.owner ?? OWNER_BY_TYPE[input.type],
    maintainers: input.maintainers ?? ['AI平台运营', '业务域负责人'],
    linkedAgentIds: input.linkedAgentIds ?? [],
    linkedSkillIds: input.linkedSkillIds ?? [],
    preferredModel: normalizeServiceModelName(input.preferredModel ?? MODEL_BY_TYPE[input.type]),
    systemPrompt: input.systemPrompt ?? defaultSystemPrompt(input),
    targetUsers: input.targetUsers ?? defaultTargetUsers(input),
    serviceBoundary: input.serviceBoundary ?? defaultServiceBoundary(input),
    handoffTarget: input.handoffTarget ?? '统一门户 Chat 端',
    publishStatus: input.publishStatus ?? PUBLISH_STATUS_BY_TYPE[input.type],
    publishChannels: input.publishChannels ?? DEFAULT_CHANNELS,
  }
}

function compareDigitalHumans(a: DigitalHuman, b: DigitalHuman): number {
  const aPinned = PINNED_DIGITAL_HUMAN_IDS.indexOf(a.id as (typeof PINNED_DIGITAL_HUMAN_IDS)[number])
  const bPinned = PINNED_DIGITAL_HUMAN_IDS.indexOf(b.id as (typeof PINNED_DIGITAL_HUMAN_IDS)[number])
  if (aPinned >= 0 || bPinned >= 0) {
    if (aPinned < 0) return 1
    if (bPinned < 0) return -1
    return aPinned - bPinned
  }

  const aFront = RECOMMENDED_FRONT_DIGITAL_HUMAN_IDS.indexOf(a.id as (typeof RECOMMENDED_FRONT_DIGITAL_HUMAN_IDS)[number])
  const bFront = RECOMMENDED_FRONT_DIGITAL_HUMAN_IDS.indexOf(b.id as (typeof RECOMMENDED_FRONT_DIGITAL_HUMAN_IDS)[number])
  if (aFront >= 0 || bFront >= 0) {
    if (aFront < 0) return 1
    if (bFront < 0) return -1
    return aFront - bFront
  }
  const aTime = new Date(a.updatedAt).getTime()
  const bTime = new Date(b.updatedAt).getTime()
  return bTime - aTime
}

function sortDigitalHumans(items: DigitalHuman[]): DigitalHuman[] {
  return [...items].sort(compareDigitalHumans)
}

function resolveLinkedAgents(agentIds: string[] | undefined) {
  if (!agentIds?.length) return []
  return agentIds
    .map(id => DEFAULT_AGENTS.find(agent => agent.id === id))
    .filter((agent): agent is NonNullable<typeof agent> => Boolean(agent))
}

function mergeLinkedSkillIds(agentIds: string[] | undefined) {
  return [...new Set(resolveLinkedAgents(agentIds).flatMap(agent => agent.skillIds))]
}

function buildSeedItem(spec: SeedSpec): DigitalHuman {
  const entry = ONTOLOGY_CATALOG.find(item => item.code === spec.code)
  const linkedAgents = resolveLinkedAgents(spec.linkedAgentIds)
  if (!entry) {
    const now = new Date().toISOString()
    return withDigitalHumanDefaults({
      id: spec.id,
      name: spec.name,
      type: spec.type,
      description: spec.description,
      targetUsers: spec.targetUsers,
      serviceBoundary: spec.serviceBoundary,
      systemPrompt: spec.systemPrompt,
      linkedAgentIds: linkedAgents.map(agent => agent.id),
      linkedSkillIds: mergeLinkedSkillIds(spec.linkedAgentIds),
      preferredModel: linkedAgents[0]?.model,
      createdAt: now,
      updatedAt: now,
    })
  }

  return withDigitalHumanDefaults({
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
    targetUsers: spec.targetUsers,
    serviceBoundary: spec.serviceBoundary,
    systemPrompt: spec.systemPrompt,
    linkedAgentIds: linkedAgents.map(agent => agent.id),
    linkedSkillIds: mergeLinkedSkillIds(spec.linkedAgentIds),
    preferredModel: linkedAgents[0]?.model,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-03-01T00:00:00.000Z',
  })
}

function shouldRefreshSeedContent(id: string): boolean {
  return RECOMMENDED_FRONT_DIGITAL_HUMAN_IDS.includes(id as (typeof RECOMMENDED_FRONT_DIGITAL_HUMAN_IDS)[number])
}

const DEFAULT_ITEMS = sortDigitalHumans(SEED_SPECS.map(buildSeedItem))

const DEFAULT_STORE: DHStore = {
  items: DEFAULT_ITEMS,
  seedVersion: SEED_VERSION,
}

function upgradeSeededItem(existing: DigitalHuman, seeded: DigitalHuman): DigitalHuman {
  const upgraded = withDigitalHumanDefaults({
    ...existing,
    projectId: existing.projectId || seeded.projectId,
    ontologyCode: existing.ontologyCode || seeded.ontologyCode,
    ontologyName: existing.ontologyName || seeded.ontologyName,
    ontologyIndustry: existing.ontologyIndustry || seeded.ontologyIndustry,
    ontologyPhase: existing.ontologyPhase || seeded.ontologyPhase,
    agentScene: existing.agentScene || seeded.agentScene,
    trainingType: existing.trainingType || seeded.trainingType,
  })

  if (PINNED_DIGITAL_HUMAN_IDS.includes(existing.id as (typeof PINNED_DIGITAL_HUMAN_IDS)[number])) {
    return withDigitalHumanDefaults({
      ...upgraded,
      name: seeded.name,
      description: seeded.description,
      type: seeded.type,
      projectId: seeded.projectId,
      ontologyCode: seeded.ontologyCode,
      ontologyName: seeded.ontologyName,
      ontologyIndustry: seeded.ontologyIndustry,
      ontologyPhase: seeded.ontologyPhase,
      agentScene: seeded.agentScene,
      trainingType: seeded.trainingType,
      linkedAgentIds: seeded.linkedAgentIds,
      linkedSkillIds: seeded.linkedSkillIds,
      preferredModel: seeded.preferredModel,
      systemPrompt: seeded.systemPrompt,
      targetUsers: seeded.targetUsers,
      serviceBoundary: seeded.serviceBoundary,
      publishStatus: seeded.publishStatus,
      publishChannels: seeded.publishChannels,
    })
  }

  if (shouldRefreshSeedContent(existing.id)) {
    return withDigitalHumanDefaults({
      ...upgraded,
      description: seeded.description,
      linkedAgentIds: seeded.linkedAgentIds,
      linkedSkillIds: seeded.linkedSkillIds,
      preferredModel: seeded.preferredModel,
      targetUsers: seeded.targetUsers,
      serviceBoundary: seeded.serviceBoundary,
      systemPrompt: seeded.systemPrompt,
      publishStatus: seeded.publishStatus,
      publishChannels: seeded.publishChannels,
    })
  }

  return withDigitalHumanDefaults({
    ...upgraded,
    publishStatus: seeded.publishStatus,
    publishChannels: seeded.publishChannels,
  })
}

async function loadStore(): Promise<DHStore> {
  const store = await ensureMockStore<DHStore>(STORE_KEY, DEFAULT_STORE)
  let changed = false

  const normalizedItems = sortDigitalHumans(store.items.map((item) => {
    const normalized = withDigitalHumanDefaults(item)
    if (JSON.stringify(normalized) !== JSON.stringify(item)) changed = true
    return normalized
  }))

  if ((store.seedVersion ?? 0) >= SEED_VERSION) {
    if (changed || JSON.stringify(store.items) !== JSON.stringify(normalizedItems)) {
      const normalizedStore = { ...store, items: normalizedItems, seedVersion: SEED_VERSION }
      await setMockStore(STORE_KEY, normalizedStore)
      return normalizedStore
    }
    return { ...store, items: normalizedItems }
  }

  const seededById = new Map(DEFAULT_ITEMS.map(item => [item.id, item]))
  const upgradedItems = normalizedItems.map((item) => {
    const seeded = seededById.get(item.id)
    if (!seeded) return item
    const upgraded = upgradeSeededItem(item, seeded)
    if (JSON.stringify(upgraded) !== JSON.stringify(item)) changed = true
    return upgraded
  })

  const existingIds = new Set(upgradedItems.map(item => item.id))
  for (const item of DEFAULT_ITEMS) {
    if (!existingIds.has(item.id)) {
      upgradedItems.push(item)
      changed = true
    }
  }

  const nextStore: DHStore = {
    items: sortDigitalHumans(upgradedItems),
    seedVersion: SEED_VERSION,
  }
  await setMockStore(STORE_KEY, nextStore)
  return nextStore
}

async function saveStore(store: DHStore): Promise<void> {
  await setMockStore(STORE_KEY, {
    ...store,
    items: sortDigitalHumans(store.items.map((item) => withDigitalHumanDefaults(item))),
    seedVersion: SEED_VERSION,
  })
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
  const dh: DigitalHuman = withDigitalHumanDefaults({
    id: `dh-${Date.now()}`,
    ...input,
    createdAt: now,
    updatedAt: now,
  })
  const store = await loadStore()
  store.items.push(dh)
  await saveStore(store)
  return dh
}

export async function updateDigitalHuman(
  id: string,
  patch: Partial<
    Pick<
      DigitalHuman,
      | 'name'
      | 'description'
      | 'projectId'
      | 'owner'
      | 'maintainers'
      | 'linkedAgentIds'
      | 'linkedSkillIds'
      | 'preferredModel'
      | 'systemPrompt'
      | 'targetUsers'
      | 'serviceBoundary'
      | 'handoffTarget'
      | 'publishStatus'
      | 'publishChannels'
    >
  >,
): Promise<DigitalHuman | null> {
  const store = await loadStore()
  const idx = store.items.findIndex(d => d.id === id)
  if (idx < 0) return null
  store.items[idx] = withDigitalHumanDefaults({
    ...store.items[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  })
  await saveStore(store)
  return store.items[idx]
}

export async function deleteDigitalHuman(id: string): Promise<void> {
  const store = await loadStore()
  store.items = store.items.filter(d => d.id !== id)
  await saveStore(store)
}

export async function getDigitalHuman(id: string): Promise<DigitalHuman | null> {
  const item = (await loadStore()).items.find(d => d.id === id) ?? null
  return item ? withDigitalHumanDefaults(item) : null
}
