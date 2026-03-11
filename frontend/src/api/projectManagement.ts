import type {
  ActionDefinition,
  AiInsightRun,
  ActionStatus,
  EntityPropertyConfig,
  EntityTypeConfig,
  ExtractionRun,
  FunctionDefinition,
  FunctionStatus,
  ProjectFunctionRunResult,
  OntologyVersion,
  ProjectDetail,
  ProjectDocument,
  ProjectSummary,
  RelationTypeConfig,
  ReviewItem,
  ReviewStatus,
  SchemaConfig,
  SkillConfig,
  StructuredDataSource,
  VersionItem,
  DataSourceType,
  DataSourceExtractMode,
  DataSourceSyncMode,
} from '../types/projectMvp'
import { delay, rand } from './mockConfig'

const STORAGE_KEY = 'deepexios_projects_v3'
/** 当默认数据结构变化时递增此值，触发本地缓存迁移 */
const DATA_VERSION = 12

interface ProjectStore {
  projects: ProjectDetail[]
  idSeq: number
  _v?: number
}

interface MockEntityDescriptor {
  type: string
  name: string
}

const PROJECT_ENTITY_NAME_POOLS: Record<string, Record<string, string[]>> = {
  'proj-001': {
    Equipment: ['VM-850 立式加工中心', 'HMC-630 卧式加工中心', '五轴联动加工单元', '高速钻攻中心', '龙门铣削工作站', '液压动力站', '刀库换刀机构'],
    Phenomenon: ['主轴温升异常', '主轴振动超限', '进给轴定位偏差', '液压压力波动', '刀具寿命异常衰减', '换刀超时报警', '表面粗糙度劣化'],
    SubPhenomenon: ['振动频谱出现BPFO峰值', '主轴箱外壳温升超18℃', 'Z轴重复定位偏差增大', '液压回路压力脉动增强', '主轴端面跳动超差', '刀柄夹持力下降'],
    Checkpoint: ['检查主轴润滑回路', '测量轴承预紧力', '校验Z轴丝杠背隙', '检查液压滤芯堵塞度', '复测主轴端跳', '核查换刀机械手原点'],
    Cause: ['主轴轴承早期剥落', '润滑油路局部堵塞', '丝杠螺母副磨损', '液压阀芯卡滞', '刀柄夹紧机构磨损', '热漂移补偿失准'],
    Solution: ['更换主轴轴承并跑合验证', '清洗润滑回路并更换滤芯', '调整丝杠预紧并重标定', '更换液压阀组并复位参数', '更换刀柄夹紧组件', '重新执行热误差标定'],
    Component: ['主轴前轴承组', '主轴润滑回路', 'Z轴滚珠丝杠', '液压比例阀', '刀柄夹紧弹簧组', '换刀机械手'],
    Parameter: ['主轴振动RMS', '主轴温升', '液压回路压力', 'Z轴定位误差', '刀柄夹持力', '主轴端面跳动'],
    EightDReport: ['8D报告#2025-11-23-EL402', '8D报告#2025-11-03-SLIDE12', '8D报告#2025-09-22-07EL360', '8D报告#2025-08-07-EL1570'],
    ProductionLine: ['最终线入口', '内饰二线尾', '后悬分装', '夹具线入口', 'PVC下线工位', '调整线10'],
    CorrectiveAction: ['恢复改动前PLC程序并强制接车记忆信号', '更换升降机抱闸继电器', '更换变频器控制模块', '更换联轴器链条及损坏横移链'],
    PreventiveAction: ['新增吊具进出信号显示与清除功能', '重点工位控制单元专项更换', '编制变频器抱闸点位修改指导书', '横向排查其余升降机联轴器开口销'],
  },
  'proj-2418': {
    Product: ['Nike Air Max 270', 'Nike Pegasus 41', 'Belle云感通勤鞋', 'Adidas Samba OG', 'On Cloudmonster'],
    Store: ['上海南京东路旗舰店', '上海五角场万达店', '上海静安大悦城店', '上海徐家汇港汇店', '上海环球港店'],
    Warehouse: ['华东上海闵行中心仓', '华东昆山鞋服周转仓', '上海青浦门店中转仓'],
    SalesOrder: ['SO-SH-20260301-10021', 'SO-SH-20260302-10318', 'SO-SH-20260303-10902', 'SO-SH-20260304-11087'],
    Inventory: ['INV-SH-MH-20260309', 'INV-SH-KS-20260309', 'INV-SH-QP-20260309'],
    SizeProfile: ['女鞋标准尺码曲线', '男鞋标准尺码曲线', '旗舰店黄金尺码曲线'],
    ReplenishmentPlan: ['上海城市单品补货计划#001', '上海区域Nike Air Max 270补货计划', '门店14天覆盖补货计划'],
    PurchaseOrder: ['PO-SH-20260310-001', 'PO-SH-20260310-002', 'PO-SH-20260310-003'],
  },
}

const FAULT_DIAGNOSIS_PROJECT_ID = 'proj-001'
const FAULT_DIAGNOSIS_PROJECT_NAME = '故障诊断本体'

const FAULT_DIAGNOSIS_8D_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-fd-006',
    name: '最终线入口EL402升降机带车在高位不下降，最终线欠量停线-附件-2025.11.23 8D设备故障分析报告_最终线升降机接车异常.docx',
    fileType: 'docx',
    size: 23265,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-11-23T09:00:00.000Z',
  },
  {
    id: 'doc-fd-007',
    name: '12号滑板在内饰二线尾升降机处无上升动作，升降机无法接车，导致内饰二满位停线-附件-2025.11.03 8D设备故障分析报告_内饰二线尾12号滑板故障(1).docx',
    fileType: 'docx',
    size: 25011,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-11-03T09:00:00.000Z',
  },
  {
    id: 'doc-fd-008',
    name: '07EL360升降机失速故障导致配重导向轴轮损坏-附件-2025-09-22 报交出口07EL360升降机故障分析.docx',
    fileType: 'docx',
    size: 21528,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-09-22T09:00:00.000Z',
  },
  {
    id: 'doc-fd-009',
    name: '涂装P1Y1C4EL395升降机不下降-附件-20250910六工厂涂装P1Y1C4EL395升降机不下降.docx',
    fileType: 'docx',
    size: 20095,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-09-10T09:00:00.000Z',
  },
  {
    id: 'doc-fd-010',
    name: 'EL1570升降机掉落-附件-8.7后悬分装EL1570升降机故障-8D报告(1).docx',
    fileType: 'docx',
    size: 12591,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-08-07T09:00:00.000Z',
  },
  {
    id: 'doc-fd-011',
    name: '升降机不上升接车和接车后不下降，HMI报升降机变频器故障和无位置故障-附件-7.10内饰一线升降台变频器故障-8D报告.docx',
    fileType: 'docx',
    size: 13373,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-07-10T09:00:00.000Z',
  },
  {
    id: 'doc-fd-012',
    name: '夹具线入口升降机EL010联轴器双排链脱落，导致升降机失重从高位落到低位-附件-机运5区EL010升降机坠落8D报告(1).docx',
    fileType: 'docx',
    size: 16754,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-06-18T09:00:00.000Z',
  },
  {
    id: 'doc-fd-013',
    name: '升降机上升越位-附件-8D分析报告案例&调整线10升降机.docx',
    fileType: 'docx',
    size: 21062,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-05-16T09:00:00.000Z',
  },
  {
    id: 'doc-fd-014',
    name: '总装输送链EP203链条断裂导致车身掉落停线-附件-2026.02.28 8D设备故障分析报告_总装输送链断链故障.docx',
    fileType: 'docx',
    size: 28341,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-02-28T09:00:00.000Z',
  },
  {
    id: 'doc-fd-015',
    name: 'EP116推板机推板动作卡滞，导致车身歪斜无法进入工位-附件-2026.02.14 8D设备故障分析报告_推板机卡滞.docx',
    fileType: 'docx',
    size: 19874,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-02-14T09:00:00.000Z',
  },
  {
    id: 'doc-fd-016',
    name: '焊装WD201点焊机电极帽过热粘连，焊点质量不达标导致整批返工-附件-2026.01.22 8D设备故障分析报告_点焊机电极粘连.docx',
    fileType: 'docx',
    size: 31256,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-01-22T09:00:00.000Z',
  },
  {
    id: 'doc-fd-017',
    name: 'WD088弧焊机器人TCP漂移，焊缝偏位导致强度不合格-附件-2026.01.09 8D设备故障分析报告_弧焊机器人TCP偏移.docx',
    fileType: 'docx',
    size: 24680,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-01-09T09:00:00.000Z',
  },
  {
    id: 'doc-fd-018',
    name: '涂装车间液压站HP301压力波动，喷涂雾化异常导致漆面橘皮-附件-2025.12.30 8D设备故障分析报告_液压站压力波动.docx',
    fileType: 'docx',
    size: 17923,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-12-30T09:00:00.000Z',
  },
  {
    id: 'doc-fd-019',
    name: '总装夹具CL402定位销折断，定位失准导致车门间隙超差停线-附件-2025.12.18 8D设备故障分析报告_夹具定位销断裂.docx',
    fileType: 'docx',
    size: 22410,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-12-18T09:00:00.000Z',
  },
  {
    id: 'doc-fd-020',
    name: '冲压CP108伺服压力机滑块下死点位置漂移导致制件尺寸超差-附件-2025.12.05 8D设备故障分析报告_伺服压力机下死点漂移.docx',
    fileType: 'docx',
    size: 26188,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-12-05T09:00:00.000Z',
  },
  {
    id: 'doc-fd-021',
    name: '搬运机器人RB215减速机漏油导致地面污染触发安全停机-附件-2025.11.27 8D设备故障分析报告_机器人减速机漏油.docx',
    fileType: 'docx',
    size: 18567,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-11-27T09:00:00.000Z',
  },
  {
    id: 'doc-fd-022',
    name: '总装线变频器VFD306过温保护跳闸导致输送线急停-附件-2025.11.12 8D设备故障分析报告_变频器过温跳闸.docx',
    fileType: 'docx',
    size: 15342,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-11-12T09:00:00.000Z',
  },
  {
    id: 'doc-fd-023',
    name: '焊装门盖线GS501气缸密封圈老化内泄导致夹紧力不足焊接飞溅-附件-2025.10.29 8D设备故障分析报告_气缸内泄.docx',
    fileType: 'docx',
    size: 20134,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-10-29T09:00:00.000Z',
  },
  {
    id: 'doc-fd-024',
    name: '总装拧紧枪TG118扭矩传感器漂移，拧紧结果虚报OK导致质量逃脱-附件-2025.10.16 8D设备故障分析报告_拧紧枪扭矩漂移.docx',
    fileType: 'docx',
    size: 23891,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-10-16T09:00:00.000Z',
  },
  {
    id: 'doc-fd-025',
    name: '涂装输调漆系统PB209回路堵塞导致颜色切换失败大量废漆-附件-2025.10.03 8D设备故障分析报告_调漆系统堵塞.docx',
    fileType: 'docx',
    size: 29405,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-10-03T09:00:00.000Z',
  },
  {
    id: 'doc-fd-026',
    name: '冲压自动化线机械手MC304腕关节轴承磨损导致取件抖动废品率升高-附件-2025.09.19 8D设备故障分析报告_机械手轴承磨损.docx',
    fileType: 'docx',
    size: 24775,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-09-19T09:00:00.000Z',
  },
  {
    id: 'doc-fd-027',
    name: 'AGV小车AG117导航激光雷达污染导致路径偏移碰撞防护栏-附件-2025.09.05 8D设备故障分析报告_AGV激光雷达污染.docx',
    fileType: 'docx',
    size: 17689,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-09-05T09:00:00.000Z',
  },
  {
    id: 'doc-fd-028',
    name: '焊装主线PLC控制柜电源模块失效，控制系统掉电整线停产2小时-附件-2025.08.22 8D设备故障分析报告_PLC电源模块失效.docx',
    fileType: 'docx',
    size: 32014,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-08-22T09:00:00.000Z',
  },
  {
    id: 'doc-fd-029',
    name: '总装线螺柱焊SD205焊接能量失控，螺柱拉拔力不达标批量返工-附件-2025.08.12 8D设备故障分析报告_螺柱焊能量失控.docx',
    fileType: 'docx',
    size: 19233,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-08-12T09:00:00.000Z',
  },
  {
    id: 'doc-fd-030',
    name: '冲压CP203双动压力机液压锁止阀内泄导致滑块自行下落安全事件-附件-2025.07.28 8D设备故障分析报告_压力机液压锁止阀内泄.docx',
    fileType: 'docx',
    size: 27556,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-07-28T09:00:00.000Z',
  },
  {
    id: 'doc-fd-031',
    name: '涂装烘干炉HF401循环风机轴承失效，炉温均匀性超差导致大批漆膜不良-附件-2025.07.14 8D设备故障分析报告_烘干炉风机轴承失效.docx',
    fileType: 'docx',
    size: 25120,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-07-14T09:00:00.000Z',
  },
  {
    id: 'doc-fd-032',
    name: '总装线视觉检测相机VC309镜头污染，漏检率突增触发质量门拦截停线-附件-2025.06.30 8D设备故障分析报告_视觉检测漏检.docx',
    fileType: 'docx',
    size: 21887,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-06-30T09:00:00.000Z',
  },
  {
    id: 'doc-fd-033',
    name: '内饰线滑板SC114滑鞍磨损导致车身倾斜，触发安全光幕急停-附件-2025.06.06 8D设备故障分析报告_滑板滑鞍磨损.docx',
    fileType: 'docx',
    size: 18442,
    status: 'READY',
    enabled: true,
    uploadedAt: '2025-06-06T09:00:00.000Z',
  },
]

const FAULT_DIAGNOSIS_8D_ENTITY_TYPES: EntityTypeConfig[] = [
  {
    id: 'et-fd-009',
    name: 'EightDReport',
    description: '沉淀故障现象、5Why、临时措施和长期措施的 8D 设备故障分析报告。',
    properties: [
      { id: 'ep-fd-081', name: 'reportCode', displayName: '报告编号', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-fd-082', name: 'reportDate', displayName: '报告日期', dataType: 'DATE', required: true, sortOrder: 2 },
      { id: 'ep-fd-083', name: 'ownerTeam', displayName: '责任班组', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-fd-084', name: 'downtimeImpact', displayName: '停线影响', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-fd-010',
    name: 'ProductionLine',
    description: '8D 案例发生的产线、工位或区域定位实体。',
    properties: [
      { id: 'ep-fd-091', name: 'lineCode', displayName: '产线编码', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-fd-092', name: 'workshop', displayName: '车间', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-fd-093', name: 'station', displayName: '工位', dataType: 'STRING', required: false, sortOrder: 3 },
    ],
  },
  {
    id: 'et-fd-011',
    name: 'CorrectiveAction',
    description: '8D 报告中的临时纠正措施或现场止血动作。',
    properties: [
      { id: 'ep-fd-101', name: 'actionType', displayName: '措施类型', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-fd-102', name: 'ownerRole', displayName: '责任角色', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-fd-103', name: 'expectedCompleteAt', displayName: '预计完成时间', dataType: 'DATETIME', required: false, sortOrder: 3 },
    ],
  },
  {
    id: 'et-fd-012',
    name: 'PreventiveAction',
    description: '8D 报告中的长期预防措施、横向排查和标准化改进动作。',
    properties: [
      { id: 'ep-fd-111', name: 'controlType', displayName: '控制类型', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-fd-112', name: 'scope', displayName: '覆盖范围', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-fd-113', name: 'verificationMethod', displayName: '验证方式', dataType: 'TEXT', required: false, sortOrder: 3 },
    ],
  },
]

const FAULT_DIAGNOSIS_8D_RELATION_TYPES: RelationTypeConfig[] = [
  { id: 'rt-fd-009', name: 'records_equipment', domain: 'EightDReport', range: 'Equipment', description: '8D 报告记录涉及的关键设备', properties: [] },
  { id: 'rt-fd-010', name: 'records_failure', domain: 'EightDReport', range: 'Phenomenon', description: '8D 报告记录的故障现象', properties: [] },
  { id: 'rt-fd-011', name: 'occurs_on_line', domain: 'Phenomenon', range: 'ProductionLine', description: '故障现象发生的产线/工位位置', properties: [] },
  { id: 'rt-fd-012', name: 'documents_subphenomenon', domain: 'EightDReport', range: 'SubPhenomenon', description: '8D 报告沉淀出的关键诊断线索', properties: [] },
  { id: 'rt-fd-013', name: 'implements_correction', domain: 'EightDReport', range: 'CorrectiveAction', description: '8D 报告中的临时纠正措施', properties: [] },
  { id: 'rt-fd-014', name: 'implements_prevention', domain: 'EightDReport', range: 'PreventiveAction', description: '8D 报告中的长期预防措施', properties: [] },
]

const FAULT_DIAGNOSIS_AI_INSIGHT_RUN: AiInsightRun = {
  id: 'ai-fd-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2025-11-24T10:00:00.000Z',
  completedAt: '2025-11-24T10:06:00.000Z',
  scannedDocumentCount: 8,
  addedEntityCount: 4,
  addedRelationCount: 6,
  addedEntityNames: ['EightDReport', 'ProductionLine', 'CorrectiveAction', 'PreventiveAction'],
  addedRelationNames: ['records_equipment', 'records_failure', 'occurs_on_line', 'documents_subphenomenon', 'implements_correction', 'implements_prevention'],
  warnings: [],
  stage: '完成',
  currentDocument: '最终线入口EL402升降机带车在高位不下降，最终线欠量停线-附件-2025.11.23 8D设备故障分析报告_最终线升降机接车异常.docx',
  logs: [
    '扫描 8 份升降机 8D 故障报告',
    '补充实体类型 4 个：EightDReport、ProductionLine、CorrectiveAction、PreventiveAction',
    '补充关系类型 6 条，用于表达案例、产线位置及整改闭环',
  ],
}

const FAULT_DIAGNOSIS_8D_RUN: ExtractionRun = {
  id: 'run-fd-002',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2025-11-24T10:30:00.000Z',
  completedAt: '2025-11-24T10:38:00.000Z',
  candidateEntityCount: 24,
  candidateRelationCount: 18,
  pendingReviewCount: 0,
  stage: '完成',
  currentDocument: '最终线入口EL402升降机带车在高位不下降，最终线欠量停线-附件-2025.11.23 8D设备故障分析报告_最终线升降机接车异常.docx',
  logs: [
    '扫描 8 份 8D 报告文档',
    '识别升降机类案例设备 8 台、产线位置 6 处、闭环措施 12 条',
    '生成 8D 案例候选实体 24 个、关系 18 条',
  ],
  warnings: [],
  reviewItems: [
    { id: 'ri-fd-101', kind: 'ENTITY', title: '8D报告#2025-11-23-EL402 (EightDReport)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.99, status: 'APPROVED' },
    { id: 'ri-fd-102', kind: 'ENTITY', title: '最终线入口EL402升降机 (Equipment)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-fd-103', kind: 'ENTITY', title: '最终线入口EL402升降机带车在高位不下降，最终线欠量停线 (Phenomenon)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-fd-104', kind: 'ENTITY', title: '吊具在位信号未正常清除 (SubPhenomenon)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-fd-105', kind: 'ENTITY', title: '供应商下载硬件组态后升降机接车时序错乱 (Cause)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.95, status: 'APPROVED' },
    { id: 'ri-fd-106', kind: 'ENTITY', title: '最终线入口 (ProductionLine)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.94, status: 'APPROVED' },
    { id: 'ri-fd-107', kind: 'ENTITY', title: '恢复改动前PLC程序并强制接车记忆信号 (CorrectiveAction)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.93, status: 'APPROVED' },
    { id: 'ri-fd-108', kind: 'ENTITY', title: '新增吊具进入离开信号显示及清除功能 (PreventiveAction)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.92, status: 'APPROVED' },
    { id: 'ri-fd-109', kind: 'ENTITY', title: '8D报告#2025-09-22-07EL360 (EightDReport)', evidence: '07EL360 升降机故障分析报告', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-fd-110', kind: 'ENTITY', title: '07EL360升降机 (Equipment)', evidence: '07EL360 升降机故障分析报告', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-fd-111', kind: 'ENTITY', title: '升降机抱闸继电器卡滞 (Cause)', evidence: '07EL360 升降机故障分析报告', confidence: 0.94, status: 'APPROVED' },
    { id: 'ri-fd-112', kind: 'ENTITY', title: '更换升降机抱闸继电器 (CorrectiveAction)', evidence: '07EL360 升降机故障分析报告', confidence: 0.93, status: 'APPROVED' },
    { id: 'ri-fd-113', kind: 'RELATION', title: '8D报告#2025-11-23-EL402 (EightDReport) → records_equipment → 最终线入口EL402升降机 (Equipment)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-fd-114', kind: 'RELATION', title: '8D报告#2025-11-23-EL402 (EightDReport) → records_failure → 最终线入口EL402升降机带车在高位不下降，最终线欠量停线 (Phenomenon)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-fd-115', kind: 'RELATION', title: '8D报告#2025-11-23-EL402 (EightDReport) → documents_subphenomenon → 吊具在位信号未正常清除 (SubPhenomenon)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-fd-116', kind: 'RELATION', title: '吊具在位信号未正常清除 (SubPhenomenon) → caused_by → 供应商下载硬件组态后升降机接车时序错乱 (Cause)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.95, status: 'APPROVED' },
    { id: 'ri-fd-117', kind: 'RELATION', title: '最终线入口EL402升降机带车在高位不下降，最终线欠量停线 (Phenomenon) → occurs_on_line → 最终线入口 (ProductionLine)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.94, status: 'APPROVED' },
    { id: 'ri-fd-118', kind: 'RELATION', title: '8D报告#2025-11-23-EL402 (EightDReport) → implements_correction → 恢复改动前PLC程序并强制接车记忆信号 (CorrectiveAction)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.93, status: 'APPROVED' },
    { id: 'ri-fd-119', kind: 'RELATION', title: '8D报告#2025-11-23-EL402 (EightDReport) → implements_prevention → 新增吊具进入离开信号显示及清除功能 (PreventiveAction)', evidence: '最终线升降机接车异常 8D 报告', confidence: 0.92, status: 'APPROVED' },
    { id: 'ri-fd-120', kind: 'RELATION', title: '8D报告#2025-09-22-07EL360 (EightDReport) → records_equipment → 07EL360升降机 (Equipment)', evidence: '07EL360 升降机故障分析报告', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-fd-121', kind: 'RELATION', title: '8D报告#2025-09-22-07EL360 (EightDReport) → implements_correction → 更换升降机抱闸继电器 (CorrectiveAction)', evidence: '07EL360 升降机故障分析报告', confidence: 0.94, status: 'APPROVED' },
  ],
}

const FAULT_DIAGNOSIS_8D_VERSION: OntologyVersion = {
  id: 'ver-fd-002',
  version: 'v1.3',
  label: '升降机 8D 案例诊断图谱',
  createdAt: '2025-11-24T10:40:00.000Z',
  sourceRunId: 'run-fd-002',
  entityCount: 24,
  relationCount: 18,
}

const PRODUCT_REPLENISHMENT_PROJECT_ID = 'proj-2418'
const PRODUCT_REPLENISHMENT_LEGACY_NAME = '补货策略本体'
const PRODUCT_REPLENISHMENT_PROJECT_NAME = '商品补货本体'
const PRODUCT_REPLENISHMENT_UPDATED_AT = '2026-03-10T09:30:00.000Z'
const PRODUCT_REPLENISHMENT_DESCRIPTION =
  '零售业 · 城市单品补货执行本体，覆盖商品、门店、仓库、销售订单、库存、尺码模型、补货计划与采购调拨单；支持依据近2周日均销量、目标满足天数和仓库可用库存自动生成专业配货方案。'

const PRODUCT_REPLENISHMENT_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-rp-001',
    name: '百丽城市单品补货业务本体模型数据说明文档.docx',
    fileType: 'docx',
    size: 128640,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: 'doc-rp-002',
    name: '上海区域门店近14日销售流速与库存水位对账.xlsx',
    fileType: 'xlsx',
    size: 286720,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-02T10:20:00.000Z',
  },
  {
    id: 'doc-rp-003',
    name: '城市补货尺码模型与优先分配规则.md',
    fileType: 'md',
    size: 92480,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-03T11:15:00.000Z',
  },
  {
    id: 'doc-rp-004',
    name: 'Nike Air Max 270 上海区域自动补货静态样本.jsonl',
    fileType: 'jsonl',
    size: 68420,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-04T14:30:00.000Z',
  },
  {
    id: 'doc-rp-005',
    name: 'ERP-WMS 调拨单接口字段映射说明.xlsx',
    fileType: 'xlsx',
    size: 173056,
    status: 'READY',
    enabled: false,
    uploadedAt: '2026-03-05T09:40:00.000Z',
  },
  {
    id: 'doc-rp-006',
    name: '上海区域A类门店补货优先级清单.xlsx',
    fileType: 'xlsx',
    size: 162304,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-06T10:00:00.000Z',
  },
  {
    id: 'doc-rp-007',
    name: '城市单品补货阈值与目标满足天数策略.md',
    fileType: 'md',
    size: 108544,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-06T13:30:00.000Z',
  },
  {
    id: 'doc-rp-008',
    name: '重点SKU黄金尺码保障规则与断码预警.xlsx',
    fileType: 'xlsx',
    size: 193536,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-07T09:10:00.000Z',
  },
  {
    id: 'doc-rp-009',
    name: '上海城市单品补货计划复盘报告-2026W10.docx',
    fileType: 'docx',
    size: 214528,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-08T16:20:00.000Z',
  },
  {
    id: 'doc-rp-010',
    name: '门店调拨单批量下发静态样本-华东零售.jsonl',
    fileType: 'jsonl',
    size: 132884,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-09T08:45:00.000Z',
  },
]

const PRODUCT_REPLENISHMENT_DATA_SOURCES: StructuredDataSource[] = [
  {
    id: 'ds-rp-001',
    name: '零售ERP销售订单事实库',
    type: 'POSTGRESQL',
    host: '10.21.8.14',
    port: 5432,
    database: 'retail_erp',
    schema: 'sales',
    username: 'erp_reader',
    password: '',
    sslEnabled: true,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['sales_order_fact', 'store_dim', 'product_dim'],
    rowLimit: 180000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'order_date',
    status: 'SUCCESS',
    lastTestAt: '2026-03-09T20:10:00.000Z',
    lastError: '',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-09T20:10:00.000Z',
  },
  {
    id: 'ds-rp-002',
    name: 'WMS仓库库存与在途快照库',
    type: 'CLICKHOUSE',
    host: '10.21.8.32',
    port: 8123,
    database: 'wms_snapshot',
    username: 'wms_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['inventory_snapshot', 'in_transit_stock', 'warehouse_dim'],
    rowLimit: 220000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'snapshot_time',
    status: 'SUCCESS',
    lastTestAt: '2026-03-09T20:20:00.000Z',
    lastError: '',
    createdAt: '2026-03-01T10:10:00.000Z',
    updatedAt: '2026-03-09T20:20:00.000Z',
  },
  {
    id: 'ds-rp-003',
    name: '商品主数据与尺码曲线中心',
    type: 'MYSQL',
    host: '10.21.8.18',
    port: 3306,
    database: 'retail_master',
    username: 'master_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['product_master', 'size_curve_model', 'store_priority_profile'],
    rowLimit: 80000,
    syncMode: 'FULL',
    incrementalColumn: '',
    status: 'SUCCESS',
    lastTestAt: '2026-03-09T20:30:00.000Z',
    lastError: '',
    createdAt: '2026-03-01T10:20:00.000Z',
    updatedAt: '2026-03-09T20:30:00.000Z',
  },
]

const PRODUCT_REPLENISHMENT_ENTITY_TYPES: EntityTypeConfig[] = [
  {
    id: 'et-rp-001',
    name: 'Product',
    description: '补货主体商品，按 SKU 维度管理品牌、品类、生命周期与目标补货策略。',
    dataSourceId: 'ds-rp-003',
    mappedTable: 'product_master',
    properties: [
      { id: 'ep-rp-001', name: 'skuCode', displayName: 'SKU编码', dataType: 'STRING', required: true, mappedColumn: 'sku_code', searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-rp-002', name: 'productName', displayName: '商品名称', dataType: 'STRING', required: true, mappedColumn: 'product_name', searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-rp-003', name: 'brand', displayName: '品牌', dataType: 'STRING', required: true, mappedColumn: 'brand_name', searchable: true, sortable: true, sortOrder: 3 },
      { id: 'ep-rp-004', name: 'category', displayName: '品类', dataType: 'STRING', required: true, mappedColumn: 'category_lv3', searchable: true, sortable: true, sortOrder: 4 },
      { id: 'ep-rp-005', name: 'seasonTag', displayName: '季节标签', dataType: 'STRING', required: false, mappedColumn: 'season_tag', searchable: true, sortable: true, sortOrder: 5 },
      { id: 'ep-rp-006', name: 'replenishmentMode', displayName: '补货模式', dataType: 'STRING', required: true, defaultValue: 'days_of_supply', mappedColumn: 'replenishment_mode', searchable: true, sortable: true, sortOrder: 6 },
    ],
  },
  {
    id: 'et-rp-002',
    name: 'Store',
    description: '接收补货的门店实体，包含城市、店级、客群和补货优先级。',
    dataSourceId: 'ds-rp-001',
    mappedTable: 'store_dim',
    properties: [
      { id: 'ep-rp-011', name: 'storeCode', displayName: '门店编码', dataType: 'STRING', required: true, mappedColumn: 'store_code', searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-rp-012', name: 'storeName', displayName: '门店名称', dataType: 'STRING', required: true, mappedColumn: 'store_name', searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-rp-013', name: 'city', displayName: '城市', dataType: 'STRING', required: true, mappedColumn: 'city_name', searchable: true, sortable: true, sortOrder: 3 },
      { id: 'ep-rp-014', name: 'storeTier', displayName: '门店等级', dataType: 'STRING', required: true, mappedColumn: 'store_tier', searchable: true, sortable: true, sortOrder: 4 },
      { id: 'ep-rp-015', name: 'priorityLevel', displayName: '补货优先级', dataType: 'STRING', required: true, defaultValue: 'A', mappedColumn: 'priority_level', searchable: true, sortable: true, sortOrder: 5 },
      { id: 'ep-rp-016', name: 'channelType', displayName: '渠道类型', dataType: 'STRING', required: false, mappedColumn: 'channel_type', searchable: true, sortable: true, sortOrder: 6 },
    ],
  },
  {
    id: 'et-rp-003',
    name: 'Warehouse',
    description: '发货仓库实体，包含可用库存、覆盖范围和发运时效。',
    dataSourceId: 'ds-rp-002',
    mappedTable: 'warehouse_dim',
    properties: [
      { id: 'ep-rp-021', name: 'warehouseCode', displayName: '仓库编码', dataType: 'STRING', required: true, mappedColumn: 'warehouse_code', searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-rp-022', name: 'warehouseName', displayName: '仓库名称', dataType: 'STRING', required: true, mappedColumn: 'warehouse_name', searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-rp-023', name: 'city', displayName: '仓库城市', dataType: 'STRING', required: true, mappedColumn: 'city_name', searchable: true, sortable: true, sortOrder: 3 },
      { id: 'ep-rp-024', name: 'coverageRegion', displayName: '覆盖区域', dataType: 'STRING', required: true, mappedColumn: 'coverage_region', searchable: true, sortable: true, sortOrder: 4 },
      { id: 'ep-rp-025', name: 'dispatchCutoffTime', displayName: '截单时间', dataType: 'STRING', required: false, mappedColumn: 'dispatch_cutoff_time', searchable: true, sortable: true, sortOrder: 5 },
    ],
  },
  {
    id: 'et-rp-004',
    name: 'SalesOrder',
    description: '门店历史销售事实，用于计算近2周日均销量和高销等级。',
    dataSourceId: 'ds-rp-001',
    mappedTable: 'sales_order_fact',
    isBigTable: true,
    properties: [
      { id: 'ep-rp-031', name: 'orderNo', displayName: '订单号', dataType: 'STRING', required: true, mappedColumn: 'order_no', searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-rp-032', name: 'orderDate', displayName: '订单日期', dataType: 'DATE', required: true, mappedColumn: 'order_date', searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-rp-033', name: 'salesQty', displayName: '销售数量', dataType: 'INTEGER', required: true, mappedColumn: 'sales_qty', searchable: false, sortable: true, sortOrder: 3 },
      { id: 'ep-rp-034', name: 'salesAmount', displayName: '销售金额', dataType: 'FLOAT', required: false, mappedColumn: 'sales_amount', searchable: false, sortable: true, sortOrder: 4 },
      { id: 'ep-rp-035', name: 'soldSize', displayName: '销售尺码', dataType: 'STRING', required: false, mappedColumn: 'sold_size', searchable: true, sortable: true, sortOrder: 5 },
      { id: 'ep-rp-036', name: 'salesChannel', displayName: '销售渠道', dataType: 'STRING', required: false, mappedColumn: 'sales_channel', searchable: true, sortable: true, sortOrder: 6 },
    ],
  },
  {
    id: 'et-rp-005',
    name: 'Inventory',
    description: '仓库与门店库存快照，支撑供给能力判断与在途占用计算。',
    dataSourceId: 'ds-rp-002',
    mappedTable: 'inventory_snapshot',
    isBigTable: true,
    properties: [
      { id: 'ep-rp-041', name: 'snapshotTime', displayName: '快照时间', dataType: 'DATETIME', required: true, mappedColumn: 'snapshot_time', searchable: false, sortable: true, sortOrder: 1 },
      { id: 'ep-rp-042', name: 'onHandQty', displayName: '现存数量', dataType: 'INTEGER', required: true, mappedColumn: 'on_hand_qty', searchable: false, sortable: true, sortOrder: 2 },
      { id: 'ep-rp-043', name: 'reservedQty', displayName: '预留数量', dataType: 'INTEGER', required: true, mappedColumn: 'reserved_qty', searchable: false, sortable: true, sortOrder: 3 },
      { id: 'ep-rp-044', name: 'inTransitQty', displayName: '在途数量', dataType: 'INTEGER', required: false, mappedColumn: 'in_transit_qty', searchable: false, sortable: true, sortOrder: 4 },
      { id: 'ep-rp-045', name: 'availableQty', displayName: '可分配数量', dataType: 'INTEGER', required: true, mappedColumn: 'available_qty', searchable: false, sortable: true, sortOrder: 5 },
      { id: 'ep-rp-046', name: 'stockOwner', displayName: '库存归属', dataType: 'STRING', required: false, mappedColumn: 'stock_owner', searchable: true, sortable: true, sortOrder: 6 },
    ],
  },
  {
    id: 'et-rp-006',
    name: 'SizeProfile',
    description: '商品对应的标准尺码分布模型，用于将总补货量拆分至具体尺码。',
    dataSourceId: 'ds-rp-003',
    mappedTable: 'size_curve_model',
    properties: [
      { id: 'ep-rp-051', name: 'profileCode', displayName: '模型编码', dataType: 'STRING', required: true, mappedColumn: 'profile_code', searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-rp-052', name: 'applicableGender', displayName: '适用性别', dataType: 'STRING', required: true, mappedColumn: 'applicable_gender', searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-rp-053', name: 'sizeCurveJson', displayName: '尺码曲线', dataType: 'JSON', required: true, mappedColumn: 'size_curve_json', searchable: false, sortable: false, sortOrder: 3 },
      { id: 'ep-rp-054', name: 'goldenSizes', displayName: '黄金尺码', dataType: 'STRING', required: false, mappedColumn: 'golden_sizes', searchable: true, sortable: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-rp-007',
    name: 'PurchaseOrder',
    description: '从仓库到门店的调拨单据，记录状态、数量与预计到货时间。',
    properties: [
      { id: 'ep-rp-061', name: 'poNo', displayName: '调拨单号', dataType: 'STRING', required: true, searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-rp-062', name: 'orderStatus', displayName: '单据状态', dataType: 'STRING', required: true, defaultValue: 'PENDING_SHIP', searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-rp-063', name: 'totalQty', displayName: '总调拨量', dataType: 'INTEGER', required: true, searchable: false, sortable: true, sortOrder: 3 },
      { id: 'ep-rp-064', name: 'plannedShipDate', displayName: '计划发货日', dataType: 'DATE', required: true, searchable: false, sortable: true, sortOrder: 4 },
      { id: 'ep-rp-065', name: 'targetArrivalDate', displayName: '预计到货日', dataType: 'DATE', required: true, searchable: false, sortable: true, sortOrder: 5 },
      { id: 'ep-rp-066', name: 'sizeBreakdownJson', displayName: '尺码拆分', dataType: 'JSON', required: true, searchable: false, sortable: false, sortOrder: 6 },
    ],
  },
  {
    id: 'et-rp-008',
    name: 'ReplenishmentPlan',
    description: '补货计划结果实体，沉淀目标满足天数、理论缺口、实际分配与解释原因。',
    properties: [
      { id: 'ep-rp-071', name: 'planNo', displayName: '计划编号', dataType: 'STRING', required: true, searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-rp-072', name: 'coverageDays', displayName: '目标满足天数', dataType: 'INTEGER', required: true, defaultValue: '14', searchable: false, sortable: true, sortOrder: 2 },
      { id: 'ep-rp-073', name: 'dailySalesVelocity', displayName: '日均销量', dataType: 'FLOAT', required: true, searchable: false, sortable: true, sortOrder: 3 },
      { id: 'ep-rp-074', name: 'theoreticalDemandQty', displayName: '理论需求量', dataType: 'INTEGER', required: true, searchable: false, sortable: true, sortOrder: 4 },
      { id: 'ep-rp-075', name: 'allocatedQty', displayName: '实际分配量', dataType: 'INTEGER', required: true, searchable: false, sortable: true, sortOrder: 5 },
      { id: 'ep-rp-076', name: 'decisionReason', displayName: '分配解释', dataType: 'TEXT', required: false, searchable: true, sortable: false, sortOrder: 6 },
    ],
  },
]

const PRODUCT_REPLENISHMENT_RELATION_TYPES: RelationTypeConfig[] = [
  { id: 'rt-rp-001', name: 'records_sales', domain: 'Store', range: 'SalesOrder', description: '门店沉淀的销售订单事实', properties: [] },
  { id: 'rt-rp-002', name: 'orders_product', domain: 'SalesOrder', range: 'Product', description: '销售订单对应的商品 SKU', properties: [] },
  { id: 'rt-rp-003', name: 'holds_inventory', domain: 'Warehouse', range: 'Inventory', description: '仓库持有的库存快照', properties: [] },
  { id: 'rt-rp-004', name: 'inventory_of_product', domain: 'Inventory', range: 'Product', description: '库存快照关联的商品 SKU', properties: [] },
  { id: 'rt-rp-005', name: 'uses_size_profile', domain: 'Product', range: 'SizeProfile', description: '商品适用的标准尺码模型', properties: [] },
  { id: 'rt-rp-006', name: 'plans_for_product', domain: 'ReplenishmentPlan', range: 'Product', description: '补货计划针对的目标商品', properties: [] },
  { id: 'rt-rp-007', name: 'targets_store', domain: 'ReplenishmentPlan', range: 'Store', description: '补货计划面向的门店', properties: [] },
  { id: 'rt-rp-008', name: 'allocated_from', domain: 'ReplenishmentPlan', range: 'Warehouse', description: '补货计划的发货仓来源', properties: [] },
  { id: 'rt-rp-009', name: 'generated_purchase_order', domain: 'ReplenishmentPlan', range: 'PurchaseOrder', description: '补货计划生成调拨单据', properties: [] },
  { id: 'rt-rp-010', name: 'ships_to_store', domain: 'PurchaseOrder', range: 'Store', description: '调拨单的目标门店', properties: [] },
  { id: 'rt-rp-011', name: 'fulfilled_by_warehouse', domain: 'PurchaseOrder', range: 'Warehouse', description: '调拨单的履约仓库', properties: [] },
]

const PRODUCT_REPLENISHMENT_AI_INSIGHT_RUN: AiInsightRun = {
  id: 'ai-rp-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-06T09:10:00.000Z',
  completedAt: '2026-03-06T09:18:00.000Z',
  scannedDocumentCount: 10,
  addedEntityCount: 8,
  addedRelationCount: 11,
  addedEntityNames: ['Product', 'Store', 'Warehouse', 'SalesOrder', 'Inventory', 'SizeProfile', 'ReplenishmentPlan', 'PurchaseOrder'],
  addedRelationNames: ['records_sales', 'orders_product', 'holds_inventory', 'inventory_of_product', 'uses_size_profile', 'plans_for_product', 'targets_store', 'allocated_from', 'generated_purchase_order', 'ships_to_store', 'fulfilled_by_warehouse'],
  warnings: [],
  stage: '完成',
  currentDocument: '百丽城市单品补货业务本体模型数据说明文档.docx',
  logs: [
    '解析 10 份城市单品补货业务文档、规则说明与调拨静态样本',
    '补齐 Product、Store、Warehouse、SalesOrder、Inventory、SizeProfile、ReplenishmentPlan、PurchaseOrder 八类专业补货实体',
    '扩展销量聚合、库存供给、尺码拆分、计划生成与调拨履约等 11 条关键关系链路',
  ],
}

const PRODUCT_REPLENISHMENT_RUN: ExtractionRun = {
  id: 'run-rp-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-06T10:00:00.000Z',
  completedAt: '2026-03-06T10:12:00.000Z',
  candidateEntityCount: 90,
  candidateRelationCount: 70,
  pendingReviewCount: 0,
  stage: '完成',
  currentDocument: 'Nike Air Max 270 上海区域自动补货静态样本.jsonl',
  logs: [
    '抽取上海区域 10 份业务资料，汇聚 80 家门店近14日销售、库存和尺码模型静态样本',
    '识别高销店、基础店、无销店分层标签，并展开门店-仓库-SKU-尺码的补货决策链路',
    '生成补货图谱候选实体 90 个、关系 70 条，并自动产出批量调拨单模板',
  ],
  warnings: [],
  reviewItems: [
    { id: 'ri-rp-001', kind: 'ENTITY', title: 'Nike Air Max 270 (Product)', evidence: '城市单品补货说明文档', confidence: 0.99, status: 'APPROVED' },
    { id: 'ri-rp-002', kind: 'ENTITY', title: '上海南京东路旗舰店 (Store)', evidence: '上海区域门店近14日销售流速与库存水位对账.xlsx', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-rp-003', kind: 'ENTITY', title: '华东上海闵行中心仓 (Warehouse)', evidence: 'ERP-WMS 调拨单接口字段映射说明.xlsx', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-rp-004', kind: 'ENTITY', title: '女鞋标准尺码曲线 (SizeProfile)', evidence: '城市补货尺码模型与优先分配规则.md', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-rp-005', kind: 'ENTITY', title: '上海区域Nike Air Max 270补货计划 (ReplenishmentPlan)', evidence: 'Nike Air Max 270 上海区域自动补货静态样本.jsonl', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-rp-006', kind: 'ENTITY', title: 'PO-SH-20260310-001 (PurchaseOrder)', evidence: 'Nike Air Max 270 上海区域自动补货静态样本.jsonl', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-rp-007', kind: 'RELATION', title: '上海区域Nike Air Max 270补货计划 (ReplenishmentPlan) → plans_for_product → Nike Air Max 270 (Product)', evidence: '静态样本关系', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-rp-008', kind: 'RELATION', title: '上海区域Nike Air Max 270补货计划 (ReplenishmentPlan) → targets_store → 上海南京东路旗舰店 (Store)', evidence: '静态样本关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-rp-009', kind: 'RELATION', title: '上海区域Nike Air Max 270补货计划 (ReplenishmentPlan) → allocated_from → 华东上海闵行中心仓 (Warehouse)', evidence: '静态样本关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-rp-010', kind: 'RELATION', title: '上海区域Nike Air Max 270补货计划 (ReplenishmentPlan) → generated_purchase_order → PO-SH-20260310-001 (PurchaseOrder)', evidence: '静态样本关系', confidence: 0.96, status: 'APPROVED' },
  ],
}

const PRODUCT_REPLENISHMENT_VERSION: OntologyVersion = {
  id: 'ver-rp-001',
  version: 'v1.1',
  label: '城市单品补货执行图谱',
  createdAt: '2026-03-06T10:15:00.000Z',
  sourceRunId: 'run-rp-001',
  entityCount: 90,
  relationCount: 70,
}

const PRODUCT_REPLENISHMENT_ACTIONS: ActionDefinition[] = [
  {
    id: 'act-rp-001',
    name: 'calculate_store_replenishment_demand',
    displayName: '计算门店补货需求',
    description: '基于近2周日均销量、当前门店库存和目标满足天数，计算门店理论补货缺口。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-rp-008',
    triggerType: 'MANUAL',
    triggerConfigJson: '[{"functionId":"fn-rp-001","order":1,"triggerType":"MANUAL","triggerConfig":"{\\"entry\\":\\"workspace.button\\",\\"scenario\\":\\"city_sku_replenishment\\"}"},{"functionId":"fn-rp-002","order":2,"triggerType":"MANUAL","triggerConfig":"{\\"coverageDays\\":14,\\"historyWindowDays\\":14,\\"fallbackVelocity\\":0.6}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_replenishment_review","notifyRole":"商品运营经理"}',
    parametersJson: '[{"name":"skuCode","displayName":"SKU编码","dataType":"STRING","required":true},{"name":"city","displayName":"目标城市","dataType":"STRING","required":true},{"name":"coverageDays","displayName":"目标满足天数","dataType":"INTEGER","required":true,"defaultValue":"14"},{"name":"historyWindowDays","displayName":"历史窗口天数","dataType":"INTEGER","required":false,"defaultValue":"14"}]',
    rulesJson: '[{"ruleType":"CREATE_OBJECT","target":"ReplenishmentPlan","conditionJson":"{\\"when\\":\\"skuCode_present and city_present\\"}","propertyMappingsJson":"{\\"planNo\\":\\"AUTO-$skuCode-$city\\",\\"coverageDays\\":\\"$coverageDays\\",\\"decisionReason\\":\\"velocity_based_gap\\"}","sortOrder":1},{"ruleType":"UPDATE_OBJECT","target":"Store","conditionJson":"{\\"when\\":\\"coverageDays >= 14\\"}","propertyMappingsJson":"{\\"priorityLevel\\":\\"A\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"sku_required","condition":"skuCode != \\"\\"","message":"SKU编码不能为空"},{"name":"city_required","condition":"city != \\"\\"","message":"目标城市不能为空"},{"name":"coverage_days_range","condition":"coverageDays >= 3 and coverageDays <= 30","message":"目标满足天数需在 3 到 30 天之间"}]',
  },
  {
    id: 'act-rp-002',
    name: 'allocate_warehouse_inventory',
    displayName: '执行仓库库存分配',
    description: '当仓库库存不足时，按门店优先级、售速和黄金尺码保障策略进行分配。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-rp-008',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-rp-003","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"plan.demand_calculated\\",\\"applySizeCurve\\":true}"},{"functionId":"fn-rp-004","order":2,"triggerType":"EVENT","triggerConfig":"{\\"priorityRule\\":\\"high_sales_first\\",\\"protectGoldenSizes\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":2,"fallback":"reserve_core_sizes_only","notifyRole":"区域配货主管"}',
    parametersJson: '[{"name":"planNo","displayName":"计划编号","dataType":"STRING","required":true},{"name":"warehouseCode","displayName":"仓库编码","dataType":"STRING","required":true},{"name":"allocatableQty","displayName":"可分配数量","dataType":"INTEGER","required":true},{"name":"protectGoldenSizes","displayName":"保障黄金尺码","dataType":"BOOLEAN","required":false,"defaultValue":"true"}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"ReplenishmentPlan","conditionJson":"{\\"when\\":\\"allocatableQty > 0\\"}","propertyMappingsJson":"{\\"allocatedQty\\":\\"$allocatableQty\\",\\"decisionReason\\":\\"warehouse_limited_allocation\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"Warehouse","conditionJson":"{\\"when\\":\\"warehouseCode_present\\"}","propertyMappingsJson":"{\\"from\\":\\"$planNo\\",\\"relation\\":\\"allocated_from\\",\\"to\\":\\"$warehouseCode\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"plan_required","condition":"planNo != \\"\\"","message":"计划编号不能为空"},{"name":"warehouse_required","condition":"warehouseCode != \\"\\"","message":"仓库编码不能为空"},{"name":"allocatable_qty_positive","condition":"allocatableQty >= 0","message":"可分配数量不能为负数"}]',
  },
  {
    id: 'act-rp-003',
    name: 'generate_transfer_purchase_orders',
    displayName: '生成门店调拨单',
    description: '将补货计划结果转为从仓库发往门店的调拨采购单，并锁定可分配库存。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-rp-007',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-rp-005","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"plan.inventory_allocated\\",\\"splitByStore\\":true}"}]',
    exceptionPolicy: 'SKIP',
    exceptionConfigJson: '{"retainDraft":true,"fallback":"manual_po_creation","notifyRole":"物流履约专员"}',
    parametersJson: '[{"name":"planNo","displayName":"计划编号","dataType":"STRING","required":true},{"name":"sourceWarehouse","displayName":"发货仓库","dataType":"STRING","required":true},{"name":"expectedArrivalDate","displayName":"预计到货日","dataType":"STRING","required":true},{"name":"lockInventory","displayName":"锁定库存","dataType":"BOOLEAN","required":false,"defaultValue":"true"}]',
    rulesJson: '[{"ruleType":"CREATE_OBJECT","target":"PurchaseOrder","conditionJson":"{\\"when\\":\\"planNo_present and sourceWarehouse_present\\"}","propertyMappingsJson":"{\\"poNo\\":\\"PO-$planNo\\",\\"plannedShipDate\\":\\"today\\",\\"targetArrivalDate\\":\\"$expectedArrivalDate\\",\\"orderStatus\\":\\"PENDING_SHIP\\"}","sortOrder":1},{"ruleType":"UPDATE_OBJECT","target":"Inventory","conditionJson":"{\\"when\\":\\"lockInventory == true\\"}","propertyMappingsJson":"{\\"reservedQty\\":\\"allocated_qty\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"plan_required","condition":"planNo != \\"\\"","message":"计划编号不能为空"},{"name":"warehouse_required","condition":"sourceWarehouse != \\"\\"","message":"发货仓库不能为空"},{"name":"arrival_required","condition":"expectedArrivalDate != \\"\\"","message":"预计到货日不能为空"}]',
  },
  {
    id: 'act-rp-004',
    name: 'review_size_breakdown_exception',
    displayName: '尺码断码异常复核',
    description: '针对高销门店或黄金尺码分配不足的情况输出人工复核建议。',
    status: 'DRAFT',
    targetObjectTypeId: 'et-rp-008',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-rp-004","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"plan.po_generated\\",\\"threshold\\":0.85}"}]',
    exceptionPolicy: 'IGNORE',
    exceptionConfigJson: '{"fallback":"notify_category_planner","notifyRole":"商品企划"}',
    parametersJson: '[{"name":"planNo","displayName":"计划编号","dataType":"STRING","required":true},{"name":"storeCode","displayName":"门店编码","dataType":"STRING","required":true},{"name":"goldenSizeFillRate","displayName":"黄金尺码满足率","dataType":"FLOAT","required":true}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"ReplenishmentPlan","conditionJson":"{\\"when\\":\\"goldenSizeFillRate < 0.85\\"}","propertyMappingsJson":"{\\"decisionReason\\":\\"manual_review_for_size_gap\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"plan_required","condition":"planNo != \\"\\"","message":"计划编号不能为空"},{"name":"store_required","condition":"storeCode != \\"\\"","message":"门店编码不能为空"},{"name":"fill_rate_range","condition":"goldenSizeFillRate >= 0 and goldenSizeFillRate <= 1","message":"黄金尺码满足率需在 0 到 1 之间"}]',
  },
]

const PRODUCT_REPLENISHMENT_FUNCTIONS: FunctionDefinition[] = [
  {
    id: 'fn-rp-001',
    name: '近14日日均销量计算',
    description: '按门店和SKU聚合近14日销售订单，输出日均销量和门店分层标签。',
    scriptContent: 'def calc_daily_sales_velocity(order_rows: list[dict], history_window_days: int = 14):\n    """计算门店SKU在窗口期内的日均销量。"""\n    total_qty = sum(row.get("sales_qty", 0) for row in order_rows)\n    velocity = round(total_qty / max(history_window_days, 1), 2)\n    level = "high" if velocity >= 4 else "base" if velocity >= 1 else "pause"\n    return {"dailySalesVelocity": velocity, "storeLevel": level, "historyWindowDays": history_window_days}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-rp-002',
    name: '目标库存缺口计算',
    description: '依据目标满足天数、当前库存和在途库存计算理论补货需求量。',
    scriptContent: 'def calc_target_stock_gap(daily_sales_velocity: float, coverage_days: int, on_hand_qty: int, in_transit_qty: int = 0):\n    """计算理论补货缺口。"""\n    target_stock = round(daily_sales_velocity * coverage_days)\n    current_stock = max(on_hand_qty, 0) + max(in_transit_qty, 0)\n    gap = max(target_stock - current_stock, 0)\n    return {"targetStock": target_stock, "currentStock": current_stock, "gapQty": gap}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-rp-003',
    name: '尺码模型拆分',
    description: '将门店总补货量按标准尺码曲线拆分至具体尺码并执行向下取整。',
    scriptContent: 'def split_qty_by_size_curve(total_qty: int, size_curve: dict[str, float]):\n    """按照尺码曲线拆分总量。"""\n    result = {}\n    allocated = 0\n    for size, ratio in size_curve.items():\n        qty = int(total_qty * ratio)\n        result[size] = qty\n        allocated += qty\n    result["_allocated"] = allocated\n    result["_remain"] = max(total_qty - allocated, 0)\n    return result',
    status: 'ACTIVE',
  },
  {
    id: 'fn-rp-004',
    name: '库存优先级分配',
    description: '在供给不足时优先满足高销店和黄金尺码，并输出满足率说明。',
    scriptContent: 'def allocate_limited_inventory(store_demands: list[dict], allocatable_qty: int):\n    """优先按高销店、A级门店、黄金尺码执行分配。"""\n    ordered = sorted(store_demands, key=lambda item: (item.get("priorityScore", 0), item.get("dailySalesVelocity", 0)), reverse=True)\n    remain = allocatable_qty\n    results = []\n    for item in ordered:\n        demand = item.get("gapQty", 0)\n        allocated = min(max(demand, 0), max(remain, 0))\n        remain -= allocated\n        fill_rate = round(allocated / demand, 2) if demand else 1.0\n        results.append({**item, "allocatedQty": allocated, "fillRate": fill_rate})\n    return {"allocations": results, "remainQty": max(remain, 0)}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-rp-005',
    name: '调拨单负载生成',
    description: '按门店粒度生成调拨单 payload，并拼装仓库、门店和尺码拆分信息。',
    scriptContent: 'def build_transfer_order_payload(plan_no: str, source_warehouse: str, allocations: list[dict], arrival_date: str):\n    """生成调拨单负载。"""\n    payload = []\n    for index, item in enumerate(allocations, start=1):\n        payload.append({\n            "poNo": f"PO-{plan_no}-{index:03d}",\n            "planNo": plan_no,\n            "sourceWarehouse": source_warehouse,\n            "targetStore": item.get("storeCode"),\n            "allocatedQty": item.get("allocatedQty", 0),\n            "sizeBreakdown": item.get("sizeBreakdown", {}),\n            "expectedArrivalDate": arrival_date,\n        })\n    return payload',
    status: 'ACTIVE',
  },
]

function isFaultDiagnosisProject(project: Pick<ProjectDetail, 'id' | 'name'>): boolean {
  return project.id === FAULT_DIAGNOSIS_PROJECT_ID || project.name === FAULT_DIAGNOSIS_PROJECT_NAME
}

function mergeUniqueById<T extends { id: string }>(current: T[], seeded: T[]): { items: T[]; changed: boolean } {
  const existingIds = new Set(current.map(item => item.id))
  const additions = seeded.filter(item => !existingIds.has(item.id))
  if (additions.length === 0) {
    return { items: current, changed: false }
  }
  return { items: [...current, ...additions], changed: true }
}

function removeItemsById<T extends { id: string }>(current: T[], ids: string[]): { items: T[]; changed: boolean } {
  const removedIds = new Set(ids)
  const items = current.filter(item => !removedIds.has(item.id))
  return { items, changed: items.length !== current.length }
}

function byIsoDesc(a: { createdAt?: string; uploadedAt?: string }, b: { createdAt?: string; uploadedAt?: string }): number {
  const aTime = Date.parse(a.createdAt ?? a.uploadedAt ?? '') || 0
  const bTime = Date.parse(b.createdAt ?? b.uploadedAt ?? '') || 0
  return bTime - aTime
}

function ensureFaultDiagnosisSeed(project: ProjectDetail): boolean {
  if (!isFaultDiagnosisProject(project)) {
    return false
  }

  let changed = false

  const mergedDocuments = mergeUniqueById(project.documents, cloneProjectData(FAULT_DIAGNOSIS_8D_DOCUMENTS))
  if (mergedDocuments.changed) {
    project.documents = mergedDocuments.items.sort(byIsoDesc)
    changed = true
  }

  const mergedEntityTypes = mergeUniqueById(project.schemaConfig.entityTypes, cloneProjectData(FAULT_DIAGNOSIS_8D_ENTITY_TYPES))
  if (mergedEntityTypes.changed) {
    project.schemaConfig.entityTypes = mergedEntityTypes.items
    changed = true
  }

  const mergedRelationTypes = mergeUniqueById(project.schemaConfig.relationTypes, cloneProjectData(FAULT_DIAGNOSIS_8D_RELATION_TYPES))
  if (mergedRelationTypes.changed) {
    project.schemaConfig.relationTypes = mergedRelationTypes.items
    changed = true
  }

  if (!project.schemaConfig.entityScope.includes('8D')) {
    project.schemaConfig.entityScope = `${project.schemaConfig.entityScope}，并补充 EightDReport、ProductionLine、CorrectiveAction、PreventiveAction 等 8D 闭环改进实体`
    changed = true
  }

  if (!project.schemaConfig.relationScope.includes('8D')) {
    project.schemaConfig.relationScope = `${project.schemaConfig.relationScope}，并覆盖 8D 报告记录设备/故障、产线定位以及纠正/预防措施闭环关系`
    changed = true
  }

  if (!project.aiInsightRun) {
    project.aiInsightRun = cloneProjectData(FAULT_DIAGNOSIS_AI_INSIGHT_RUN)
    changed = true
  }

  const mergedRuns = mergeUniqueById(project.runs, cloneProjectData([FAULT_DIAGNOSIS_8D_RUN]))
  if (mergedRuns.changed) {
    project.runs = mergedRuns.items.sort(byIsoDesc)
    changed = true
  }

  const mergedVersions = mergeUniqueById(project.versions, cloneProjectData([FAULT_DIAGNOSIS_8D_VERSION]))
  if (mergedVersions.changed) {
    project.versions = mergedVersions.items.sort(byIsoDesc)
    changed = true
  }

  const versionExists = project.versions.some(version => version.id === project.currentVersionId)
  if (!versionExists) {
    project.currentVersionId = FAULT_DIAGNOSIS_8D_VERSION.id
    changed = true
  }

  return changed
}

function isProductReplenishmentProject(project: Pick<ProjectDetail, 'id' | 'name'>): boolean {
  return (
    project.id === PRODUCT_REPLENISHMENT_PROJECT_ID
    || project.name === PRODUCT_REPLENISHMENT_PROJECT_NAME
    || project.name === PRODUCT_REPLENISHMENT_LEGACY_NAME
  )
}

function ensureProductReplenishmentSeed(project: ProjectDetail): boolean {
  if (!isProductReplenishmentProject(project)) {
    return false
  }

  let changed = false

  if (project.name !== PRODUCT_REPLENISHMENT_PROJECT_NAME) {
    project.name = PRODUCT_REPLENISHMENT_PROJECT_NAME
    changed = true
  }

  if (project.category !== 'retail') {
    project.category = 'retail'
    changed = true
  }

  if (project.description !== PRODUCT_REPLENISHMENT_DESCRIPTION) {
    project.description = PRODUCT_REPLENISHMENT_DESCRIPTION
    changed = true
  }

  if ((Date.parse(project.updatedAt || '') || 0) < Date.parse(PRODUCT_REPLENISHMENT_UPDATED_AT)) {
    project.updatedAt = PRODUCT_REPLENISHMENT_UPDATED_AT
    changed = true
  }

  const cleanedDocuments = removeItemsById(project.documents, ['doc-2.4.18-1', 'doc-2.4.18-2'])
  if (cleanedDocuments.changed) {
    project.documents = cleanedDocuments.items
    changed = true
  }

  const mergedDocuments = mergeUniqueById(project.documents, cloneProjectData(PRODUCT_REPLENISHMENT_DOCUMENTS))
  if (mergedDocuments.changed) {
    project.documents = mergedDocuments.items.sort(byIsoDesc)
    changed = true
  }

  const mergedDataSources = mergeUniqueById(project.dataSources, cloneProjectData(PRODUCT_REPLENISHMENT_DATA_SOURCES))
  if (mergedDataSources.changed) {
    project.dataSources = mergedDataSources.items.sort(byIsoDesc)
    changed = true
  }

  const cleanedEntityTypes = removeItemsById(project.schemaConfig.entityTypes, ['et-2.4.18-s', 'et-2.4.18-o'])
  if (cleanedEntityTypes.changed) {
    project.schemaConfig.entityTypes = cleanedEntityTypes.items
    changed = true
  }

  const mergedEntityTypes = mergeUniqueById(project.schemaConfig.entityTypes, cloneProjectData(PRODUCT_REPLENISHMENT_ENTITY_TYPES))
  if (mergedEntityTypes.changed) {
    project.schemaConfig.entityTypes = mergedEntityTypes.items
    changed = true
  }

  const cleanedRelationTypes = removeItemsById(project.schemaConfig.relationTypes, ['rt-2.4.18-1'])
  if (cleanedRelationTypes.changed) {
    project.schemaConfig.relationTypes = cleanedRelationTypes.items
    changed = true
  }

  const mergedRelationTypes = mergeUniqueById(project.schemaConfig.relationTypes, cloneProjectData(PRODUCT_REPLENISHMENT_RELATION_TYPES))
  if (mergedRelationTypes.changed) {
    project.schemaConfig.relationTypes = mergedRelationTypes.items
    changed = true
  }

  const mergedSkills = mergeUniqueById(project.schemaConfig.skills, cloneProjectData([
    { id: 'sk-rp-001', code: 'data_processing', name: '城市补货数据整编', enabled: true, prompt: '将 ERP 销售订单、WMS 库存和商品主数据清洗为城市单品补货可用语义视图', source: 'built_in', tags: ['replenishment', 'etl', 'sales'] },
    { id: 'sk-rp-002', code: 'graph_synthesis', name: '补货图谱融合', enabled: true, prompt: '融合商品、门店、仓库、库存与尺码模型实体，生成补货决策链路', source: 'built_in', tags: ['graph', 'replenishment'] },
    { id: 'sk-rp-003', code: 'custom', name: '尺码分配规则编排', enabled: true, prompt: '根据门店层级、黄金尺码与断码约束执行尺码拆分和库存分配规则', source: 'built_in', tags: ['size-curve', 'allocation'] },
  ]))
  if (mergedSkills.changed) {
    project.schemaConfig.skills = mergedSkills.items
    changed = true
  }

  if (project.schemaConfig.entityScope !== '零售门店与运营场景中的商品、门店、仓库、销售订单、库存、尺码模型、补货计划与采购调拨单等核心业务实体') {
    project.schemaConfig.entityScope = '零售门店与运营场景中的商品、门店、仓库、销售订单、库存、尺码模型、补货计划与采购调拨单等核心业务实体'
    changed = true
  }

  if (project.schemaConfig.relationScope !== '覆盖销量聚合、库存供给、尺码模型应用、补货计划生成与仓配履约的完整补货执行关系链路') {
    project.schemaConfig.relationScope = '覆盖销量聚合、库存供给、尺码模型应用、补货计划生成与仓配履约的完整补货执行关系链路'
    changed = true
  }

  if (project.schemaConfig.updatedAt !== PRODUCT_REPLENISHMENT_UPDATED_AT) {
    project.schemaConfig.updatedAt = PRODUCT_REPLENISHMENT_UPDATED_AT
    changed = true
  }

  if (!project.aiInsightRun) {
    project.aiInsightRun = cloneProjectData(PRODUCT_REPLENISHMENT_AI_INSIGHT_RUN)
    changed = true
  }

  const mergedRuns = mergeUniqueById(project.runs, cloneProjectData([PRODUCT_REPLENISHMENT_RUN]))
  if (mergedRuns.changed) {
    project.runs = mergedRuns.items.sort(byIsoDesc)
    changed = true
  }

  const mergedVersions = mergeUniqueById(project.versions, cloneProjectData([PRODUCT_REPLENISHMENT_VERSION]))
  if (mergedVersions.changed) {
    project.versions = mergedVersions.items.sort(byIsoDesc)
    changed = true
  }

  const mergedActions = mergeUniqueById(project.actions, cloneProjectData(PRODUCT_REPLENISHMENT_ACTIONS))
  if (mergedActions.changed) {
    project.actions = mergedActions.items
    changed = true
  }

  const mergedFunctions = mergeUniqueById(project.functions, cloneProjectData(PRODUCT_REPLENISHMENT_FUNCTIONS))
  if (mergedFunctions.changed) {
    project.functions = mergedFunctions.items
    changed = true
  }

  const versionExists = project.versions.some(version => version.id === project.currentVersionId)
  if (!versionExists) {
    project.currentVersionId = PRODUCT_REPLENISHMENT_VERSION.id
    changed = true
  }

  return changed
}

function deterministicConfidence(base: number, index: number, floor: number): number {
  return Number(Math.max(floor, base - (index % 12) * 0.01).toFixed(2))
}

function parseReviewEntityTitle(title: string): MockEntityDescriptor | null {
  const legacyMatch = title.match(/^(.+?)::(.+)$/)
  if (legacyMatch) {
    const type = legacyMatch[1].trim()
    const name = legacyMatch[2].trim()
    return type && name ? { type, name } : null
  }

  const suffixMatch = title.match(/^(.*?)\s*[（(]\s*([A-Za-z][\w-]*)\s*[）)]$/)
  if (suffixMatch) {
    const name = suffixMatch[1].trim()
    const type = suffixMatch[2].trim()
    return type && name ? { type, name } : null
  }

  const fallbackName = title.trim()
  return fallbackName ? { type: 'Entity', name: fallbackName } : null
}

function formatReviewEntityTitle(entity: MockEntityDescriptor): string {
  return `${entity.name} (${entity.type})`
}

function entityNamePool(project: ProjectDetail, type: string): string[] {
  return PROJECT_ENTITY_NAME_POOLS[project.id]?.[type] ?? [
    `${type}样本`,
    `${type}实例`,
    `${type}对象`,
    `${type}节点`,
    `${type}条目`,
  ]
}

function collectEntityDescriptors(items: ReviewItem[]): MockEntityDescriptor[] {
  const descriptors: MockEntityDescriptor[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (item.kind !== 'ENTITY') continue
    const parsed = parseReviewEntityTitle(item.title)
    if (!parsed) continue
    const key = `${parsed.type}::${parsed.name}`
    if (seen.has(key)) continue
    descriptors.push(parsed)
    seen.add(key)
  }
  return descriptors
}

function completeEntityDescriptors(project: ProjectDetail, desiredCount: number, existing: MockEntityDescriptor[]): MockEntityDescriptor[] {
  const descriptors = [...existing]
  const seen = new Set(descriptors.map(entity => `${entity.type}::${entity.name}`))
  const entityTypes = project.schemaConfig.entityTypes.map(type => type.name)
  const types = entityTypes.length > 0 ? entityTypes : ['Entity']
  let cursor = 0

  while (descriptors.length < desiredCount) {
    const type = types[cursor % types.length]
    const pool = entityNamePool(project, type)
    const occurrence = Math.floor(cursor / types.length)
    const baseName = pool[occurrence % pool.length] ?? `${type}样本`
    const cycle = Math.floor(occurrence / Math.max(pool.length, 1))
    const name = cycle === 0 ? baseName : `${baseName} ${cycle + 1}`
    const key = `${type}::${name}`
    if (!seen.has(key)) {
      descriptors.push({ type, name })
      seen.add(key)
    }
    cursor++
    if (cursor > desiredCount * 20) break
  }

  return descriptors
}

export function buildReviewItemsForRun(
  project: ProjectDetail,
  run: Pick<ExtractionRun, 'candidateEntityCount' | 'candidateRelationCount' | 'pendingReviewCount' | 'reviewItems'>,
  createId: () => string,
): ReviewItem[] {
  const existingItems = run.reviewItems ?? []
  const items = [...existingItems]
  const entities = completeEntityDescriptors(project, run.candidateEntityCount, collectEntityDescriptors(existingItems))
  const existingEntityCount = existingItems.filter(item => item.kind === 'ENTITY').length
  const existingPendingCount = existingItems.filter(item => item.status === 'PENDING').length
  let pendingLeft = Math.max(0, run.pendingReviewCount - existingPendingCount)

  const nextStatus = (): ReviewStatus => {
    if (pendingLeft > 0) {
      pendingLeft--
      return 'PENDING'
    }
    return 'APPROVED'
  }

  for (let i = existingEntityCount; i < run.candidateEntityCount; i++) {
    const entity = entities[i]
    if (!entity) break
    items.push({
      id: createId(),
      kind: 'ENTITY',
      title: formatReviewEntityTitle(entity),
      evidence: `抽取实体候选 ${i + 1}`,
      confidence: deterministicConfidence(0.97, i, 0.75),
      status: nextStatus(),
    })
  }

  const relationTypes = project.schemaConfig.relationTypes.length > 0
    ? project.schemaConfig.relationTypes
    : [{ id: 'rt-auto', name: 'related_to', domain: entities[0]?.type ?? 'Entity', range: entities[1]?.type ?? entities[0]?.type ?? 'Entity', properties: [] }]
  const existingRelationCount = existingItems.filter(item => item.kind === 'RELATION').length

  for (let i = existingRelationCount; i < run.candidateRelationCount; i++) {
    if (entities.length === 0) break
    const relation = relationTypes[i % relationTypes.length]
    const sourcePool = entities.filter(entity => entity.type === relation.domain)
    const targetPool = entities.filter(entity => entity.type === relation.range)
    const sources = sourcePool.length > 0 ? sourcePool : entities
    const targets = targetPool.length > 0 ? targetPool : entities
    const source = sources[i % sources.length]
    let target = targets[(i + Math.floor(i / Math.max(1, sources.length)) + 1) % targets.length]

    if (source && target && source.type === target.type && source.name === target.name && targets.length > 1) {
      target = targets[(i + 1) % targets.length]
    }
    if (!source || !target) break

    items.push({
      id: createId(),
      kind: 'RELATION',
      title: `${formatReviewEntityTitle(source)} → ${relation.name} → ${formatReviewEntityTitle(target)}`,
      evidence: `抽取关系候选 ${i + 1}`,
      confidence: deterministicConfidence(0.95, i, 0.7),
      status: nextStatus(),
    })
  }

  return items
}

function normalizeRun(project: ProjectDetail, run: ExtractionRun, createId: () => string): boolean {
  const expectedCount = run.candidateEntityCount + run.candidateRelationCount
  let changed = false

  if (run.reviewItems.length < expectedCount) {
    run.reviewItems = buildReviewItemsForRun(project, run, createId)
    changed = true
  }

  const pendingCount = run.reviewItems.filter(item => item.status === 'PENDING').length
  if (run.pendingReviewCount !== pendingCount) {
    run.pendingReviewCount = pendingCount
    changed = true
  }

  return changed
}

function normalizeStore(store: ProjectStore): boolean {
  let changed = false

  if (!Number.isFinite(store.idSeq)) {
    store.idSeq = 5000
    changed = true
  }

  for (const project of store.projects) {
    if (ensureFaultDiagnosisSeed(project)) {
      changed = true
    }
    if (ensureProductReplenishmentSeed(project)) {
      changed = true
    }
    for (const run of project.runs) {
      if (normalizeRun(project, run, () => `ri-${++store.idSeq}`)) {
        changed = true
      }
    }
  }

  if (store._v !== DATA_VERSION) {
    store._v = DATA_VERSION
    changed = true
  }

  return changed
}

/* ========== 108 行业本体定义（来源：滴普科技行业本体清单v3_3.xlsx） ========== */
// [code, name, industry, phase, triple, agentScene, trainingType, dataCount]
export type OntologyDef = [string, string, string, string, string, string, string, number]

export const ONTOLOGY_DEFS: OntologyDef[] = [
  // ── 00 故障诊断本体（排第一）──
  ['0.0.1', '故障诊断本体', 'manufacturing', '生产', '(故障现象:主轴温升异常) -[caused_by]-> (主轴轴承早期剥落)', '故障诊断Agent：根据状态监测与报警现象自动定位根因并生成排查路径', '分析类', 8500],
  // ── 01 制造行业（29 个）──
  ['1.1.1', '需求规范本体', 'manufacturing', '研发', '(静音需求) -[量化为]-> (声压值<40dB)', '需求冲突检测Agent：自动发现设计指标间的物理矛盾', '分析类', 6200],
  ['1.1.2', 'FBS功能结构本体', 'manufacturing', '研发', '(减速功能) -[实现于]-> (斜齿轮组)', '方案生成Agent：根据功能描述自动检索历史拓扑结构', '分析类', 6200],
  ['1.1.3', '材料物性本体', 'manufacturing', '研发', '(铝合金6061) -[屈服强度]-> (276 MPa)', '轻量化优化Agent：在保证强度下自动寻找最优替代材料', '决策类', 6400],
  ['1.1.4', '标准合规本体', 'manufacturing', '研发', '(设计A) -[适用标准]-> (ISO 9001)', '合规性自动化审计Agent：实时监控设计文档是否违反法规', '治理类', 8200],
  ['1.1.5', '仿真验证本体', 'manufacturing', '研发', '(仿真任务) -[验证指标]-> (抗疲劳寿命)', '虚拟测试Agent：自动调用仿真软件并根据结果修正参数', '分析类', 6300],
  ['1.2.6', '工艺路线(BOP)本体', 'manufacturing', '工艺', '(粗铣工序) -[紧前工序]-> (铸造工序)', 'CAPP路径规划Agent：根据零件几何形状自动排布工序流', '执行类', 3200],
  ['1.2.7', '制造资源能力本体', 'manufacturing', '工艺', '(加工中心A) -[具备精度]-> (0.01mm)', '资源匹配Agent：根据设计公差自动筛选满足条件的生产线', '执行类', 7400],
  ['1.2.8', '工装夹具本体', 'manufacturing', '工艺', '(夹具A) -[兼容工件]-> (曲轴系列)', '自动化换模Agent：计算最优夹具组合，减少停机切换时间', '执行类', 6000],
  ['1.2.9', '加工参数本体', 'manufacturing', '工艺', '(硬质合金刀) -[推荐转速]-> (2000rpm)', '切削优化Agent：基于材料硬度实时调整加工步长与转速', '执行类', 6100],
  ['1.2.10', '公差传递本体', 'manufacturing', '工艺', '(公差A) -[累积影响]-> (装配间隙B)', '装配仿真Agent：预测各零件公差对最终成品合格率的影响', '分析类', 6900],
  ['1.3.12', '任务调度本体', 'manufacturing', '生产', '(工单101) -[紧急度]-> (高/Level 5)', '动态排产Agent：遇插单时自动重算全局最优开工时间', '执行类', 9300],
  ['1.3.13', '质量根因本体', 'manufacturing', '生产', '(划伤缺陷) -[关联因子]-> (机械臂路径)', '质量溯源Agent：利用知识图谱反向追踪次品产生的具体环节', '分析类', 8100],
  ['1.3.14', '能源消耗本体', 'manufacturing', '生产', '(加热炉) -[能效峰值]-> (2:00-4:00)', '节能降耗Agent：建议在电价低谷或能效高点执行高能耗任务', '决策类', 6900],
  ['1.3.15', '人员技能本体', 'manufacturing', '生产', '(技师张三) -[持有证件]-> (高级焊接证)', '人力调度Agent：确保高精尖工单被分配给资质符合的员工', '执行类', 4900],
  ['1.4.16', '供应商画像本体', 'manufacturing', '供应链', '(供应商X) -[历史交付率]-> (98%)', '供应商评级Agent：自动根据交付记录和财务风险调整采购权重', '分析类', 4300],
  ['1.4.17', '物流拓扑本体', 'manufacturing', '供应链', '(仓库A) -[运输距离]-> (工厂B: 200km)', '物流路径优化Agent：在多中心网络中寻找成本最低的补货路径', '决策类', 7200],
  ['1.4.18', '库存风险本体', 'manufacturing', '供应链', '(轴承) -[安全库存]-> (500件)', '自动补货Agent：跌破阈值时自动生成订单并分发给多个供应商', '执行类', 9600],
  ['1.4.19', '碳足迹本体', 'manufacturing', '供应链', '(物料A) -[碳排强度]-> (2.5kg CO2/kg)', '绿色供应链Agent：为追求ESG目标的企业计算产品全绿价值', '治理类', 6700],
  ['1.4.20', '事件风险本体', 'manufacturing', '供应链', '(红海海运) -[阻断概率]-> (30%)', '供应韧性Agent：监控全球新闻，遇到中断自动寻找绕路方案', '决策类', 6400],
  ['1.5.21', 'CPQ配置逻辑本体', 'manufacturing', '销售', '(配置项:天窗) -[排斥]-> (配置项:行李架)', '智能配置Agent：防止客户在官网选配出无法生产的矛盾产品', '治理类', 7800],
  ['1.5.22', '市场情报本体', 'manufacturing', '销售', '(竞品A) -[价格波动]-> (-5%)', '竞争策略Agent：当竞品降价时，自动分析利润空间并建议促策略', '决策类', 3300],
  ['1.5.23', '客户360本体', 'manufacturing', '销售', '(客户A) -[关注点]-> (售后响应速度)', '精准营销Agent：根据客户历史偏好自动生成个性化产品手册', '执行类', 5900],
  ['1.5.24', '合同约束本体', 'manufacturing', '销售', '(条款A) -[违约责任]-> (赔付5%)', '法务风险Agent：自动扫描合同草案中的不平等或高风险三元组', '治理类', 7700],
  ['1.5.25', '预测需求本体', 'manufacturing', '销售', '(区域:华东) -[季节需求]-> (旺季:6月)', '需求感知Agent：结合气象和社交数据预测下季度的销量波动', '分析类', 8600],
  ['1.6.26', '故障现象本体', 'manufacturing', '售后', '(现象:电机异响) -[根因]-> (润滑不足)', '专家辅助Agent：通过语音交互引导现场工人排查故障', '分析类', 6100],
  ['1.6.27', '维护SOP本体', 'manufacturing', '售后', '(步骤1) -[需要工具]-> (力矩扳手)', '维修指引Agent：自动为特定故障生成可视化的维修作业指导书', '执行类', 7500],
  ['1.6.28', '备件兼容性本体', 'manufacturing', '售后', '(旧型号轴承) -[可由代替]-> (新型号V2)', '备件搜索Agent：在老旧设备维修时，自动匹配可用的替代零件', '执行类', 7200],
  ['1.6.29', '服务履历本体', 'manufacturing', '售后', '(单体设备) -[维修频次]-> (3次/月)', '退役决策Agent：分析维修成本与残值，建议设备报废或翻新', '决策类', 8400],
  ['1.6.30', '客户反馈情感本体', 'manufacturing', '售后', '(评价内容) -[情感分]-> (-0.8/愤怒)', '危机公关Agent：自动识别高危差评并触发紧急客服介入流程', '执行类', 4100],
  // ── 02 零售行业（31 个）──
  ['2.1.1', '品类架构本体', 'retail', '选品与规划', '(SKU:001) -[隶属于]-> (三级类目:跑步鞋)', '自动上新Agent：根据类目缺失度自动建议补充特定价格带的SKU', '分析类', 7400],
  ['2.1.2', '趋势信号本体', 'retail', '选品与规划', '(关键词:低碳) -[热度指数]-> (环比增长20%)', '选品雷达Agent：抓取社交媒体趋势，预测下一个爆款潜力商品', '分析类', 3200],
  ['2.1.3', '商品属性本体', 'retail', '选品与规划', '(单品A) -[核心卖点]-> (无添加/有机)', '智能文案Agent：基于属性三元组自动生成多平台的种草笔记', '执行类', 1000],
  ['2.1.4', '价格带分布本体', 'retail', '选品与规划', '(价格区间) -[覆盖]-> (中端/20-50元)', '定价策略Agent：自动分析竞品价格，建议最优利润率下的价格锚点', '决策类', 4900],
  ['2.1.5', '季节性/周期本体', 'retail', '选品与规划', '(防晒霜) -[需求峰值]-> (5月-8月)', '季节性规划Agent：提前3个月触发生产与采购的资源锁定期', '决策类', 4400],
  ['2.2.6', '供方准入本体', 'retail', '采购与供应', '(工厂X) -[合规认证]-> (FSC森林认证)', '准入审核Agent：自动验证供应商资质，剔除不符合ESG要求的伙伴', '治理类', 8000],
  ['2.2.7', '契约逻辑本体', 'retail', '采购与供应', '(采购合同) -[账期要求]-> (15天/预付)', '财务协同Agent：自动对账并根据现金流状态建议最优支付时间', '执行类', 7600],
  ['2.2.8', '起订量(MOQ)本体', 'retail', '采购与供应', '(SKU_B) -[最小起订量]-> (500件)', '采购拼单Agent：跨区域合并小额订单以达成供应商的MOQ门槛', '执行类', 3800],
  ['2.2.9', '原料溯源本体', 'retail', '采购与供应', '(棉纱) -[产地]-> (新疆/产区A)', '透明供应链Agent：为消费者提供可扫码查看的链路溯源证据', '治理类', 8000],
  ['2.2.10', '生产前置期本体', 'retail', '采购与供应', '(定制款) -[LeadTime]-> (45天)', '补货预警Agent：结合销量趋势和前置期，精准计算下单时机', '分析类', 4200],
  ['2.3.11', '仓储拓扑本体', 'retail', '仓储与物流', '(前置仓) -[服务半径]-> (3公里)', '选址模拟Agent：基于人口密度和配送距离，建议下一个前置仓坐标', '决策类', 6100],
  ['2.3.12', '库存状态本体', 'retail', '仓储与物流', '(单品C) -[状态]-> (临期/余30天)', '临期清货Agent：自动下发折扣指令至POS端，加速陈旧库存周转', '执行类', 5700],
  ['2.3.13', '物流温控本体', 'retail', '仓储与物流', '(鲜奶) -[温度约束]-> (2℃-6℃)', '冷链监控Agent：传感器波动时，自动联系司机并重新评估商品残值', '治理类', 6500],
  ['2.3.14', '包材规则本体', 'retail', '仓储与物流', '(易碎品) -[防护等级]-> (气泡袋+加厚纸箱)', '智能打包Agent：根据订单内商品组合，自动选择最省耗材的包材', '执行类', 7900],
  ['2.3.15', '末端运力本体', 'retail', '仓储与物流', '(骑手A) -[当前负载]-> (5单)', '即时配送调度Agent：在高峰期平衡配送时长与骑手收益，优化路线', '执行类', 7500],
  ['2.4.16', '货架图谱本体', 'retail', '门店与运营', '(货架A层) -[关联商品]-> (薯片+可乐)', '货架优化Agent：利用关联购买数据，建议能够提升连带率的陈列布局', '决策类', 7000],
  ['2.4.17', '客流行为本体', 'retail', '门店与运营', '(消费者甲) -[停留时长]-> (美妆区/15分钟)', '门店热力Agent：识别高流量死角，调整动线引导', '分析类', 7600],
  ['2.4.18', '商品补货本体', 'retail', '门店与运营', '(商品SKU:Nike Air Max 270) -[生成补货计划]-> (门店调拨单/14天满足)', '城市单品补货Agent：结合销量流速、库存水位与尺码模型自动生成门店调拨方案', '执行类', 12600],
  ['2.4.19', '设备能耗本体', 'retail', '门店与运营', '(门店空调) -[运行策略]-> (节能模式/26℃)', '绿色门店Agent：根据进店人数实时调节灯光与温控系统', '执行类', 5000],
  ['2.4.20', '店员排班本体', 'retail', '门店与运营', '(店员A) -[擅长领域]-> (导购/美妆)', '弹性排班Agent：预测客流波峰，自动生成跨店调拨的人力计划', '执行类', 4800],
  ['2.4.21', '全渠道库存本体', 'retail', '门店与运营', '(线上订单) -[支持自提]-> (门店B)', 'O2O履约Agent：根据库存距离和成本，决定从仓库发货还是门店自提', '决策类', 5300],
  ['2.5.22', '会员画像本体', 'retail', '营销与CRM', '(用户ID) -[消费标签]-> (高频/价格敏感)', '精准推送Agent：仅针对感兴趣的用户推送特定优惠', '执行类', 7300],
  ['2.5.23', '促销逻辑本体', 'retail', '营销与CRM', '(满减活动) -[互斥]-> (限时秒杀)', '营销校验Agent：防止多重折扣叠加导致毛利归零甚至亏损', '治理类', 5700],
  ['2.5.24', '情感反馈本体', 'retail', '营销与CRM', '(评论词:配送慢) -[情感极性]-> (负面)', '舆情响应Agent：自动识别愤怒客户，发放补偿券并安排人工介入', '执行类', 11000],
  ['2.5.25', '权益积分本体', 'retail', '营销与CRM', '(100积分) -[兑换价值]-> (1元现金)', '忠诚度管理Agent：预测积分过期可能导致的用户流失，提前提醒兑换', '分析类', 4600],
  ['2.5.26', '社交影响力本体', 'retail', '营销与CRM', '(KOC_A) -[带货转化率]-> (12%)', '达人筛选Agent：基于历史数据模型，为新品推荐最匹配的博主', '分析类', 4000],
  ['2.6.27', '售后策略本体', 'retail', '服务与循环', '(生鲜类) -[退货规则]-> (仅退款/不退货)', '智能客服Agent：根据品类和客单价，自主决定赔付策略以降低成本', '决策类', 7800],
  ['2.6.28', '逆向物流本体', 'retail', '服务与循环', '(退货单) -[返回路径]-> (最近分拣中心)', '退货质检Agent：判定商品是否可进行二次销售或需降级进入特卖', '分析类', 9100],
  ['2.6.29', '旧物回收本体', 'retail', '服务与循环', '(旧衣) -[回收价值]-> (5元/kg)', '环保激励Agent：引导客户参与以旧换新，提升用户粘性与品牌形象', '执行类', 7200],
  ['2.6.30', '维修配件本体', 'retail', '服务与循环', '(小家电A) -[易损件]-> (密封圈)', '自助维修Agent：通过图文指引引导用户自行解决小故障', '执行类', 7900],
  ['2.6.31', '服务业务本体', 'retail', '服务与循环', '(产品常见问题) -[答案映射]-> (使用手册P5)', '智慧导购Agent：在直播间或聊天框24小时解答产品参数疑问', '执行类', 9100],
  // ── 03 医疗行业（20 个）──
  ['3.1.1', '疾病诊断本体(ICD-11)', 'medical', '临床诊疗', '(心房颤动) -[临床表现]-> (心悸/脉搏短绌)', '预诊分诊Agent：根据患者主诉，自动推荐挂号科室与紧急程度优先级', '分析类', 3700],
  ['3.1.2', '临床路径(CP)本体', 'medical', '临床诊疗', '(全髋关节置换术) -[术后24h标准]-> (康复训练A)', '诊疗偏离预警Agent：实时监控住院医嘱，若偏离标准临床路径自动提醒', '治理类', 1900],
  ['3.1.3', '药物交互(DDI)本体', 'medical', '临床诊疗', '(华法林) -[禁忌联用]-> (阿司匹林)', '用药安全检查Agent：在医生开方时，自动扫描处方内药物的冲突三元组', '治理类', 3100],
  ['3.1.4', '临床试验方案本体', 'medical', '临床诊疗', '(临床试验) -[入选标准]-> (HbA1c > 7.0%)', '受试者自动精准招募Agent：扫描电子病历自动识别符合试验标准的受试者', '分析类', 5100],
  ['3.1.5', '医学影像特征本体', 'medical', '临床诊疗', '(肺部结节) -[影像学特征]-> (分叶征/毛刺感)', '影像辅助诊断Agent：辅助识别影像切片中的关键特征，自动生成报告', '分析类', 1900],
  ['3.2.6', '医疗资源效能本体', 'medical', '医院运营', '(手术室05) -[洁净等级]-> (百级)', '手术排程Agent：根据手术难度与洁净等级，自动生成最优手术计划表', '执行类', 3900],
  ['3.2.7', '床位周转本体', 'medical', '医院运营', '(内科病房A) -[当前状态]-> (待出院评估)', '动态床位管理Agent：预测出院人数，自动平衡急诊入院与择期手术的床位', '执行类', 4200],
  ['3.2.8', '人员资质本体', 'medical', '医院运营', '(医生甲) -[具备权限]-> (三类手术/腹腔镜)', '排班合规Agent：确保排班表中每项诊疗活动都有具备相应资质的人员', '治理类', 3400],
  ['3.2.9', '医疗设备孪生本体', 'medical', '医院运营', '(MRI设备) -[液氦水平]-> (15%/低值)', '主动维保Agent：在大型设备故障前根据传感器三元组触发维保', '执行类', 4900],
  ['3.3.10', '高值耗材追溯本体', 'medical', '医药供应链', '(心脏支架) -[关联患者]-> (张三/SN:12345)', '高值耗材闭环Agent：实现从供应商到手术植入、再到医保报销的全流程追溯', '治理类', 4700],
  ['3.3.11', '药品冷链质量本体', 'medical', '医药供应链', '(胰岛素) -[存储温度约束]-> (2℃-8℃)', '药品质量保障Agent：冷链异常时自动标记受影响批次，禁止入库', '治理类', 7100],
  ['3.3.12', 'VMI供应商管理库存本体', 'medical', '医药供应链', '(库房A) -[缺货阈值]-> (100盒)', '自动补货Agent：药品跌破安全库位时，自动向药企发送补货指令', '执行类', 4700],
  ['3.3.13', '替代药品本体', 'medical', '医药供应链', '(阿莫西林) -[同类替代]-> (头孢氨苄)', '断药协调Agent：当某药品断货时，自动建议成分等价的替代方案', '决策类', 3000],
  ['3.4.14', '患者画像(PHR)本体', 'medical', '患者服务', '(患者A) -[过敏史]-> (青霉素)', '个性化宣教Agent：根据患者手术类型和过敏史，自动推送康复课程', '执行类', 3100],
  ['3.4.15', '随访随办本体', 'medical', '患者服务', '(出院日期) -[触发随访周期]-> (7天/30天/90天)', '自动随访Agent：通过AI语音或短信自动回访患者康复情况', '执行类', 2700],
  ['3.4.16', '患者情感本体', 'medical', '患者服务', '(投诉内容) -[关键词]-> (排队久/态度差)', '医患关系预警Agent：识别高风险投诉三元组，自动转办至医务处干预', '分析类', 5200],
  ['3.5.17', '医保控费(DRGs)本体', 'medical', '医保与合规', '(阑尾切除术) -[医保支付限额]-> (8000元)', '成本控费Agent：实时计算住院费用，接近限额时提醒医生检查资源使用', '治理类', 3100],
  ['3.5.18', '检查合理性本体', 'medical', '医保与合规', '(感冒诊断) -[不推荐检查]-> (全血基因组测序)', '反欺诈检查Agent：自动识别过度诊疗和虚假报销行为三元组', '治理类', 3800],
  ['3.5.19', '电子病历质控本体', 'medical', '医保与合规', '(病程记录) -[逻辑缺失]-> (体格检查描述)', '病历质控Agent：实时检查病历书写质量，确保满足法律文书合规要求', '治理类', 4900],
  ['3.6.20', '靶点-配体相互作用本体', 'medical', '药物发现', '(蛋白质A) -[属于靶点类型]-> (GPCR受体)', '虚拟筛选Agent：在百万分子库中，通过亲和力三元组推理筛选先导化合物', '分析类', 2900],
  // ── 04 交通行业（15 个）──
  ['4.1.1', '路网拓扑本体', 'transport', '基础设施', '(路段A) -[连接于]-> (节点B)', '路径规划Agent：基于静态拓扑与实时封闭信息，计算最优避让路径', '执行类', 3100],
  ['4.1.2', '枢纽设施本体', 'transport', '基础设施', '(站台01) -[泊位长度]-> (400m)', '泊位分配Agent：根据载具长度与枢纽实时占用情况，自动指派停靠位置', '执行类', 1300],
  ['4.1.3', '健康监测本体', 'transport', '基础设施', '(桥梁支座) -[应力峰值]-> (200kN)', '预防性维护Agent：识别设施疲劳三元组，在风险临界点前触发维修', '分析类', 2200],
  ['4.2.4', '载具数字孪生本体', 'transport', '载具资产', '(机车01) -[总里程]-> (50万km)', '资产全生命周期Agent：评估载具残值，建议报废或进入二级维护', '决策类', 2800],
  ['4.2.5', '实时工况本体', 'transport', '载具资产', '(货车A) -[瞬时油耗]-> (32L/100km)', '能耗优化Agent：实时干预驾驶员或自动驾驶策略，降低非必要能耗', '执行类', 4000],
  ['4.2.6', '载具能力本体', 'transport', '载具资产', '(船舶B) -[具备载重]-> (5万吨)', '运力匹配Agent：根据货物对温度、重量的要求，自动筛选合规载具', '执行类', 4900],
  ['4.3.7', '动态流量本体', 'transport', '调度指挥', '(十字路口) -[饱和度]-> (0.85)', '信号灯自适应Agent：通过感应流量三元组，动态调整绿信比缓解拥堵', '执行类', 3500],
  ['4.3.8', '多模态联运本体', 'transport', '调度指挥', '(高铁G1) -[接驳窗口]-> (出租车/地铁)', '联运协调Agent：当主干线路延误时，自动调整末端接驳工具的待命时间', '执行类', 3800],
  ['4.3.9', '冲突消解本体', 'transport', '调度指挥', '(航路A) -[安全间隔]-> (5km)', '安全避碰Agent：预测四维轨迹冲突，实时下发航向或空层改变指令', '执行类', 3700],
  ['4.4.10', '货物单元本体', 'transport', '货物与运输', '(货包01) -[时效等级]-> (JIT/准时制)', '装载方案Agent：根据重心平衡和危险品配装禁忌，自动生成最优配载图', '执行类', 4800],
  ['4.4.11', '订单履约本体', 'transport', '货物与运输', '(运输单) -[当前节点]-> (分拨中心)', '时效督办Agent：预测延误风险，自动触发加急运输或多式联运切换', '执行类', 4600],
  ['4.5.12', '气象约束本体', 'transport', '运行环境', '(路段) -[能见度]-> (<50m)', '安全降级Agent：在极端气象下，自动下发限速或全线封停指令', '治理类', 3700],
  ['4.5.13', '地理围栏本体', 'transport', '运行环境', '(区域X) -[限制类别]-> (限行/禁入)', '准入合规Agent：自动校验载具属性，拦截不符合环保或行政要求的入城申请', '治理类', 2300],
  ['4.6.14', '用户需求本体', 'transport', '出行服务', '(乘客) -[偏好]-> (最低换乘/最短时间)', '个人助手Agent：基于用户画像三元组，定制化推荐多模式组合出行方案', '决策类', 4600],
  ['4.6.15', '动态定价本体', 'transport', '出行服务', '(供需比) -[当前状态]-> (严重失衡)', '收益管理Agent：实时调节票价或运费，利用价格杠杆调节客流分布', '决策类', 3900],
  // ── 05 通用业务（12 个）──
  ['5.1.1', '科目核算本体', 'general', '财务管理', '(费用申请) -[归属于]-> (成本中心001)', '自动报销Agent：自动比对发票、行程与预算，识别违规支出', '治理类', 4600],
  ['5.1.2', '资金风险本体', 'general', '财务管理', '(现金流预测) -[敏感度分析]-> (利率波动)', '现金流预警Agent：预测未来3个月收支缺口，自动提出融资建议', '分析类', 3100],
  ['5.2.3', '组织架构与职能本体', 'general', '人力资源', '(员工A) -[汇报于]-> (岗位B)', '自动入职/调岗Agent：当员工岗位变动时，自动更新权限及配套资源', '执行类', 5400],
  ['5.2.4', '技能图谱本体', 'general', '人力资源', '(技能:Python) -[掌握等级]-> (专家)', '动态组队Agent：根据任务属性，在人才池中自动拼凑最优项目组', '执行类', 2800],
  ['5.3.5', '资产与办公资源本体', 'general', '行政与办公', '(会议室) -[具备设施]-> (视频终端/10人)', '智能行政助手：根据会议参会人数与设备需求，自动预定空间', '执行类', 5000],
  ['5.3.6', '合规政策本体', 'general', '行政与办公', '(出差政策) -[约束]-> (住宿上限/500元)', '差旅合规Agent：在预订环节自动拦截不合规的酒店选择', '治理类', 3300],
  ['5.4.7', '战略指标(KPI/OKR)本体', 'general', '管理与决策', '(总目标) -[分解为]-> (季度指标A)', '战略对齐Agent：识别下级指标是否背离上级目标', '分析类', 2600],
  ['5.4.8', '决策影响因子本体', 'general', '管理与决策', '(决策A) -[前置条件]-> (预算批准+市场调研)', '模拟决策Agent：在执行前模拟"如果...那么..."场景，评估副作用', '决策类', 2000],
  ['5.5.9', '数据语义本体', 'general', '业务分析', '(销售额) -[等价于]-> (收入-退货-折让)', '自动化报表Agent：即使数据源不同，也能通过语义对齐生成一致经营大表', '执行类', 3000],
  ['5.5.10', '因果推断本体', 'general', '业务分析', '(销量下降) -[根因分析]-> (缺货率/竞品促销)', '根因洞察Agent：当KPI异常波动时，自动下钻数据并生成归因报告', '分析类', 4800],
  ['5.6.11', '内部控制本体', 'general', '风险与合规', '(操作A) -[触发检查]-> (双人复核)', '风控Agent：实时监控业务流，自动拦截违反"职责分离"原则的操作', '治理类', 4100],
  ['5.6.12', '法律法规库本体', 'general', '风险与合规', '(欧盟GDPR) -[约束]-> (用户隐私存储)', '法务审查Agent：自动扫描业务合同，识别潜在的法律违规条款', '治理类', 4000],
]

/** 从三元组样本中提取 Subject / Predicate / Object */
function parseTriple(triple: string): { subject: string; predicate: string; object: string } {
  const m = triple.match(/\(([^)]+)\)\s*-\[([^\]]+)\]->\s*\(([^)]+)\)/)
  if (m) return { subject: m[1], predicate: m[2], object: m[3] }
  return { subject: '实体A', predicate: '关联', object: '实体B' }
}

const INDUSTRY_LABELS: Record<string, string> = {
  manufacturing: '制造业', retail: '零售业', medical: '医疗健康', transport: '交通物流', general: '通用业务',
}

/** 根据本体定义自动生成 ProjectDetail */
function generateProject(def: OntologyDef, idx: number): ProjectDetail {
  const [code, name, industry, phase, triple, agentScene, trainingType, dataCount] = def
  const industryLabel = INDUSTRY_LABELS[industry] || industry
  const t = parseTriple(triple)
  const baseDate = new Date('2024-10-01')
  baseDate.setDate(baseDate.getDate() + idx * 3)
  const createdAt = baseDate.toISOString()
  baseDate.setDate(baseDate.getDate() + Math.floor(30 + idx * 2))
  const updatedAt = baseDate.toISOString()

  // 提取主语/谓语/宾语中的纯名称（去掉冒号后的值部分）
  const subjectName = t.subject.split(':')[0].trim()
  const objectName = t.object.split(':')[0].trim()

  const project: ProjectDetail = {
    id: `proj-${code.replace(/\./g, '')}`,
    name,
    category: industry,
    description: `${industryLabel} · ${phase}领域本体 | ${triple} | Agent场景：${agentScene} | 训练方向：${trainingType} | 数据量：${dataCount.toLocaleString()} 条`,
    createdAt,
    updatedAt,
    documents: [
      { id: `doc-${code}-1`, name: `${name}知识文档.docx`, fileType: 'docx', size: Math.floor(500000 + dataCount * 100), status: 'READY', enabled: true, uploadedAt: createdAt },
      { id: `doc-${code}-2`, name: `${phase}领域数据规范.md`, fileType: 'md', size: Math.floor(100000 + dataCount * 20), status: 'READY', enabled: true, uploadedAt: createdAt },
    ],
    dataSources: [],
    schemaConfig: {
      entityTypes: [
        {
          id: `et-${code}-s`, name: subjectName, description: `本体主语实体：${t.subject}`,
          properties: [
            { id: `ep-${code}-s1`, name: 'name', displayName: '名称', dataType: 'STRING', required: true, sortOrder: 1 },
            { id: `ep-${code}-s2`, name: 'code', displayName: '编码', dataType: 'STRING', required: true, sortOrder: 2 },
            { id: `ep-${code}-s3`, name: 'description', displayName: '描述', dataType: 'TEXT', required: false, sortOrder: 3 },
          ],
        },
        {
          id: `et-${code}-o`, name: objectName, description: `本体宾语实体：${t.object}`,
          properties: [
            { id: `ep-${code}-o1`, name: 'name', displayName: '名称', dataType: 'STRING', required: true, sortOrder: 1 },
            { id: `ep-${code}-o2`, name: 'value', displayName: '值', dataType: 'STRING', required: false, sortOrder: 2 },
          ],
        },
      ],
      relationTypes: [
        { id: `rt-${code}-1`, name: t.predicate, domain: subjectName, range: objectName, description: `${t.subject} ${t.predicate} ${t.object}`, properties: [] },
      ],
      entityScope: `${industryLabel}${phase}领域的${subjectName}、${objectName}等实体`,
      relationScope: `${subjectName}与${objectName}之间的${t.predicate}关系`,
      skills: [],
      updatedAt,
    },
    runs: [],
    versions: [],
    actions: [],
    functions: [],
  }
  return project
}

function defaultProjects(): ProjectDetail[] {
  const projects = ONTOLOGY_DEFS.map((def, idx) => generateProject(def, idx))

  // ── 第一个项目（故障诊断本体）增加丰富的详情数据 ──
  const first = projects[0]
  first.documents = [
    { id: 'doc-fd-001', name: '立式加工中心故障诊断知识手册.docx', fileType: 'docx', size: 2981888, status: 'READY', enabled: true, uploadedAt: '2025-01-10T08:00:00.000Z' },
    { id: 'doc-fd-002', name: '主轴与进给轴状态监测规范.docx', fileType: 'docx', size: 1843200, status: 'READY', enabled: true, uploadedAt: '2025-01-12T09:30:00.000Z' },
    { id: 'doc-fd-003', name: '设备故障图谱样本.jsonl', fileType: 'jsonl', size: 48600, status: 'READY', enabled: true, uploadedAt: '2025-01-15T14:00:00.000Z' },
    { id: 'doc-fd-004', name: '标准排查路径与安全隔离清单.md', fileType: 'md', size: 412000, status: 'READY', enabled: true, uploadedAt: '2025-01-20T10:00:00.000Z' },
    { id: 'doc-fd-005', name: '边缘采集点位映射表.xlsx', fileType: 'xlsx', size: 246000, status: 'READY', enabled: false, uploadedAt: '2025-02-01T11:00:00.000Z' },
  ]
  first.dataSources = [
    {
      id: 'ds-fd-001', name: '设备维保知识图谱库', type: 'MYSQL', host: '10.10.30.18', port: 3306,
      database: 'maintenance_kg', username: 'kg_reader', password: '', sslEnabled: false,
      enabled: true, extractMode: 'TABLE', tables: ['equipment_asset', 'fault_patterns', 'kg_relations'],
      rowLimit: 120000, syncMode: 'FULL', incrementalColumn: '',
      status: 'SUCCESS', lastTestAt: '2025-03-08T10:00:00.000Z', lastError: '',
      createdAt: '2025-01-10T10:00:00.000Z', updatedAt: '2025-03-08T10:00:00.000Z',
    },
    {
      id: 'ds-fd-002', name: '状态监测时序库', type: 'CLICKHOUSE', host: '10.10.30.27', port: 8123,
      database: 'condition_history', username: 'trend_reader', password: '', sslEnabled: false,
      enabled: true, extractMode: 'TABLE', tables: ['spindle_trend', 'axis_precision', 'hydraulic_alarm'],
      rowLimit: 200000, syncMode: 'INCREMENTAL', incrementalColumn: 'event_time',
      status: 'SUCCESS', lastTestAt: '2025-03-08T10:10:00.000Z', lastError: '',
      createdAt: '2025-01-18T10:00:00.000Z', updatedAt: '2025-03-08T10:10:00.000Z',
    },
  ]
  first.schemaConfig = {
    entityTypes: [
      {
        id: 'et-fd-001', name: 'Equipment', description: '关键设备资产实体，如 VM-850 立式加工中心',
        properties: [
          { id: 'ep-fd-001', name: 'assetCode', displayName: '设备编码', dataType: 'STRING', required: true, sortOrder: 1 },
          { id: 'ep-fd-002', name: 'model', displayName: '设备型号', dataType: 'STRING', required: true, sortOrder: 2 },
          { id: 'ep-fd-003', name: 'equipmentClass', displayName: '设备类别', dataType: 'STRING', required: true, sortOrder: 3 },
          { id: 'ep-fd-004', name: 'location', displayName: '安装位置', dataType: 'STRING', required: false, sortOrder: 4 },
          { id: 'ep-fd-005', name: 'criticality', displayName: '关键等级', dataType: 'STRING', required: false, sortOrder: 5 },
          { id: 'ep-fd-006', name: 'description', displayName: '说明', dataType: 'TEXT', required: false, sortOrder: 6 },
        ],
      },
      {
        id: 'et-fd-002', name: 'Phenomenon', description: '故障现象主题，如主轴温升异常、进给轴定位偏差',
        properties: [
          { id: 'ep-fd-011', name: 'code', displayName: '故障码', dataType: 'STRING', required: true, sortOrder: 1 },
          { id: 'ep-fd-012', name: 'category', displayName: '故障类别', dataType: 'STRING', required: true, sortOrder: 2 },
          { id: 'ep-fd-013', name: 'description', displayName: '现象描述', dataType: 'TEXT', required: true, sortOrder: 3 },
          { id: 'ep-fd-014', name: 'severityLevel', displayName: '严重级别', dataType: 'STRING', required: false, sortOrder: 4 },
        ],
      },
      {
        id: 'et-fd-003', name: 'SubPhenomenon', description: '可用于根因判定的细分诊断信号',
        properties: [
          { id: 'ep-fd-021', name: 'description', displayName: '细分描述', dataType: 'TEXT', required: true, sortOrder: 1 },
          { id: 'ep-fd-022', name: 'signal', displayName: '诊断信号', dataType: 'STRING', required: false, sortOrder: 2 },
        ],
      },
      {
        id: 'et-fd-004', name: 'Checkpoint', description: '现场排查的关键检查点与安全要求',
        properties: [
          { id: 'ep-fd-031', name: 'priority', displayName: '优先级', dataType: 'INTEGER', required: true, sortOrder: 1 },
          { id: 'ep-fd-032', name: 'method', displayName: '检查方法', dataType: 'TEXT', required: true, sortOrder: 2 },
          { id: 'ep-fd-033', name: 'expectedValue', displayName: '期望值', dataType: 'STRING', required: true, sortOrder: 3 },
          { id: 'ep-fd-034', name: 'safetyNote', displayName: '安全要求', dataType: 'TEXT', required: false, sortOrder: 4 },
          { id: 'ep-fd-035', name: 'description', displayName: '说明', dataType: 'TEXT', required: false, sortOrder: 5 },
        ],
      },
      {
        id: 'et-fd-005', name: 'Cause', description: '标准化根因和失效机理',
        properties: [
          { id: 'ep-fd-041', name: 'description', displayName: '原因描述', dataType: 'TEXT', required: true, sortOrder: 1 },
          { id: 'ep-fd-042', name: 'causeCategory', displayName: '原因分类', dataType: 'STRING', required: false, sortOrder: 2 },
          { id: 'ep-fd-043', name: 'evidenceHint', displayName: '判定依据', dataType: 'TEXT', required: false, sortOrder: 3 },
        ],
      },
      {
        id: 'et-fd-006', name: 'Solution', description: '标准处置方案、恢复步骤与技能要求',
        properties: [
          { id: 'ep-fd-051', name: 'steps', displayName: '执行步骤', dataType: 'TEXT', required: true, sortOrder: 1 },
          { id: 'ep-fd-052', name: 'estimatedTime', displayName: '预计耗时', dataType: 'STRING', required: true, sortOrder: 2 },
          { id: 'ep-fd-053', name: 'effectiveness', displayName: '预期效果', dataType: 'STRING', required: true, sortOrder: 3 },
          { id: 'ep-fd-054', name: 'riskLevel', displayName: '风险等级', dataType: 'STRING', required: true, sortOrder: 4 },
          { id: 'ep-fd-055', name: 'requiredSkill', displayName: '技能要求', dataType: 'STRING', required: false, sortOrder: 5 },
        ],
      },
      {
        id: 'et-fd-007', name: 'Component', description: '关键部件和可更换功能单元',
        properties: [
          { id: 'ep-fd-061', name: 'description', displayName: '组件描述', dataType: 'TEXT', required: true, sortOrder: 1 },
          { id: 'ep-fd-062', name: 'componentClass', displayName: '部件类别', dataType: 'STRING', required: false, sortOrder: 2 },
          { id: 'ep-fd-063', name: 'sparePartCode', displayName: '备件编码', dataType: 'STRING', required: false, sortOrder: 3 },
        ],
      },
      {
        id: 'et-fd-008', name: 'Parameter', description: '用于判断故障链路的关键参数',
        properties: [
          { id: 'ep-fd-071', name: 'dataType', displayName: '数据类型', dataType: 'STRING', required: true, sortOrder: 1 },
          { id: 'ep-fd-072', name: 'source', displayName: '采集来源', dataType: 'STRING', required: true, sortOrder: 2 },
          { id: 'ep-fd-073', name: 'unit', displayName: '单位', dataType: 'STRING', required: false, sortOrder: 3 },
          { id: 'ep-fd-074', name: 'collectionCycle', displayName: '采样周期', dataType: 'STRING', required: false, sortOrder: 4 },
          { id: 'ep-fd-075', name: 'opcUaPath', displayName: '采集路径', dataType: 'STRING', required: false, sortOrder: 5 },
        ],
      },
    ],
    relationTypes: [
      { id: 'rt-fd-001', name: 'prone_to', domain: 'Equipment', range: 'Phenomenon', description: '设备资产常见或高风险故障现象', properties: [] },
      { id: 'rt-fd-002', name: 'contains', domain: 'Phenomenon', range: 'SubPhenomenon', description: '故障现象拆解后的可验证细分表现', properties: [] },
      { id: 'rt-fd-003', name: 'needs_check', domain: 'Phenomenon', range: 'Checkpoint', description: '故障现象或子现象对应的排查检查点', properties: [] },
      { id: 'rt-fd-004', name: 'discovers', domain: 'Checkpoint', range: 'SubPhenomenon', description: '检查点能够验证或发现的异常特征', properties: [] },
      { id: 'rt-fd-005', name: 'located_at', domain: 'SubPhenomenon', range: 'Component', description: '细分异常所定位的关键部件', properties: [] },
      { id: 'rt-fd-006', name: 'caused_by', domain: 'SubPhenomenon', range: 'Cause', description: '细分异常对应的标准根因', properties: [] },
      { id: 'rt-fd-007', name: 'solved_by', domain: 'Cause', range: 'Solution', description: '根因关联的标准处置方案', properties: [] },
      { id: 'rt-fd-008', name: 'supports', domain: 'Parameter', range: 'Checkpoint', description: '参数数据为检查点判断提供支撑', properties: [] },
    ],
    entityScope: '离散制造设备故障诊断领域的设备、故障现象、细分信号、检查点、根因、处置方案、部件和参数实体',
    relationScope: 'Equipment→Phenomenon→SubPhenomenon→Cause→Solution 的标准诊断链路，并补充 Checkpoint、Component、Parameter 三类支撑关系',
    skills: [
      { id: 'sk-fd-001', code: 'fault_graph_loading', name: '图谱加载', enabled: true, prompt: '从 graph.jsonl 加载设备故障诊断本体的节点与关系数据', source: 'built_in', tags: ['graph', 'loading'] },
      { id: 'sk-fd-002', code: 'symptom_matching', name: '现象匹配', enabled: true, prompt: '根据报警码、趋势信号和描述匹配最可能的故障现象与细分特征', source: 'built_in', tags: ['diagnosis', 'matching'] },
      { id: 'sk-fd-003', code: 'root_cause_analysis', name: '根因追溯', enabled: true, prompt: '沿故障链路追溯根因并输出标准排查与处置建议', source: 'built_in', tags: ['diagnosis', 'analysis'] },
    ],
    updatedAt: '2025-03-09T10:00:00.000Z',
  }
  first.runs = [{
    id: 'run-fd-001', status: 'COMPLETED', progress: 100,
    createdAt: '2025-03-01T10:00:00.000Z', completedAt: '2025-03-01T10:08:00.000Z',
    candidateEntityCount: 52, candidateRelationCount: 64, pendingReviewCount: 0,
    stage: '完成', logs: ['从 graph.jsonl 提取完成，共发现 52 个实体节点，64 条关系'], warnings: [],
    reviewItems: [
      { id: 'ri-fd-001', kind: 'ENTITY', title: 'VM-850 立式加工中心 (Equipment)', evidence: 'graph.jsonl - equip_vm850', confidence: 0.98, status: 'APPROVED' },
      { id: 'ri-fd-002', kind: 'ENTITY', title: '主轴温升异常 (Phenomenon)', evidence: 'graph.jsonl - phen_spindle_hot', confidence: 0.97, status: 'APPROVED' },
      { id: 'ri-fd-003', kind: 'ENTITY', title: '振动频谱出现BPFO峰值 (SubPhenomenon)', evidence: 'graph.jsonl - sp_bpfo_peak', confidence: 0.96, status: 'APPROVED' },
      { id: 'ri-fd-004', kind: 'ENTITY', title: '主轴轴承早期剥落 (Cause)', evidence: 'graph.jsonl - cause_bearing_spall', confidence: 0.95, status: 'APPROVED' },
      { id: 'ri-fd-005', kind: 'RELATION', title: 'VM-850 立式加工中心 → prone_to → 主轴温升异常', evidence: 'graph.jsonl relation', confidence: 0.97, status: 'APPROVED' },
      { id: 'ri-fd-006', kind: 'RELATION', title: '主轴轴承早期剥落 → solved_by → 更换主轴轴承并跑合验证', evidence: 'graph.jsonl relation', confidence: 0.96, status: 'APPROVED' },
      { id: 'ri-fd-007', kind: 'ENTITY', title: '更换主轴轴承并跑合验证 (Solution)', evidence: 'graph.jsonl - sol_replace_bearing', confidence: 0.95, status: 'APPROVED' },
      { id: 'ri-fd-008', kind: 'RELATION', title: '主轴温升异常 → contains → 振动频谱出现BPFO峰值', evidence: 'graph.jsonl relation', confidence: 0.94, status: 'APPROVED' },
    ],
  }]
  first.versions = [
    { id: 'ver-fd-001', version: 'v1.2', label: '标准化设备故障诊断图谱', createdAt: '2025-03-01T10:10:00.000Z', sourceRunId: 'run-fd-001', entityCount: 52, relationCount: 64 },
  ]
  first.actions = [
    {
      id: 'act-fd-001',
      name: 'auto_fault_triage',
      displayName: '自动告警分诊',
      description: '接收报警码、趋势信号和设备履历，自动识别候选故障现象并给出首轮分诊建议。',
      status: 'ACTIVE',
      targetObjectTypeId: 'et-fd-002',
      triggerType: 'EVENT',
      triggerConfigJson: '[{"functionId":"fn-fd-001","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"condition.alarm\\",\\"source\\":\\"edge-gateway\\",\\"window\\":\\"10m\\"}"},{"functionId":"fn-fd-002","order":2,"triggerType":"EVENT","triggerConfig":"{\\"stage\\":\\"triage\\",\\"candidateLimit\\":3,\\"includeHistory\\":true}"}]',
      exceptionPolicy: 'RETRY',
      exceptionConfigJson: '{"maxRetries":2,"fallback":"create_manual_triage_task","notifyRole":"设备工程师"}',
      parametersJson: '[{"name":"equipmentId","displayName":"设备ID","dataType":"STRING","required":true},{"name":"alarmCode","displayName":"报警码","dataType":"STRING","required":true},{"name":"symptomSummary","displayName":"现象摘要","dataType":"STRING","required":true},{"name":"trendSnapshot","displayName":"趋势快照","dataType":"JSON","required":true},{"name":"severity","displayName":"风险等级","dataType":"STRING","required":true,"defaultValue":"HIGH"}]',
      rulesJson: '[{"ruleType":"CREATE_OBJECT","target":"Checkpoint","conditionJson":"{\\"when\\":\\"alarmCode_present\\"}","propertyMappingsJson":"{\\"source\\":\\"$equipmentId\\",\\"alarmCode\\":\\"$alarmCode\\",\\"summary\\":\\"$symptomSummary\\"}","sortOrder":1},{"ruleType":"UPDATE_OBJECT","target":"Equipment","conditionJson":"{\\"when\\":\\"severity in [\\\\\\"HIGH\\\\\\",\\\\\\"CRITICAL\\\\\\"]\\"}","propertyMappingsJson":"{\\"latestAlarmCode\\":\\"$alarmCode\\",\\"diagnosticSeverity\\":\\"$severity\\"}","sortOrder":2}]',
      validationRulesJson: '[{"name":"equipment_id_required","condition":"equipmentId != \\"\\"","message":"设备ID不能为空"},{"name":"alarm_code_format","condition":"alarmCode matches ^ALM-[A-Z0-9-]+$","message":"报警码需满足 ALM-* 编码规范"},{"name":"severity_range","condition":"severity in [\\"LOW\\",\\"MEDIUM\\",\\"HIGH\\",\\"CRITICAL\\"]","message":"风险等级仅支持 LOW/MEDIUM/HIGH/CRITICAL"}]',
    },
    {
      id: 'act-fd-002',
      name: 'generate_diagnostic_work_order',
      displayName: '生成标准排查工单',
      description: '基于故障现象、停机影响和安全要求，生成带优先级、检查项和备件建议的标准排查工单。',
      status: 'ACTIVE',
      targetObjectTypeId: 'et-fd-004',
      triggerType: 'MANUAL',
      triggerConfigJson: '[{"functionId":"fn-fd-003","order":1,"triggerType":"MANUAL","triggerConfig":"{\\"entry\\":\\"workspace.button\\",\\"template\\":\\"fault-inspection-standard\\"}"},{"functionId":"fn-fd-004","order":2,"triggerType":"MANUAL","triggerConfig":"{\\"rule\\":\\"priority_score\\",\\"includeSpareAdvice\\":true}"}]',
      exceptionPolicy: 'SKIP',
      exceptionConfigJson: '{"retainDraft":true,"fallback":"manual_dispatch","notifyRole":"维修班长"}',
      parametersJson: '[{"name":"triageRecordId","displayName":"分诊记录ID","dataType":"STRING","required":true},{"name":"phenomenonId","displayName":"故障现象ID","dataType":"STRING","required":true},{"name":"downtimeImpact","displayName":"停机影响系数","dataType":"FLOAT","required":true,"defaultValue":"0.7"},{"name":"lineCode","displayName":"产线编码","dataType":"STRING","required":true},{"name":"plannedStart","displayName":"计划开工时间","dataType":"STRING","required":false}]',
      rulesJson: '[{"ruleType":"CREATE_OBJECT","target":"Checkpoint","conditionJson":"{\\"when\\":\\"phenomenonId_present\\"}","propertyMappingsJson":"{\\"phenomenonId\\":\\"$phenomenonId\\",\\"lineCode\\":\\"$lineCode\\",\\"plannedStart\\":\\"$plannedStart\\"}","sortOrder":1},{"ruleType":"UPDATE_OBJECT","target":"Solution","conditionJson":"{\\"when\\":\\"downtimeImpact >= 0.7\\"}","propertyMappingsJson":"{\\"dispatchPriority\\":\\"P1\\",\\"dispatchSource\\":\\"standard_work_order\\"}","sortOrder":2}]',
      validationRulesJson: '[{"name":"triage_record_required","condition":"triageRecordId != \\"\\"","message":"分诊记录ID不能为空"},{"name":"impact_range","condition":"downtimeImpact >= 0 and downtimeImpact <= 1","message":"停机影响系数需在 0 到 1 之间"},{"name":"line_code_required","condition":"lineCode != \\"\\"","message":"产线编码不能为空"}]',
    },
    {
      id: 'act-fd-003',
      name: 'escalate_shutdown_response',
      displayName: '升级停机处置',
      description: '当故障影响产能或存在安全风险时，自动升级停机处置流程并同步应急协同角色。',
      status: 'ACTIVE',
      targetObjectTypeId: 'et-fd-006',
      triggerType: 'EVENT',
      triggerConfigJson: '[{"functionId":"fn-fd-002","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"triage.escalated\\",\\"requireRootCause\\":true}"},{"functionId":"fn-fd-004","order":2,"triggerType":"EVENT","triggerConfig":"{\\"scoreThreshold\\":0.82,\\"output\\":\\"P1\\"}"}]',
      exceptionPolicy: 'RETRY',
      exceptionConfigJson: '{"maxRetries":1,"notifyChannels":["andon","sms"],"escalationRole":"产线主管"}',
      parametersJson: '[{"name":"equipmentId","displayName":"设备ID","dataType":"STRING","required":true},{"name":"rootCauseId","displayName":"根因ID","dataType":"STRING","required":true},{"name":"productionLossMinutes","displayName":"影响时长(分钟)","dataType":"INTEGER","required":true},{"name":"safetyRiskLevel","displayName":"安全风险等级","dataType":"STRING","required":true,"defaultValue":"HIGH"}]',
      rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"Solution","conditionJson":"{\\"when\\":\\"productionLossMinutes >= 30\\"}","propertyMappingsJson":"{\\"responseLevel\\":\\"shutdown\\",\\"ownerRole\\":\\"maintenance_supervisor\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"Cause","conditionJson":"{\\"when\\":\\"rootCauseId_present\\"}","propertyMappingsJson":"{\\"from\\":\\"$rootCauseId\\",\\"relation\\":\\"solved_by\\",\\"to\\":\\"shutdown_response\\"}","sortOrder":2}]',
      validationRulesJson: '[{"name":"loss_minutes_positive","condition":"productionLossMinutes >= 0","message":"影响时长不能为负数"},{"name":"safety_risk_range","condition":"safetyRiskLevel in [\\"MEDIUM\\",\\"HIGH\\",\\"CRITICAL\\"]","message":"安全风险等级仅支持 MEDIUM/HIGH/CRITICAL"},{"name":"root_cause_required","condition":"rootCauseId != \\"\\"","message":"升级停机处置前必须明确根因"}]',
    },
    {
      id: 'act-fd-004',
      name: 'recovery_verification_loop',
      displayName: '复机验证闭环',
      description: '维修完成后对温升、振动和试切结果进行复机判定，未达标时自动回退到排查流程。',
      status: 'DRAFT',
      targetObjectTypeId: 'et-fd-006',
      triggerType: 'MANUAL',
      triggerConfigJson: '[{"functionId":"fn-fd-005","order":1,"triggerType":"MANUAL","triggerConfig":"{\\"entry\\":\\"work_order.finish\\",\\"requireSupervisorSignoff\\":true}"}]',
      exceptionPolicy: 'IGNORE',
      exceptionConfigJson: '{"rollbackAction":"reopen_work_order","notifyRole":"工艺工程师"}',
      parametersJson: '[{"name":"workOrderId","displayName":"工单ID","dataType":"STRING","required":true},{"name":"repairResult","displayName":"维修结论","dataType":"STRING","required":true},{"name":"vibrationRms","displayName":"振动RMS","dataType":"FLOAT","required":true},{"name":"spindleTempRise","displayName":"主轴温升","dataType":"FLOAT","required":true}]',
      rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"Solution","conditionJson":"{\\"when\\":\\"repairResult == \\\\\\"PASS\\\\\\"\\"}","propertyMappingsJson":"{\\"recoveryStatus\\":\\"verified\\",\\"verificationSource\\":\\"restart_loop\\"}","sortOrder":1},{"ruleType":"UPDATE_OBJECT","target":"Checkpoint","conditionJson":"{\\"when\\":\\"repairResult != \\\\\\"PASS\\\\\\"\\"}","propertyMappingsJson":"{\\"reopenFlag\\":true,\\"reason\\":\\"restart_verification_failed\\"}","sortOrder":2}]',
      validationRulesJson: '[{"name":"work_order_required","condition":"workOrderId != \\"\\"","message":"工单ID不能为空"},{"name":"repair_result_range","condition":"repairResult in [\\"PASS\\",\\"FAIL\\",\\"RECHECK\\"]","message":"维修结论仅支持 PASS/FAIL/RECHECK"},{"name":"measurement_positive","condition":"vibrationRms >= 0 and spindleTempRise >= 0","message":"测量值不能为负数"}]',
    },
  ]
  first.functions = [
    {
      id: 'fn-fd-001',
      name: '故障现象检索',
      description: '根据报警码、现象描述和趋势特征召回候选故障现象与细分异常。',
      scriptContent: 'def retrieve_fault_symptoms(alarm_code: str, symptom_summary: str, trend_snapshot: dict):\n    """检索候选故障现象并输出相似度排序结果。"""\n    candidates = []\n    for node in nodes.values():\n        if node["entity"] not in ("Phenomenon", "SubPhenomenon"):\n            continue\n        text = f"{node.get(\\"label\\", \\"\\")} {node.get(\\"properties\\", {}).get(\\"description\\", \\"\\")}"\n        score = 0.0\n        if alarm_code and alarm_code in text:\n            score += 0.45\n        if symptom_summary and symptom_summary in text:\n            score += 0.35\n        if trend_snapshot:\n            score += 0.20\n        if score > 0:\n            candidates.append({"id": node["id"], "label": node["label"], "score": round(score, 2)})\n    return sorted(candidates, key=lambda item: item["score"], reverse=True)[:5]',
      status: 'ACTIVE',
    },
    {
      id: 'fn-fd-002',
      name: '根因链路追溯',
      description: '沿故障现象到根因再到处置方案的链路回溯标准诊断路径。',
      scriptContent: 'def trace_root_cause_chain(sub_phenomenon_id: str):\n    """返回根因、处置方案和关键验证证据。"""\n    causes = [r["to"] for r in relations if r["from"] == sub_phenomenon_id and r["relation"] == "caused_by"]\n    solutions = [r["to"] for r in relations if r["from"] in causes and r["relation"] == "solved_by"]\n    checkpoints = [r["to"] for r in relations if r["from"] == sub_phenomenon_id and r["relation"] == "needs_check"]\n    return {"causes": causes, "solutions": solutions, "checkpoints": checkpoints}',
      status: 'ACTIVE',
    },
    {
      id: 'fn-fd-003',
      name: '排查清单生成',
      description: '基于故障现象自动输出按优先级排序的检查点、安全动作和备件建议。',
      scriptContent: 'def build_checkpoint_list(phenomenon_id: str):\n    """输出标准排查清单。"""\n    checkpoint_ids = [r["to"] for r in relations if r["from"] == phenomenon_id and r["relation"] == "needs_check"]\n    items = []\n    for index, checkpoint_id in enumerate(checkpoint_ids, start=1):\n        checkpoint = nodes.get(checkpoint_id, {})\n        props = checkpoint.get("properties", {})\n        items.append({\n            "step": index,\n            "checkpointId": checkpoint_id,\n            "name": checkpoint.get("label"),\n            "method": props.get("method"),\n            "safetyNote": props.get("safetyNote"),\n            "priority": props.get("priority", index),\n        })\n    return sorted(items, key=lambda item: item["priority"])',
      status: 'ACTIVE',
    },
    {
      id: 'fn-fd-004',
      name: '维修优先级评估',
      description: '综合故障等级、设备关键性、停机影响和安全风险，输出维修优先级。',
      scriptContent: 'def evaluate_maintenance_priority(severity: str, equipment_criticality: float, downtime_impact: float, safety_risk: float):\n    """输出 P1/P2/P3 优先级和评分。"""\n    weights = {"CRITICAL": 1.0, "HIGH": 0.85, "MEDIUM": 0.6, "LOW": 0.3}\n    severity_score = weights.get(severity, 0.5)\n    score = severity_score * 0.4 + equipment_criticality * 0.25 + downtime_impact * 0.2 + safety_risk * 0.15\n    level = "P1" if score >= 0.8 else "P2" if score >= 0.6 else "P3"\n    return {"priority": level, "score": round(score, 3)}',
      status: 'ACTIVE',
    },
    {
      id: 'fn-fd-005',
      name: '复机验证判定',
      description: '结合振动、温升和试切结果判断是否满足复机条件，并给出回退建议。',
      scriptContent: 'def decide_recovery_readiness(vibration_rms: float, spindle_temp_rise: float, test_cut_passed: bool):\n    """输出复机判定结论。"""\n    passed = vibration_rms <= 2.8 and spindle_temp_rise <= 18 and test_cut_passed\n    return {\n        "ready": passed,\n        "decision": "PASS" if passed else "RECHECK",\n        "nextAction": "close_work_order" if passed else "reopen_diagnostic_flow",\n    }',
      status: 'DRAFT',
    },
  ]
  ensureFaultDiagnosisSeed(first)

  const productReplenishment = projects.find(project => project.id === PRODUCT_REPLENISHMENT_PROJECT_ID)
  if (productReplenishment) {
    ensureProductReplenishmentSeed(productReplenishment)
  }
  const store: ProjectStore = { projects, idSeq: 9000, _v: DATA_VERSION }
  normalizeStore(store)
  return projects
}

function loadStore(): ProjectStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ProjectStore
      if (normalizeStore(parsed)) {
        saveStore(parsed)
      }
      return parsed
    }
  } catch { /* ignore */ }
  const s: ProjectStore = { projects: defaultProjects(), idSeq: 5000, _v: DATA_VERSION }
  saveStore(s)
  return s
}

function saveStore(store: ProjectStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function nextId(): string {
  const s = loadStore()
  s.idSeq++
  saveStore(s)
  return String(s.idSeq)
}

function findProject(projectId: string): { store: ProjectStore; project: ProjectDetail; index: number } {
  const store = loadStore()
  const index = store.projects.findIndex(p => p.id === projectId)
  if (index < 0) throw new Error(`项目不存在：${projectId}`)
  return { store, project: store.projects[index], index }
}

export const __PROJECT_STORE_LEGACY_HELPERS = { nextId, findProject }

function cloneProjectData<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

const PINNED_PROJECT_ORDER = ['故障诊断本体', '商品补货本体'] as const

function getPinnedProjectRank(project: Pick<ProjectDetail, 'name'>): number {
  const index = PINNED_PROJECT_ORDER.indexOf(project.name as (typeof PINNED_PROJECT_ORDER)[number])
  return index >= 0 ? index : Number.POSITIVE_INFINITY
}

function sortProjectsByUpdatedAt(projects: ProjectDetail[]): ProjectDetail[] {
  return [...projects].sort((a, b) => {
    const aRank = getPinnedProjectRank(a)
    const bRank = getPinnedProjectRank(b)
    if (aRank !== bRank) {
      return aRank - bRank
    }

    const aTime = Date.parse(a.updatedAt || a.createdAt || '') || 0
    const bTime = Date.parse(b.updatedAt || b.createdAt || '') || 0
    return bTime - aTime
  })
}

function latestRunStatus(project: ProjectDetail): ProjectSummary['latestRunStatus'] {
  if (project.runs.length === 0) return undefined
  const latestRun = [...project.runs].sort((a, b) => {
    const aTime = Date.parse(a.createdAt || '') || 0
    const bTime = Date.parse(b.createdAt || '') || 0
    return bTime - aTime
  })[0]
  return latestRun?.status
}

function toProjectSummary(project: ProjectDetail): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    category: project.category,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    documentCount: project.documents.length,
    versionCount: project.versions.length,
    latestRunStatus: latestRunStatus(project),
  }
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function touchProject(project: ProjectDetail): string {
  const now = new Date().toISOString()
  project.updatedAt = now
  return now
}

function touchProjectSchema(project: ProjectDetail): string {
  const now = touchProject(project)
  project.schemaConfig.updatedAt = now
  return now
}

function mutateProject<T>(projectId: string, mutate: (project: ProjectDetail, store: ProjectStore) => T): T {
  const { store, project, index } = findProject(projectId)
  const draft = cloneProjectData(project)
  const result = mutate(draft, store)
  store.projects[index] = draft
  saveStore(store)
  return result
}

function inferDocumentType(fileName: string): ProjectDocument['fileType'] {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.xlsx')) return 'xlsx'
  if (lower.endsWith('.jsonl')) return 'jsonl'
  return 'md'
}

function normalizeEntityProperties(
  properties?: Array<{
    id?: string
    name: string
    displayName?: string
    dataType?: EntityPropertyConfig['dataType']
    required?: boolean
    defaultValue?: string
    description?: string
    mappedColumn?: string
    searchable?: boolean
    sortable?: boolean
    sortOrder?: number
  }>,
): EntityPropertyConfig[] {
  return (properties ?? [])
    .filter(item => item.name?.trim())
    .map((item, index) => ({
      id: item.id || createLocalId('prop'),
      name: item.name.trim(),
      displayName: item.displayName?.trim() || item.name.trim(),
      dataType: item.dataType || 'STRING',
      required: Boolean(item.required),
      defaultValue: item.defaultValue,
      description: item.description,
      mappedColumn: item.mappedColumn,
      searchable: Boolean(item.searchable),
      sortable: Boolean(item.sortable),
      sortOrder: item.sortOrder ?? index,
    }))
}

function findRun(project: ProjectDetail, runId: string): ExtractionRun {
  const run = project.runs.find(item => item.id === runId)
  if (!run) {
    throw new Error(`抽取任务不存在：${runId}`)
  }
  return run
}

function findVersion(project: ProjectDetail, versionId: string): OntologyVersion {
  const version = project.versions.find(item => item.id === versionId)
  if (!version) {
    throw new Error(`版本不存在：${versionId}`)
  }
  return version
}

/* ========== Projects ========== */

interface DataSourcePayload {
  name: string
  type: DataSourceType
  host: string
  port: number
  database: string
  schema?: string
  username: string
  password?: string
  sslEnabled: boolean
  enabled: boolean
  extractMode: DataSourceExtractMode
  tables?: string[]
  customSql?: string
  rowLimit: number
  syncMode: DataSourceSyncMode
  incrementalColumn?: string
}

function normalizeDataSource(dataSource: StructuredDataSource & { passwordMasked?: string | null }): StructuredDataSource {
  return {
    ...dataSource,
    password: dataSource.password ?? dataSource.passwordMasked ?? '',
  }
}

function normalizeProjectDetail(detail: ProjectDetail): ProjectDetail {
  return {
    ...detail,
    dataSources: detail.dataSources.map(item => normalizeDataSource(item as StructuredDataSource & { passwordMasked?: string | null })),
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const store = loadStore()
  return sortProjectsByUpdatedAt(store.projects).map(project => toProjectSummary(project))
}

export async function createProject(name: string, description?: string, category?: string): Promise<ProjectSummary> {
  const store = loadStore()
  store.idSeq += 1
  const now = new Date().toISOString()
  const project: ProjectDetail = {
    id: `proj-${store.idSeq}`,
    name,
    description,
    category,
    createdAt: now,
    updatedAt: now,
    documents: [],
    dataSources: [],
    schemaConfig: {
      entityTypes: [],
      relationTypes: [],
      entityScope: '',
      relationScope: '',
      skills: [],
      updatedAt: now,
    },
    runs: [],
    versions: [],
    actions: [],
    functions: [],
  }
  store.projects.unshift(project)
  saveStore(store)
  return toProjectSummary(project)
}

export async function deleteProject(projectId: string): Promise<void> {
  const store = loadStore()
  store.projects = store.projects.filter(project => project.id !== projectId)
  saveStore(store)
}

export async function updateProject(projectId: string, name: string, description?: string, category?: string): Promise<ProjectSummary> {
  const { store, project, index } = findProject(projectId)
  const updated: ProjectDetail = {
    ...project,
    name,
    description,
    category,
    updatedAt: new Date().toISOString(),
  }
  store.projects[index] = updated
  saveStore(store)
  return toProjectSummary(updated)
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetail> {
  const { project } = findProject(projectId)
  return normalizeProjectDetail(cloneProjectData(project))
}

export async function uploadProjectDocument(projectId: string, file: File): Promise<ProjectDocument> {
  return mutateProject(projectId, (project) => {
    const now = touchProject(project)
    const document: ProjectDocument = {
      id: createLocalId('doc'),
      name: file.name,
      fileType: inferDocumentType(file.name),
      size: file.size,
      status: 'READY',
      enabled: true,
      uploadedAt: now,
    }
    project.documents.unshift(document)
    return cloneProjectData(document)
  })
}

export async function deleteProjectDocument(projectId: string, documentId: string): Promise<void> {
  mutateProject(projectId, (project) => {
    project.documents = project.documents.filter(item => item.id !== documentId)
    touchProject(project)
  })
}

export async function setProjectDocumentEnabled(
  projectId: string, documentId: string, enabled: boolean,
): Promise<ProjectDocument> {
  return mutateProject(projectId, (project) => {
    const document = project.documents.find(item => item.id === documentId)
    if (!document) throw new Error(`文档不存在：${documentId}`)
    document.enabled = enabled
    touchProject(project)
    return cloneProjectData(document)
  })
}

export async function createProjectDataSource(
  projectId: string, payload: DataSourcePayload,
): Promise<StructuredDataSource> {
  return mutateProject(projectId, (project) => {
    const now = touchProject(project)
    const dataSource: StructuredDataSource = {
      id: createLocalId('ds'),
      ...payload,
      password: payload.password ?? '',
      tables: payload.tables ?? [],
      status: 'UNKNOWN',
      lastError: '',
      createdAt: now,
      updatedAt: now,
    }
    project.dataSources.unshift(dataSource)
    return cloneProjectData(dataSource)
  })
}

export async function updateProjectDataSource(
  projectId: string, dataSourceId: string, payload: DataSourcePayload,
): Promise<StructuredDataSource> {
  return mutateProject(projectId, (project) => {
    const dataSource = project.dataSources.find(item => item.id === dataSourceId)
    if (!dataSource) throw new Error(`数据源不存在：${dataSourceId}`)
    const now = touchProject(project)
    Object.assign(dataSource, payload, {
      tables: payload.tables ?? [],
      updatedAt: now,
    })
    return cloneProjectData(dataSource)
  })
}

export async function deleteProjectDataSource(projectId: string, dataSourceId: string): Promise<void> {
  mutateProject(projectId, (project) => {
    project.dataSources = project.dataSources.filter(item => item.id !== dataSourceId)
    touchProject(project)
  })
}

export async function setProjectDataSourceEnabled(
  projectId: string, dataSourceId: string, enabled: boolean,
): Promise<StructuredDataSource> {
  return mutateProject(projectId, (project) => {
    const dataSource = project.dataSources.find(item => item.id === dataSourceId)
    if (!dataSource) throw new Error(`数据源不存在：${dataSourceId}`)
    const now = touchProject(project)
    dataSource.enabled = enabled
    dataSource.updatedAt = now
    return cloneProjectData(dataSource)
  })
}

export async function testProjectDataSourceConnection(
  projectId: string, dataSourceId: string,
): Promise<{ status: 'SUCCESS' | 'FAILED'; testedAt: string; message: string }> {
  return mutateProject(projectId, (project) => {
    const dataSource = project.dataSources.find(item => item.id === dataSourceId)
    if (!dataSource) throw new Error(`数据源不存在：${dataSourceId}`)
    const testedAt = new Date().toISOString()
    const status = dataSource.host && dataSource.database ? 'SUCCESS' as const : 'FAILED' as const
    dataSource.status = status
    dataSource.lastTestAt = testedAt
    dataSource.lastError = status === 'SUCCESS' ? '' : '连接信息不完整'
    dataSource.updatedAt = testedAt
    touchProject(project)
    return {
      status,
      testedAt,
      message: status === 'SUCCESS' ? '已完成静态数据连接校验' : '连接信息不完整',
    }
  })
}

export async function createEntityType(
  projectId: string,
  name: string,
  description?: string,
  properties?: Array<{
    id?: string; name: string; displayName?: string;
    dataType?: EntityPropertyConfig['dataType']; required?: boolean;
    defaultValue?: string; description?: string; sortOrder?: number;
  }>,
): Promise<EntityTypeConfig> {
  return mutateProject(projectId, (project) => {
    const entityType: EntityTypeConfig = {
      id: createLocalId('entity'),
      name,
      description,
      properties: normalizeEntityProperties(properties),
    }
    project.schemaConfig.entityTypes.push(entityType)
    touchProjectSchema(project)
    return cloneProjectData(entityType)
  })
}

export async function updateEntityType(
  projectId: string,
  entityTypeId: string,
  payload: {
    name: string; description?: string; dataSourceId?: string; mappedTable?: string; isBigTable?: boolean;
    properties?: Array<{
      id?: string; name: string; displayName?: string;
      dataType?: EntityPropertyConfig['dataType']; required?: boolean;
      defaultValue?: string; description?: string; mappedColumn?: string; searchable?: boolean; sortable?: boolean; sortOrder?: number;
    }>;
  },
): Promise<EntityTypeConfig> {
  return mutateProject(projectId, (project) => {
    const entityType = project.schemaConfig.entityTypes.find(item => item.id === entityTypeId)
    if (!entityType) throw new Error(`实体类型不存在：${entityTypeId}`)
    entityType.name = payload.name
    entityType.description = payload.description
    entityType.dataSourceId = payload.dataSourceId
    entityType.mappedTable = payload.mappedTable
    entityType.isBigTable = payload.isBigTable
    entityType.properties = normalizeEntityProperties(payload.properties)
    touchProjectSchema(project)
    return cloneProjectData(entityType)
  })
}

export async function removeEntityType(projectId: string, entityTypeId: string): Promise<void> {
  mutateProject(projectId, (project) => {
    project.schemaConfig.entityTypes = project.schemaConfig.entityTypes.filter(item => item.id !== entityTypeId)
    touchProjectSchema(project)
  })
}

export async function createRelationType(
  projectId: string,
  relation: {
    name: string; domain: string; range: string; description?: string;
    properties?: Array<{
      id?: string; name: string; displayName?: string;
      dataType?: EntityPropertyConfig['dataType']; required?: boolean;
      defaultValue?: string; description?: string; sortOrder?: number;
    }>;
  },
): Promise<RelationTypeConfig> {
  return mutateProject(projectId, (project) => {
    const relationType: RelationTypeConfig = {
      id: createLocalId('relation'),
      name: relation.name,
      domain: relation.domain,
      range: relation.range,
      description: relation.description,
      properties: normalizeEntityProperties(relation.properties),
    }
    project.schemaConfig.relationTypes.push(relationType)
    touchProjectSchema(project)
    return cloneProjectData(relationType)
  })
}

export async function updateRelationType(
  projectId: string,
  relationTypeId: string,
  payload: {
    name: string; domain: string; range: string; description?: string;
    properties?: Array<{
      id?: string; name: string; displayName?: string;
      dataType?: EntityPropertyConfig['dataType']; required?: boolean;
      defaultValue?: string; description?: string; sortOrder?: number;
    }>;
  },
): Promise<RelationTypeConfig> {
  return mutateProject(projectId, (project) => {
    const relationType = project.schemaConfig.relationTypes.find(item => item.id === relationTypeId)
    if (!relationType) throw new Error(`关系类型不存在：${relationTypeId}`)
    relationType.name = payload.name
    relationType.domain = payload.domain
    relationType.range = payload.range
    relationType.description = payload.description
    relationType.properties = normalizeEntityProperties(payload.properties)
    touchProjectSchema(project)
    return cloneProjectData(relationType)
  })
}

export async function removeRelationType(projectId: string, relationTypeId: string): Promise<void> {
  mutateProject(projectId, (project) => {
    project.schemaConfig.relationTypes = project.schemaConfig.relationTypes.filter(item => item.id !== relationTypeId)
    touchProjectSchema(project)
  })
}

export async function clearProjectSchema(projectId: string): Promise<void> {
  mutateProject(projectId, (project) => {
    project.schemaConfig.entityTypes = []
    project.schemaConfig.relationTypes = []
    touchProjectSchema(project)
  })
}

export async function updateSchemaPrompts(
  projectId: string,
  payload: { entityScope: string; relationScope: string; skills: SkillConfig[] },
): Promise<SchemaConfig> {
  return mutateProject(projectId, (project) => {
    project.schemaConfig.entityScope = payload.entityScope
    project.schemaConfig.relationScope = payload.relationScope
    project.schemaConfig.skills = cloneProjectData(payload.skills)
    touchProjectSchema(project)
    return cloneProjectData(project.schemaConfig)
  })
}

export async function uploadCustomSkill(projectId: string, file: File): Promise<SkillConfig> {
  return mutateProject(projectId, (project) => {
    const skill: SkillConfig = {
      id: createLocalId('skill'),
      code: 'custom',
      name: file.name.replace(/\.zip$/i, ''),
      description: `从 ${file.name} 导入的自定义 Skill`,
      enabled: true,
      prompt: `加载自定义 Skill 包 ${file.name}`,
      source: 'uploaded',
      fileName: file.name,
      tags: ['uploaded'],
      createdAt: new Date().toISOString(),
      metadata: {
        packageFormat: 'zip',
        packageSize: file.size,
        hasSkillMd: true,
      },
    }
    project.schemaConfig.skills.unshift(skill)
    touchProjectSchema(project)
    return cloneProjectData(skill)
  })
}

export async function removeCustomSkill(projectId: string, skillId: string): Promise<void> {
  mutateProject(projectId, (project) => {
    project.schemaConfig.skills = project.schemaConfig.skills.filter(item => item.id !== skillId)
    touchProjectSchema(project)
  })
}

export async function runAiSchemaInsight(projectId: string): Promise<AiInsightRun> {
  return mutateProject(projectId, (project) => {
    const enabledDocuments = project.documents.filter(item => item.enabled)
    if (enabledDocuments.length === 0) {
      throw new Error('没有启用中的文档，请先启用文档后再执行 AI 洞察')
    }
    const existingEntityNames = new Set(project.schemaConfig.entityTypes.map(item => item.name))
    const existingRelationKeys = new Set(project.schemaConfig.relationTypes.map(item => `${item.domain}|${item.name}|${item.range}`))
    const addedEntityNames: string[] = []
    const addedRelationNames: string[] = []
    const anchorEntityName = project.schemaConfig.entityTypes[0]?.name

    enabledDocuments.slice(0, 3).forEach((document, index) => {
      const baseName = document.name.replace(/\.[^.]+$/, '').trim() || `文档${index + 1}`
      const entityName = existingEntityNames.has(baseName) ? `${baseName}主题` : baseName
      if (!existingEntityNames.has(entityName)) {
        project.schemaConfig.entityTypes.push({
          id: createLocalId('entity'),
          name: entityName,
          description: `AI 从文档《${document.name}》补充的主题实体`,
          properties: [
            {
              id: createLocalId('prop'),
              name: 'name',
              displayName: '名称',
              dataType: 'STRING',
              required: true,
              sortOrder: 0,
            },
          ],
        })
        existingEntityNames.add(entityName)
        addedEntityNames.push(entityName)
      }

      if (anchorEntityName) {
        const relationName = `derived_from_doc_${index + 1}`
        const relationKey = `${anchorEntityName}|${relationName}|${entityName}`
        if (!existingRelationKeys.has(relationKey)) {
          project.schemaConfig.relationTypes.push({
            id: createLocalId('relation'),
            name: relationName,
            domain: anchorEntityName,
            range: entityName,
            description: `AI 从文档《${document.name}》补充的关联`,
            properties: [],
          })
          existingRelationKeys.add(relationKey)
          addedRelationNames.push(relationName)
        }
      }
    })

    const completedAt = touchProjectSchema(project)
    const run: AiInsightRun = {
      id: createLocalId('ai'),
      status: 'COMPLETED',
      progress: 100,
      createdAt: completedAt,
      completedAt,
      scannedDocumentCount: enabledDocuments.length,
      addedEntityCount: addedEntityNames.length,
      addedRelationCount: addedRelationNames.length,
      addedEntityNames,
      addedRelationNames,
      warnings: [],
      stage: '完成',
      logs: [`扫描 ${enabledDocuments.length} 个文档`, `新增实体 ${addedEntityNames.length} 个`, `新增关系 ${addedRelationNames.length} 条`],
    }
    project.aiInsightRun = run
    return cloneProjectData(run)
  })
}

export async function runProjectExtraction(projectId: string): Promise<ExtractionRun> {
  return mutateProject(projectId, (project, store) => {
    const enabledDocuments = project.documents.filter(item => item.enabled)
    const enabledDataSources = project.dataSources.filter(item => item.enabled)
    const candidateEntityCount = Math.max(
      project.schemaConfig.entityTypes.length * 2 + enabledDocuments.length * 3 + enabledDataSources.length * 2,
      6,
    )
    const candidateRelationCount = Math.max(
      project.schemaConfig.relationTypes.length * 2 + enabledDocuments.length + enabledDataSources.length,
      4,
    )
    const pendingReviewCount = Math.max(1, Math.min(8, Math.round((candidateEntityCount + candidateRelationCount) * 0.35)))
    const createdAt = new Date().toISOString()
    const run: ExtractionRun = {
      id: createLocalId('run'),
      status: 'COMPLETED',
      progress: 100,
      createdAt,
      completedAt: createdAt,
      candidateEntityCount,
      candidateRelationCount,
      pendingReviewCount,
      stage: '完成',
      currentDocument: enabledDocuments[0]?.name,
      logs: [
        `扫描文档 ${enabledDocuments.length} 个`,
        `扫描数据源 ${enabledDataSources.length} 个`,
        `生成候选实体 ${candidateEntityCount} 个，关系 ${candidateRelationCount} 条`,
      ],
      warnings: [],
      reviewItems: [],
    }
    run.reviewItems = buildReviewItemsForRun(project, run, () => `ri-${++store.idSeq}`)
    run.pendingReviewCount = run.reviewItems.filter(item => item.status === 'PENDING').length
    project.runs.unshift(run)
    touchProject(project)
    return cloneProjectData(run)
  })
}

export async function updateRunReviewItem(
  projectId: string, runId: string, itemId: string, status: ReviewStatus,
): Promise<ReviewItem> {
  return mutateProject(projectId, (project) => {
    const run = findRun(project, runId)
    const item = run.reviewItems.find(entry => entry.id === itemId)
    if (!item) throw new Error(`审核项不存在：${itemId}`)
    item.status = status
    run.pendingReviewCount = run.reviewItems.filter(entry => entry.status === 'PENDING').length
    touchProject(project)
    return cloneProjectData(item)
  })
}

export async function batchUpdateRunReviewItems(
  projectId: string, runId: string, itemIds: string[], status: ReviewStatus,
): Promise<{ updatedCount: number; pendingReviewCount: number }> {
  return mutateProject(projectId, (project) => {
    const run = findRun(project, runId)
    let updatedCount = 0
    const itemIdSet = new Set(itemIds)
    run.reviewItems.forEach((item) => {
      if (!itemIdSet.has(item.id)) return
      item.status = status
      updatedCount += 1
    })
    run.pendingReviewCount = run.reviewItems.filter(entry => entry.status === 'PENDING').length
    touchProject(project)
    return {
      updatedCount,
      pendingReviewCount: run.pendingReviewCount,
    }
  })
}

export async function publishRunVersion(
  projectId: string, runId: string, label: string,
): Promise<OntologyVersion> {
  return mutateProject(projectId, (project) => {
    const run = findRun(project, runId)
    const versionNumber = project.versions.length + 1
    const version: OntologyVersion = {
      id: createLocalId('version'),
      version: `v${versionNumber}`,
      label,
      createdAt: new Date().toISOString(),
      sourceRunId: run.id,
      entityCount: run.reviewItems.filter(item => item.kind === 'ENTITY' && item.status !== 'REJECTED').length,
      relationCount: run.reviewItems.filter(item => item.kind === 'RELATION' && item.status !== 'REJECTED').length,
    }
    project.versions.unshift(version)
    project.currentVersionId = version.id
    touchProject(project)
    return cloneProjectData(version)
  })
}

export async function getVersionItems(projectId: string, versionId: string): Promise<VersionItem[]> {
  const { project } = findProject(projectId)
  const version = findVersion(project, versionId)
  const run = findRun(project, version.sourceRunId)
  return run.reviewItems
    .filter(item => item.status !== 'REJECTED')
    .map(item => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      evidence: item.evidence,
      confidence: item.confidence,
    }))
}

export async function createProjectAction(
  projectId: string,
  payload: { name: string; description?: string; status?: ActionStatus; displayName?: string },
): Promise<ActionDefinition> {
  return mutateProject(projectId, (project) => {
    const action: ActionDefinition = {
      id: createLocalId('action'),
      name: payload.name,
      displayName: payload.displayName,
      description: payload.description,
      status: payload.status ?? 'DRAFT',
    }
    project.actions.unshift(action)
    touchProject(project)
    return cloneProjectData(action)
  })
}

export async function setActionStatus(
  projectId: string, actionId: string, status: ActionStatus,
): Promise<void> {
  mutateProject(projectId, (project) => {
    const action = project.actions.find(item => item.id === actionId)
    if (!action) throw new Error(`动作不存在：${actionId}`)
    action.status = status
    touchProject(project)
  })
}

export async function deleteProjectAction(projectId: string, actionId: string): Promise<void> {
  mutateProject(projectId, (project) => {
    project.actions = project.actions.filter(item => item.id !== actionId)
    touchProject(project)
  })
}

export async function updateProjectAction(
  projectId: string, actionId: string, payload: Partial<ActionDefinition>,
): Promise<ActionDefinition> {
  return mutateProject(projectId, (project) => {
    const action = project.actions.find(item => item.id === actionId)
    if (!action) throw new Error(`动作不存在：${actionId}`)
    Object.assign(action, payload)
    touchProject(project)
    return cloneProjectData(action)
  })
}

interface ParsedFunctionSignature {
  functionName: string | null
  params: string[]
}

const DEFAULT_FUNCTION_RUN_INPUT: Record<string, Record<string, unknown>> = {
  retrieve_fault_symptoms: {
    alarm_code: 'ALM-SPINDLE-TEMP',
    symptom_summary: '主轴温升异常并伴随轻微振动',
    trend_snapshot: { spindleTempRise: 21.6, vibrationRms: 2.9 },
  },
  trace_root_cause_chain: {
    sub_phenomenon_id: 'sub-spindle-bearing-wear',
  },
  build_checkpoint_list: {
    phenomenon_id: 'phen-spindle-temp-rise',
  },
  evaluate_maintenance_priority: {
    severity: 'HIGH',
    equipment_criticality: 0.86,
    downtime_impact: 0.72,
    safety_risk: 0.41,
  },
  decide_recovery_readiness: {
    vibration_rms: 2.4,
    spindle_temp_rise: 16.8,
    test_cut_passed: true,
  },
  calc_daily_sales_velocity: {
    order_rows: [
      { sales_qty: 22 },
      { sales_qty: 18 },
      { sales_qty: 16 },
    ],
    history_window_days: 14,
  },
  calc_target_stock_gap: {
    daily_sales_velocity: 3.8,
    coverage_days: 12,
    on_hand_qty: 21,
    in_transit_qty: 6,
  },
  split_qty_by_size_curve: {
    total_qty: 48,
    size_curve: { '36': 0.15, '37': 0.2, '38': 0.25, '39': 0.25, '40': 0.15 },
  },
  allocate_limited_inventory: {
    allocatable_qty: 30,
    store_demands: [
      { storeCode: 'SH001', gapQty: 16, priorityScore: 98, dailySalesVelocity: 5.6 },
      { storeCode: 'SH015', gapQty: 12, priorityScore: 90, dailySalesVelocity: 4.2 },
      { storeCode: 'SH023', gapQty: 10, priorityScore: 72, dailySalesVelocity: 2.8 },
    ],
  },
  build_transfer_order_payload: {
    plan_no: 'RP-20260311-001',
    source_warehouse: '华东上海闵行中心仓',
    arrival_date: '2026-03-14',
    allocations: [
      { storeCode: 'SH001', allocatedQty: 16, sizeBreakdown: { '37': 3, '38': 5, '39': 5, '40': 3 } },
      { storeCode: 'SH015', allocatedQty: 12, sizeBreakdown: { '36': 2, '37': 2, '38': 4, '39': 2, '40': 2 } },
    ],
  },
}

const FAULT_SYMPTOM_CANDIDATES = [
  {
    id: 'phen-spindle-temp-rise',
    label: '主轴温升异常',
    description: '主轴箱外壳温升超 18℃，伴随温漂补偿触发',
    keywords: ['spindle', 'temp', '温升', '主轴', '热漂移'],
  },
  {
    id: 'sub-spindle-bearing-wear',
    label: '振动频谱出现 BPFO 峰值',
    description: '前轴承外圈疑似早期剥落，频谱异常增强',
    keywords: ['bpfo', '振动', '轴承', '频谱'],
  },
  {
    id: 'phen-z-axis-position-error',
    label: 'Z轴重复定位偏差增大',
    description: '丝杠预紧衰减后出现定位波动',
    keywords: ['z轴', '定位', '丝杠', '背隙'],
  },
  {
    id: 'phen-hydraulic-pressure-fluctuation',
    label: '液压压力波动',
    description: '液压回路压差增大，伴随周期性抖动',
    keywords: ['液压', '压力', '波动', '滤芯'],
  },
]

const ROOT_CAUSE_CHAIN_FIXTURES: Record<string, { causes: string[]; solutions: string[]; checkpoints: string[] }> = {
  'sub-spindle-bearing-wear': {
    causes: ['主轴前轴承组早期剥落', '润滑油路局部堵塞'],
    solutions: ['更换主轴轴承并跑合验证', '清洗润滑回路并更换滤芯'],
    checkpoints: ['检查主轴润滑回路', '测量轴承预紧力'],
  },
}

const CHECKPOINT_LIST_FIXTURES: Record<string, Array<Record<string, unknown>>> = {
  'phen-spindle-temp-rise': [
    { step: 1, checkpointId: 'cp-lube-loop', name: '检查主轴润滑回路', method: '观察油窗、测压', safetyNote: '先执行停机挂牌', priority: 1 },
    { step: 2, checkpointId: 'cp-bearing-preload', name: '测量轴承预紧力', method: '使用振动与温升联动复测', safetyNote: '确认主轴完全停稳', priority: 2 },
    { step: 3, checkpointId: 'cp-runout', name: '复测主轴端面跳动', method: '千分表检测', safetyNote: '拆装刀具前确认防护罩关闭', priority: 3 },
  ],
}

function parseFunctionSignature(scriptContent: string): ParsedFunctionSignature {
  const match = scriptContent.match(/def\s+([A-Za-z_]\w*)\s*\(([\s\S]*?)\)\s*:/)
  if (!match) {
    return { functionName: null, params: [] }
  }

  const [, functionName, rawParams] = match
  const parts: string[] = []
  let current = ''
  let bracketDepth = 0

  for (const char of rawParams) {
    if (char === '[' || char === '(' || char === '{') bracketDepth += 1
    if (char === ']' || char === ')' || char === '}') bracketDepth = Math.max(bracketDepth - 1, 0)
    if (char === ',' && bracketDepth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current.trim()) {
    parts.push(current)
  }

  const params = parts
    .map(item => item.trim())
    .filter(Boolean)
    .map((item) => {
      const beforeDefault = item.split('=')[0]?.trim() ?? item
      const beforeType = beforeDefault.split(':')[0]?.trim() ?? beforeDefault
      return beforeType.replace(/^\*+/, '')
    })
    .filter(param => param && param !== 'self')

  return { functionName, params }
}

function normalizeFunctionInput(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('运行入参必须是 JSON 对象，例如 {"key":"value"}')
  }
  return value as Record<string, unknown>
}

function getFunctionRunErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message) || fallback
  }
  return fallback
}

function roundNumber(value: number, digits: number = 2): number {
  return Number(value.toFixed(digits))
}

function buildProjectFunctionContext(project: ProjectDetail) {
  return {
    projectName: project.name,
    documentCount: project.documents.length,
    dataSourceCount: project.dataSources.length,
    entityTypeCount: project.schemaConfig.entityTypes.length,
    relationTypeCount: project.schemaConfig.relationTypes.length,
  }
}

function buildFunctionPreviewInput(fn: Pick<FunctionDefinition, 'name' | 'scriptContent'>): Record<string, unknown> {
  const { functionName, params } = parseFunctionSignature(fn.scriptContent)
  if (functionName && DEFAULT_FUNCTION_RUN_INPUT[functionName]) {
    return cloneProjectData(DEFAULT_FUNCTION_RUN_INPUT[functionName])
  }
  if (DEFAULT_FUNCTION_RUN_INPUT[fn.name]) {
    return cloneProjectData(DEFAULT_FUNCTION_RUN_INPUT[fn.name])
  }
  return Object.fromEntries(params.map(param => [param, '']))
}

function executeSeededFunctionHandler(
  functionName: string,
  input: Record<string, unknown>,
): { output: unknown; logLines: string[] } | null {
  if (functionName === 'calc_daily_sales_velocity') {
    const orderRows = Array.isArray(input.order_rows) ? input.order_rows as Array<Record<string, unknown>> : []
    const historyWindowDays = Number(input.history_window_days ?? 14) || 14
    const totalQty = orderRows.reduce((sum, row) => sum + Number(row.sales_qty ?? 0), 0)
    const velocity = roundNumber(totalQty / Math.max(historyWindowDays, 1))
    const level = velocity >= 4 ? 'high' : velocity >= 1 ? 'base' : 'pause'
    return {
      output: { dailySalesVelocity: velocity, storeLevel: level, historyWindowDays },
      logLines: [`汇总订单行 ${orderRows.length} 条`, `销量合计 ${totalQty}`, `店铺分层 ${level}`],
    }
  }

  if (functionName === 'calc_target_stock_gap') {
    const dailySalesVelocity = Number(input.daily_sales_velocity ?? 0)
    const coverageDays = Number(input.coverage_days ?? 0)
    const onHandQty = Number(input.on_hand_qty ?? 0)
    const inTransitQty = Number(input.in_transit_qty ?? 0)
    const targetStock = Math.round(dailySalesVelocity * coverageDays)
    const currentStock = Math.max(onHandQty, 0) + Math.max(inTransitQty, 0)
    return {
      output: { targetStock, currentStock, gapQty: Math.max(targetStock - currentStock, 0) },
      logLines: [`目标覆盖天数 ${coverageDays}`, `当前可用库存 ${currentStock}`],
    }
  }

  if (functionName === 'split_qty_by_size_curve') {
    const totalQty = Number(input.total_qty ?? 0)
    const sizeCurve = typeof input.size_curve === 'object' && input.size_curve && !Array.isArray(input.size_curve)
      ? input.size_curve as Record<string, number>
      : {}
    const result: Record<string, unknown> = {}
    let allocated = 0
    Object.entries(sizeCurve).forEach(([size, ratio]) => {
      const qty = Math.floor(totalQty * Number(ratio ?? 0))
      result[size] = qty
      allocated += qty
    })
    result._allocated = allocated
    result._remain = Math.max(totalQty - allocated, 0)
    return {
      output: result,
      logLines: [`总补货量 ${totalQty}`, `拆分尺码 ${Object.keys(sizeCurve).length} 个`],
    }
  }

  if (functionName === 'allocate_limited_inventory') {
    const storeDemands = Array.isArray(input.store_demands) ? input.store_demands as Array<Record<string, unknown>> : []
    let remain = Math.max(Number(input.allocatable_qty ?? 0), 0)
    const ordered = [...storeDemands].sort((left, right) => {
      const leftScore = Number(left.priorityScore ?? 0) * 100 + Number(left.dailySalesVelocity ?? 0)
      const rightScore = Number(right.priorityScore ?? 0) * 100 + Number(right.dailySalesVelocity ?? 0)
      return rightScore - leftScore
    })
    const allocations = ordered.map((item) => {
      const demand = Math.max(Number(item.gapQty ?? 0), 0)
      const allocatedQty = Math.min(demand, remain)
      remain -= allocatedQty
      return {
        ...item,
        allocatedQty,
        fillRate: demand > 0 ? roundNumber(allocatedQty / demand) : 1,
      }
    })
    return {
      output: { allocations, remainQty: remain },
      logLines: [`待分配门店 ${ordered.length} 家`, `剩余库存 ${remain}`],
    }
  }

  if (functionName === 'build_transfer_order_payload') {
    const allocations = Array.isArray(input.allocations) ? input.allocations as Array<Record<string, unknown>> : []
    const planNo = String(input.plan_no ?? '')
    const sourceWarehouse = String(input.source_warehouse ?? '')
    const arrivalDate = String(input.arrival_date ?? '')
    return {
      output: allocations.map((item, index) => ({
        poNo: `PO-${planNo}-${String(index + 1).padStart(3, '0')}`,
        planNo,
        sourceWarehouse,
        targetStore: item.storeCode,
        allocatedQty: Number(item.allocatedQty ?? 0),
        sizeBreakdown: item.sizeBreakdown ?? {},
        expectedArrivalDate: arrivalDate,
      })),
      logLines: [`生成调拨明细 ${allocations.length} 条`, `来源仓 ${sourceWarehouse || '未填写'}`],
    }
  }

  if (functionName === 'retrieve_fault_symptoms') {
    const alarmCode = String(input.alarm_code ?? '').toLowerCase()
    const symptomSummary = String(input.symptom_summary ?? '').toLowerCase()
    const trendSnapshot = typeof input.trend_snapshot === 'object' && input.trend_snapshot && !Array.isArray(input.trend_snapshot)
      ? input.trend_snapshot as Record<string, unknown>
      : {}
    const scored = FAULT_SYMPTOM_CANDIDATES
      .map((candidate) => {
        let score = 0
        const haystack = `${candidate.label} ${candidate.description} ${candidate.keywords.join(' ')}`.toLowerCase()
        if (alarmCode && haystack.includes(alarmCode)) score += 0.45
        if (symptomSummary && candidate.keywords.some(keyword => symptomSummary.includes(keyword.toLowerCase()))) score += 0.35
        if (Object.keys(trendSnapshot).length > 0) score += 0.2
        return { id: candidate.id, label: candidate.label, score: roundNumber(score) }
      })
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5)
    return {
      output: scored,
      logLines: [`候选现象 ${scored.length} 条`, `趋势特征字段 ${Object.keys(trendSnapshot).length} 个`],
    }
  }

  if (functionName === 'trace_root_cause_chain') {
    const subPhenomenonId = String(input.sub_phenomenon_id ?? '')
    const fixture = ROOT_CAUSE_CHAIN_FIXTURES[subPhenomenonId] ?? {
      causes: ['未命中预置根因链路'],
      solutions: ['建议补充关系映射后重试'],
      checkpoints: ['核查 caused_by / solved_by / needs_check 关系'],
    }
    return {
      output: fixture,
      logLines: [`子现象 ID: ${subPhenomenonId || '未填写'}`, `返回根因 ${fixture.causes.length} 个`],
    }
  }

  if (functionName === 'build_checkpoint_list') {
    const phenomenonId = String(input.phenomenon_id ?? '')
    const items = CHECKPOINT_LIST_FIXTURES[phenomenonId] ?? []
    return {
      output: items,
      logLines: [`现象 ID: ${phenomenonId || '未填写'}`, `检查项 ${items.length} 个`],
    }
  }

  if (functionName === 'evaluate_maintenance_priority') {
    const weights: Record<string, number> = { CRITICAL: 1, HIGH: 0.85, MEDIUM: 0.6, LOW: 0.3 }
    const severity = String(input.severity ?? 'MEDIUM').toUpperCase()
    const severityScore = weights[severity] ?? 0.5
    const equipmentCriticality = Number(input.equipment_criticality ?? 0)
    const downtimeImpact = Number(input.downtime_impact ?? 0)
    const safetyRisk = Number(input.safety_risk ?? 0)
    const score = severityScore * 0.4 + equipmentCriticality * 0.25 + downtimeImpact * 0.2 + safetyRisk * 0.15
    const priority = score >= 0.8 ? 'P1' : score >= 0.6 ? 'P2' : 'P3'
    return {
      output: { priority, score: roundNumber(score, 3) },
      logLines: [`严重度 ${severity}`, `综合评分 ${roundNumber(score, 3)}`],
    }
  }

  if (functionName === 'decide_recovery_readiness') {
    const vibrationRms = Number(input.vibration_rms ?? 0)
    const spindleTempRise = Number(input.spindle_temp_rise ?? 0)
    const testCutPassed = Boolean(input.test_cut_passed)
    const ready = vibrationRms <= 2.8 && spindleTempRise <= 18 && testCutPassed
    return {
      output: {
        ready,
        decision: ready ? 'PASS' : 'RECHECK',
        nextAction: ready ? 'close_work_order' : 'reopen_diagnostic_flow',
      },
      logLines: [`振动 ${vibrationRms}`, `温升 ${spindleTempRise}`, `试切结果 ${testCutPassed ? '通过' : '失败'}`],
    }
  }

  return null
}

export function getProjectFunctionInputTemplate(
  fn: Pick<FunctionDefinition, 'name' | 'scriptContent'>,
): Record<string, unknown> {
  return buildFunctionPreviewInput(fn)
}

export async function runProjectFunction(
  projectId: string,
  functionId: string,
  payload?: { input?: Record<string, unknown>; scriptContent?: string; name?: string },
): Promise<ProjectFunctionRunResult> {
  const { project } = findProject(projectId)
  const storedFunction = project.functions.find(item => item.id === functionId)
  if (!storedFunction) throw new Error(`函数不存在：${functionId}`)

  const functionNameFromScript = parseFunctionSignature(payload?.scriptContent ?? storedFunction.scriptContent).functionName
  const effectiveFunctionName = functionNameFromScript || payload?.name || storedFunction.name
  const input = normalizeFunctionInput(payload?.input)
  const executedAt = new Date().toISOString()
  const startMs = Date.now()

  try {
    await delay(rand(700, 1400))

    const handled = functionNameFromScript
      ? executeSeededFunctionHandler(functionNameFromScript, input)
      : null
    const durationMs = Date.now() - startMs

    if (handled) {
      return {
        functionId,
        functionName: effectiveFunctionName,
        status: 'SUCCESS',
        mode: 'HANDLER',
        input: cloneProjectData(input),
        output: cloneProjectData(handled.output),
        logLines: handled.logLines,
        executedAt,
        durationMs,
      }
    }

    const signature = parseFunctionSignature(payload?.scriptContent ?? storedFunction.scriptContent)
    if (!signature.functionName) {
      throw new Error('当前脚本未识别到 Python def 定义，无法生成运行预览')
    }

    const missingParams = signature.params.filter(param => !(param in input))
    return {
      functionId,
      functionName: effectiveFunctionName,
      status: 'SUCCESS',
      mode: 'PREVIEW',
      input: cloneProjectData(input),
      output: {
        note: '当前函数尚未配置专用 mock 执行器，已返回静态预览结果。',
        receivedInput: cloneProjectData(input),
        missingParams,
        projectContext: buildProjectFunctionContext(project),
      },
      logLines: [
        `解析函数 ${signature.functionName}(${signature.params.join(', ')})`,
        missingParams.length > 0 ? `缺少参数: ${missingParams.join(', ')}` : '入参完整',
        '执行模式: 预览',
      ],
      executedAt,
      durationMs: Date.now() - startMs,
    }
  } catch (error: unknown) {
    return {
      functionId,
      functionName: effectiveFunctionName,
      status: 'FAILED',
      mode: 'PREVIEW',
      input: cloneProjectData(input),
      logLines: ['执行失败'],
      errorMessage: getFunctionRunErrorMessage(error, '运行失败'),
      executedAt,
      durationMs: Date.now() - startMs,
    }
  }
}

export async function createProjectFunction(
  projectId: string,
  payload: { name: string; description?: string; scriptContent: string; status?: FunctionStatus },
): Promise<FunctionDefinition> {
  return mutateProject(projectId, (project) => {
    const fn: FunctionDefinition = {
      id: createLocalId('fn'),
      name: payload.name,
      description: payload.description,
      scriptContent: payload.scriptContent,
      status: payload.status ?? 'DRAFT',
    }
    project.functions.unshift(fn)
    touchProject(project)
    return cloneProjectData(fn)
  })
}

export async function setFunctionStatus(
  projectId: string, functionId: string, status: FunctionStatus,
): Promise<void> {
  mutateProject(projectId, (project) => {
    const fn = project.functions.find(item => item.id === functionId)
    if (!fn) throw new Error(`函数不存在：${functionId}`)
    fn.status = status
    touchProject(project)
  })
}

export async function updateProjectFunction(
  projectId: string, functionId: string,
  payload: { name: string; description?: string; scriptContent: string },
): Promise<FunctionDefinition> {
  return mutateProject(projectId, (project) => {
    const fn = project.functions.find(item => item.id === functionId)
    if (!fn) throw new Error(`函数不存在：${functionId}`)
    fn.name = payload.name
    fn.description = payload.description
    fn.scriptContent = payload.scriptContent
    touchProject(project)
    return cloneProjectData(fn)
  })
}

export async function deleteProjectFunction(projectId: string, functionId: string): Promise<void> {
  mutateProject(projectId, (project) => {
    project.functions = project.functions.filter(item => item.id !== functionId)
    touchProject(project)
  })
}
