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

/** 当默认数据结构变化时递增此值，触发内存种子迁移 */
const DATA_VERSION = 23

interface ProjectStore {
  projects: ProjectDetail[]
  idSeq: number
  _v?: number
}

let inMemoryProjectStore: ProjectStore | null = null

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
  'proj-2421': {
    ProductSku: ['Nike Air Max 270-黑色-42', 'Belle云感通勤鞋-米白-37', 'Adidas Samba OG-白绿-38', 'On Cloudmonster-灰橙-41'],
    FulfillmentNode: ['华东上海闵行中心仓', '上海南京东路旗舰店', '上海五角场万达店', '前置仓-静安寺商圈', '退货翻新中心-青浦'],
    InventorySnapshot: ['库存快照-闵行仓-2026-03-11', '库存快照-南京东路店-2026-03-11', '库存快照-五角场店-2026-03-11', '库存快照-前置仓-2026-03-11'],
    ChannelOrder: ['订单#O2O-20260311-001', '订单#APP-20260311-028', '订单#小程序-20260311-043', '订单#门店云店-20260311-065'],
    Reservation: ['预占单#RSV-20260311-001', '预占单#RSV-20260311-014', '预占单#RSV-20260311-029', '预占单#RSV-20260311-051'],
    TransferTask: ['调拨任务#TF-20260311-001', '调拨任务#TF-20260311-009', '同城补货任务#TF-20260311-015', '门店返仓任务#TF-20260311-021'],
    FulfillmentPolicy: ['门店优先自提策略', '同城2小时达策略', '缺货跨店履约策略', '滞销库存优先出清策略'],
    FulfillmentDecision: ['履约决策#FD-20260311-001', '履约决策#FD-20260311-012', '履约决策#FD-20260311-020', '履约决策#FD-20260311-033'],
  },
  'proj-2522': {
    Member: ['会员ID:U100238', '会员ID:U100562', '会员ID:U100879', '会员ID:U101024', '会员ID:U101388'],
    MembershipTier: ['黑金会员', '铂金会员', '金卡会员', '银卡会员'],
    ChannelTouchpoint: ['小程序商城', '企业微信社群', 'APP Push', '门店导购企业微信', '短信触达'],
    ConsumptionEvent: ['2026-03-08女鞋复购订单', '2026-03-09换季外套加购订单', '2026-03-10到店核销订单', '2026-03-10直播间成交订单'],
    PreferenceTag: ['高频复购', '价格敏感', '偏好运动鞋', '偏好晚间推送', '关注满减活动'],
    CouponAsset: ['春季满300减50券', 'VIP专属95折券', '门店到店礼券', '生日双倍积分券'],
    LifeCycleSegment: ['高价值活跃会员', '沉睡待唤醒会员', '新品潜力会员', '流失预警会员'],
    CampaignTask: ['春季新品精准推送任务', '沉睡会员唤醒任务', '生日关怀任务', '满减活动召回任务'],
  },
  'proj-5612': {
    Regulation: ['个人信息保护法', '数据安全法', '欧盟GDPR', '网络安全法', '标准合同条款(SCC)'],
    Regulator: ['国家网信办', '欧盟数据保护委员会', '市场监管总局', '工业和信息化部'],
    ComplianceObligation: ['取得单独同意', '开展个人信息保护影响评估', '建立最小必要处理机制', '保留审计日志', '设置跨境传输评估门槛'],
    DataProcessingActivity: ['用户画像营销', '跨境客服工单同步', '员工考勤信息处理', '广告投放归因分析', '海外CRM客户数据同步'],
    ContractClause: ['跨境数据传输条款', '数据留存期限条款', '第三方分包处理条款', '用户授权营销条款', '个人敏感信息处理条款'],
    PenaltyCase: ['某电商App超范围收集处罚案', '某SaaS厂商未履行删除义务处罚案', '某出海业务未完成评估被责令整改', '某广告平台默认勾选授权被处罚案'],
  },
  'proj-1523': {
    Customer: ['宁德时代-华东工厂', '比亚迪-焊装事业部', '上汽大众-总装工厂', '立讯精密-连接器产线', '美的集团-空调事业部'],
    Account: ['重点战略客户', '区域KA客户', '年度框架客户', '高增长客户'],
    ContactChannel: ['企业微信', '服务热线', '现场拜访', '邮件订阅', '售后工单系统'],
    Interaction: ['季度经营回顾会', '新品方案演示', '售后升级沟通', '价格谈判会', '联合创新工作坊'],
    Opportunity: ['设备预测性维护升级包', '工业视觉质检方案', 'WMS与MES协同改造', '售后备件托管服务'],
    ServiceTicket: ['SR-202603-001', 'SR-202603-018', 'SR-202603-027', 'SR-202603-043'],
    PreferenceTag: ['偏好现场驻场支持', '偏好按产线维度报价', '关注售后响应速度', '关注交付稳定性', '关注ROI闭环'],
    CustomerSegment: ['战略大客户', '增长型客户', '高服务敏感客户', '交叉销售机会客户'],
  },
  'proj-1524': {
    ContractTemplate: ['设备采购主协议', '年度框架采购合同', '售后维保服务协议', '联合研发保密协议'],
    ContractClause: ['违约赔偿条款', '交付验收条款', '质保与售后条款', '付款与账期条款', '知识产权归属条款'],
    ComplianceRequirement: ['不得设置单方免责', '必须约定数据保密责任', '关键节点需保留审计痕迹', '高风险条款需法审会签'],
    RiskScenario: ['逾期交付赔付风险', '验收标准不清风险', '回款账期过长风险', '知识产权归属争议风险'],
    ApprovalCheckpoint: ['销售经理初审', '法务专员复核', '风控经理复核', '总监级审批'],
    Obligation: ['7日内完成交付', '30日内支付尾款', '质保期内4小时响应', '涉密资料不得外传'],
    Counterparty: ['宁德时代采购中心', '比亚迪设备工程部', '上汽大众采购管理部', '立讯精密自动化事业群'],
    FulfillmentEvent: ['样机交付完成', '终验签署完成', '首付款到账', '售后升级响应'],
  },
  'proj-1312': {
    WorkOrder: ['MO-20260311-001', 'MO-20260311-018', 'MO-20260311-032', 'MO-20260311-047'],
    ProcessStep: ['焊装点焊', '总装拧紧', '涂装烘干', '终检下线'],
    MachineResource: ['线体A-焊装单元01', '线体B-总装工位12', '涂装炉区HF-03', '终检工位QC-06'],
    ShiftCalendar: ['白班-2026-03-11', '中班-2026-03-11', '夜班-2026-03-11', '周末加班班次'],
    OperatorSkill: ['焊装高级操作证', '总装多能工', '涂装炉温调参资格', '终检放行授权'],
    ConstraintRule: ['插单优先级规则', '换型冻结窗口', '关键设备维护约束', '夜班禁排高风险工序'],
    SchedulePlan: ['排产计划#2026W11-A', '插单重排计划#20260311-1', '夜班补产计划#20260311-N', '瓶颈工位均衡计划#03'],
    DispatchTask: ['派工单#A-001', '派工单#A-018', '派工单#B-006', '派工单#N-009'],
  },
  'proj-1416': {
    Supplier: ['宁波舜宇精密结构件', '苏州汇川电驱系统', '无锡先导传感科技', '深圳拓普连接器', '常州瑞安铝压铸'],
    MaterialCategory: ['电机控制器', '线束总成', '铝合金压铸件', '高精密传感器', '滚珠丝杠模组'],
    Plant: ['上海总装工厂', '常州动力总成工厂', '合肥焊装工厂', '武汉零部件中心'],
    DeliveryPerformance: ['2026年2月OTD评分卡', '华东区域供应稳定性评分', 'Q1加急交付履约记录', '关键物料交付健康看板'],
    QualityIssue: ['IQC-202603-018', '8D-来料尺寸偏差-031', 'PPM异常批次#20260309', '焊点虚焊来料升级单'],
    FinancialRisk: ['现金流预警-2026Q1', '负债率升高-2026M02', '诉讼风险提示-2026Q1', '授信收紧风险提示'],
    ComplianceCertificate: ['IATF 16949', 'ISO 14001', 'RoHS符合性声明', 'VDA 6.3过程审核A级'],
    SupplierSegment: ['战略供方', '核心供方', '条件供方', '观察名单'],
  },
  'proj-1418': {
    Material: ['高精密轴承6208', '伺服驱动器A12', '减速机总成R80', '工业线束W-09', '压力传感器PS-7'],
    Warehouse: ['华东中心仓', '常州备件仓', '武汉零部件仓', '上海产线超市'],
    PlantDemand: ['上海总装本周需求', '常州动力总成紧急需求', '武汉焊装日需求计划', '华东售后备件补货需求'],
    InventorySnapshot: ['库存快照-2026-03-11', '在途库存快照-2026-03-11', '呆滞库存快照-2026-03-11', '超储库存快照-2026-03-11'],
    RiskSignal: ['缺货风险预警', '超储风险预警', '单一供方断供风险', '交期拉长风险'],
    SafetyStockPolicy: ['A类关键件安全库存策略', '进口件高波动安全库存策略', '售后备件保供策略', '瓶颈工位防断料策略'],
    ReplenishmentRecommendation: ['补货建议单#IR-001', '调拨建议单#IR-002', '紧急采购建议单#IR-003', '降库存处置建议单#IR-004'],
    SupplierOption: ['宁波舜宇精密结构件', '苏州汇川电驱系统', '深圳拓普连接器', '无锡先导传感科技'],
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

const LEGAL_REGULATIONS_PROJECT_ID = 'proj-5612'
const LEGAL_REGULATIONS_PROJECT_NAME = '法律法规库本体'
const LEGAL_REGULATIONS_UPDATED_AT = '2026-03-11T09:20:00.000Z'
const LEGAL_REGULATIONS_DESCRIPTION =
  '通用业务 · 风险与合规领域法律法规知识库本体，覆盖法律法规、监管机构、合规义务、数据处理活动、合同条款、处罚案例与跨境传输要求；支持合同审查、隐私合规评估与政策适配。'

const LEGAL_REGULATIONS_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-lr-001',
    name: '个人信息保护法适用条款与企业责任清单.docx',
    fileType: 'docx',
    size: 186240,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-03T09:00:00.000Z',
  },
  {
    id: 'doc-lr-002',
    name: '数据安全法与重要数据分类分级映射说明.xlsx',
    fileType: 'xlsx',
    size: 228416,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-03T14:30:00.000Z',
  },
  {
    id: 'doc-lr-003',
    name: '欧盟GDPR核心义务与跨境传输约束.md',
    fileType: 'md',
    size: 96420,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-04T10:15:00.000Z',
  },
  {
    id: 'doc-lr-004',
    name: '网络安全法与等保2.0合规检查清单.xlsx',
    fileType: 'xlsx',
    size: 204800,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-05T11:20:00.000Z',
  },
  {
    id: 'doc-lr-005',
    name: '标准合同条款(SCC)与出境评估要点.md',
    fileType: 'md',
    size: 88576,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-06T09:40:00.000Z',
  },
  {
    id: 'doc-lr-006',
    name: 'SaaS主协议与数据处理协议审查样本.jsonl',
    fileType: 'jsonl',
    size: 64218,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-07T15:10:00.000Z',
  },
  {
    id: 'doc-lr-007',
    name: '广告法与用户授权营销限制案例库.docx',
    fileType: 'docx',
    size: 143360,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-08T13:00:00.000Z',
  },
  {
    id: 'doc-lr-008',
    name: '监管处罚案例与高频违规条款复盘.xlsx',
    fileType: 'xlsx',
    size: 196608,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-10T16:20:00.000Z',
  },
]

const LEGAL_REGULATIONS_ENTITY_TYPES: EntityTypeConfig[] = [
  {
    id: 'et-lr-001',
    name: 'Regulation',
    description: '法律、行政法规、部门规章或行业监管制度等规范性文件。',
    properties: [
      { id: 'ep-lr-001', name: 'name', displayName: '法规名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-lr-002', name: 'jurisdiction', displayName: '适用法域', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-lr-003', name: 'effectiveDate', displayName: '生效日期', dataType: 'DATE', required: false, sortOrder: 3 },
      { id: 'ep-lr-004', name: 'topic', displayName: '主题领域', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-lr-002',
    name: 'Regulator',
    description: '监管机构或发布解释、处罚决定的主管部门。',
    properties: [
      { id: 'ep-lr-011', name: 'name', displayName: '机构名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-lr-012', name: 'region', displayName: '监管区域', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-lr-013', name: 'authorityType', displayName: '监管类型', dataType: 'STRING', required: false, sortOrder: 3 },
    ],
  },
  {
    id: 'et-lr-003',
    name: 'ComplianceObligation',
    description: '法规对企业提出的具体义务，如告知同意、最小必要、审计留痕等。',
    properties: [
      { id: 'ep-lr-021', name: 'title', displayName: '义务名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-lr-022', name: 'riskLevel', displayName: '风险等级', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-lr-023', name: 'controlPoint', displayName: '控制点', dataType: 'TEXT', required: false, sortOrder: 3 },
      { id: 'ep-lr-024', name: 'articleRef', displayName: '条款引用', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-lr-004',
    name: 'DataProcessingActivity',
    description: '企业中的数据处理活动，如营销画像、跨境同步、客服工单处理等。',
    properties: [
      { id: 'ep-lr-031', name: 'name', displayName: '活动名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-lr-032', name: 'dataCategory', displayName: '数据类别', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-lr-033', name: 'crossBorder', displayName: '是否跨境', dataType: 'BOOLEAN', required: false, sortOrder: 3 },
      { id: 'ep-lr-034', name: 'purpose', displayName: '处理目的', dataType: 'TEXT', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-lr-005',
    name: 'ContractClause',
    description: '合同、隐私政策、数据处理协议中的关键条款。',
    properties: [
      { id: 'ep-lr-041', name: 'clauseTitle', displayName: '条款标题', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-lr-042', name: 'clauseType', displayName: '条款类型', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-lr-043', name: 'reviewStatus', displayName: '审查状态', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-lr-044', name: 'riskNote', displayName: '风险说明', dataType: 'TEXT', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-lr-006',
    name: 'PenaltyCase',
    description: '监管处罚、责令整改或公开通报案例。',
    properties: [
      { id: 'ep-lr-051', name: 'caseTitle', displayName: '案例标题', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-lr-052', name: 'decisionDate', displayName: '处罚日期', dataType: 'DATE', required: false, sortOrder: 2 },
      { id: 'ep-lr-053', name: 'penaltyResult', displayName: '处罚结果', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-lr-054', name: 'amount', displayName: '处罚金额', dataType: 'FLOAT', required: false, sortOrder: 4 },
    ],
  },
]

const LEGAL_REGULATIONS_RELATION_TYPES: RelationTypeConfig[] = [
  { id: 'rt-lr-001', name: 'issued_by', domain: 'Regulation', range: 'Regulator', description: '法规由特定监管机构发布或解释。', properties: [] },
  { id: 'rt-lr-002', name: 'imposes_obligation', domain: 'Regulation', range: 'ComplianceObligation', description: '法规定义企业需满足的义务要求。', properties: [] },
  { id: 'rt-lr-003', name: 'governs_activity', domain: 'ComplianceObligation', range: 'DataProcessingActivity', description: '合规义务约束对应的数据处理活动。', properties: [] },
  { id: 'rt-lr-004', name: 'constrains_clause', domain: 'Regulation', range: 'ContractClause', description: '法规约束合同和政策条款的写法。', properties: [] },
  { id: 'rt-lr-005', name: 'requires_clause', domain: 'ComplianceObligation', range: 'ContractClause', description: '合规义务要求在合同中明确体现。', properties: [] },
  { id: 'rt-lr-006', name: 'violated_in', domain: 'ComplianceObligation', range: 'PenaltyCase', description: '处罚案例反映特定义务被违反。', properties: [] },
]

const LEGAL_REGULATIONS_SKILLS: SkillConfig[] = [
  { id: 'sk-lr-001', code: 'data_processing', name: '法规条款归档', enabled: true, prompt: '将法律法规、处罚案例和制度文本清洗为法规-条款-义务结构化视图', source: 'built_in', tags: ['legal', 'etl', 'compliance'] },
  { id: 'sk-lr-002', code: 'graph_synthesis', name: '合规知识融合', enabled: true, prompt: '融合监管机构、法规条款、义务要求、数据处理活动和合同条款，形成可审查图谱', source: 'built_in', tags: ['legal', 'graph'] },
  { id: 'sk-lr-003', code: 'custom', name: '合同风险审查编排', enabled: true, prompt: '针对 SaaS 主协议、DPA 和隐私政策自动识别高风险条款和缺失义务', source: 'built_in', tags: ['contract', 'review'] },
]

const LEGAL_REGULATIONS_AI_INSIGHT_RUN: AiInsightRun = {
  id: 'ai-lr-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T09:00:00.000Z',
  completedAt: '2026-03-10T09:08:00.000Z',
  scannedDocumentCount: 8,
  addedEntityCount: 6,
  addedRelationCount: 6,
  addedEntityNames: ['Regulation', 'Regulator', 'ComplianceObligation', 'DataProcessingActivity', 'ContractClause', 'PenaltyCase'],
  addedRelationNames: ['issued_by', 'imposes_obligation', 'governs_activity', 'constrains_clause', 'requires_clause', 'violated_in'],
  warnings: [],
  stage: '完成',
  currentDocument: 'SaaS主协议与数据处理协议审查样本.jsonl',
  logs: [
    '扫描 8 份法规条款、制度说明、处罚案例和合同审查样本',
    '补齐 Regulation、Regulator、ComplianceObligation、DataProcessingActivity、ContractClause、PenaltyCase 六类法务合规实体',
    '建立法规发布、义务约束、处理活动适用、合同审查和处罚追溯六条关键关系链路',
  ],
}

const LEGAL_REGULATIONS_RUNS: ExtractionRun[] = [
  {
    id: 'run-lr-001',
    status: 'COMPLETED',
    progress: 100,
    createdAt: '2026-03-07T10:00:00.000Z',
    completedAt: '2026-03-07T10:09:00.000Z',
    candidateEntityCount: 38,
    candidateRelationCount: 29,
    pendingReviewCount: 0,
    stage: '完成',
    currentDocument: '个人信息保护法适用条款与企业责任清单.docx',
    logs: [
      '抽取国内隐私与数据安全法规、监管机构及基础义务要求',
      '识别法规实体 18 个、监管机构 6 个、义务和处理活动实体 14 个',
      '形成法规到义务、义务到处理活动的基础合规链路',
    ],
    warnings: [],
    reviewItems: [
      { id: 'ri-lr-001', kind: 'ENTITY', title: '个人信息保护法 (Regulation)', evidence: '个人信息保护法适用条款与企业责任清单.docx', confidence: 0.99, status: 'APPROVED' },
      { id: 'ri-lr-002', kind: 'ENTITY', title: '国家网信办 (Regulator)', evidence: '个人信息保护法适用条款与企业责任清单.docx', confidence: 0.98, status: 'APPROVED' },
      { id: 'ri-lr-003', kind: 'ENTITY', title: '取得单独同意 (ComplianceObligation)', evidence: '个人信息保护法适用条款与企业责任清单.docx', confidence: 0.98, status: 'APPROVED' },
      { id: 'ri-lr-004', kind: 'ENTITY', title: '用户画像营销 (DataProcessingActivity)', evidence: '欧盟GDPR核心义务与跨境传输约束.md', confidence: 0.97, status: 'APPROVED' },
      { id: 'ri-lr-005', kind: 'RELATION', title: '个人信息保护法 (Regulation) → imposes_obligation → 取得单独同意 (ComplianceObligation)', evidence: '法规条款关系', confidence: 0.98, status: 'APPROVED' },
      { id: 'ri-lr-006', kind: 'RELATION', title: '取得单独同意 (ComplianceObligation) → governs_activity → 用户画像营销 (DataProcessingActivity)', evidence: '法规条款关系', confidence: 0.97, status: 'APPROVED' },
    ],
  },
  {
    id: 'run-lr-002',
    status: 'COMPLETED',
    progress: 100,
    createdAt: '2026-03-10T10:00:00.000Z',
    completedAt: '2026-03-10T10:12:00.000Z',
    candidateEntityCount: 52,
    candidateRelationCount: 44,
    pendingReviewCount: 0,
    stage: '完成',
    currentDocument: 'SaaS主协议与数据处理协议审查样本.jsonl',
    logs: [
      '在基础法规图谱上增量抽取 SaaS 合同、DPA、SCC 及监管处罚案例',
      '识别跨境传输、数据留存、第三方分包和营销授权四类高风险合同条款',
      '生成法律法规库候选实体 52 个、关系 44 条，支撑合同审查和跨境合规评估',
    ],
    warnings: [],
    reviewItems: [
      { id: 'ri-lr-101', kind: 'ENTITY', title: '欧盟GDPR (Regulation)', evidence: '欧盟GDPR核心义务与跨境传输约束.md', confidence: 0.99, status: 'APPROVED' },
      { id: 'ri-lr-102', kind: 'ENTITY', title: '标准合同条款(SCC) (Regulation)', evidence: '标准合同条款(SCC)与出境评估要点.md', confidence: 0.98, status: 'APPROVED' },
      { id: 'ri-lr-103', kind: 'ENTITY', title: '开展个人信息保护影响评估 (ComplianceObligation)', evidence: 'SaaS主协议与数据处理协议审查样本.jsonl', confidence: 0.97, status: 'APPROVED' },
      { id: 'ri-lr-104', kind: 'ENTITY', title: '跨境客服工单同步 (DataProcessingActivity)', evidence: 'SaaS主协议与数据处理协议审查样本.jsonl', confidence: 0.97, status: 'APPROVED' },
      { id: 'ri-lr-105', kind: 'ENTITY', title: '跨境数据传输条款 (ContractClause)', evidence: 'SaaS主协议与数据处理协议审查样本.jsonl', confidence: 0.98, status: 'APPROVED' },
      { id: 'ri-lr-106', kind: 'ENTITY', title: '某出海业务未完成评估被责令整改 (PenaltyCase)', evidence: '监管处罚案例与高频违规条款复盘.xlsx', confidence: 0.96, status: 'APPROVED' },
      { id: 'ri-lr-107', kind: 'RELATION', title: '欧盟GDPR (Regulation) → imposes_obligation → 开展个人信息保护影响评估 (ComplianceObligation)', evidence: '法规条款关系', confidence: 0.98, status: 'APPROVED' },
      { id: 'ri-lr-108', kind: 'RELATION', title: '开展个人信息保护影响评估 (ComplianceObligation) → governs_activity → 跨境客服工单同步 (DataProcessingActivity)', evidence: '法规条款关系', confidence: 0.97, status: 'APPROVED' },
      { id: 'ri-lr-109', kind: 'RELATION', title: '标准合同条款(SCC) (Regulation) → constrains_clause → 跨境数据传输条款 (ContractClause)', evidence: '合同条款关系', confidence: 0.97, status: 'APPROVED' },
      { id: 'ri-lr-110', kind: 'RELATION', title: '开展个人信息保护影响评估 (ComplianceObligation) → violated_in → 某出海业务未完成评估被责令整改 (PenaltyCase)', evidence: '处罚案例关系', confidence: 0.96, status: 'APPROVED' },
    ],
  },
]

const LEGAL_REGULATIONS_VERSIONS: OntologyVersion[] = [
  {
    id: 'ver-lr-001',
    version: 'v1.0',
    label: '基础法规义务图谱',
    createdAt: '2026-03-07T10:15:00.000Z',
    sourceRunId: 'run-lr-001',
    entityCount: 38,
    relationCount: 29,
  },
  {
    id: 'ver-lr-002',
    version: 'v1.1',
    label: '合同审查与跨境合规增强版',
    createdAt: '2026-03-10T10:20:00.000Z',
    sourceRunId: 'run-lr-002',
    entityCount: 52,
    relationCount: 44,
  },
]

const CUSTOMER_360_PROJECT_ID = 'proj-1523'
const CUSTOMER_360_PROJECT_NAME = '客户360本体'
const CUSTOMER_360_UPDATED_AT = '2026-03-11T10:20:00.000Z'
const CUSTOMER_360_DESCRIPTION =
  '制造业 · 销售与客户经营领域客户360本体，覆盖客户、集团账户、触达渠道、互动事件、商机、服务工单、偏好标签与客户分层；支持客户洞察、商机推进、售后协同与精准营销。'

const CUSTOMER_360_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-c360-001',
    name: '客户360业务本体模型说明书.docx',
    fileType: 'docx',
    size: 214528,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-02T09:00:00.000Z',
  },
  {
    id: 'doc-c360-002',
    name: 'CRM客户主数据与集团账户映射规范.xlsx',
    fileType: 'xlsx',
    size: 245760,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-03T10:30:00.000Z',
  },
  {
    id: 'doc-c360-003',
    name: '售前触达与商机推进节点定义.md',
    fileType: 'md',
    size: 101376,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-04T11:00:00.000Z',
  },
  {
    id: 'doc-c360-004',
    name: '售后服务工单与满意度回访样本.jsonl',
    fileType: 'jsonl',
    size: 68224,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-05T14:20:00.000Z',
  },
  {
    id: 'doc-c360-005',
    name: '客户标签体系与分层运营规则.xlsx',
    fileType: 'xlsx',
    size: 198656,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-06T09:40:00.000Z',
  },
  {
    id: 'doc-c360-006',
    name: '客户互动时间线与经营例会模板.docx',
    fileType: 'docx',
    size: 176128,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-07T15:00:00.000Z',
  },
  {
    id: 'doc-c360-007',
    name: '客户成功预警指标与流失信号定义.md',
    fileType: 'md',
    size: 92768,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-08T13:10:00.000Z',
  },
  {
    id: 'doc-c360-008',
    name: '交叉销售机会识别训练样本.jsonl',
    fileType: 'jsonl',
    size: 74416,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-10T16:00:00.000Z',
  },
]

const CUSTOMER_360_DATA_SOURCES: StructuredDataSource[] = [
  {
    id: 'ds-c360-001',
    name: 'CRM客户主数据中心',
    type: 'POSTGRESQL',
    host: '10.18.12.21',
    port: 5432,
    database: 'crm_customer_center',
    username: 'crm_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['customer_master', 'account_hierarchy', 'contact_channels'],
    rowLimit: 180000,
    syncMode: 'FULL',
    incrementalColumn: '',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:20:00.000Z',
    lastError: '',
    createdAt: '2026-03-02T10:00:00.000Z',
    updatedAt: '2026-03-11T08:20:00.000Z',
  },
  {
    id: 'ds-c360-002',
    name: '客户互动事件分析库',
    type: 'CLICKHOUSE',
    host: '10.18.12.35',
    port: 8123,
    database: 'customer_engagement',
    username: 'event_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['interaction_events', 'campaign_touchpoints', 'meeting_minutes'],
    rowLimit: 260000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'event_time',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:28:00.000Z',
    lastError: '',
    createdAt: '2026-03-03T10:00:00.000Z',
    updatedAt: '2026-03-11T08:28:00.000Z',
  },
  {
    id: 'ds-c360-003',
    name: '服务工单与满意度反馈库',
    type: 'MYSQL',
    host: '10.18.12.42',
    port: 3306,
    database: 'customer_service',
    username: 'service_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['service_ticket', 'service_feedback', 'renewal_risk_signal'],
    rowLimit: 120000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'updated_at',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:35:00.000Z',
    lastError: '',
    createdAt: '2026-03-04T10:00:00.000Z',
    updatedAt: '2026-03-11T08:35:00.000Z',
  },
]

const CUSTOMER_360_ENTITY_TYPES: EntityTypeConfig[] = [
  {
    id: 'et-c360-001',
    name: 'Customer',
    description: '客户主体，可为企业、事业部、工厂或采购组织。',
    properties: [
      { id: 'ep-c360-001', name: 'customerCode', displayName: '客户编码', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-c360-002', name: 'customerName', displayName: '客户名称', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-c360-003', name: 'industry', displayName: '行业', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-c360-004', name: 'annualRevenueBand', displayName: '年营收区间', dataType: 'STRING', required: false, sortOrder: 4 },
      { id: 'ep-c360-005', name: 'healthScore', displayName: '客户健康分', dataType: 'FLOAT', required: false, sortOrder: 5 },
    ],
  },
  {
    id: 'et-c360-002',
    name: 'Account',
    description: '集团账户、区域账户或事业群账户，用于统一经营视图。',
    properties: [
      { id: 'ep-c360-011', name: 'accountName', displayName: '账户名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-c360-012', name: 'accountLevel', displayName: '账户级别', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-c360-013', name: 'ownerTeam', displayName: '负责团队', dataType: 'STRING', required: false, sortOrder: 3 },
    ],
  },
  {
    id: 'et-c360-003',
    name: 'ContactChannel',
    description: '客户触达和沟通渠道，例如热线、企业微信、现场拜访。',
    properties: [
      { id: 'ep-c360-021', name: 'channelType', displayName: '渠道类型', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-c360-022', name: 'reachability', displayName: '触达状态', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-c360-023', name: 'ownerRole', displayName: '渠道负责人', dataType: 'STRING', required: false, sortOrder: 3 },
    ],
  },
  {
    id: 'et-c360-004',
    name: 'Interaction',
    description: '客户互动事件，包括演示、拜访、回访、投诉沟通等。',
    properties: [
      { id: 'ep-c360-031', name: 'interactionType', displayName: '互动类型', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-c360-032', name: 'occurredAt', displayName: '发生时间', dataType: 'DATETIME', required: false, sortOrder: 2 },
      { id: 'ep-c360-033', name: 'sentiment', displayName: '客户情绪', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-c360-034', name: 'summary', displayName: '互动摘要', dataType: 'TEXT', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-c360-005',
    name: 'Opportunity',
    description: '销售商机、续约机会或交叉销售机会。',
    properties: [
      { id: 'ep-c360-041', name: 'opportunityName', displayName: '商机名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-c360-042', name: 'stage', displayName: '商机阶段', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-c360-043', name: 'amount', displayName: '预估金额', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-c360-044', name: 'expectedCloseDate', displayName: '预计关闭日期', dataType: 'DATE', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-c360-006',
    name: 'ServiceTicket',
    description: '客户服务工单、投诉单或升级处理记录。',
    properties: [
      { id: 'ep-c360-051', name: 'ticketNo', displayName: '工单号', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-c360-052', name: 'severity', displayName: '严重等级', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-c360-053', name: 'slaStatus', displayName: 'SLA状态', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-c360-054', name: 'csatScore', displayName: '满意度评分', dataType: 'FLOAT', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-c360-007',
    name: 'PreferenceTag',
    description: '客户标签和偏好，例如价格敏感、关注交付、偏好驻场支持。',
    properties: [
      { id: 'ep-c360-061', name: 'tagName', displayName: '标签名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-c360-062', name: 'tagGroup', displayName: '标签分组', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-c360-063', name: 'confidence', displayName: '置信度', dataType: 'FLOAT', required: false, sortOrder: 3 },
    ],
  },
  {
    id: 'et-c360-008',
    name: 'CustomerSegment',
    description: '客户分层，用于经营策略、资源分配和续约预警。',
    properties: [
      { id: 'ep-c360-071', name: 'segmentName', displayName: '分层名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-c360-072', name: 'lifecycleStage', displayName: '生命周期阶段', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-c360-073', name: 'strategy', displayName: '经营策略', dataType: 'TEXT', required: false, sortOrder: 3 },
    ],
  },
]

const CUSTOMER_360_RELATION_TYPES: RelationTypeConfig[] = [
  { id: 'rt-c360-001', name: 'associated_with_account', domain: 'Customer', range: 'Account', description: '客户归属到统一集团或区域账户。', properties: [] },
  { id: 'rt-c360-002', name: 'reachable_via', domain: 'Customer', range: 'ContactChannel', description: '客户可通过多种渠道触达。', properties: [] },
  { id: 'rt-c360-003', name: 'has_interaction', domain: 'Customer', range: 'Interaction', description: '客户在经营过程中产生的互动事件。', properties: [] },
  { id: 'rt-c360-004', name: 'creates_opportunity', domain: 'Customer', range: 'Opportunity', description: '客户沉淀或触发的商机。', properties: [] },
  { id: 'rt-c360-005', name: 'submits_ticket', domain: 'Customer', range: 'ServiceTicket', description: '客户提交的服务诉求或投诉工单。', properties: [] },
  { id: 'rt-c360-006', name: 'tagged_with_preference', domain: 'Customer', range: 'PreferenceTag', description: '客户画像标签和偏好信息。', properties: [] },
  { id: 'rt-c360-007', name: 'belongs_to_segment', domain: 'Customer', range: 'CustomerSegment', description: '客户所属经营分层。', properties: [] },
  { id: 'rt-c360-008', name: 'interaction_via_channel', domain: 'Interaction', range: 'ContactChannel', description: '互动发生的触达渠道。', properties: [] },
  { id: 'rt-c360-009', name: 'promotes_opportunity', domain: 'Interaction', range: 'Opportunity', description: '客户互动推动商机阶段前进。', properties: [] },
  { id: 'rt-c360-010', name: 'ticket_affects_segment', domain: 'ServiceTicket', range: 'CustomerSegment', description: '服务体验影响客户健康和分层。', properties: [] },
]

const CUSTOMER_360_SKILLS: SkillConfig[] = [
  { id: 'sk-c360-001', code: 'data_processing', name: '客户主数据整编', enabled: true, prompt: '统一 CRM、互动事件和服务工单中的客户主数据，构建客户唯一视图', source: 'built_in', tags: ['customer360', 'mdm'] },
  { id: 'sk-c360-002', code: 'graph_synthesis', name: '客户关系融合', enabled: true, prompt: '融合客户、账户、互动、商机和服务工单，生成客户360经营图谱', source: 'built_in', tags: ['customer360', 'graph'] },
  { id: 'sk-c360-003', code: 'custom', name: '客户经营策略编排', enabled: true, prompt: '根据客户分层、健康分和偏好标签输出续约、增购和售后协同建议', source: 'built_in', tags: ['customer360', 'playbook'] },
]

const CUSTOMER_360_AI_INSIGHT_RUN: AiInsightRun = {
  id: 'ai-c360-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-09T09:20:00.000Z',
  completedAt: '2026-03-09T09:28:00.000Z',
  scannedDocumentCount: 8,
  addedEntityCount: 8,
  addedRelationCount: 10,
  addedEntityNames: ['Customer', 'Account', 'ContactChannel', 'Interaction', 'Opportunity', 'ServiceTicket', 'PreferenceTag', 'CustomerSegment'],
  addedRelationNames: ['associated_with_account', 'reachable_via', 'has_interaction', 'creates_opportunity', 'submits_ticket', 'tagged_with_preference', 'belongs_to_segment', 'interaction_via_channel', 'promotes_opportunity', 'ticket_affects_segment'],
  warnings: [],
  stage: '完成',
  currentDocument: '客户360业务本体模型说明书.docx',
  logs: [
    '解析 8 份客户主数据、互动事件、服务工单与分层运营资料',
    '补齐 Customer、Account、ContactChannel、Interaction、Opportunity、ServiceTicket、PreferenceTag、CustomerSegment 八类经营实体',
    '形成客户归属、互动演进、服务反馈、偏好标签与分层策略十条关键关系链路',
  ],
}

const CUSTOMER_360_RUN: ExtractionRun = {
  id: 'run-c360-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-09T10:00:00.000Z',
  completedAt: '2026-03-09T10:14:00.000Z',
  candidateEntityCount: 76,
  candidateRelationCount: 58,
  pendingReviewCount: 0,
  stage: '完成',
  currentDocument: '交叉销售机会识别训练样本.jsonl',
  logs: [
    '抽取重点客户、集团账户、客户互动、工单回访和增购机会数据',
    '识别客户经营链路中的高频偏好标签、服务风险信号和交叉销售机会',
    '生成客户360候选实体 76 个、关系 58 条，用于销售、客户成功和服务协同',
  ],
  warnings: [],
  reviewItems: [
    { id: 'ri-c360-001', kind: 'ENTITY', title: '宁德时代-华东工厂 (Customer)', evidence: 'CRM客户主数据与集团账户映射规范.xlsx', confidence: 0.99, status: 'APPROVED' },
    { id: 'ri-c360-002', kind: 'ENTITY', title: '重点战略客户 (Account)', evidence: 'CRM客户主数据与集团账户映射规范.xlsx', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-c360-003', kind: 'ENTITY', title: '企业微信 (ContactChannel)', evidence: '客户互动时间线与经营例会模板.docx', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-c360-004', kind: 'ENTITY', title: '季度经营回顾会 (Interaction)', evidence: '客户互动时间线与经营例会模板.docx', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-c360-005', kind: 'ENTITY', title: '设备预测性维护升级包 (Opportunity)', evidence: '交叉销售机会识别训练样本.jsonl', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-c360-006', kind: 'ENTITY', title: 'SR-202603-001 (ServiceTicket)', evidence: '售后服务工单与满意度回访样本.jsonl', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-c360-007', kind: 'ENTITY', title: '关注售后响应速度 (PreferenceTag)', evidence: '客户标签体系与分层运营规则.xlsx', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-c360-008', kind: 'ENTITY', title: '战略大客户 (CustomerSegment)', evidence: '客户标签体系与分层运营规则.xlsx', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-c360-009', kind: 'RELATION', title: '宁德时代-华东工厂 (Customer) → associated_with_account → 重点战略客户 (Account)', evidence: '客户归属关系', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-c360-010', kind: 'RELATION', title: '宁德时代-华东工厂 (Customer) → reachable_via → 企业微信 (ContactChannel)', evidence: '触达渠道关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-c360-011', kind: 'RELATION', title: '宁德时代-华东工厂 (Customer) → has_interaction → 季度经营回顾会 (Interaction)', evidence: '互动时间线关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-c360-012', kind: 'RELATION', title: '季度经营回顾会 (Interaction) → promotes_opportunity → 设备预测性维护升级包 (Opportunity)', evidence: '商机推进关系', confidence: 0.96, status: 'APPROVED' },
  ],
}

const CUSTOMER_360_VERSION: OntologyVersion = {
  id: 'ver-c360-001',
  version: 'v1.1',
  label: '客户360经营洞察图谱',
  createdAt: '2026-03-09T10:20:00.000Z',
  sourceRunId: 'run-c360-001',
  entityCount: 76,
  relationCount: 58,
}

const CUSTOMER_360_ACTIONS: ActionDefinition[] = [
  {
    id: 'act-c360-001',
    name: 'refresh_customer_health_score',
    displayName: '刷新客户健康分',
    description: '根据近30日互动、工单、回款和商机推进情况重算客户健康分。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-c360-001',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-c360-001","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"customer.timeline.updated\\",\\"window\\":\\"30d\\"}"},{"functionId":"fn-c360-002","order":2,"triggerType":"EVENT","triggerConfig":"{\\"segmentRefresh\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_customer_review","notifyRole":"客户成功经理"}',
    parametersJson: '[{"name":"customerCode","displayName":"客户编码","dataType":"STRING","required":true},{"name":"interactionCount","displayName":"互动次数","dataType":"INTEGER","required":true},{"name":"openTicketCount","displayName":"未关闭工单数","dataType":"INTEGER","required":true},{"name":"opportunityStageScore","displayName":"商机推进分","dataType":"FLOAT","required":true}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"Customer","conditionJson":"{\\"when\\":\\"customerCode_present\\"}","propertyMappingsJson":"{\\"healthScore\\":\\"calculated_health_score\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"CustomerSegment","conditionJson":"{\\"when\\":\\"segmentRefresh == true\\"}","propertyMappingsJson":"{\\"from\\":\\"$customerCode\\",\\"relation\\":\\"belongs_to_segment\\",\\"to\\":\\"recommended_segment\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"customer_required","condition":"customerCode != \\"\\"","message":"客户编码不能为空"},{"name":"interaction_non_negative","condition":"interactionCount >= 0","message":"互动次数不能为负数"},{"name":"stage_score_range","condition":"opportunityStageScore >= 0 and opportunityStageScore <= 1","message":"商机推进分需在 0 到 1 之间"}]',
  },
  {
    id: 'act-c360-002',
    name: 'generate_key_account_playbook',
    displayName: '生成大客户经营策略',
    description: '结合客户偏好、工单满意度和商机进展，输出下一步经营动作建议。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-c360-008',
    triggerType: 'MANUAL',
    triggerConfigJson: '[{"functionId":"fn-c360-003","order":1,"triggerType":"MANUAL","triggerConfig":"{\\"entry\\":\\"workspace.button\\",\\"includeServiceSignals\\":true}"}]',
    exceptionPolicy: 'SKIP',
    exceptionConfigJson: '{"retainDraft":true,"fallback":"manual_account_planning","notifyRole":"区域销售总监"}',
    parametersJson: '[{"name":"customerCode","displayName":"客户编码","dataType":"STRING","required":true},{"name":"segmentName","displayName":"分层名称","dataType":"STRING","required":true},{"name":"renewalRisk","displayName":"续约风险","dataType":"FLOAT","required":true},{"name":"crossSellPotential","displayName":"交叉销售潜力","dataType":"FLOAT","required":true}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"CustomerSegment","conditionJson":"{\\"when\\":\\"renewalRisk >= 0.6\\"}","propertyMappingsJson":"{\\"strategy\\":\\"retention_first\\"}","sortOrder":1},{"ruleType":"CREATE_OBJECT","target":"Interaction","conditionJson":"{\\"when\\":\\"crossSellPotential >= 0.7\\"}","propertyMappingsJson":"{\\"interactionType\\":\\"联合经营复盘\\",\\"summary\\":\\"推荐启动增购推进\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"customer_required","condition":"customerCode != \\"\\"","message":"客户编码不能为空"},{"name":"segment_required","condition":"segmentName != \\"\\"","message":"分层名称不能为空"},{"name":"risk_range","condition":"renewalRisk >= 0 and renewalRisk <= 1","message":"续约风险需在 0 到 1 之间"}]',
  },
  {
    id: 'act-c360-003',
    name: 'escalate_service_recovery',
    displayName: '升级服务补救闭环',
    description: '当工单严重度高或满意度过低时，自动升级客户补救动作并同步客户成功团队。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-c360-006',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-c360-004","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"ticket.closed\\",\\"csatThreshold\\":3.5}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":2,"fallback":"create_manual_recovery_task","notifyRole":"服务交付经理"}',
    parametersJson: '[{"name":"ticketNo","displayName":"工单号","dataType":"STRING","required":true},{"name":"severity","displayName":"严重等级","dataType":"STRING","required":true},{"name":"csatScore","displayName":"满意度评分","dataType":"FLOAT","required":true},{"name":"customerCode","displayName":"客户编码","dataType":"STRING","required":true}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"ServiceTicket","conditionJson":"{\\"when\\":\\"csatScore < 3.5\\"}","propertyMappingsJson":"{\\"slaStatus\\":\\"RECOVERY_REQUIRED\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"CustomerSegment","conditionJson":"{\\"when\\":\\"severity in [\\\\\\"HIGH\\\\\\",\\\\\\"CRITICAL\\\\\\"]\\"}","propertyMappingsJson":"{\\"from\\":\\"$ticketNo\\",\\"relation\\":\\"ticket_affects_segment\\",\\"to\\":\\"service_sensitive_segment\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"ticket_required","condition":"ticketNo != \\"\\"","message":"工单号不能为空"},{"name":"severity_range","condition":"severity in [\\"LOW\\",\\"MEDIUM\\",\\"HIGH\\",\\"CRITICAL\\"]","message":"严重等级仅支持 LOW/MEDIUM/HIGH/CRITICAL"},{"name":"csat_range","condition":"csatScore >= 0 and csatScore <= 5","message":"满意度评分需在 0 到 5 之间"}]',
  },
]

const CUSTOMER_360_FUNCTIONS: FunctionDefinition[] = [
  {
    id: 'fn-c360-001',
    name: '客户健康分计算',
    description: '根据互动活跃度、服务风险和商机推进分计算客户健康分。',
    scriptContent: 'def calc_customer_health_score(interaction_count: int, open_ticket_count: int, opportunity_stage_score: float, csat_score: float = 4.5):\n    """计算客户健康分。"""\n    engagement = min(max(interaction_count, 0) * 6, 40)\n    service_penalty = min(max(open_ticket_count, 0) * 8, 30)\n    opportunity = min(max(opportunity_stage_score, 0.0), 1.0) * 20\n    satisfaction = min(max(csat_score, 0.0), 5.0) * 2\n    score = round(max(0, min(100, 40 + engagement + opportunity + satisfaction - service_penalty)), 1)\n    return {"healthScore": score}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-c360-002',
    name: '客户分层推荐',
    description: '依据客户健康分、合同金额和互动深度推荐客户分层。',
    scriptContent: 'def recommend_customer_segment(health_score: float, contract_amount: float, interaction_depth: int):\n    """推荐客户分层。"""\n    if contract_amount >= 5000000 and health_score >= 75:\n        segment = "战略大客户"\n    elif health_score >= 65 and interaction_depth >= 3:\n        segment = "增长型客户"\n    elif health_score < 55:\n        segment = "高服务敏感客户"\n    else:\n        segment = "交叉销售机会客户"\n    return {"segmentName": segment}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-c360-003',
    name: '大客户经营策略生成',
    description: '输出客户续约保留、增购推进和高层拜访建议。',
    scriptContent: 'def build_account_playbook(segment_name: str, renewal_risk: float, cross_sell_potential: float, preference_tags: list[str]):\n    """生成客户经营策略。"""\n    actions = []\n    if renewal_risk >= 0.6:\n        actions.append("优先安排高层续约沟通和服务复盘")\n    if cross_sell_potential >= 0.7:\n        actions.append("发起交叉销售联合方案演示")\n    if "关注售后响应速度" in preference_tags:\n        actions.append("承诺关键工单升级SLA和专属服务群")\n    if not actions:\n        actions.append("维持季度经营回顾并持续观察")\n    return {"playbook": actions[:3]}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-c360-004',
    name: '服务补救优先级评估',
    description: '基于工单严重度、满意度和客户分层评估服务补救优先级。',
    scriptContent: 'def evaluate_service_recovery_priority(severity: str, csat_score: float, segment_name: str):\n    """评估服务补救优先级。"""\n    score = 0\n    if severity in ("HIGH", "CRITICAL"):\n        score += 50\n    if csat_score < 3.5:\n        score += 30\n    if segment_name == "战略大客户":\n        score += 20\n    priority = "P1" if score >= 70 else "P2" if score >= 40 else "P3"\n    return {"priority": priority, "score": score}',
    status: 'ACTIVE',
  },
]

const TASK_SCHEDULING_PROJECT_ID = 'proj-1312'
const TASK_SCHEDULING_PROJECT_NAME = '任务调度本体'
const TASK_SCHEDULING_UPDATED_AT = '2026-03-11T11:20:00.000Z'
const TASK_SCHEDULING_DESCRIPTION =
  '制造业 · 生产执行与动态排产领域任务调度本体，覆盖工单、工序、设备资源、班次日历、人员技能、约束规则、排程计划与派工任务；支持插单重排、瓶颈设备均衡、班次匹配和派工下发。'

const TASK_SCHEDULING_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-ts-001',
    name: '任务调度本体模型说明书.docx',
    fileType: 'docx',
    size: 208896,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-04T09:00:00.000Z',
  },
  {
    id: 'doc-ts-002',
    name: 'APS插单重排与优先级规则说明.xlsx',
    fileType: 'xlsx',
    size: 236544,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-05T10:20:00.000Z',
  },
  {
    id: 'doc-ts-003',
    name: '设备产能节拍与换型窗口配置.xlsx',
    fileType: 'xlsx',
    size: 184320,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-06T11:10:00.000Z',
  },
  {
    id: 'doc-ts-004',
    name: '班次日历与多能工技能矩阵.md',
    fileType: 'md',
    size: 94208,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-07T09:40:00.000Z',
  },
  {
    id: 'doc-ts-005',
    name: 'MES工单与工序静态样本-2026W11.jsonl',
    fileType: 'jsonl',
    size: 76312,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-08T14:00:00.000Z',
  },
  {
    id: 'doc-ts-006',
    name: '瓶颈工位负荷与产能平衡复盘报告.docx',
    fileType: 'docx',
    size: 173568,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-09T16:20:00.000Z',
  },
  {
    id: 'doc-ts-007',
    name: '紧急插单调度看板字段映射说明.md',
    fileType: 'md',
    size: 88192,
    status: 'READY',
    enabled: false,
    uploadedAt: '2026-03-10T13:15:00.000Z',
  },
  {
    id: 'doc-ts-008',
    name: '班次派工单回写与执行确认样本.jsonl',
    fileType: 'jsonl',
    size: 69248,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T08:35:00.000Z',
  },
]

const TASK_SCHEDULING_DATA_SOURCES: StructuredDataSource[] = [
  {
    id: 'ds-ts-001',
    name: 'MES工单与工艺路由中心',
    type: 'POSTGRESQL',
    host: '10.16.24.18',
    port: 5432,
    database: 'mes_production',
    schema: 'schedule',
    username: 'mes_reader',
    password: '',
    sslEnabled: true,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['work_order_header', 'process_route_step', 'insert_order_event'],
    rowLimit: 180000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'updated_at',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T09:00:00.000Z',
    lastError: '',
    createdAt: '2026-03-04T10:00:00.000Z',
    updatedAt: '2026-03-11T09:00:00.000Z',
  },
  {
    id: 'ds-ts-002',
    name: '设备节拍与运行状态库',
    type: 'CLICKHOUSE',
    host: '10.16.24.27',
    port: 8123,
    database: 'equipment_runtime',
    username: 'runtime_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['machine_capacity_snapshot', 'equipment_status_event', 'changeover_window'],
    rowLimit: 260000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'snapshot_time',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T09:08:00.000Z',
    lastError: '',
    createdAt: '2026-03-04T10:10:00.000Z',
    updatedAt: '2026-03-11T09:08:00.000Z',
  },
  {
    id: 'ds-ts-003',
    name: '班次日历与人员技能库',
    type: 'MYSQL',
    host: '10.16.24.39',
    port: 3306,
    database: 'workforce_scheduler',
    username: 'ops_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['shift_calendar', 'operator_skill_matrix', 'dispatch_task_feedback'],
    rowLimit: 90000,
    syncMode: 'FULL',
    incrementalColumn: '',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T09:15:00.000Z',
    lastError: '',
    createdAt: '2026-03-04T10:20:00.000Z',
    updatedAt: '2026-03-11T09:15:00.000Z',
  },
]

const TASK_SCHEDULING_ENTITY_TYPES: EntityTypeConfig[] = [
  {
    id: 'et-ts-001',
    name: 'WorkOrder',
    description: '生产工单实体，承载订单紧急度、交期、数量和重排优先级。',
    dataSourceId: 'ds-ts-001',
    mappedTable: 'work_order_header',
    properties: [
      { id: 'ep-ts-001', name: 'workOrderNo', displayName: '工单号', dataType: 'STRING', required: true, mappedColumn: 'work_order_no', searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-ts-002', name: 'productCode', displayName: '产品编码', dataType: 'STRING', required: true, mappedColumn: 'product_code', searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-ts-003', name: 'priorityLevel', displayName: '优先级', dataType: 'STRING', required: true, defaultValue: 'NORMAL', mappedColumn: 'priority_level', searchable: true, sortable: true, sortOrder: 3 },
      { id: 'ep-ts-004', name: 'dueAt', displayName: '交期', dataType: 'DATETIME', required: true, mappedColumn: 'due_at', searchable: false, sortable: true, sortOrder: 4 },
      { id: 'ep-ts-005', name: 'plannedQty', displayName: '计划数量', dataType: 'INTEGER', required: true, mappedColumn: 'planned_qty', searchable: false, sortable: true, sortOrder: 5 },
      { id: 'ep-ts-006', name: 'insertOrderFlag', displayName: '是否插单', dataType: 'BOOLEAN', required: false, defaultValue: 'false', mappedColumn: 'insert_order_flag', searchable: true, sortable: true, sortOrder: 6 },
    ],
  },
  {
    id: 'et-ts-002',
    name: 'ProcessStep',
    description: '工单拆解后的工序步骤，包含节拍、前后约束和工艺要求。',
    dataSourceId: 'ds-ts-001',
    mappedTable: 'process_route_step',
    properties: [
      { id: 'ep-ts-011', name: 'stepCode', displayName: '工序编码', dataType: 'STRING', required: true, mappedColumn: 'step_code', searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-ts-012', name: 'stepName', displayName: '工序名称', dataType: 'STRING', required: true, mappedColumn: 'step_name', searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-ts-013', name: 'cycleSeconds', displayName: '标准节拍(秒)', dataType: 'INTEGER', required: true, mappedColumn: 'cycle_seconds', searchable: false, sortable: true, sortOrder: 3 },
      { id: 'ep-ts-014', name: 'setupMinutes', displayName: '换型时长(分钟)', dataType: 'INTEGER', required: false, mappedColumn: 'setup_minutes', searchable: false, sortable: true, sortOrder: 4 },
      { id: 'ep-ts-015', name: 'riskLevel', displayName: '工序风险等级', dataType: 'STRING', required: false, mappedColumn: 'risk_level', searchable: true, sortable: true, sortOrder: 5 },
    ],
  },
  {
    id: 'et-ts-003',
    name: 'MachineResource',
    description: '可执行工序的设备资源，沉淀产能、状态与换型窗口。',
    dataSourceId: 'ds-ts-002',
    mappedTable: 'machine_capacity_snapshot',
    properties: [
      { id: 'ep-ts-021', name: 'machineCode', displayName: '设备编码', dataType: 'STRING', required: true, mappedColumn: 'machine_code', searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-ts-022', name: 'machineName', displayName: '设备名称', dataType: 'STRING', required: true, mappedColumn: 'machine_name', searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-ts-023', name: 'lineCode', displayName: '产线编码', dataType: 'STRING', required: true, mappedColumn: 'line_code', searchable: true, sortable: true, sortOrder: 3 },
      { id: 'ep-ts-024', name: 'hourCapacity', displayName: '小时产能', dataType: 'FLOAT', required: true, mappedColumn: 'hour_capacity', searchable: false, sortable: true, sortOrder: 4 },
      { id: 'ep-ts-025', name: 'status', displayName: '设备状态', dataType: 'STRING', required: true, mappedColumn: 'status', searchable: true, sortable: true, sortOrder: 5 },
      { id: 'ep-ts-026', name: 'changeoverWindow', displayName: '换型窗口', dataType: 'STRING', required: false, mappedColumn: 'changeover_window', searchable: true, sortable: true, sortOrder: 6 },
    ],
  },
  {
    id: 'et-ts-004',
    name: 'ShiftCalendar',
    description: '可排产班次日历，记录班次类型、可用工时和是否允许加班。',
    dataSourceId: 'ds-ts-003',
    mappedTable: 'shift_calendar',
    properties: [
      { id: 'ep-ts-031', name: 'shiftCode', displayName: '班次编码', dataType: 'STRING', required: true, mappedColumn: 'shift_code', searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-ts-032', name: 'shiftDate', displayName: '班次日期', dataType: 'DATE', required: true, mappedColumn: 'shift_date', searchable: false, sortable: true, sortOrder: 2 },
      { id: 'ep-ts-033', name: 'shiftType', displayName: '班次类型', dataType: 'STRING', required: true, mappedColumn: 'shift_type', searchable: true, sortable: true, sortOrder: 3 },
      { id: 'ep-ts-034', name: 'availableHours', displayName: '可用工时', dataType: 'FLOAT', required: true, mappedColumn: 'available_hours', searchable: false, sortable: true, sortOrder: 4 },
      { id: 'ep-ts-035', name: 'overtimeAllowed', displayName: '允许加班', dataType: 'BOOLEAN', required: false, mappedColumn: 'overtime_allowed', searchable: true, sortable: true, sortOrder: 5 },
    ],
  },
  {
    id: 'et-ts-005',
    name: 'OperatorSkill',
    description: '岗位与技能资格矩阵，用于判断工序在特定班次是否可执行。',
    dataSourceId: 'ds-ts-003',
    mappedTable: 'operator_skill_matrix',
    properties: [
      { id: 'ep-ts-041', name: 'skillCode', displayName: '技能编码', dataType: 'STRING', required: true, mappedColumn: 'skill_code', searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-ts-042', name: 'skillName', displayName: '技能名称', dataType: 'STRING', required: true, mappedColumn: 'skill_name', searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-ts-043', name: 'skillLevel', displayName: '技能等级', dataType: 'STRING', required: false, mappedColumn: 'skill_level', searchable: true, sortable: true, sortOrder: 3 },
      { id: 'ep-ts-044', name: 'certExpiryDate', displayName: '证书到期日', dataType: 'DATE', required: false, mappedColumn: 'cert_expiry_date', searchable: false, sortable: true, sortOrder: 4 },
    ],
  },
  {
    id: 'et-ts-006',
    name: 'ConstraintRule',
    description: '排产和重排时使用的业务约束规则，如插单优先、冻结窗口和夜班限制。',
    properties: [
      { id: 'ep-ts-051', name: 'ruleCode', displayName: '规则编码', dataType: 'STRING', required: true, searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-ts-052', name: 'ruleType', displayName: '规则类型', dataType: 'STRING', required: true, searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-ts-053', name: 'ruleWeight', displayName: '规则权重', dataType: 'FLOAT', required: true, defaultValue: '1', searchable: false, sortable: true, sortOrder: 3 },
      { id: 'ep-ts-054', name: 'ruleExpression', displayName: '规则表达式', dataType: 'TEXT', required: true, searchable: false, sortable: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-ts-007',
    name: 'SchedulePlan',
    description: '排程输出结果，沉淀设备分配、班次占用、排序结果和重排原因。',
    properties: [
      { id: 'ep-ts-061', name: 'planNo', displayName: '计划编号', dataType: 'STRING', required: true, searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-ts-062', name: 'planVersion', displayName: '计划版本', dataType: 'STRING', required: true, defaultValue: 'v1', searchable: true, sortable: true, sortOrder: 2 },
      { id: 'ep-ts-063', name: 'scheduleStatus', displayName: '计划状态', dataType: 'STRING', required: true, defaultValue: 'DRAFT', searchable: true, sortable: true, sortOrder: 3 },
      { id: 'ep-ts-064', name: 'rescheduleReason', displayName: '重排原因', dataType: 'TEXT', required: false, searchable: true, sortable: false, sortOrder: 4 },
      { id: 'ep-ts-065', name: 'objectiveScore', displayName: '目标得分', dataType: 'FLOAT', required: false, searchable: false, sortable: true, sortOrder: 5 },
    ],
  },
  {
    id: 'et-ts-008',
    name: 'DispatchTask',
    description: '下发到班组或设备的派工指令，记录开工时间、执行状态和回写结果。',
    properties: [
      { id: 'ep-ts-071', name: 'dispatchNo', displayName: '派工单号', dataType: 'STRING', required: true, searchable: true, sortable: true, sortOrder: 1 },
      { id: 'ep-ts-072', name: 'plannedStartAt', displayName: '计划开工时间', dataType: 'DATETIME', required: true, searchable: false, sortable: true, sortOrder: 2 },
      { id: 'ep-ts-073', name: 'plannedEndAt', displayName: '计划完工时间', dataType: 'DATETIME', required: true, searchable: false, sortable: true, sortOrder: 3 },
      { id: 'ep-ts-074', name: 'dispatchStatus', displayName: '派工状态', dataType: 'STRING', required: true, defaultValue: 'PENDING', searchable: true, sortable: true, sortOrder: 4 },
      { id: 'ep-ts-075', name: 'feedbackSummary', displayName: '执行反馈', dataType: 'TEXT', required: false, searchable: true, sortable: false, sortOrder: 5 },
    ],
  },
]

const TASK_SCHEDULING_RELATION_TYPES: RelationTypeConfig[] = [
  { id: 'rt-ts-001', name: 'has_process_step', domain: 'WorkOrder', range: 'ProcessStep', description: '工单由多个工序步骤组成。', properties: [] },
  { id: 'rt-ts-002', name: 'requires_machine', domain: 'ProcessStep', range: 'MachineResource', description: '工序可在满足条件的设备资源上执行。', properties: [] },
  { id: 'rt-ts-003', name: 'requires_skill', domain: 'ProcessStep', range: 'OperatorSkill', description: '工序执行所需的岗位技能或资格。', properties: [] },
  { id: 'rt-ts-004', name: 'constrained_by', domain: 'WorkOrder', range: 'ConstraintRule', description: '工单受业务约束规则限制。', properties: [] },
  { id: 'rt-ts-005', name: 'included_in_plan', domain: 'WorkOrder', range: 'SchedulePlan', description: '工单被纳入某一版排程计划。', properties: [] },
  { id: 'rt-ts-006', name: 'allocates_machine', domain: 'SchedulePlan', range: 'MachineResource', description: '排程计划为工单分配设备资源。', properties: [] },
  { id: 'rt-ts-007', name: 'scheduled_on_shift', domain: 'SchedulePlan', range: 'ShiftCalendar', description: '排程计划占用具体班次日历。', properties: [] },
  { id: 'rt-ts-008', name: 'issues_dispatch_task', domain: 'SchedulePlan', range: 'DispatchTask', description: '排程计划生成派工任务并下发执行。', properties: [] },
  { id: 'rt-ts-009', name: 'handled_by_skill', domain: 'DispatchTask', range: 'OperatorSkill', description: '派工任务要求具备相应技能的人员执行。', properties: [] },
  { id: 'rt-ts-010', name: 'available_in_shift', domain: 'MachineResource', range: 'ShiftCalendar', description: '设备在特定班次具备可用产能。', properties: [] },
  { id: 'rt-ts-011', name: 'limits_machine', domain: 'ConstraintRule', range: 'MachineResource', description: '约束规则限制特定设备或设备组的可用窗口。', properties: [] },
]

const TASK_SCHEDULING_SKILLS: SkillConfig[] = [
  { id: 'sk-ts-001', code: 'data_processing', name: '排产主数据整编', enabled: true, prompt: '统一 MES 工单、工艺路由、设备状态和班次日历，形成任务调度可用语义视图', source: 'built_in', tags: ['schedule', 'mes', 'etl'] },
  { id: 'sk-ts-002', code: 'graph_synthesis', name: '约束排程图谱融合', enabled: true, prompt: '融合工单、工序、设备、班次、技能和约束规则，构建可重排的排产关系图谱', source: 'built_in', tags: ['schedule', 'graph', 'constraint'] },
  { id: 'sk-ts-003', code: 'custom', name: '插单重排编排', enabled: true, prompt: '根据紧急度、交期、换型损失和班次能力执行插单重排，并生成派工单与解释原因', source: 'built_in', tags: ['schedule', 'reschedule', 'dispatch'] },
]

const TASK_SCHEDULING_AI_INSIGHT_RUN: AiInsightRun = {
  id: 'ai-ts-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T09:20:00.000Z',
  completedAt: '2026-03-10T09:28:00.000Z',
  scannedDocumentCount: 8,
  addedEntityCount: 8,
  addedRelationCount: 11,
  addedEntityNames: ['WorkOrder', 'ProcessStep', 'MachineResource', 'ShiftCalendar', 'OperatorSkill', 'ConstraintRule', 'SchedulePlan', 'DispatchTask'],
  addedRelationNames: ['has_process_step', 'requires_machine', 'requires_skill', 'constrained_by', 'included_in_plan', 'allocates_machine', 'scheduled_on_shift', 'issues_dispatch_task', 'handled_by_skill', 'available_in_shift', 'limits_machine'],
  warnings: [],
  stage: '完成',
  currentDocument: '任务调度本体模型说明书.docx',
  logs: [
    '扫描 8 份 APS、MES、班次规则与设备产能文档',
    '补齐 WorkOrder、ProcessStep、MachineResource、ShiftCalendar、OperatorSkill、ConstraintRule、SchedulePlan、DispatchTask 八类专业调度实体',
    '建立工单-工序-设备-班次-派工闭环的 11 条关键关系链路，用于动态排产和插单重排',
  ],
}

const TASK_SCHEDULING_RUN: ExtractionRun = {
  id: 'run-ts-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T10:00:00.000Z',
  completedAt: '2026-03-10T10:14:00.000Z',
  candidateEntityCount: 72,
  candidateRelationCount: 60,
  pendingReviewCount: 0,
  stage: '完成',
  currentDocument: 'MES工单与工序静态样本-2026W11.jsonl',
  logs: [
    '抽取本周工单、工序路由、设备产能和班次技能样本，生成排产图谱候选',
    '识别插单、冻结窗口、瓶颈设备负荷和夜班限制等高频约束语义',
    '形成任务调度候选实体 72 个、关系 60 条，支撑动态重排和派工下发',
  ],
  warnings: [],
  reviewItems: [
    { id: 'ri-ts-001', kind: 'ENTITY', title: 'MO-20260311-001 (WorkOrder)', evidence: 'MES工单与工序静态样本-2026W11.jsonl', confidence: 0.99, status: 'APPROVED' },
    { id: 'ri-ts-002', kind: 'ENTITY', title: '焊装点焊 (ProcessStep)', evidence: 'APS插单重排与优先级规则说明.xlsx', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-ts-003', kind: 'ENTITY', title: '线体A-焊装单元01 (MachineResource)', evidence: '设备产能节拍与换型窗口配置.xlsx', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-ts-004', kind: 'ENTITY', title: '白班-2026-03-11 (ShiftCalendar)', evidence: '班次日历与多能工技能矩阵.md', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ts-005', kind: 'ENTITY', title: '焊装高级操作证 (OperatorSkill)', evidence: '班次日历与多能工技能矩阵.md', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ts-006', kind: 'ENTITY', title: '插单优先级规则 (ConstraintRule)', evidence: 'APS插单重排与优先级规则说明.xlsx', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-ts-007', kind: 'ENTITY', title: '插单重排计划#20260311-1 (SchedulePlan)', evidence: '瓶颈工位负荷与产能平衡复盘报告.docx', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ts-008', kind: 'ENTITY', title: '派工单#A-001 (DispatchTask)', evidence: '班次派工单回写与执行确认样本.jsonl', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-ts-009', kind: 'RELATION', title: 'MO-20260311-001 (WorkOrder) → has_process_step → 焊装点焊 (ProcessStep)', evidence: '工单工序关系', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-ts-010', kind: 'RELATION', title: '焊装点焊 (ProcessStep) → requires_machine → 线体A-焊装单元01 (MachineResource)', evidence: '工序设备关系', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-ts-011', kind: 'RELATION', title: '焊装点焊 (ProcessStep) → requires_skill → 焊装高级操作证 (OperatorSkill)', evidence: '工序技能关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ts-012', kind: 'RELATION', title: 'MO-20260311-001 (WorkOrder) → constrained_by → 插单优先级规则 (ConstraintRule)', evidence: '工单约束关系', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-ts-013', kind: 'RELATION', title: 'MO-20260311-001 (WorkOrder) → included_in_plan → 插单重排计划#20260311-1 (SchedulePlan)', evidence: '排程计划关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ts-014', kind: 'RELATION', title: '插单重排计划#20260311-1 (SchedulePlan) → allocates_machine → 线体A-焊装单元01 (MachineResource)', evidence: '计划资源分配关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ts-015', kind: 'RELATION', title: '插单重排计划#20260311-1 (SchedulePlan) → scheduled_on_shift → 白班-2026-03-11 (ShiftCalendar)', evidence: '计划班次关系', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-ts-016', kind: 'RELATION', title: '插单重排计划#20260311-1 (SchedulePlan) → issues_dispatch_task → 派工单#A-001 (DispatchTask)', evidence: '计划派工关系', confidence: 0.96, status: 'APPROVED' },
  ],
}

const TASK_SCHEDULING_VERSION: OntologyVersion = {
  id: 'ver-ts-001',
  version: 'v1.1',
  label: '动态排产与派工执行图谱',
  createdAt: '2026-03-10T10:20:00.000Z',
  sourceRunId: 'run-ts-001',
  entityCount: 72,
  relationCount: 60,
}

const TASK_SCHEDULING_ACTIONS: ActionDefinition[] = [
  {
    id: 'act-ts-001',
    name: 'evaluate_work_order_priority',
    displayName: '评估工单优先级',
    description: '根据紧急度、交期、客户等级和插单标记计算工单优先级分。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-ts-001',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-ts-001","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"work_order.created\\",\\"includeInsertOrder\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_priority_review","notifyRole":"生产计划员"}',
    parametersJson: '[{"name":"workOrderNo","displayName":"工单号","dataType":"STRING","required":true},{"name":"urgencyLevel","displayName":"紧急度","dataType":"STRING","required":true},{"name":"dueHours","displayName":"距交期小时数","dataType":"INTEGER","required":true},{"name":"customerLevel","displayName":"客户等级","dataType":"STRING","required":false},{"name":"insertOrderFlag","displayName":"是否插单","dataType":"BOOLEAN","required":false,"defaultValue":"false"}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"WorkOrder","conditionJson":"{\\"when\\":\\"workOrderNo_present\\"}","propertyMappingsJson":"{\\"priorityLevel\\":\\"calculated_priority\\",\\"insertOrderFlag\\":\\"$insertOrderFlag\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"ConstraintRule","conditionJson":"{\\"when\\":\\"insertOrderFlag == true\\"}","propertyMappingsJson":"{\\"from\\":\\"$workOrderNo\\",\\"relation\\":\\"constrained_by\\",\\"to\\":\\"insert_priority_rule\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"work_order_required","condition":"workOrderNo != \\"\\"","message":"工单号不能为空"},{"name":"urgency_required","condition":"urgencyLevel in [\\"LOW\\",\\"NORMAL\\",\\"HIGH\\",\\"CRITICAL\\"]","message":"紧急度仅支持 LOW/NORMAL/HIGH/CRITICAL"},{"name":"due_hours_non_negative","condition":"dueHours >= 0","message":"距交期小时数不能为负数"}]',
  },
  {
    id: 'act-ts-002',
    name: 'reschedule_insert_order',
    displayName: '执行插单重排',
    description: '当紧急插单进入产线时，综合设备产能、换型窗口与冻结区重新计算计划顺序。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-ts-007',
    triggerType: 'MANUAL',
    triggerConfigJson: '[{"functionId":"fn-ts-002","order":1,"triggerType":"MANUAL","triggerConfig":"{\\"entry\\":\\"workspace.button\\",\\"objective\\":\\"min_tardiness\\"}"},{"functionId":"fn-ts-003","order":2,"triggerType":"MANUAL","triggerConfig":"{\\"respectFrozenWindow\\":true,\\"allowOvertime\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":2,"fallback":"manual_schedule_board","notifyRole":"APS调度员"}',
    parametersJson: '[{"name":"planNo","displayName":"计划编号","dataType":"STRING","required":true},{"name":"insertWorkOrderNo","displayName":"插单工单号","dataType":"STRING","required":true},{"name":"frozenWindowMinutes","displayName":"冻结窗口(分钟)","dataType":"INTEGER","required":true,"defaultValue":"120"},{"name":"allowOvertime","displayName":"允许加班","dataType":"BOOLEAN","required":false,"defaultValue":"true"}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"SchedulePlan","conditionJson":"{\\"when\\":\\"planNo_present and insertWorkOrderNo_present\\"}","propertyMappingsJson":"{\\"planVersion\\":\\"next_version\\",\\"rescheduleReason\\":\\"insert_order\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"WorkOrder","conditionJson":"{\\"when\\":\\"insertWorkOrderNo_present\\"}","propertyMappingsJson":"{\\"from\\":\\"$insertWorkOrderNo\\",\\"relation\\":\\"included_in_plan\\",\\"to\\":\\"$planNo\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"plan_required","condition":"planNo != \\"\\"","message":"计划编号不能为空"},{"name":"insert_order_required","condition":"insertWorkOrderNo != \\"\\"","message":"插单工单号不能为空"},{"name":"frozen_window_range","condition":"frozenWindowMinutes >= 0 and frozenWindowMinutes <= 480","message":"冻结窗口需在 0 到 480 分钟之间"}]',
  },
  {
    id: 'act-ts-003',
    name: 'allocate_machine_shift',
    displayName: '分配设备与班次',
    description: '为排程计划匹配可执行设备和班次，避免设备停机窗口与技能不匹配。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-ts-007',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-ts-003","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"plan.rescheduled\\",\\"preferSameLine\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":2,"fallback":"manual_capacity_balancing","notifyRole":"车间调度长"}',
    parametersJson: '[{"name":"planNo","displayName":"计划编号","dataType":"STRING","required":true},{"name":"preferredLineCode","displayName":"优先产线","dataType":"STRING","required":false},{"name":"requiredSkill","displayName":"所需技能","dataType":"STRING","required":true},{"name":"allowNightShift","displayName":"允许夜班","dataType":"BOOLEAN","required":false,"defaultValue":"false"}]',
    rulesJson: '[{"ruleType":"CREATE_LINK","target":"MachineResource","conditionJson":"{\\"when\\":\\"planNo_present\\"}","propertyMappingsJson":"{\\"from\\":\\"$planNo\\",\\"relation\\":\\"allocates_machine\\",\\"to\\":\\"selected_machine\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"ShiftCalendar","conditionJson":"{\\"when\\":\\"selected_shift != null\\"}","propertyMappingsJson":"{\\"from\\":\\"$planNo\\",\\"relation\\":\\"scheduled_on_shift\\",\\"to\\":\\"selected_shift\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"plan_required","condition":"planNo != \\"\\"","message":"计划编号不能为空"},{"name":"skill_required","condition":"requiredSkill != \\"\\"","message":"所需技能不能为空"}]',
  },
  {
    id: 'act-ts-004',
    name: 'release_dispatch_task',
    displayName: '下发派工任务',
    description: '将已确认的排程计划转为派工任务并回写至执行系统。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-ts-008',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-ts-004","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"plan.confirmed\\",\\"syncToMes\\":true}"}]',
    exceptionPolicy: 'SKIP',
    exceptionConfigJson: '{"retainDraft":true,"fallback":"manual_dispatch_release","notifyRole":"班组长"}',
    parametersJson: '[{"name":"planNo","displayName":"计划编号","dataType":"STRING","required":true},{"name":"dispatchNo","displayName":"派工单号","dataType":"STRING","required":true},{"name":"plannedStartAt","displayName":"计划开工时间","dataType":"STRING","required":true},{"name":"plannedEndAt","displayName":"计划完工时间","dataType":"STRING","required":true}]',
    rulesJson: '[{"ruleType":"CREATE_OBJECT","target":"DispatchTask","conditionJson":"{\\"when\\":\\"dispatchNo_present\\"}","propertyMappingsJson":"{\\"dispatchNo\\":\\"$dispatchNo\\",\\"plannedStartAt\\":\\"$plannedStartAt\\",\\"plannedEndAt\\":\\"$plannedEndAt\\",\\"dispatchStatus\\":\\"RELEASED\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"DispatchTask","conditionJson":"{\\"when\\":\\"planNo_present and dispatchNo_present\\"}","propertyMappingsJson":"{\\"from\\":\\"$planNo\\",\\"relation\\":\\"issues_dispatch_task\\",\\"to\\":\\"$dispatchNo\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"plan_required","condition":"planNo != \\"\\"","message":"计划编号不能为空"},{"name":"dispatch_required","condition":"dispatchNo != \\"\\"","message":"派工单号不能为空"},{"name":"start_required","condition":"plannedStartAt != \\"\\"","message":"计划开工时间不能为空"},{"name":"end_required","condition":"plannedEndAt != \\"\\"","message":"计划完工时间不能为空"}]',
  },
]

const TASK_SCHEDULING_FUNCTIONS: FunctionDefinition[] = [
  {
    id: 'fn-ts-001',
    name: '工单优先级计算',
    description: '根据紧急度、交期压力、客户等级和插单标记输出优先级和评分。',
    scriptContent: 'def calc_work_order_priority(urgency_level: str, due_hours: int, customer_level: str = "B", insert_order_flag: bool = False):\n    """计算工单优先级。"""\n    urgency_weights = {"LOW": 10, "NORMAL": 25, "HIGH": 40, "CRITICAL": 55}\n    customer_bonus = {"A": 15, "B": 8, "C": 3}\n    due_score = 35 if due_hours <= 8 else 25 if due_hours <= 24 else 12 if due_hours <= 48 else 5\n    score = urgency_weights.get(urgency_level, 20) + due_score + customer_bonus.get(customer_level, 5) + (20 if insert_order_flag else 0)\n    priority = "P1" if score >= 85 else "P2" if score >= 60 else "P3"\n    return {"priorityLevel": priority, "score": score}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-ts-002',
    name: '插单重排模拟',
    description: '模拟插单进入后对现有计划的延误、换型损失和交期影响。',
    scriptContent: 'def simulate_insert_order(current_queue: list[dict], insert_order: dict, frozen_window_minutes: int = 120):\n    """模拟插单重排结果。"""\n    affected = []\n    tardiness_minutes = 0\n    for item in current_queue:\n        if item.get("locked_minutes", 0) >= frozen_window_minutes:\n            continue\n        shift = insert_order.get("cycle_minutes", 0)\n        tardiness_minutes += shift\n        affected.append({"workOrderNo": item.get("workOrderNo"), "delayMinutes": shift})\n    return {"affectedOrders": affected[:8], "estimatedTardinessMinutes": tardiness_minutes, "next_version": "auto-rescheduled"}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-ts-003',
    name: '设备班次匹配',
    description: '基于设备状态、班次可用工时、技能要求与夜班限制选择最优资源槽位。',
    scriptContent: 'def match_machine_shift_slot(machine_candidates: list[dict], shift_candidates: list[dict], required_skill: str, allow_night_shift: bool = False):\n    """匹配设备与班次。"""\n    valid_shifts = [shift for shift in shift_candidates if allow_night_shift or shift.get("shiftType") != "NIGHT"]\n    ranked = sorted(machine_candidates, key=lambda item: (item.get("status") != "RUNNING", -item.get("hourCapacity", 0)))\n    machine = ranked[0] if ranked else None\n    shift = valid_shifts[0] if valid_shifts else None\n    return {"selected_machine": machine.get("machineCode") if machine else None, "selected_shift": shift.get("shiftCode") if shift else None, "requiredSkill": required_skill}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-ts-004',
    name: '派工指令生成',
    description: '将排程结果转换为派工任务负载，输出给 MES 或班组看板。',
    scriptContent: 'def build_dispatch_payload(plan_no: str, machine_code: str, shift_code: str, work_orders: list[str], start_at: str, end_at: str):\n    """生成派工负载。"""\n    return {"planNo": plan_no, "dispatchTarget": {"machineCode": machine_code, "shiftCode": shift_code}, "workOrders": work_orders, "plannedStartAt": start_at, "plannedEndAt": end_at, "dispatchStatus": "RELEASED"}',
    status: 'ACTIVE',
  },
]

const OMNICHANNEL_INVENTORY_PROJECT_ID = 'proj-2421'
const OMNICHANNEL_INVENTORY_PROJECT_NAME = '全渠道库存本体'
const OMNICHANNEL_INVENTORY_UPDATED_AT = '2026-03-11T12:05:00.000Z'
const OMNICHANNEL_INVENTORY_DESCRIPTION =
  '零售业 · 门店与运营领域全渠道库存本体，覆盖商品SKU、履约节点、库存快照、渠道订单、库存预占、调拨任务、履约策略与履约决策；支持跨仓跨店库存可视、O2O履约分配、同城调拨与缺货兜底决策。'

const OMNICHANNEL_INVENTORY_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-oci-001',
    name: '全渠道库存本体模型说明书.docx',
    fileType: 'docx',
    size: 224256,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-03T09:05:00.000Z',
  },
  {
    id: 'doc-oci-002',
    name: 'OMS订单履约路由与库存口径.xlsx',
    fileType: 'xlsx',
    size: 259072,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-04T10:10:00.000Z',
  },
  {
    id: 'doc-oci-003',
    name: '门店仓-前置仓库存同步规则.md',
    fileType: 'md',
    size: 100352,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-05T10:55:00.000Z',
  },
  {
    id: 'doc-oci-004',
    name: '同城调拨与缺货兜底样本.jsonl',
    fileType: 'jsonl',
    size: 74240,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-06T14:05:00.000Z',
  },
  {
    id: 'doc-oci-005',
    name: 'BOPIS自提SLA与门店履约规则.xlsx',
    fileType: 'xlsx',
    size: 212992,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-07T09:30:00.000Z',
  },
  {
    id: 'doc-oci-006',
    name: '库存预占释放与超卖回滚SOP.docx',
    fileType: 'docx',
    size: 185344,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-08T13:10:00.000Z',
  },
  {
    id: 'doc-oci-007',
    name: '全渠道库存健康看板指标说明.md',
    fileType: 'md',
    size: 92160,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-09T15:00:00.000Z',
  },
  {
    id: 'doc-oci-008',
    name: '履约分单决策训练样本.jsonl',
    fileType: 'jsonl',
    size: 76800,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T08:58:00.000Z',
  },
  {
    id: 'doc-oci-009',
    name: '跨店库存共享与锁库优先级规则.xlsx',
    fileType: 'xlsx',
    size: 198656,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T15:10:00.000Z',
  },
  {
    id: 'doc-oci-010',
    name: '门店自提超时释放与补单处理案例.md',
    fileType: 'md',
    size: 86400,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T16:00:00.000Z',
  },
  {
    id: 'doc-oci-011',
    name: '同城急送节点容量与波峰阈值配置.xlsx',
    fileType: 'xlsx',
    size: 189440,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T16:25:00.000Z',
  },
  {
    id: 'doc-oci-012',
    name: '前置仓缺货回退至中心仓策略说明.md',
    fileType: 'md',
    size: 84224,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T16:40:00.000Z',
  },
  {
    id: 'doc-oci-013',
    name: '门店店发包装能力与截单时间清单.xlsx',
    fileType: 'xlsx',
    size: 176128,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T17:00:00.000Z',
  },
  {
    id: 'doc-oci-014',
    name: '超卖补偿券自动发放规则.jsonl',
    fileType: 'jsonl',
    size: 71296,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T17:18:00.000Z',
  },
  {
    id: 'doc-oci-015',
    name: '履约节点成本模型与线路报价表.xlsx',
    fileType: 'xlsx',
    size: 208896,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T17:35:00.000Z',
  },
  {
    id: 'doc-oci-016',
    name: '门店缺货替代推荐与拆单案例库.md',
    fileType: 'md',
    size: 90112,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T17:48:00.000Z',
  },
  {
    id: 'doc-oci-017',
    name: '区域波次调拨日历与优先级矩阵.xlsx',
    fileType: 'xlsx',
    size: 195584,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T18:05:00.000Z',
  },
  {
    id: 'doc-oci-018',
    name: 'BOPIS到店提醒与核销异常排查手册.docx',
    fileType: 'docx',
    size: 166912,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T18:20:00.000Z',
  },
]

const OMNICHANNEL_INVENTORY_DATA_SOURCES: StructuredDataSource[] = [
  {
    id: 'ds-oci-001',
    name: 'OMS订单与履约中心',
    type: 'POSTGRESQL',
    host: '10.24.18.20',
    port: 5432,
    database: 'retail_oms_center',
    username: 'oms_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['sales_order', 'order_fulfillment_plan', 'reservation_record'],
    rowLimit: 260000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'updated_at',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:12:00.000Z',
    lastError: '',
    createdAt: '2026-03-03T10:00:00.000Z',
    updatedAt: '2026-03-11T08:12:00.000Z',
  },
  {
    id: 'ds-oci-002',
    name: '门店仓与前置仓库存事件仓',
    type: 'CLICKHOUSE',
    host: '10.24.18.34',
    port: 8123,
    database: 'retail_inventory_event',
    username: 'inv_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['inventory_snapshot', 'store_stock_delta', 'transfer_execution_log'],
    rowLimit: 360000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'event_time',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:20:00.000Z',
    lastError: '',
    createdAt: '2026-03-04T10:00:00.000Z',
    updatedAt: '2026-03-11T08:20:00.000Z',
  },
  {
    id: 'ds-oci-003',
    name: '履约规则与SLA策略库',
    type: 'MYSQL',
    host: '10.24.18.46',
    port: 3306,
    database: 'retail_fulfillment_rule',
    username: 'rule_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['fulfillment_policy', 'bopis_sla_rule', 'node_capacity_snapshot'],
    rowLimit: 120000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'updated_at',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:29:00.000Z',
    lastError: '',
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-11T08:29:00.000Z',
  },
]

const OMNICHANNEL_INVENTORY_ENTITY_TYPES: EntityTypeConfig[] = [
  {
    id: 'et-oci-001',
    name: 'ProductSku',
    description: '全渠道统一管理的商品 SKU。',
    properties: [
      { id: 'ep-oci-001', name: 'skuCode', displayName: 'SKU编码', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-oci-002', name: 'productName', displayName: '商品名称', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-oci-003', name: 'category', displayName: '品类', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-oci-004', name: 'season', displayName: '季节', dataType: 'STRING', required: false, sortOrder: 4 },
      { id: 'ep-oci-005', name: 'sizeColor', displayName: '尺码颜色', dataType: 'STRING', required: false, sortOrder: 5 },
    ],
  },
  {
    id: 'et-oci-002',
    name: 'FulfillmentNode',
    description: '可承担履约的仓库、门店、前置仓或返修中心。',
    properties: [
      { id: 'ep-oci-011', name: 'nodeCode', displayName: '节点编码', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-oci-012', name: 'nodeType', displayName: '节点类型', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-oci-013', name: 'city', displayName: '城市', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-oci-014', name: 'pickupSupported', displayName: '支持自提', dataType: 'BOOLEAN', required: false, sortOrder: 4 },
      { id: 'ep-oci-015', name: 'sameDaySupported', displayName: '支持当日达', dataType: 'BOOLEAN', required: false, sortOrder: 5 },
    ],
  },
  {
    id: 'et-oci-003',
    name: 'InventorySnapshot',
    description: '节点级库存快照，记录现存、可售和锁定库存。',
    properties: [
      { id: 'ep-oci-021', name: 'snapshotTime', displayName: '快照时间', dataType: 'DATETIME', required: true, sortOrder: 1 },
      { id: 'ep-oci-022', name: 'onHandQty', displayName: '现存数量', dataType: 'FLOAT', required: true, sortOrder: 2 },
      { id: 'ep-oci-023', name: 'sellableQty', displayName: '可售数量', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-oci-024', name: 'reservedQty', displayName: '锁定数量', dataType: 'FLOAT', required: false, sortOrder: 4 },
      { id: 'ep-oci-025', name: 'accuracyScore', displayName: '库存准确率', dataType: 'FLOAT', required: false, sortOrder: 5 },
    ],
  },
  {
    id: 'et-oci-004',
    name: 'ChannelOrder',
    description: '来自 App、小程序、门店云店等渠道的订单。',
    properties: [
      { id: 'ep-oci-031', name: 'orderNo', displayName: '订单号', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-oci-032', name: 'channel', displayName: '订单渠道', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-oci-033', name: 'deliveryMode', displayName: '履约方式', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-oci-034', name: 'promisedHours', displayName: '承诺时效(小时)', dataType: 'INTEGER', required: false, sortOrder: 4 },
      { id: 'ep-oci-035', name: 'customerRegion', displayName: '客户区域', dataType: 'STRING', required: false, sortOrder: 5 },
    ],
  },
  {
    id: 'et-oci-005',
    name: 'Reservation',
    description: '订单对库存的预占和释放记录。',
    properties: [
      { id: 'ep-oci-041', name: 'reservationNo', displayName: '预占单号', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-oci-042', name: 'reservedQty', displayName: '预占数量', dataType: 'FLOAT', required: true, sortOrder: 2 },
      { id: 'ep-oci-043', name: 'status', displayName: '状态', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-oci-044', name: 'expiresAt', displayName: '失效时间', dataType: 'DATETIME', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-oci-006',
    name: 'TransferTask',
    description: '门店、仓库之间的补货、调拨或返仓任务。',
    properties: [
      { id: 'ep-oci-051', name: 'taskNo', displayName: '任务号', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-oci-052', name: 'taskType', displayName: '任务类型', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-oci-053', name: 'plannedQty', displayName: '计划数量', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-oci-054', name: 'etaHours', displayName: '预计到达时效', dataType: 'INTEGER', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-oci-007',
    name: 'FulfillmentPolicy',
    description: '履约分单、库存兜底和 SLA 约束规则。',
    properties: [
      { id: 'ep-oci-061', name: 'policyName', displayName: '策略名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-oci-062', name: 'policyType', displayName: '策略类型', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-oci-063', name: 'priority', displayName: '优先级', dataType: 'INTEGER', required: false, sortOrder: 3 },
      { id: 'ep-oci-064', name: 'costWeight', displayName: '成本权重', dataType: 'FLOAT', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-oci-008',
    name: 'FulfillmentDecision',
    description: '订单级履约决策结果，明确从哪个节点履约和是否需要调拨。',
    properties: [
      { id: 'ep-oci-071', name: 'decisionNo', displayName: '决策号', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-oci-072', name: 'decisionType', displayName: '决策类型', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-oci-073', name: 'expectedCost', displayName: '预计成本', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-oci-074', name: 'promisedArrival', displayName: '承诺送达', dataType: 'DATETIME', required: false, sortOrder: 4 },
      { id: 'ep-oci-075', name: 'decisionReason', displayName: '决策原因', dataType: 'TEXT', required: false, sortOrder: 5 },
    ],
  },
]

const OMNICHANNEL_INVENTORY_RELATION_TYPES: RelationTypeConfig[] = [
  { id: 'rt-oci-001', name: 'stocked_at_node', domain: 'ProductSku', range: 'FulfillmentNode', description: 'SKU 在履约节点的库存归属。', properties: [] },
  { id: 'rt-oci-002', name: 'tracked_by_snapshot', domain: 'ProductSku', range: 'InventorySnapshot', description: 'SKU 的库存快照记录。', properties: [] },
  { id: 'rt-oci-003', name: 'ordered_as', domain: 'ChannelOrder', range: 'ProductSku', description: '订单关联的商品 SKU。', properties: [] },
  { id: 'rt-oci-004', name: 'reserves_inventory', domain: 'ChannelOrder', range: 'Reservation', description: '订单触发的库存预占记录。', properties: [] },
  { id: 'rt-oci-005', name: 'reservation_on_node', domain: 'Reservation', range: 'FulfillmentNode', description: '预占发生的库存节点。', properties: [] },
  { id: 'rt-oci-006', name: 'fulfilled_by_node', domain: 'FulfillmentDecision', range: 'FulfillmentNode', description: '履约决策选择的执行节点。', properties: [] },
  { id: 'rt-oci-007', name: 'decision_for_order', domain: 'FulfillmentDecision', range: 'ChannelOrder', description: '履约决策对应的订单。', properties: [] },
  { id: 'rt-oci-008', name: 'guided_by_policy', domain: 'FulfillmentDecision', range: 'FulfillmentPolicy', description: '履约决策依据的策略规则。', properties: [] },
  { id: 'rt-oci-009', name: 'triggers_transfer_task', domain: 'FulfillmentDecision', range: 'TransferTask', description: '履约决策触发的调拨任务。', properties: [] },
  { id: 'rt-oci-010', name: 'moves_between_nodes', domain: 'TransferTask', range: 'FulfillmentNode', description: '调拨任务涉及的节点流转。', properties: [] },
]

const OMNICHANNEL_INVENTORY_SKILLS: SkillConfig[] = [
  { id: 'sk-oci-001', code: 'data_processing', name: '全渠道库存整编', enabled: true, prompt: '统一 OMS、门店仓、前置仓和调拨日志，形成可售库存与履约节点视图', source: 'built_in', tags: ['retail', 'inventory'] },
  { id: 'sk-oci-002', code: 'graph_synthesis', name: '履约决策图谱融合', enabled: true, prompt: '融合 SKU、节点、订单、预占、调拨、策略和履约决策，形成全渠道库存图谱', source: 'built_in', tags: ['retail', 'fulfillment'] },
  { id: 'sk-oci-003', code: 'custom', name: '分单与调拨编排', enabled: true, prompt: '根据库存、节点时效和履约策略推荐分单节点与调拨方案', source: 'built_in', tags: ['retail', 'decision'] },
]

const OMNICHANNEL_INVENTORY_AI_INSIGHT_RUN: AiInsightRun = {
  id: 'ai-oci-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T09:15:00.000Z',
  completedAt: '2026-03-10T09:23:00.000Z',
  scannedDocumentCount: 18,
  addedEntityCount: 8,
  addedRelationCount: 10,
  addedEntityNames: ['ProductSku', 'FulfillmentNode', 'InventorySnapshot', 'ChannelOrder', 'Reservation', 'TransferTask', 'FulfillmentPolicy', 'FulfillmentDecision'],
  addedRelationNames: ['stocked_at_node', 'tracked_by_snapshot', 'ordered_as', 'reserves_inventory', 'reservation_on_node', 'fulfilled_by_node', 'decision_for_order', 'guided_by_policy', 'triggers_transfer_task', 'moves_between_nodes'],
  warnings: [],
  stage: '完成',
  currentDocument: '全渠道库存本体模型说明书.docx',
  logs: [
    '解析 8 份 OMS 履约、库存同步、BOPIS 规则和调拨策略资料',
    '补齐 ProductSku、FulfillmentNode、InventorySnapshot、ChannelOrder、Reservation、TransferTask、FulfillmentPolicy、FulfillmentDecision 八类核心实体',
    '形成库存归属、订单预占、履约分单、调拨联动和策略约束十条关键关系链路',
  ],
}

const OMNICHANNEL_INVENTORY_RUN: ExtractionRun = {
  id: 'run-oci-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T10:00:00.000Z',
  completedAt: '2026-03-10T10:13:00.000Z',
  candidateEntityCount: 80,
  candidateRelationCount: 66,
  pendingReviewCount: 0,
  stage: '完成',
  currentDocument: '履约分单决策训练样本.jsonl',
  logs: [
    '抽取全渠道订单、节点库存、预占释放、门店自提和同城调拨样本',
    '识别超卖回滚、缺货跨店履约、滞销门店优先出清和同城2小时达等高频决策模式',
    '形成全渠道库存候选实体 80 个、关系 66 条，支撑库存可视、分单履约和调拨协同',
  ],
  warnings: [],
  reviewItems: [
    { id: 'ri-oci-001', kind: 'ENTITY', title: 'Nike Air Max 270-黑色-42 (ProductSku)', evidence: 'OMS订单履约路由与库存口径.xlsx', confidence: 0.99, status: 'APPROVED' },
    { id: 'ri-oci-002', kind: 'ENTITY', title: '上海南京东路旗舰店 (FulfillmentNode)', evidence: '门店仓-前置仓库存同步规则.md', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-oci-003', kind: 'ENTITY', title: '库存快照-南京东路店-2026-03-11 (InventorySnapshot)', evidence: '全渠道库存健康看板指标说明.md', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-oci-004', kind: 'ENTITY', title: '订单#O2O-20260311-001 (ChannelOrder)', evidence: '履约分单决策训练样本.jsonl', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-oci-005', kind: 'ENTITY', title: '预占单#RSV-20260311-001 (Reservation)', evidence: '库存预占释放与超卖回滚SOP.docx', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-oci-006', kind: 'ENTITY', title: '调拨任务#TF-20260311-001 (TransferTask)', evidence: '同城调拨与缺货兜底样本.jsonl', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-oci-007', kind: 'ENTITY', title: '门店优先自提策略 (FulfillmentPolicy)', evidence: 'BOPIS自提SLA与门店履约规则.xlsx', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-oci-008', kind: 'ENTITY', title: '履约决策#FD-20260311-001 (FulfillmentDecision)', evidence: '履约分单决策训练样本.jsonl', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-oci-009', kind: 'RELATION', title: 'Nike Air Max 270-黑色-42 (ProductSku) → stocked_at_node → 上海南京东路旗舰店 (FulfillmentNode)', evidence: '库存归属关系', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-oci-010', kind: 'RELATION', title: '订单#O2O-20260311-001 (ChannelOrder) → reserves_inventory → 预占单#RSV-20260311-001 (Reservation)', evidence: '预占关联关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-oci-011', kind: 'RELATION', title: '履约决策#FD-20260311-001 (FulfillmentDecision) → fulfilled_by_node → 上海南京东路旗舰店 (FulfillmentNode)', evidence: '分单关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-oci-012', kind: 'RELATION', title: '履约决策#FD-20260311-001 (FulfillmentDecision) → guided_by_policy → 门店优先自提策略 (FulfillmentPolicy)', evidence: '策略关系', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-oci-013', kind: 'RELATION', title: '履约决策#FD-20260311-001 (FulfillmentDecision) → triggers_transfer_task → 调拨任务#TF-20260311-001 (TransferTask)', evidence: '调拨触发关系', confidence: 0.96, status: 'APPROVED' },
  ],
}

const OMNICHANNEL_INVENTORY_VERSION: OntologyVersion = {
  id: 'ver-oci-001',
  version: 'v1.1',
  label: '全渠道库存与履约决策图谱',
  createdAt: '2026-03-10T10:20:00.000Z',
  sourceRunId: 'run-oci-001',
  entityCount: 80,
  relationCount: 66,
}

const OMNICHANNEL_INVENTORY_ACTIONS: ActionDefinition[] = [
  {
    id: 'act-oci-001',
    name: 'refresh_sellable_inventory',
    displayName: '刷新可售库存',
    description: '根据现存库存、锁定库存和门店可售规则刷新节点可售库存。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-oci-003',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-oci-001","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"inventory.snapshot.ingested\\"}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_inventory_recheck","notifyRole":"渠道库存经理"}',
    parametersJson: '[{"name":"snapshotId","displayName":"快照ID","dataType":"STRING","required":true},{"name":"onHandQty","displayName":"现存数量","dataType":"FLOAT","required":true},{"name":"reservedQty","displayName":"锁定数量","dataType":"FLOAT","required":true},{"name":"safetyBufferQty","displayName":"安全缓冲量","dataType":"FLOAT","required":true}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"InventorySnapshot","conditionJson":"{\\"when\\":\\"snapshotId_present\\"}","propertyMappingsJson":"{\\"sellableQty\\":\\"sellable_qty\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"snapshot_required","condition":"snapshotId != \\"\\"","message":"快照ID不能为空"},{"name":"qty_non_negative","condition":"onHandQty >= 0 and reservedQty >= 0 and safetyBufferQty >= 0","message":"库存数量不能为负数"}]',
  },
  {
    id: 'act-oci-002',
    name: 'decide_order_fulfillment',
    displayName: '生成履约分单决策',
    description: '基于节点库存、距离、SLA 和成本生成订单履约分单结果。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-oci-008',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-oci-002","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"order.created\\",\\"includeStorePickup\\":true}"},{"functionId":"fn-oci-003","order":2,"triggerType":"EVENT","triggerConfig":"{\\"allowTransferFallback\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_fulfillment_assignment","notifyRole":"OMS运营经理"}',
    parametersJson: '[{"name":"orderNo","displayName":"订单号","dataType":"STRING","required":true},{"name":"promisedHours","displayName":"承诺时效","dataType":"INTEGER","required":true},{"name":"distanceKm","displayName":"距离公里数","dataType":"FLOAT","required":true},{"name":"deliveryMode","displayName":"履约方式","dataType":"STRING","required":true}]',
    rulesJson: '[{"ruleType":"CREATE_OBJECT","target":"FulfillmentDecision","conditionJson":"{\\"when\\":\\"orderNo_present\\"}","propertyMappingsJson":"{\\"decisionType\\":\\"recommended_decision_type\\",\\"decisionReason\\":\\"decision_reason\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"ChannelOrder","conditionJson":"{\\"when\\":\\"orderNo_present\\"}","propertyMappingsJson":"{\\"from\\":\\"generated_decision_no\\",\\"relation\\":\\"decision_for_order\\",\\"to\\":\\"$orderNo\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"order_required","condition":"orderNo != \\"\\"","message":"订单号不能为空"},{"name":"hours_positive","condition":"promisedHours > 0","message":"承诺时效必须大于 0"},{"name":"distance_non_negative","condition":"distanceKm >= 0","message":"距离不能为负数"}]',
  },
  {
    id: 'act-oci-003',
    name: 'launch_transfer_task',
    displayName: '发起库存调拨任务',
    description: '当首选履约节点缺货时，自动生成跨店或跨仓调拨任务。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-oci-006',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-oci-003","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"fulfillment.decision.created\\",\\"requireShortage\\":true}"},{"functionId":"fn-oci-004","order":2,"triggerType":"EVENT","triggerConfig":"{\\"splitByNodeCapacity\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_transfer_dispatch","notifyRole":"调拨计划员"}',
    parametersJson: '[{"name":"decisionNo","displayName":"决策号","dataType":"STRING","required":true},{"name":"shortageQty","displayName":"缺口数量","dataType":"FLOAT","required":true},{"name":"targetNode","displayName":"目标节点","dataType":"STRING","required":true},{"name":"etaHours","displayName":"预计时效","dataType":"INTEGER","required":true}]',
    rulesJson: '[{"ruleType":"CREATE_OBJECT","target":"TransferTask","conditionJson":"{\\"when\\":\\"shortageQty > 0\\"}","propertyMappingsJson":"{\\"plannedQty\\":\\"transfer_qty\\",\\"etaHours\\":\\"$etaHours\\",\\"taskType\\":\\"replenishment_transfer\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"decision_required","condition":"decisionNo != \\"\\"","message":"决策号不能为空"},{"name":"shortage_positive","condition":"shortageQty >= 0","message":"缺口数量不能为负数"},{"name":"eta_positive","condition":"etaHours > 0","message":"预计时效必须大于 0"}]',
  },
]

const OMNICHANNEL_INVENTORY_FUNCTIONS: FunctionDefinition[] = [
  {
    id: 'fn-oci-001',
    name: '可售库存计算',
    description: '根据现存、锁定和安全缓冲量计算节点可售库存。',
    scriptContent: 'def calc_sellable_inventory(on_hand_qty: float, reserved_qty: float, safety_buffer_qty: float):\n    """计算可售库存。"""\n    sellable = max(on_hand_qty - reserved_qty - safety_buffer_qty, 0)\n    return {"sellableQty": round(sellable, 1)}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-oci-002',
    name: '履约节点评分',
    description: '综合距离、时效、库存余量和履约成本对候选节点打分。',
    scriptContent: 'def score_fulfillment_node(distance_km: float, promised_hours: int, sellable_qty: float, logistics_cost: float, pickup_supported: bool = False):\n    """评估候选履约节点。"""\n    distance_score = max(0, 30 - min(distance_km, 30))\n    sla_score = 25 if promised_hours <= 4 else 18 if promised_hours <= 24 else 10\n    inventory_score = min(max(sellable_qty, 0), 20)\n    cost_score = max(0, 20 - min(logistics_cost, 20))\n    pickup_bonus = 6 if pickup_supported else 0\n    total = round(min(100, distance_score + sla_score + inventory_score + cost_score + pickup_bonus), 1)\n    return {"nodeScore": total}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-oci-003',
    name: '履约方案推荐',
    description: '根据节点评分和缺口数量推荐直发、自提或调拨履约方案。',
    scriptContent: 'def recommend_fulfillment_plan(best_node_score: float, shortage_qty: float, delivery_mode: str, transfer_eta_hours: int = 0):\n    """推荐履约方案。"""\n    if shortage_qty <= 0 and best_node_score >= 60:\n        decision = "direct_fulfillment"\n    elif delivery_mode == "PICKUP" and best_node_score >= 50:\n        decision = "store_pickup"\n    elif transfer_eta_hours <= 8:\n        decision = "transfer_fallback"\n    else:\n        decision = "backorder_review"\n    return {"recommendedDecisionType": decision, "decisionReason": f"score={best_node_score}, shortage={shortage_qty}"}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-oci-004',
    name: '调拨数量拆分',
    description: '根据各节点可用库存和容量上限拆分调拨数量。',
    scriptContent: 'def split_transfer_qty(shortage_qty: float, source_nodes: list[dict]):\n    """拆分调拨数量。"""\n    remain = max(shortage_qty, 0)\n    allocations = []\n    for node in sorted(source_nodes, key=lambda item: -item.get("sellableQty", 0)):\n        available = max(node.get("sellableQty", 0), 0)\n        qty = min(remain, available)\n        if qty > 0:\n            allocations.append({"nodeCode": node.get("nodeCode"), "qty": round(qty, 1)})\n            remain -= qty\n        if remain <= 0:\n            break\n    return {"allocations": allocations, "remainQty": round(remain, 1)}',
    status: 'ACTIVE',
  },
]

const MEMBER_PROFILE_PROJECT_ID = 'proj-2522'
const MEMBER_PROFILE_PROJECT_NAME = '会员画像本体'
const MEMBER_PROFILE_UPDATED_AT = '2026-03-11T11:45:00.000Z'
const MEMBER_PROFILE_DESCRIPTION =
  '零售业 · 营销与CRM领域会员画像本体，覆盖会员、会员等级、触达渠道、消费事件、偏好标签、券资产、生命周期分层与营销任务；支持精准人群圈选、权益编排、复购促进与流失预警。'

const MEMBER_PROFILE_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-mp-001',
    name: '会员画像本体模型说明书.docx',
    fileType: 'docx',
    size: 218112,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-03T09:10:00.000Z',
  },
  {
    id: 'doc-mp-002',
    name: 'CDP会员主数据与身份合并规则.xlsx',
    fileType: 'xlsx',
    size: 252928,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-04T10:20:00.000Z',
  },
  {
    id: 'doc-mp-003',
    name: '全渠道交易与行为埋点口径说明.md',
    fileType: 'md',
    size: 99840,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-05T11:00:00.000Z',
  },
  {
    id: 'doc-mp-004',
    name: '会员标签与生命周期分层样本.jsonl',
    fileType: 'jsonl',
    size: 73152,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-06T14:10:00.000Z',
  },
  {
    id: 'doc-mp-005',
    name: '优惠券权益与核销规则清单.xlsx',
    fileType: 'xlsx',
    size: 206848,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-07T09:35:00.000Z',
  },
  {
    id: 'doc-mp-006',
    name: '门店导购触达与回访SOP.docx',
    fileType: 'docx',
    size: 181248,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-08T13:20:00.000Z',
  },
  {
    id: 'doc-mp-007',
    name: '会员流失预警指标说明.md',
    fileType: 'md',
    size: 91520,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-09T15:10:00.000Z',
  },
  {
    id: 'doc-mp-008',
    name: '精准营销活动编排样本.jsonl',
    fileType: 'jsonl',
    size: 75648,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T09:05:00.000Z',
  },
  {
    id: 'doc-mp-009',
    name: '会员券包投放与领取漏斗周报.xlsx',
    fileType: 'xlsx',
    size: 194560,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T15:20:00.000Z',
  },
  {
    id: 'doc-mp-010',
    name: '高价值会员召回话术与A/B实验记录.md',
    fileType: 'md',
    size: 83200,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T16:10:00.000Z',
  },
  {
    id: 'doc-mp-011',
    name: '会员复购周期与品类偏好迁移分析.xlsx',
    fileType: 'xlsx',
    size: 186368,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T16:25:00.000Z',
  },
  {
    id: 'doc-mp-012',
    name: '企微导购一对一唤醒脚本库.docx',
    fileType: 'docx',
    size: 158720,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T16:45:00.000Z',
  },
  {
    id: 'doc-mp-013',
    name: '沉睡会员召回失败原因复盘.md',
    fileType: 'md',
    size: 80448,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T17:05:00.000Z',
  },
  {
    id: 'doc-mp-014',
    name: '会员等级升级触发条件与权益映射清单.xlsx',
    fileType: 'xlsx',
    size: 177152,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T17:22:00.000Z',
  },
  {
    id: 'doc-mp-015',
    name: '会员标签更新延迟与补偿任务案例.jsonl',
    fileType: 'jsonl',
    size: 68864,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T17:40:00.000Z',
  },
]

const MEMBER_PROFILE_DATA_SOURCES: StructuredDataSource[] = [
  {
    id: 'ds-mp-001',
    name: 'CDP会员主数据中心',
    type: 'POSTGRESQL',
    host: '10.26.14.18',
    port: 5432,
    database: 'retail_member_center',
    username: 'member_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['member_profile', 'member_identity_graph', 'member_tier_snapshot'],
    rowLimit: 260000,
    syncMode: 'FULL',
    incrementalColumn: '',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:16:00.000Z',
    lastError: '',
    createdAt: '2026-03-03T10:00:00.000Z',
    updatedAt: '2026-03-11T08:16:00.000Z',
  },
  {
    id: 'ds-mp-002',
    name: '全渠道交易与行为事件仓',
    type: 'CLICKHOUSE',
    host: '10.26.14.31',
    port: 8123,
    database: 'member_behavior_analytics',
    username: 'behavior_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['member_order_event', 'browse_behavior_event', 'channel_touch_log'],
    rowLimit: 420000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'event_time',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:24:00.000Z',
    lastError: '',
    createdAt: '2026-03-04T10:00:00.000Z',
    updatedAt: '2026-03-11T08:24:00.000Z',
  },
  {
    id: 'ds-mp-003',
    name: '券权益与营销自动化库',
    type: 'MYSQL',
    host: '10.26.14.45',
    port: 3306,
    database: 'crm_marketing_automation',
    username: 'campaign_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['coupon_asset', 'campaign_task', 'member_churn_signal'],
    rowLimit: 180000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'updated_at',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:32:00.000Z',
    lastError: '',
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-11T08:32:00.000Z',
  },
]

const MEMBER_PROFILE_ENTITY_TYPES: EntityTypeConfig[] = [
  {
    id: 'et-mp-001',
    name: 'Member',
    description: '会员主体，统一线上线下身份、价值分和运营状态。',
    properties: [
      { id: 'ep-mp-001', name: 'memberId', displayName: '会员ID', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-mp-002', name: 'mobileMasked', displayName: '手机号脱敏', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-mp-003', name: 'registerChannel', displayName: '注册渠道', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-mp-004', name: 'city', displayName: '城市', dataType: 'STRING', required: false, sortOrder: 4 },
      { id: 'ep-mp-005', name: 'valueScore', displayName: '会员价值分', dataType: 'FLOAT', required: false, sortOrder: 5 },
    ],
  },
  {
    id: 'et-mp-002',
    name: 'MembershipTier',
    description: '会员等级与权益包定义。',
    properties: [
      { id: 'ep-mp-011', name: 'tierName', displayName: '等级名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-mp-012', name: 'validUntil', displayName: '有效期至', dataType: 'DATE', required: false, sortOrder: 2 },
      { id: 'ep-mp-013', name: 'pointsMultiplier', displayName: '积分倍数', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-mp-014', name: 'rightsPack', displayName: '权益包', dataType: 'TEXT', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-mp-003',
    name: 'ChannelTouchpoint',
    description: '会员触达渠道与交互触点，包括门店、App、企微和短信。',
    properties: [
      { id: 'ep-mp-021', name: 'channelType', displayName: '渠道类型', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-mp-022', name: 'channelCode', displayName: '渠道编码', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-mp-023', name: 'reachability', displayName: '触达状态', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-mp-024', name: 'ownerTeam', displayName: '归属团队', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-mp-004',
    name: 'ConsumptionEvent',
    description: '会员消费或互动转化事件，沉淀购买、核销和复购信号。',
    properties: [
      { id: 'ep-mp-031', name: 'orderNo', displayName: '订单号', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-mp-032', name: 'occurredAt', displayName: '发生时间', dataType: 'DATETIME', required: false, sortOrder: 2 },
      { id: 'ep-mp-033', name: 'orderAmount', displayName: '订单金额', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-mp-034', name: 'purchaseCategory', displayName: '购买品类', dataType: 'STRING', required: false, sortOrder: 4 },
      { id: 'ep-mp-035', name: 'storeName', displayName: '成交门店', dataType: 'STRING', required: false, sortOrder: 5 },
    ],
  },
  {
    id: 'et-mp-005',
    name: 'PreferenceTag',
    description: '会员偏好和行为标签，用于人群圈选与内容推荐。',
    properties: [
      { id: 'ep-mp-041', name: 'tagName', displayName: '标签名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-mp-042', name: 'tagGroup', displayName: '标签分组', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-mp-043', name: 'confidenceScore', displayName: '置信度', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-mp-044', name: 'tagSource', displayName: '标签来源', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-mp-006',
    name: 'CouponAsset',
    description: '会员可领取或已领取的券、积分权益和福利资产。',
    properties: [
      { id: 'ep-mp-051', name: 'couponName', displayName: '券名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-mp-052', name: 'couponType', displayName: '券类型', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-mp-053', name: 'faceValue', displayName: '面额', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-mp-054', name: 'expiresAt', displayName: '过期时间', dataType: 'DATETIME', required: false, sortOrder: 4 },
      { id: 'ep-mp-055', name: 'redeemStatus', displayName: '核销状态', dataType: 'STRING', required: false, sortOrder: 5 },
    ],
  },
  {
    id: 'et-mp-007',
    name: 'LifeCycleSegment',
    description: '会员生命周期分层，用于识别活跃、沉睡、流失和潜力人群。',
    properties: [
      { id: 'ep-mp-061', name: 'segmentName', displayName: '分层名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-mp-062', name: 'churnRiskLevel', displayName: '流失风险', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-mp-063', name: 'nextBestAction', displayName: '下一最佳动作', dataType: 'TEXT', required: false, sortOrder: 3 },
      { id: 'ep-mp-064', name: 'refreshCycleDays', displayName: '刷新周期(天)', dataType: 'INTEGER', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-mp-008',
    name: 'CampaignTask',
    description: '围绕会员画像自动编排的营销任务。',
    properties: [
      { id: 'ep-mp-071', name: 'campaignName', displayName: '任务名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-mp-072', name: 'channel', displayName: '执行渠道', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-mp-073', name: 'objective', displayName: '营销目标', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-mp-074', name: 'scheduledAt', displayName: '计划执行时间', dataType: 'DATETIME', required: false, sortOrder: 4 },
      { id: 'ep-mp-075', name: 'conversionTarget', displayName: '转化目标', dataType: 'FLOAT', required: false, sortOrder: 5 },
    ],
  },
]

const MEMBER_PROFILE_RELATION_TYPES: RelationTypeConfig[] = [
  { id: 'rt-mp-001', name: 'has_membership_tier', domain: 'Member', range: 'MembershipTier', description: '会员当前所属等级。', properties: [] },
  { id: 'rt-mp-002', name: 'interacts_via', domain: 'Member', range: 'ChannelTouchpoint', description: '会员可触达或已互动的渠道触点。', properties: [] },
  { id: 'rt-mp-003', name: 'records_consumption', domain: 'Member', range: 'ConsumptionEvent', description: '会员关联的消费或转化事件。', properties: [] },
  { id: 'rt-mp-004', name: 'tagged_with_preference', domain: 'Member', range: 'PreferenceTag', description: '会员被标注的偏好和行为标签。', properties: [] },
  { id: 'rt-mp-005', name: 'owns_coupon_asset', domain: 'Member', range: 'CouponAsset', description: '会员拥有的券或权益资产。', properties: [] },
  { id: 'rt-mp-006', name: 'classified_into_lifecycle', domain: 'Member', range: 'LifeCycleSegment', description: '会员被归入的生命周期分层。', properties: [] },
  { id: 'rt-mp-007', name: 'triggered_campaign_task', domain: 'Member', range: 'CampaignTask', description: '基于会员画像触发的营销任务。', properties: [] },
  { id: 'rt-mp-008', name: 'campaign_targets_segment', domain: 'CampaignTask', range: 'LifeCycleSegment', description: '营销任务针对的生命周期人群。', properties: [] },
  { id: 'rt-mp-009', name: 'campaign_uses_coupon', domain: 'CampaignTask', range: 'CouponAsset', description: '营销任务关联的权益资产。', properties: [] },
  { id: 'rt-mp-010', name: 'consumption_strengthens_tag', domain: 'ConsumptionEvent', range: 'PreferenceTag', description: '消费行为强化或更新的偏好标签。', properties: [] },
]

const MEMBER_PROFILE_SKILLS: SkillConfig[] = [
  { id: 'sk-mp-001', code: 'data_processing', name: '会员身份整编', enabled: true, prompt: '统一 CDP 主数据、交易行为和门店触达日志，构建会员唯一视图', source: 'built_in', tags: ['member', 'identity'] },
  { id: 'sk-mp-002', code: 'graph_synthesis', name: '会员画像图谱融合', enabled: true, prompt: '融合会员、等级、消费、标签、券资产和生命周期分层，形成会员画像图谱', source: 'built_in', tags: ['member', 'graph'] },
  { id: 'sk-mp-003', code: 'custom', name: '精准营销编排', enabled: true, prompt: '根据会员价值分、流失风险、偏好标签和券资产状态编排触达策略', source: 'built_in', tags: ['member', 'campaign'] },
]

const MEMBER_PROFILE_AI_INSIGHT_RUN: AiInsightRun = {
  id: 'ai-mp-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T09:20:00.000Z',
  completedAt: '2026-03-10T09:28:00.000Z',
  scannedDocumentCount: 15,
  addedEntityCount: 8,
  addedRelationCount: 10,
  addedEntityNames: ['Member', 'MembershipTier', 'ChannelTouchpoint', 'ConsumptionEvent', 'PreferenceTag', 'CouponAsset', 'LifeCycleSegment', 'CampaignTask'],
  addedRelationNames: ['has_membership_tier', 'interacts_via', 'records_consumption', 'tagged_with_preference', 'owns_coupon_asset', 'classified_into_lifecycle', 'triggered_campaign_task', 'campaign_targets_segment', 'campaign_uses_coupon', 'consumption_strengthens_tag'],
  warnings: [],
  stage: '完成',
  currentDocument: '会员画像本体模型说明书.docx',
  logs: [
    '解析 8 份会员主数据、交易事件、标签规则、券权益和营销编排资料',
    '补齐 Member、MembershipTier、ChannelTouchpoint、ConsumptionEvent、PreferenceTag、CouponAsset、LifeCycleSegment、CampaignTask 八类核心实体',
    '形成等级归属、触达互动、消费沉淀、标签强化、权益绑定和营销编排十条关键关系链路',
  ],
}

const MEMBER_PROFILE_RUN: ExtractionRun = {
  id: 'run-mp-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T10:00:00.000Z',
  completedAt: '2026-03-10T10:14:00.000Z',
  candidateEntityCount: 82,
  candidateRelationCount: 64,
  pendingReviewCount: 0,
  stage: '完成',
  currentDocument: '精准营销活动编排样本.jsonl',
  logs: [
    '抽取会员身份合并、消费行为、偏好标签、券资产和流失预警样本',
    '识别高价值活跃、沉睡待唤醒、价格敏感和新品潜力等关键人群信号',
    '形成会员画像候选实体 82 个、关系 64 条，支撑精准触达、权益分发和流失召回',
  ],
  warnings: [],
  reviewItems: [
    { id: 'ri-mp-001', kind: 'ENTITY', title: '会员ID:U100238 (Member)', evidence: 'CDP会员主数据与身份合并规则.xlsx', confidence: 0.99, status: 'APPROVED' },
    { id: 'ri-mp-002', kind: 'ENTITY', title: '黑金会员 (MembershipTier)', evidence: '会员画像本体模型说明书.docx', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-mp-003', kind: 'ENTITY', title: '小程序商城 (ChannelTouchpoint)', evidence: '全渠道交易与行为埋点口径说明.md', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-mp-004', kind: 'ENTITY', title: '2026-03-08女鞋复购订单 (ConsumptionEvent)', evidence: '会员标签与生命周期分层样本.jsonl', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-mp-005', kind: 'ENTITY', title: '高频复购 (PreferenceTag)', evidence: '会员标签与生命周期分层样本.jsonl', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-mp-006', kind: 'ENTITY', title: '春季满300减50券 (CouponAsset)', evidence: '优惠券权益与核销规则清单.xlsx', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-mp-007', kind: 'ENTITY', title: '高价值活跃会员 (LifeCycleSegment)', evidence: '会员流失预警指标说明.md', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-mp-008', kind: 'ENTITY', title: '春季新品精准推送任务 (CampaignTask)', evidence: '精准营销活动编排样本.jsonl', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-mp-009', kind: 'RELATION', title: '会员ID:U100238 (Member) → has_membership_tier → 黑金会员 (MembershipTier)', evidence: '等级归属关系', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-mp-010', kind: 'RELATION', title: '会员ID:U100238 (Member) → records_consumption → 2026-03-08女鞋复购订单 (ConsumptionEvent)', evidence: '消费沉淀关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-mp-011', kind: 'RELATION', title: '会员ID:U100238 (Member) → tagged_with_preference → 高频复购 (PreferenceTag)', evidence: '标签映射关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-mp-012', kind: 'RELATION', title: '会员ID:U100238 (Member) → classified_into_lifecycle → 高价值活跃会员 (LifeCycleSegment)', evidence: '生命周期分层关系', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-mp-013', kind: 'RELATION', title: '春季新品精准推送任务 (CampaignTask) → campaign_uses_coupon → 春季满300减50券 (CouponAsset)', evidence: '营销权益关系', confidence: 0.96, status: 'APPROVED' },
  ],
}

const MEMBER_PROFILE_VERSION: OntologyVersion = {
  id: 'ver-mp-001',
  version: 'v1.1',
  label: '会员画像与精准营销图谱',
  createdAt: '2026-03-10T10:20:00.000Z',
  sourceRunId: 'run-mp-001',
  entityCount: 82,
  relationCount: 64,
}

const MEMBER_PROFILE_ACTIONS: ActionDefinition[] = [
  {
    id: 'act-mp-001',
    name: 'refresh_member_value_score',
    displayName: '刷新会员价值分',
    description: '根据消费频次、近90天消费额和互动活跃度更新会员价值分。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-mp-001',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-mp-001","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"member.transaction.updated\\"}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_member_score_review","notifyRole":"CRM运营经理"}',
    parametersJson: '[{"name":"memberId","displayName":"会员ID","dataType":"STRING","required":true},{"name":"purchaseFrequency","displayName":"消费频次","dataType":"INTEGER","required":true},{"name":"recentAmount","displayName":"近90天消费额","dataType":"FLOAT","required":true},{"name":"engagementScore","displayName":"互动活跃度","dataType":"FLOAT","required":true}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"Member","conditionJson":"{\\"when\\":\\"memberId_present\\"}","propertyMappingsJson":"{\\"valueScore\\":\\"member_value_score\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"member_required","condition":"memberId != \\"\\"","message":"会员ID不能为空"},{"name":"frequency_non_negative","condition":"purchaseFrequency >= 0","message":"消费频次不能为负数"},{"name":"amount_non_negative","condition":"recentAmount >= 0","message":"消费金额不能为负数"}]',
  },
  {
    id: 'act-mp-002',
    name: 'refresh_lifecycle_segment',
    displayName: '刷新生命周期分层',
    description: '根据会员价值分、流失风险和最近活跃天数重算生命周期分层。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-mp-007',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-mp-002","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"member.score.changed\\",\\"includeChurnRisk\\":true}"},{"functionId":"fn-mp-003","order":2,"triggerType":"EVENT","triggerConfig":"{\\"refreshTag\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_segment_review","notifyRole":"会员运营经理"}',
    parametersJson: '[{"name":"memberId","displayName":"会员ID","dataType":"STRING","required":true},{"name":"valueScore","displayName":"会员价值分","dataType":"FLOAT","required":true},{"name":"daysSinceLastOrder","displayName":"距上次消费天数","dataType":"INTEGER","required":true},{"name":"couponUnusedDays","displayName":"券未使用天数","dataType":"INTEGER","required":true}]',
    rulesJson: '[{"ruleType":"CREATE_LINK","target":"LifeCycleSegment","conditionJson":"{\\"when\\":\\"memberId_present\\"}","propertyMappingsJson":"{\\"from\\":\\"$memberId\\",\\"relation\\":\\"classified_into_lifecycle\\",\\"to\\":\\"recommended_segment\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"member_required","condition":"memberId != \\"\\"","message":"会员ID不能为空"},{"name":"value_range","condition":"valueScore >= 0 and valueScore <= 100","message":"会员价值分需在 0 到 100 之间"},{"name":"days_non_negative","condition":"daysSinceLastOrder >= 0 and couponUnusedDays >= 0","message":"天数指标不能为负数"}]',
  },
  {
    id: 'act-mp-003',
    name: 'launch_precision_campaign',
    displayName: '发起精准营销任务',
    description: '基于生命周期分层、偏好标签和券资产状态生成个性化营销任务。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-mp-008',
    triggerType: 'MANUAL',
    triggerConfigJson: '[{"functionId":"fn-mp-004","order":1,"triggerType":"MANUAL","triggerConfig":"{\\"entry\\":\\"workspace.button\\",\\"respectOptIn\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_campaign_approval","notifyRole":"营销经理"}',
    parametersJson: '[{"name":"segmentName","displayName":"分层名称","dataType":"STRING","required":true},{"name":"primaryTag","displayName":"主偏好标签","dataType":"STRING","required":true},{"name":"couponName","displayName":"权益名称","dataType":"STRING","required":false},{"name":"channel","displayName":"执行渠道","dataType":"STRING","required":true}]',
    rulesJson: '[{"ruleType":"CREATE_OBJECT","target":"CampaignTask","conditionJson":"{\\"when\\":\\"segmentName_present\\"}","propertyMappingsJson":"{\\"campaignName\\":\\"generated_campaign_name\\",\\"channel\\":\\"$channel\\",\\"objective\\":\\"precision_conversion\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"LifeCycleSegment","conditionJson":"{\\"when\\":\\"segmentName_present\\"}","propertyMappingsJson":"{\\"from\\":\\"generated_campaign_name\\",\\"relation\\":\\"campaign_targets_segment\\",\\"to\\":\\"$segmentName\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"segment_required","condition":"segmentName != \\"\\"","message":"分层名称不能为空"},{"name":"tag_required","condition":"primaryTag != \\"\\"","message":"主偏好标签不能为空"},{"name":"channel_required","condition":"channel != \\"\\"","message":"执行渠道不能为空"}]',
  },
]

const MEMBER_PROFILE_FUNCTIONS: FunctionDefinition[] = [
  {
    id: 'fn-mp-001',
    name: '会员价值分计算',
    description: '根据消费频次、消费金额和互动活跃度计算会员价值分。',
    scriptContent: 'def calc_member_value_score(purchase_frequency: int, recent_amount: float, engagement_score: float):\n    """计算会员价值分。"""\n    frequency_score = min(max(purchase_frequency, 0), 20) * 2.2\n    amount_score = min(max(recent_amount, 0.0) / 80, 35)\n    engagement_component = min(max(engagement_score, 0.0), 1.0) * 21\n    total = round(min(100, frequency_score + amount_score + engagement_component), 1)\n    return {"memberValueScore": total}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-mp-002',
    name: '会员流失风险评估',
    description: '综合最近消费间隔、券未使用时长和触达响应率评估流失风险。',
    scriptContent: 'def evaluate_member_churn_risk(days_since_last_order: int, coupon_unused_days: int, response_rate: float):\n    """评估会员流失风险。"""\n    score = min(max(days_since_last_order, 0), 90) * 0.55 + min(max(coupon_unused_days, 0), 60) * 0.35 + (1 - min(max(response_rate, 0.0), 1.0)) * 25\n    risk_score = round(min(score, 100), 1)\n    risk_level = "HIGH" if risk_score >= 65 else "MEDIUM" if risk_score >= 35 else "LOW"\n    return {"riskScore": risk_score, "riskLevel": risk_level}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-mp-003',
    name: '生命周期分层推荐',
    description: '依据会员价值分、流失风险和最近活跃情况推荐生命周期分层。',
    scriptContent: 'def recommend_member_segment(value_score: float, risk_level: str, days_since_last_order: int):\n    """推荐会员生命周期分层。"""\n    if value_score >= 80 and days_since_last_order <= 30:\n        segment = "高价值活跃会员"\n    elif risk_level == "HIGH" and days_since_last_order >= 45:\n        segment = "流失预警会员"\n    elif days_since_last_order >= 60:\n        segment = "沉睡待唤醒会员"\n    else:\n        segment = "新品潜力会员"\n    return {"segmentName": segment}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-mp-004',
    name: '营销任务编排',
    description: '根据分层、偏好标签和优惠券策略生成营销任务负载。',
    scriptContent: 'def build_member_campaign_payload(segment_name: str, primary_tag: str, channel: str, coupon_name: str | None = None):\n    """生成会员营销任务负载。"""\n    campaign_name = f"{segment_name}-{primary_tag}-精准触达"\n    content_theme = "权益召回" if "流失" in segment_name or "沉睡" in segment_name else "新品推荐"\n    return {"campaignName": campaign_name, "channel": channel, "contentTheme": content_theme, "couponName": coupon_name or "", "priority": "P1" if "高价值" in segment_name else "P2"}',
    status: 'ACTIVE',
  },
]

const SUPPLIER_PROFILE_PROJECT_ID = 'proj-1416'
const SUPPLIER_PROFILE_PROJECT_NAME = '供应商画像本体'
const SUPPLIER_PROFILE_UPDATED_AT = '2026-03-11T11:05:00.000Z'
const SUPPLIER_PROFILE_DESCRIPTION =
  '制造业 · 供应链与采购协同领域供应商画像本体，覆盖供应商、供货物料、服务工厂、交付表现、质量事件、财务风险、合规资质与供应商分层；支持供应商评级、采购份额调整、风险预警与供方治理。'

const SUPPLIER_PROFILE_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-sp-001',
    name: '供应商画像本体模型说明书.docx',
    fileType: 'docx',
    size: 212480,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-03T09:00:00.000Z',
  },
  {
    id: 'doc-sp-002',
    name: 'SRM供应商主数据与供货范围映射.xlsx',
    fileType: 'xlsx',
    size: 241664,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-04T10:15:00.000Z',
  },
  {
    id: 'doc-sp-003',
    name: '准时交付率与缺料停线事件口径说明.md',
    fileType: 'md',
    size: 95360,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-05T11:00:00.000Z',
  },
  {
    id: 'doc-sp-004',
    name: '来料质量PPM与8D闭环样本.jsonl',
    fileType: 'jsonl',
    size: 73408,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-06T14:10:00.000Z',
  },
  {
    id: 'doc-sp-005',
    name: '供应商财务风险预警指标手册.docx',
    fileType: 'docx',
    size: 176128,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-07T09:40:00.000Z',
  },
  {
    id: 'doc-sp-006',
    name: '合规认证与审厂结论清单.xlsx',
    fileType: 'xlsx',
    size: 205824,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-08T10:50:00.000Z',
  },
  {
    id: 'doc-sp-007',
    name: '月度供应商绩效评分卡模板.md',
    fileType: 'md',
    size: 88672,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-09T15:20:00.000Z',
  },
  {
    id: 'doc-sp-008',
    name: '采购份额调整与风险复核样本.jsonl',
    fileType: 'jsonl',
    size: 70144,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T08:50:00.000Z',
  },
  {
    id: 'doc-sp-009',
    name: '备选供应商切换与产能爬坡评估.xlsx',
    fileType: 'xlsx',
    size: 203776,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T15:00:00.000Z',
  },
  {
    id: 'doc-sp-010',
    name: '供应商整改闭环追踪与复审纪要.md',
    fileType: 'md',
    size: 85120,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T15:50:00.000Z',
  },
  {
    id: 'doc-sp-011',
    name: '供应商季度审厂问题闭环统计.xlsx',
    fileType: 'xlsx',
    size: 181248,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T16:20:00.000Z',
  },
  {
    id: 'doc-sp-012',
    name: '关键物料双供切换演练记录.md',
    fileType: 'md',
    size: 79872,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T16:45:00.000Z',
  },
]

const SUPPLIER_PROFILE_DATA_SOURCES: StructuredDataSource[] = [
  {
    id: 'ds-sp-001',
    name: 'SRM供应商主数据中心',
    type: 'POSTGRESQL',
    host: '10.16.18.21',
    port: 5432,
    database: 'srm_vendor_center',
    username: 'srm_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['supplier_master', 'supplier_material_scope', 'plant_supplier_binding'],
    rowLimit: 160000,
    syncMode: 'FULL',
    incrementalColumn: '',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:15:00.000Z',
    lastError: '',
    createdAt: '2026-03-03T10:00:00.000Z',
    updatedAt: '2026-03-11T08:15:00.000Z',
  },
  {
    id: 'ds-sp-002',
    name: '供应链交付事件仓',
    type: 'CLICKHOUSE',
    host: '10.16.18.34',
    port: 8123,
    database: 'supply_delivery_analytics',
    username: 'delivery_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['otif_daily', 'shortage_incident', 'expedite_requests'],
    rowLimit: 280000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'event_date',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:22:00.000Z',
    lastError: '',
    createdAt: '2026-03-04T10:00:00.000Z',
    updatedAt: '2026-03-11T08:22:00.000Z',
  },
  {
    id: 'ds-sp-003',
    name: '质量与财务风控联合库',
    type: 'SQLSERVER',
    host: '10.16.18.46',
    port: 1433,
    database: 'supplier_risk_hub',
    username: 'risk_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['incoming_quality_case', 'vendor_financial_watch', 'compliance_audit'],
    rowLimit: 140000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'updated_at',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:30:00.000Z',
    lastError: '',
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-11T08:30:00.000Z',
  },
]

const SUPPLIER_PROFILE_ENTITY_TYPES: EntityTypeConfig[] = [
  {
    id: 'et-sp-001',
    name: 'Supplier',
    description: '供应商主体，记录供方基础信息、评级分和采购份额建议。',
    properties: [
      { id: 'ep-sp-001', name: 'supplierCode', displayName: '供应商编码', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-sp-002', name: 'supplierName', displayName: '供应商名称', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-sp-003', name: 'supplierTier', displayName: '供方层级', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-sp-004', name: 'ownedRegion', displayName: '区域归属', dataType: 'STRING', required: false, sortOrder: 4 },
      { id: 'ep-sp-005', name: 'ratingScore', displayName: '评级得分', dataType: 'FLOAT', required: false, sortOrder: 5 },
      { id: 'ep-sp-006', name: 'procurementWeight', displayName: '采购份额', dataType: 'FLOAT', required: false, sortOrder: 6 },
    ],
  },
  {
    id: 'et-sp-002',
    name: 'MaterialCategory',
    description: '供应商供货的关键物料或品类范围。',
    properties: [
      { id: 'ep-sp-011', name: 'materialCode', displayName: '物料编码', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-sp-012', name: 'materialName', displayName: '物料名称', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-sp-013', name: 'category', displayName: '物料类别', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-sp-014', name: 'criticality', displayName: '关键度', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-sp-003',
    name: 'Plant',
    description: '供应商服务的工厂、园区或事业部。',
    properties: [
      { id: 'ep-sp-021', name: 'plantCode', displayName: '工厂编码', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-sp-022', name: 'plantName', displayName: '工厂名称', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-sp-023', name: 'businessUnit', displayName: '业务单元', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-sp-024', name: 'lineCriticality', displayName: '产线关键度', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-sp-004',
    name: 'DeliveryPerformance',
    description: '供应商按时交付、加急响应和缺料影响等交付表现。',
    properties: [
      { id: 'ep-sp-031', name: 'onTimeRate', displayName: '准时交付率', dataType: 'FLOAT', required: true, sortOrder: 1 },
      { id: 'ep-sp-032', name: 'leadTimeDays', displayName: '平均交期(天)', dataType: 'INTEGER', required: false, sortOrder: 2 },
      { id: 'ep-sp-033', name: 'expediteCount', displayName: '加急次数', dataType: 'INTEGER', required: false, sortOrder: 3 },
      { id: 'ep-sp-034', name: 'supplyStabilityScore', displayName: '供货稳定分', dataType: 'FLOAT', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-sp-005',
    name: 'QualityIssue',
    description: '来料质量异常、PPM超限和8D闭环事件。',
    properties: [
      { id: 'ep-sp-041', name: 'issueNo', displayName: '异常单号', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-sp-042', name: 'ppm', displayName: '质量PPM', dataType: 'FLOAT', required: false, sortOrder: 2 },
      { id: 'ep-sp-043', name: 'severity', displayName: '严重级别', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-sp-044', name: 'closedLoopStatus', displayName: '闭环状态', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-sp-006',
    name: 'FinancialRisk',
    description: '供应商财务健康、现金流预警和诉讼风险快照。',
    properties: [
      { id: 'ep-sp-051', name: 'riskLevel', displayName: '风险等级', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-sp-052', name: 'debtRatio', displayName: '负债率', dataType: 'FLOAT', required: false, sortOrder: 2 },
      { id: 'ep-sp-053', name: 'cashFlowAlertCount', displayName: '现金流预警次数', dataType: 'INTEGER', required: false, sortOrder: 3 },
      { id: 'ep-sp-054', name: 'alertSource', displayName: '预警来源', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-sp-007',
    name: 'ComplianceCertificate',
    description: '资质认证、审厂结论和客户强制合规要求。',
    properties: [
      { id: 'ep-sp-061', name: 'certificateName', displayName: '证书名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-sp-062', name: 'validUntil', displayName: '有效期', dataType: 'DATE', required: false, sortOrder: 2 },
      { id: 'ep-sp-063', name: 'auditResult', displayName: '审核结果', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-sp-064', name: 'issuer', displayName: '发证机构', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-sp-008',
    name: 'SupplierSegment',
    description: '供应商经营分层，用于份额、辅导和风险管控策略。',
    properties: [
      { id: 'ep-sp-071', name: 'segmentName', displayName: '分层名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-sp-072', name: 'recommendedWeightBand', displayName: '建议份额区间', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-sp-073', name: 'reviewCycleDays', displayName: '复核周期(天)', dataType: 'INTEGER', required: false, sortOrder: 3 },
      { id: 'ep-sp-074', name: 'governanceStrategy', displayName: '治理策略', dataType: 'TEXT', required: false, sortOrder: 4 },
    ],
  },
]

const SUPPLIER_PROFILE_RELATION_TYPES: RelationTypeConfig[] = [
  { id: 'rt-sp-001', name: 'supplies_material', domain: 'Supplier', range: 'MaterialCategory', description: '供应商供货的关键物料或品类。', properties: [] },
  { id: 'rt-sp-002', name: 'serves_plant', domain: 'Supplier', range: 'Plant', description: '供应商服务的工厂或事业部。', properties: [] },
  { id: 'rt-sp-003', name: 'measured_by_delivery', domain: 'Supplier', range: 'DeliveryPerformance', description: '供应商交付表现的评分卡和事件快照。', properties: [] },
  { id: 'rt-sp-004', name: 'has_quality_issue', domain: 'Supplier', range: 'QualityIssue', description: '供应商关联的来料质量异常和8D事件。', properties: [] },
  { id: 'rt-sp-005', name: 'exposed_to_financial_risk', domain: 'Supplier', range: 'FinancialRisk', description: '供应商暴露的财务预警和经营风险。', properties: [] },
  { id: 'rt-sp-006', name: 'holds_certificate', domain: 'Supplier', range: 'ComplianceCertificate', description: '供应商持有的认证资质和审厂结论。', properties: [] },
  { id: 'rt-sp-007', name: 'classified_into_segment', domain: 'Supplier', range: 'SupplierSegment', description: '供应商被归类到对应治理分层。', properties: [] },
  { id: 'rt-sp-008', name: 'delivery_for_material', domain: 'DeliveryPerformance', range: 'MaterialCategory', description: '交付表现对应的物料范围。', properties: [] },
  { id: 'rt-sp-009', name: 'quality_issue_impacts_plant', domain: 'QualityIssue', range: 'Plant', description: '来料质量问题影响到的工厂。', properties: [] },
  { id: 'rt-sp-010', name: 'certificate_covers_material', domain: 'ComplianceCertificate', range: 'MaterialCategory', description: '认证或审核覆盖的物料范围。', properties: [] },
]

const SUPPLIER_PROFILE_SKILLS: SkillConfig[] = [
  { id: 'sk-sp-001', code: 'data_processing', name: '供应商主数据整编', enabled: true, prompt: '统一 SRM、交付事件、质量异常和财务风控数据，构建供应商唯一视图', source: 'built_in', tags: ['supplier', 'mdm'] },
  { id: 'sk-sp-002', code: 'graph_synthesis', name: '供应商绩效图谱融合', enabled: true, prompt: '融合供应商、物料、工厂、交付、质量和风险实体，形成供应商画像图谱', source: 'built_in', tags: ['supplier', 'graph'] },
  { id: 'sk-sp-003', code: 'custom', name: '采购份额策略编排', enabled: true, prompt: '根据交付表现、质量PPM、财务预警和资质状态推荐采购份额调整策略', source: 'built_in', tags: ['supplier', 'allocation'] },
]

const SUPPLIER_PROFILE_AI_INSIGHT_RUN: AiInsightRun = {
  id: 'ai-sp-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T09:10:00.000Z',
  completedAt: '2026-03-10T09:18:00.000Z',
  scannedDocumentCount: 12,
  addedEntityCount: 8,
  addedRelationCount: 10,
  addedEntityNames: ['Supplier', 'MaterialCategory', 'Plant', 'DeliveryPerformance', 'QualityIssue', 'FinancialRisk', 'ComplianceCertificate', 'SupplierSegment'],
  addedRelationNames: ['supplies_material', 'serves_plant', 'measured_by_delivery', 'has_quality_issue', 'exposed_to_financial_risk', 'holds_certificate', 'classified_into_segment', 'delivery_for_material', 'quality_issue_impacts_plant', 'certificate_covers_material'],
  warnings: [],
  stage: '完成',
  currentDocument: '供应商画像本体模型说明书.docx',
  logs: [
    '解析 8 份供应商主数据、交付评分、质量异常、财务预警和资质审厂资料',
    '补齐 Supplier、MaterialCategory、Plant、DeliveryPerformance、QualityIssue、FinancialRisk、ComplianceCertificate、SupplierSegment 八类核心实体',
    '形成供货范围、交付评分、质量闭环、财务预警、资质覆盖和供方分层十条关键关系链路',
  ],
}

const SUPPLIER_PROFILE_RUN: ExtractionRun = {
  id: 'run-sp-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T10:00:00.000Z',
  completedAt: '2026-03-10T10:12:00.000Z',
  candidateEntityCount: 74,
  candidateRelationCount: 56,
  pendingReviewCount: 0,
  stage: '完成',
  currentDocument: '采购份额调整与风险复核样本.jsonl',
  logs: [
    '抽取供应商、物料、工厂绑定、OTD评分和财务预警样本，生成供应商画像候选',
    '识别交付失稳、质量PPM超阈值、资质到期和现金流预警等高频治理信号',
    '形成供应商画像候选实体 74 个、关系 56 条，支撑供方评级与采购份额治理',
  ],
  warnings: [],
  reviewItems: [
    { id: 'ri-sp-001', kind: 'ENTITY', title: '宁波舜宇精密结构件 (Supplier)', evidence: 'SRM供应商主数据与供货范围映射.xlsx', confidence: 0.99, status: 'APPROVED' },
    { id: 'ri-sp-002', kind: 'ENTITY', title: '电机控制器 (MaterialCategory)', evidence: 'SRM供应商主数据与供货范围映射.xlsx', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-sp-003', kind: 'ENTITY', title: '上海总装工厂 (Plant)', evidence: '准时交付率与缺料停线事件口径说明.md', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-sp-004', kind: 'ENTITY', title: '2026年2月OTD评分卡 (DeliveryPerformance)', evidence: '月度供应商绩效评分卡模板.md', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-sp-005', kind: 'ENTITY', title: 'IQC-202603-018 (QualityIssue)', evidence: '来料质量PPM与8D闭环样本.jsonl', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-sp-006', kind: 'ENTITY', title: '现金流预警-2026Q1 (FinancialRisk)', evidence: '供应商财务风险预警指标手册.docx', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-sp-007', kind: 'ENTITY', title: 'IATF 16949 (ComplianceCertificate)', evidence: '合规认证与审厂结论清单.xlsx', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-sp-008', kind: 'ENTITY', title: '战略供方 (SupplierSegment)', evidence: '月度供应商绩效评分卡模板.md', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-sp-009', kind: 'RELATION', title: '宁波舜宇精密结构件 (Supplier) → supplies_material → 电机控制器 (MaterialCategory)', evidence: '供货范围关系', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-sp-010', kind: 'RELATION', title: '宁波舜宇精密结构件 (Supplier) → serves_plant → 上海总装工厂 (Plant)', evidence: '工厂绑定关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-sp-011', kind: 'RELATION', title: '宁波舜宇精密结构件 (Supplier) → measured_by_delivery → 2026年2月OTD评分卡 (DeliveryPerformance)', evidence: '交付评分关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-sp-012', kind: 'RELATION', title: '宁波舜宇精密结构件 (Supplier) → exposed_to_financial_risk → 现金流预警-2026Q1 (FinancialRisk)', evidence: '财务预警关系', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-sp-013', kind: 'RELATION', title: '宁波舜宇精密结构件 (Supplier) → classified_into_segment → 战略供方 (SupplierSegment)', evidence: '供方分层关系', confidence: 0.96, status: 'APPROVED' },
  ],
}

const SUPPLIER_PROFILE_VERSION: OntologyVersion = {
  id: 'ver-sp-001',
  version: 'v1.1',
  label: '供应商评级与份额治理图谱',
  createdAt: '2026-03-10T10:20:00.000Z',
  sourceRunId: 'run-sp-001',
  entityCount: 74,
  relationCount: 56,
}

const SUPPLIER_PROFILE_ACTIONS: ActionDefinition[] = [
  {
    id: 'act-sp-001',
    name: 'refresh_supplier_score',
    displayName: '刷新供应商评级',
    description: '根据交付表现、质量PPM和财务预警重新计算供应商评级分。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-sp-001',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-sp-001","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"delivery.snapshot.ingested\\"}"},{"functionId":"fn-sp-002","order":2,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"risk.snapshot.ingested\\"}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_score_review","notifyRole":"采购绩效经理"}',
    parametersJson: '[{"name":"supplierCode","displayName":"供应商编码","dataType":"STRING","required":true},{"name":"onTimeRate","displayName":"准时交付率","dataType":"FLOAT","required":true},{"name":"qualityPpm","displayName":"质量PPM","dataType":"FLOAT","required":true},{"name":"debtRatio","displayName":"负债率","dataType":"FLOAT","required":true}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"Supplier","conditionJson":"{\\"when\\":\\"supplierCode_present\\"}","propertyMappingsJson":"{\\"ratingScore\\":\\"supplier_rating_score\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"supplier_required","condition":"supplierCode != \\"\\"","message":"供应商编码不能为空"},{"name":"otd_range","condition":"onTimeRate >= 0 and onTimeRate <= 1","message":"准时交付率需在 0 到 1 之间"},{"name":"ppm_non_negative","condition":"qualityPpm >= 0","message":"质量PPM不能为负数"}]',
  },
  {
    id: 'act-sp-002',
    name: 'adjust_procurement_weight',
    displayName: '调整采购份额',
    description: '基于供应商分层、风险指数和备用供方状态，给出采购份额调整建议。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-sp-001',
    triggerType: 'MANUAL',
    triggerConfigJson: '[{"functionId":"fn-sp-003","order":1,"triggerType":"MANUAL","triggerConfig":"{\\"entry\\":\\"workspace.button\\",\\"objective\\":\\"rebalance_share\\"}"},{"functionId":"fn-sp-004","order":2,"triggerType":"MANUAL","triggerConfig":"{\\"includeBackupSupplier\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_allocation_committee","notifyRole":"采购经理"}',
    parametersJson: '[{"name":"supplierCode","displayName":"供应商编码","dataType":"STRING","required":true},{"name":"currentWeight","displayName":"当前采购份额","dataType":"FLOAT","required":true},{"name":"segmentName","displayName":"分层名称","dataType":"STRING","required":true},{"name":"riskIndex","displayName":"风险指数","dataType":"FLOAT","required":true}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"Supplier","conditionJson":"{\\"when\\":\\"supplierCode_present\\"}","propertyMappingsJson":"{\\"procurementWeight\\":\\"recommended_weight\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"SupplierSegment","conditionJson":"{\\"when\\":\\"segmentName_present\\"}","propertyMappingsJson":"{\\"from\\":\\"$supplierCode\\",\\"relation\\":\\"classified_into_segment\\",\\"to\\":\\"$segmentName\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"supplier_required","condition":"supplierCode != \\"\\"","message":"供应商编码不能为空"},{"name":"weight_range","condition":"currentWeight >= 0 and currentWeight <= 1","message":"当前采购份额需在 0 到 1 之间"},{"name":"risk_range","condition":"riskIndex >= 0 and riskIndex <= 100","message":"风险指数需在 0 到 100 之间"}]',
  },
  {
    id: 'act-sp-003',
    name: 'launch_supplier_risk_review',
    displayName: '触发供方风险复核',
    description: '当财务风险升高、质量PPM超阈值或资质到期时，自动发起供方风险复核。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-sp-006',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-sp-002","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"supplier.risk.changed\\",\\"riskThreshold\\":65}"}]',
    exceptionPolicy: 'SKIP',
    exceptionConfigJson: '{"retainDraft":true,"fallback":"manual_supplier_board","notifyRole":"SQE经理"}',
    parametersJson: '[{"name":"supplierCode","displayName":"供应商编码","dataType":"STRING","required":true},{"name":"riskIndex","displayName":"风险指数","dataType":"FLOAT","required":true},{"name":"certificateStatus","displayName":"资质状态","dataType":"STRING","required":true},{"name":"qualityPpm","displayName":"质量PPM","dataType":"FLOAT","required":true}]',
    rulesJson: '[{"ruleType":"CREATE_OBJECT","target":"FinancialRisk","conditionJson":"{\\"when\\":\\"riskIndex >= 65\\"}","propertyMappingsJson":"{\\"riskLevel\\":\\"HIGH\\",\\"alertSource\\":\\"auto_review\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"supplier_required","condition":"supplierCode != \\"\\"","message":"供应商编码不能为空"},{"name":"risk_range","condition":"riskIndex >= 0 and riskIndex <= 100","message":"风险指数需在 0 到 100 之间"},{"name":"ppm_non_negative","condition":"qualityPpm >= 0","message":"质量PPM不能为负数"}]',
  },
]

const SUPPLIER_PROFILE_FUNCTIONS: FunctionDefinition[] = [
  {
    id: 'fn-sp-001',
    name: '交付评分计算',
    description: '根据准时交付率、交期、加急次数和缺料事件计算交付得分。',
    scriptContent: 'def calc_supplier_delivery_score(on_time_rate: float, lead_time_days: int, expedite_count: int, shortage_incidents: int = 0):\n    """计算供应商交付表现得分。"""\n    base = max(min(on_time_rate, 1.0), 0.0) * 70\n    lead_time_penalty = min(max(lead_time_days - 7, 0) * 1.8, 18)\n    expedite_penalty = min(max(expedite_count, 0) * 2.5, 10)\n    shortage_penalty = min(max(shortage_incidents, 0) * 6, 18)\n    score = round(max(0, min(100, base + 30 - lead_time_penalty - expedite_penalty - shortage_penalty)), 1)\n    band = "A" if score >= 90 else "B" if score >= 75 else "C"\n    return {"deliveryScore": score, "band": band}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-sp-002',
    name: '风险指数计算',
    description: '综合财务、诉讼和质量信号计算供应商风险指数。',
    scriptContent: 'def calc_supplier_risk_index(debt_ratio: float, cash_flow_alerts: int, litigation_count: int, quality_ppm: float):\n    """计算供应商风险指数。"""\n    debt_score = min(max(debt_ratio, 0.0), 1.0) * 35\n    cash_flow_score = min(max(cash_flow_alerts, 0) * 12, 24)\n    litigation_score = min(max(litigation_count, 0) * 10, 20)\n    quality_score = min(max(quality_ppm, 0.0) / 50, 21)\n    risk_index = round(min(100, debt_score + cash_flow_score + litigation_score + quality_score), 1)\n    risk_level = "HIGH" if risk_index >= 65 else "MEDIUM" if risk_index >= 40 else "LOW"\n    return {"riskIndex": risk_index, "riskLevel": risk_level}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-sp-003',
    name: '供应商分层推荐',
    description: '依据交付得分、风险指数、质量PPM和资质状态推荐供应商分层。',
    scriptContent: 'def recommend_supplier_segment(delivery_score: float, risk_index: float, quality_ppm: float, certificate_status: str = "VALID"):\n    """推荐供应商分层。"""\n    if certificate_status != "VALID" or risk_index >= 75 or quality_ppm >= 1200:\n        segment = "观察名单"\n    elif delivery_score >= 88 and risk_index < 35 and quality_ppm < 300:\n        segment = "战略供方"\n    elif delivery_score >= 75 and risk_index < 55:\n        segment = "核心供方"\n    else:\n        segment = "条件供方"\n    return {"segmentName": segment}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-sp-004',
    name: '采购份额调整建议',
    description: '根据分层、风险指数、当前份额和备用供方状态推荐新的采购份额。',
    scriptContent: 'def build_procurement_weight_plan(current_weight: float, segment_name: str, risk_index: float, capacity_share: float, backup_supplier_ready: bool = False):\n    """生成采购份额调整建议。"""\n    segment_delta = {"战略供方": 0.08, "核心供方": 0.02, "条件供方": -0.05, "观察名单": -0.12}\n    delta = segment_delta.get(segment_name, 0.0)\n    if risk_index >= 70:\n        delta -= 0.08\n    elif risk_index <= 30:\n        delta += 0.03\n    if backup_supplier_ready and risk_index >= 55:\n        delta -= 0.05\n    upper_bound = max(min(capacity_share + 0.12, 0.75), 0.05)\n    recommended = round(max(0.05, min(current_weight + delta, upper_bound)), 3)\n    return {"recommendedWeight": recommended, "adjustment": round(recommended - current_weight, 3), "procurementAction": "rebalance" if recommended != current_weight else "hold"}',
    status: 'ACTIVE',
  },
]

const INVENTORY_RISK_PROJECT_ID = 'proj-1418'
const INVENTORY_RISK_PROJECT_NAME = '库存风险本体'
const INVENTORY_RISK_UPDATED_AT = '2026-03-11T11:30:00.000Z'
const INVENTORY_RISK_DESCRIPTION =
  '制造业 · 供应链与库存治理领域库存风险本体，覆盖物料、仓库、工厂需求、库存快照、风险信号、安全库存策略、补货建议与供应商选项；支持缺货预警、超储识别、补货建议和供方分摊决策。'

const INVENTORY_RISK_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-ir-001',
    name: '库存风险本体模型说明书.docx',
    fileType: 'docx',
    size: 216064,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-03T09:20:00.000Z',
  },
  {
    id: 'doc-ir-002',
    name: '物料安全库存与补货阈值策略.xlsx',
    fileType: 'xlsx',
    size: 248320,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-04T10:30:00.000Z',
  },
  {
    id: 'doc-ir-003',
    name: '缺料停线与库存预警口径说明.md',
    fileType: 'md',
    size: 97280,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-05T11:15:00.000Z',
  },
  {
    id: 'doc-ir-004',
    name: '仓库库存快照与在途样本.jsonl',
    fileType: 'jsonl',
    size: 74624,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-06T14:20:00.000Z',
  },
  {
    id: 'doc-ir-005',
    name: '工厂需求波动与缺料升级案例.docx',
    fileType: 'docx',
    size: 183296,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-07T09:50:00.000Z',
  },
  {
    id: 'doc-ir-006',
    name: '供应商交期与MOQ约束清单.xlsx',
    fileType: 'xlsx',
    size: 209920,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-08T11:00:00.000Z',
  },
  {
    id: 'doc-ir-007',
    name: '库存风险周报与处置SOP.md',
    fileType: 'md',
    size: 89600,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-09T15:35:00.000Z',
  },
  {
    id: 'doc-ir-008',
    name: '自动补货与调拨建议样本.jsonl',
    fileType: 'jsonl',
    size: 71296,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-11T09:00:00.000Z',
  },
]

const INVENTORY_RISK_DATA_SOURCES: StructuredDataSource[] = [
  {
    id: 'ds-ir-001',
    name: 'ERP库存主数据中心',
    type: 'MYSQL',
    host: '10.15.22.18',
    port: 3306,
    database: 'inventory_core',
    username: 'inv_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['material_master', 'warehouse_stock_snapshot', 'in_transit_stock'],
    rowLimit: 220000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'snapshot_time',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:12:00.000Z',
    lastError: '',
    createdAt: '2026-03-03T10:00:00.000Z',
    updatedAt: '2026-03-11T08:12:00.000Z',
  },
  {
    id: 'ds-ir-002',
    name: '工厂需求与缺料事件仓',
    type: 'CLICKHOUSE',
    host: '10.15.22.33',
    port: 8123,
    database: 'plant_supply_demand',
    username: 'demand_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['plant_demand_daily', 'shortage_event', 'consumption_history'],
    rowLimit: 300000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'biz_date',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:20:00.000Z',
    lastError: '',
    createdAt: '2026-03-04T10:00:00.000Z',
    updatedAt: '2026-03-11T08:20:00.000Z',
  },
  {
    id: 'ds-ir-003',
    name: '供应商交期与采购约束库',
    type: 'POSTGRESQL',
    host: '10.15.22.46',
    port: 5432,
    database: 'procurement_constraints',
    username: 'po_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['supplier_lead_time', 'purchase_moq', 'supplier_capacity_share'],
    rowLimit: 120000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'updated_at',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:28:00.000Z',
    lastError: '',
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-11T08:28:00.000Z',
  },
]

const INVENTORY_RISK_ENTITY_TYPES: EntityTypeConfig[] = [
  {
    id: 'et-ir-001',
    name: 'Material',
    description: '被管控的关键物料或备件。',
    properties: [
      { id: 'ep-ir-001', name: 'materialCode', displayName: '物料编码', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-ir-002', name: 'materialName', displayName: '物料名称', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-ir-003', name: 'abcClass', displayName: 'ABC分类', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-ir-004', name: 'criticality', displayName: '关键度', dataType: 'STRING', required: false, sortOrder: 4 },
      { id: 'ep-ir-005', name: 'unit', displayName: '计量单位', dataType: 'STRING', required: false, sortOrder: 5 },
    ],
  },
  {
    id: 'et-ir-002',
    name: 'Warehouse',
    description: '物料库存所在仓库、线边仓或产线超市。',
    properties: [
      { id: 'ep-ir-011', name: 'warehouseCode', displayName: '仓库编码', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-ir-012', name: 'warehouseName', displayName: '仓库名称', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-ir-013', name: 'warehouseType', displayName: '仓库类型', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-ir-014', name: 'region', displayName: '所属区域', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-ir-003',
    name: 'PlantDemand',
    description: '工厂、产线或售后网络对物料的需求计划。',
    properties: [
      { id: 'ep-ir-021', name: 'demandDate', displayName: '需求日期', dataType: 'DATE', required: true, sortOrder: 1 },
      { id: 'ep-ir-022', name: 'dailyDemandQty', displayName: '日需求量', dataType: 'FLOAT', required: true, sortOrder: 2 },
      { id: 'ep-ir-023', name: 'demandVolatility', displayName: '需求波动系数', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-ir-024', name: 'plantPriority', displayName: '工厂优先级', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-ir-004',
    name: 'InventorySnapshot',
    description: '库存快照，记录现存、在途、锁定和可用库存状态。',
    properties: [
      { id: 'ep-ir-031', name: 'snapshotTime', displayName: '快照时间', dataType: 'DATETIME', required: true, sortOrder: 1 },
      { id: 'ep-ir-032', name: 'onHandQty', displayName: '现存数量', dataType: 'FLOAT', required: true, sortOrder: 2 },
      { id: 'ep-ir-033', name: 'inTransitQty', displayName: '在途数量', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-ir-034', name: 'availableQty', displayName: '可用数量', dataType: 'FLOAT', required: false, sortOrder: 4 },
      { id: 'ep-ir-035', name: 'coverDays', displayName: '库存覆盖天数', dataType: 'FLOAT', required: false, sortOrder: 5 },
    ],
  },
  {
    id: 'et-ir-005',
    name: 'RiskSignal',
    description: '库存相关风险预警，例如缺货、超储、断供和交期拉长。',
    properties: [
      { id: 'ep-ir-041', name: 'riskType', displayName: '风险类型', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-ir-042', name: 'riskLevel', displayName: '风险等级', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-ir-043', name: 'impactDays', displayName: '影响天数', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-ir-044', name: 'riskScore', displayName: '风险评分', dataType: 'FLOAT', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-ir-006',
    name: 'SafetyStockPolicy',
    description: '针对物料和场景定义的安全库存与补货策略。',
    properties: [
      { id: 'ep-ir-051', name: 'safetyStockQty', displayName: '安全库存量', dataType: 'FLOAT', required: true, sortOrder: 1 },
      { id: 'ep-ir-052', name: 'targetCoverDays', displayName: '目标覆盖天数', dataType: 'INTEGER', required: true, sortOrder: 2 },
      { id: 'ep-ir-053', name: 'reorderPoint', displayName: '补货点', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-ir-054', name: 'policyScenario', displayName: '策略场景', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-ir-007',
    name: 'ReplenishmentRecommendation',
    description: '补货、调拨或降库存处置建议。',
    properties: [
      { id: 'ep-ir-061', name: 'recommendedQty', displayName: '建议数量', dataType: 'FLOAT', required: true, sortOrder: 1 },
      { id: 'ep-ir-062', name: 'recommendationType', displayName: '建议类型', dataType: 'STRING', required: true, sortOrder: 2 },
      { id: 'ep-ir-063', name: 'expectedArrivalDays', displayName: '预计到货天数', dataType: 'INTEGER', required: false, sortOrder: 3 },
      { id: 'ep-ir-064', name: 'reasonSummary', displayName: '建议原因', dataType: 'TEXT', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-ir-008',
    name: 'SupplierOption',
    description: '可用于补货或分摊采购的供应商候选。',
    properties: [
      { id: 'ep-ir-071', name: 'supplierName', displayName: '供应商名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-ir-072', name: 'leadTimeDays', displayName: '交期(天)', dataType: 'INTEGER', required: false, sortOrder: 2 },
      { id: 'ep-ir-073', name: 'moq', displayName: 'MOQ', dataType: 'FLOAT', required: false, sortOrder: 3 },
      { id: 'ep-ir-074', name: 'capacityShare', displayName: '可供份额', dataType: 'FLOAT', required: false, sortOrder: 4 },
    ],
  },
]

const INVENTORY_RISK_RELATION_TYPES: RelationTypeConfig[] = [
  { id: 'rt-ir-001', name: 'stocked_in', domain: 'Material', range: 'Warehouse', description: '物料在仓库中的库存归属。', properties: [] },
  { id: 'rt-ir-002', name: 'faces_demand', domain: 'Material', range: 'PlantDemand', description: '物料对应的工厂或产线需求。', properties: [] },
  { id: 'rt-ir-003', name: 'tracked_by_snapshot', domain: 'Material', range: 'InventorySnapshot', description: '物料当前库存快照。', properties: [] },
  { id: 'rt-ir-004', name: 'constrained_by_policy', domain: 'Material', range: 'SafetyStockPolicy', description: '物料适用的安全库存策略。', properties: [] },
  { id: 'rt-ir-005', name: 'triggers_risk_signal', domain: 'InventorySnapshot', range: 'RiskSignal', description: '库存状态触发的风险预警。', properties: [] },
  { id: 'rt-ir-006', name: 'mitigated_by_replenishment', domain: 'RiskSignal', range: 'ReplenishmentRecommendation', description: '风险对应的补货或调拨建议。', properties: [] },
  { id: 'rt-ir-007', name: 'recommendation_for_material', domain: 'ReplenishmentRecommendation', range: 'Material', description: '补货建议针对的物料。', properties: [] },
  { id: 'rt-ir-008', name: 'recommendation_to_warehouse', domain: 'ReplenishmentRecommendation', range: 'Warehouse', description: '补货或调拨建议的执行仓。', properties: [] },
  { id: 'rt-ir-009', name: 'risk_impacts_plant', domain: 'RiskSignal', range: 'PlantDemand', description: '库存风险影响的工厂需求。', properties: [] },
  { id: 'rt-ir-010', name: 'sourced_from_supplier', domain: 'ReplenishmentRecommendation', range: 'SupplierOption', description: '建议补货来源的供应商选项。', properties: [] },
]

const INVENTORY_RISK_SKILLS: SkillConfig[] = [
  { id: 'sk-ir-001', code: 'data_processing', name: '库存与需求整编', enabled: true, prompt: '统一 ERP 库存、工厂需求和在途库存数据，形成库存风险分析视图', source: 'built_in', tags: ['inventory', 'demand'] },
  { id: 'sk-ir-002', code: 'graph_synthesis', name: '库存风险图谱融合', enabled: true, prompt: '融合物料、仓库、需求、库存快照、风险信号和补货建议，形成库存治理图谱', source: 'built_in', tags: ['inventory', 'graph'] },
  { id: 'sk-ir-003', code: 'custom', name: '补货与调拨策略编排', enabled: true, prompt: '根据安全库存、交期、MOQ 和风险等级编排补货、调拨与降库存建议', source: 'built_in', tags: ['inventory', 'replenishment'] },
]

const INVENTORY_RISK_AI_INSIGHT_RUN: AiInsightRun = {
  id: 'ai-ir-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T09:30:00.000Z',
  completedAt: '2026-03-10T09:38:00.000Z',
  scannedDocumentCount: 8,
  addedEntityCount: 8,
  addedRelationCount: 10,
  addedEntityNames: ['Material', 'Warehouse', 'PlantDemand', 'InventorySnapshot', 'RiskSignal', 'SafetyStockPolicy', 'ReplenishmentRecommendation', 'SupplierOption'],
  addedRelationNames: ['stocked_in', 'faces_demand', 'tracked_by_snapshot', 'constrained_by_policy', 'triggers_risk_signal', 'mitigated_by_replenishment', 'recommendation_for_material', 'recommendation_to_warehouse', 'risk_impacts_plant', 'sourced_from_supplier'],
  warnings: [],
  stage: '完成',
  currentDocument: '库存风险本体模型说明书.docx',
  logs: [
    '解析 8 份库存策略、需求波动、供应商约束与补货建议资料',
    '补齐 Material、Warehouse、PlantDemand、InventorySnapshot、RiskSignal、SafetyStockPolicy、ReplenishmentRecommendation、SupplierOption 八类核心实体',
    '形成库存状态、需求波动、风险预警与补货建议十条关键关系链路',
  ],
}

const INVENTORY_RISK_RUN: ExtractionRun = {
  id: 'run-ir-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T10:10:00.000Z',
  completedAt: '2026-03-10T10:22:00.000Z',
  candidateEntityCount: 78,
  candidateRelationCount: 62,
  pendingReviewCount: 0,
  stage: '完成',
  currentDocument: '自动补货与调拨建议样本.jsonl',
  logs: [
    '抽取物料库存、工厂需求、在途供给、安全库存和供应商交期约束样本',
    '识别缺货、超储、交期拉长和单一供方依赖等高频库存风险信号',
    '形成库存风险候选实体 78 个、关系 62 条，支撑补货、调拨和降库存处置',
  ],
  warnings: [],
  reviewItems: [
    { id: 'ri-ir-001', kind: 'ENTITY', title: '高精密轴承6208 (Material)', evidence: '物料安全库存与补货阈值策略.xlsx', confidence: 0.99, status: 'APPROVED' },
    { id: 'ri-ir-002', kind: 'ENTITY', title: '华东中心仓 (Warehouse)', evidence: '仓库库存快照与在途样本.jsonl', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-ir-003', kind: 'ENTITY', title: '上海总装本周需求 (PlantDemand)', evidence: '工厂需求波动与缺料升级案例.docx', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ir-004', kind: 'ENTITY', title: '库存快照-2026-03-11 (InventorySnapshot)', evidence: '仓库库存快照与在途样本.jsonl', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-ir-005', kind: 'ENTITY', title: '缺货风险预警 (RiskSignal)', evidence: '库存风险周报与处置SOP.md', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ir-006', kind: 'ENTITY', title: 'A类关键件安全库存策略 (SafetyStockPolicy)', evidence: '物料安全库存与补货阈值策略.xlsx', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ir-007', kind: 'ENTITY', title: '补货建议单#IR-001 (ReplenishmentRecommendation)', evidence: '自动补货与调拨建议样本.jsonl', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ir-008', kind: 'ENTITY', title: '宁波舜宇精密结构件 (SupplierOption)', evidence: '供应商交期与MOQ约束清单.xlsx', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-ir-009', kind: 'RELATION', title: '高精密轴承6208 (Material) → stocked_in → 华东中心仓 (Warehouse)', evidence: '库存归属关系', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-ir-010', kind: 'RELATION', title: '高精密轴承6208 (Material) → faces_demand → 上海总装本周需求 (PlantDemand)', evidence: '需求关联关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ir-011', kind: 'RELATION', title: '库存快照-2026-03-11 (InventorySnapshot) → triggers_risk_signal → 缺货风险预警 (RiskSignal)', evidence: '风险识别关系', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-ir-012', kind: 'RELATION', title: '缺货风险预警 (RiskSignal) → mitigated_by_replenishment → 补货建议单#IR-001 (ReplenishmentRecommendation)', evidence: '处置建议关系', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-ir-013', kind: 'RELATION', title: '补货建议单#IR-001 (ReplenishmentRecommendation) → sourced_from_supplier → 宁波舜宇精密结构件 (SupplierOption)', evidence: '供应商建议关系', confidence: 0.96, status: 'APPROVED' },
  ],
}

const INVENTORY_RISK_VERSION: OntologyVersion = {
  id: 'ver-ir-001',
  version: 'v1.1',
  label: '库存预警与补货治理图谱',
  createdAt: '2026-03-10T10:28:00.000Z',
  sourceRunId: 'run-ir-001',
  entityCount: 78,
  relationCount: 62,
}

const INVENTORY_RISK_ACTIONS: ActionDefinition[] = [
  {
    id: 'act-ir-001',
    name: 'refresh_inventory_cover',
    displayName: '刷新库存覆盖天数',
    description: '根据现存、在途和日需求量计算库存覆盖天数并回写快照。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-ir-004',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-ir-001","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"inventory.snapshot.ingested\\"}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_inventory_review","notifyRole":"库存计划员"}',
    parametersJson: '[{"name":"materialCode","displayName":"物料编码","dataType":"STRING","required":true},{"name":"onHandQty","displayName":"现存数量","dataType":"FLOAT","required":true},{"name":"inTransitQty","displayName":"在途数量","dataType":"FLOAT","required":true},{"name":"dailyDemand","displayName":"日需求量","dataType":"FLOAT","required":true}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"InventorySnapshot","conditionJson":"{\\"when\\":\\"materialCode_present\\"}","propertyMappingsJson":"{\\"coverDays\\":\\"cover_days\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"material_required","condition":"materialCode != \\"\\"","message":"物料编码不能为空"},{"name":"qty_non_negative","condition":"onHandQty >= 0 and inTransitQty >= 0","message":"库存数量不能为负数"},{"name":"demand_positive","condition":"dailyDemand > 0","message":"日需求量必须大于 0"}]',
  },
  {
    id: 'act-ir-002',
    name: 'evaluate_shortage_risk',
    displayName: '评估缺货风险',
    description: '结合缺口天数、需求波动和供应商交期评估库存风险等级。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-ir-005',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-ir-002","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"inventory.cover.changed\\",\\"includeSingleSource\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_risk_board","notifyRole":"供应链经理"}',
    parametersJson: '[{"name":"shortageDays","displayName":"缺口天数","dataType":"FLOAT","required":true},{"name":"demandVolatility","displayName":"需求波动系数","dataType":"FLOAT","required":true},{"name":"supplierLeadTime","displayName":"供应商交期","dataType":"INTEGER","required":true},{"name":"singleSource","displayName":"是否单一供方","dataType":"BOOLEAN","required":false,"defaultValue":"false"}]',
    rulesJson: '[{"ruleType":"CREATE_OBJECT","target":"RiskSignal","conditionJson":"{\\"when\\":\\"shortageDays > 0\\"}","propertyMappingsJson":"{\\"riskLevel\\":\\"risk_level\\",\\"riskScore\\":\\"risk_score\\",\\"riskType\\":\\"shortage\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"shortage_non_negative","condition":"shortageDays >= 0","message":"缺口天数不能为负数"},{"name":"volatility_non_negative","condition":"demandVolatility >= 0","message":"需求波动不能为负数"},{"name":"lead_time_positive","condition":"supplierLeadTime > 0","message":"供应商交期必须大于 0"}]',
  },
  {
    id: 'act-ir-003',
    name: 'generate_replenishment_plan',
    displayName: '生成补货建议',
    description: '根据目标覆盖天数、库存缺口和 MOQ 生成补货或调拨建议。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-ir-007',
    triggerType: 'MANUAL',
    triggerConfigJson: '[{"functionId":"fn-ir-003","order":1,"triggerType":"MANUAL","triggerConfig":"{\\"entry\\":\\"workspace.button\\",\\"respectMoq\\":true}"},{"functionId":"fn-ir-004","order":2,"triggerType":"MANUAL","triggerConfig":"{\\"splitBySupplier\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_replenishment_committee","notifyRole":"采购计划员"}',
    parametersJson: '[{"name":"targetCoverDays","displayName":"目标覆盖天数","dataType":"INTEGER","required":true},{"name":"dailyDemand","displayName":"日需求量","dataType":"FLOAT","required":true},{"name":"onHandQty","displayName":"现存数量","dataType":"FLOAT","required":true},{"name":"inTransitQty","displayName":"在途数量","dataType":"FLOAT","required":true},{"name":"moq","displayName":"MOQ","dataType":"FLOAT","required":true}]',
    rulesJson: '[{"ruleType":"CREATE_OBJECT","target":"ReplenishmentRecommendation","conditionJson":"{\\"when\\":\\"dailyDemand > 0\\"}","propertyMappingsJson":"{\\"recommendedQty\\":\\"recommended_qty\\",\\"recommendationType\\":\\"purchase\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"cover_positive","condition":"targetCoverDays > 0","message":"目标覆盖天数必须大于 0"},{"name":"demand_positive","condition":"dailyDemand > 0","message":"日需求量必须大于 0"},{"name":"moq_positive","condition":"moq >= 0","message":"MOQ 不能为负数"}]',
  },
]

const INVENTORY_RISK_FUNCTIONS: FunctionDefinition[] = [
  {
    id: 'fn-ir-001',
    name: '库存覆盖天数计算',
    description: '根据现存、在途和日需求量计算库存覆盖天数。',
    scriptContent: 'def calc_inventory_cover_days(on_hand_qty: float, in_transit_qty: float, daily_demand: float):\n    """计算库存覆盖天数。"""\n    available = max(on_hand_qty, 0) + max(in_transit_qty, 0)\n    cover_days = round(available / daily_demand, 2) if daily_demand > 0 else 999.0\n    return {"availableQty": available, "coverDays": cover_days}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-ir-002',
    name: '库存风险评分',
    description: '综合缺口天数、需求波动、交期和单一供方因素计算风险等级。',
    scriptContent: 'def evaluate_inventory_risk(shortage_days: float, demand_volatility: float, supplier_lead_time: int, single_source: bool = False):\n    """评估库存风险等级。"""\n    score = min(max(shortage_days, 0), 15) * 4 + min(max(demand_volatility, 0), 1) * 25 + min(max(supplier_lead_time, 0), 30) * 1.5 + (12 if single_source else 0)\n    risk_level = "HIGH" if score >= 65 else "MEDIUM" if score >= 35 else "LOW"\n    return {"riskScore": round(min(score, 100), 1), "riskLevel": risk_level}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-ir-003',
    name: '补货数量建议',
    description: '根据目标覆盖天数、库存现状和 MOQ 输出建议补货数量。',
    scriptContent: 'def recommend_replenishment_qty(target_cover_days: int, daily_demand: float, on_hand_qty: float, in_transit_qty: float, moq: float = 0):\n    """计算建议补货数量。"""\n    target_stock = target_cover_days * daily_demand\n    current_stock = max(on_hand_qty, 0) + max(in_transit_qty, 0)\n    gap = max(target_stock - current_stock, 0)\n    recommended_qty = max(gap, moq) if gap > 0 else 0\n    return {"targetStock": round(target_stock, 1), "currentStock": round(current_stock, 1), "recommendedQty": round(recommended_qty, 1)}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-ir-004',
    name: '供应商分摊建议',
    description: '根据供应商可供份额、风险分和 MOQ 约束输出分摊采购方案。',
    scriptContent: 'def allocate_supplier_split(replenishment_qty: float, supplier_options: list[dict]):\n    """生成供应商分摊方案。"""\n    ranked = sorted(supplier_options, key=lambda item: (item.get("riskScore", 100), -item.get("capacityShare", 0)))\n    remain = replenishment_qty\n    allocations = []\n    for item in ranked:\n        capacity = max(item.get("capacityShare", 0), 0)\n        qty = min(remain, replenishment_qty * capacity)\n        allocations.append({"supplierName": item.get("supplierName"), "allocatedQty": round(qty, 1)})\n        remain = max(remain - qty, 0)\n    return {"allocations": allocations, "remainQty": round(remain, 1)}',
    status: 'ACTIVE',
  },
]

const CONTRACT_CONSTRAINTS_PROJECT_ID = 'proj-1524'
const CONTRACT_CONSTRAINTS_PROJECT_NAME = '合同约束本体'
const CONTRACT_CONSTRAINTS_UPDATED_AT = '2026-03-11T10:40:00.000Z'
const CONTRACT_CONSTRAINTS_DESCRIPTION =
  '制造业 · 销售与合同治理领域合同约束本体，覆盖合同模板、合同条款、合规要求、风险场景、审批节点、履约义务、交易对手与履约事件；支持法审扫描、合同风控、审批协同与履约预警。'

const CONTRACT_CONSTRAINTS_DOCUMENTS: ProjectDocument[] = [
  {
    id: 'doc-cc-001',
    name: '合同约束本体模型说明书.docx',
    fileType: 'docx',
    size: 221184,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-03T09:10:00.000Z',
  },
  {
    id: 'doc-cc-002',
    name: '设备采购主协议模板与红线条款清单.xlsx',
    fileType: 'xlsx',
    size: 248832,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-04T10:20:00.000Z',
  },
  {
    id: 'doc-cc-003',
    name: '法务合同审查规则与风险分级标准.md',
    fileType: 'md',
    size: 98624,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-05T11:00:00.000Z',
  },
  {
    id: 'doc-cc-004',
    name: '高风险合同条款审查样本.jsonl',
    fileType: 'jsonl',
    size: 70312,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-06T14:10:00.000Z',
  },
  {
    id: 'doc-cc-005',
    name: '审批流节点与会签策略配置.xlsx',
    fileType: 'xlsx',
    size: 184320,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-07T09:40:00.000Z',
  },
  {
    id: 'doc-cc-006',
    name: '履约义务跟踪与违约事件归档模板.docx',
    fileType: 'docx',
    size: 169984,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-08T13:30:00.000Z',
  },
  {
    id: 'doc-cc-007',
    name: '知识产权与保密约束专项审查规则.md',
    fileType: 'md',
    size: 90112,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-09T15:00:00.000Z',
  },
  {
    id: 'doc-cc-008',
    name: '合同履约异常与赔付案例库.jsonl',
    fileType: 'jsonl',
    size: 79264,
    status: 'READY',
    enabled: true,
    uploadedAt: '2026-03-10T16:40:00.000Z',
  },
]

const CONTRACT_CONSTRAINTS_DATA_SOURCES: StructuredDataSource[] = [
  {
    id: 'ds-cc-001',
    name: '合同主数据中心',
    type: 'POSTGRESQL',
    host: '10.18.16.31',
    port: 5432,
    database: 'contract_master',
    username: 'contract_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['contract_header', 'contract_clause', 'counterparty_master'],
    rowLimit: 150000,
    syncMode: 'FULL',
    incrementalColumn: '',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:40:00.000Z',
    lastError: '',
    createdAt: '2026-03-03T10:00:00.000Z',
    updatedAt: '2026-03-11T08:40:00.000Z',
  },
  {
    id: 'ds-cc-002',
    name: '合同审批与会签工作流库',
    type: 'MYSQL',
    host: '10.18.16.37',
    port: 3306,
    database: 'contract_workflow',
    username: 'workflow_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['approval_instance', 'approval_checkpoint', 'legal_review_comment'],
    rowLimit: 120000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'updated_at',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:46:00.000Z',
    lastError: '',
    createdAt: '2026-03-04T10:00:00.000Z',
    updatedAt: '2026-03-11T08:46:00.000Z',
  },
  {
    id: 'ds-cc-003',
    name: '履约与违约事件分析库',
    type: 'CLICKHOUSE',
    host: '10.18.16.44',
    port: 8123,
    database: 'contract_fulfillment',
    username: 'fulfillment_reader',
    password: '',
    sslEnabled: false,
    enabled: true,
    extractMode: 'TABLE',
    tables: ['obligation_tracker', 'fulfillment_event', 'breach_event'],
    rowLimit: 220000,
    syncMode: 'INCREMENTAL',
    incrementalColumn: 'event_time',
    status: 'SUCCESS',
    lastTestAt: '2026-03-11T08:52:00.000Z',
    lastError: '',
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-11T08:52:00.000Z',
  },
]

const CONTRACT_CONSTRAINTS_ENTITY_TYPES: EntityTypeConfig[] = [
  {
    id: 'et-cc-001',
    name: 'ContractTemplate',
    description: '标准合同模板或具体合同文档。',
    properties: [
      { id: 'ep-cc-001', name: 'templateName', displayName: '模板名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-cc-002', name: 'contractType', displayName: '合同类型', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-cc-003', name: 'version', displayName: '版本号', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-cc-004', name: 'status', displayName: '状态', dataType: 'STRING', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-cc-002',
    name: 'ContractClause',
    description: '合同中的具体条款，包括付款、违约、验收、保密等。',
    properties: [
      { id: 'ep-cc-011', name: 'clauseTitle', displayName: '条款标题', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-cc-012', name: 'clauseType', displayName: '条款类型', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-cc-013', name: 'riskLevel', displayName: '风险等级', dataType: 'STRING', required: false, sortOrder: 3 },
      { id: 'ep-cc-014', name: 'reviewNote', displayName: '审查意见', dataType: 'TEXT', required: false, sortOrder: 4 },
    ],
  },
  {
    id: 'et-cc-003',
    name: 'ComplianceRequirement',
    description: '合同签署与履约过程中必须满足的法务或风控要求。',
    properties: [
      { id: 'ep-cc-021', name: 'requirementName', displayName: '要求名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-cc-022', name: 'source', displayName: '来源', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-cc-023', name: 'controlType', displayName: '控制方式', dataType: 'STRING', required: false, sortOrder: 3 },
    ],
  },
  {
    id: 'et-cc-004',
    name: 'RiskScenario',
    description: '合同谈判或履约中的典型风险场景。',
    properties: [
      { id: 'ep-cc-031', name: 'scenarioName', displayName: '风险场景', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-cc-032', name: 'impactLevel', displayName: '影响等级', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-cc-033', name: 'mitigation', displayName: '缓释建议', dataType: 'TEXT', required: false, sortOrder: 3 },
    ],
  },
  {
    id: 'et-cc-005',
    name: 'ApprovalCheckpoint',
    description: '合同审批流中的节点、会签角色或升级审批点。',
    properties: [
      { id: 'ep-cc-041', name: 'checkpointName', displayName: '节点名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-cc-042', name: 'ownerRole', displayName: '负责角色', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-cc-043', name: 'slaHours', displayName: 'SLA时长', dataType: 'INTEGER', required: false, sortOrder: 3 },
    ],
  },
  {
    id: 'et-cc-006',
    name: 'Obligation',
    description: '合同双方约定的关键履约义务。',
    properties: [
      { id: 'ep-cc-051', name: 'obligationName', displayName: '义务名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-cc-052', name: 'dueRule', displayName: '履约规则', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-cc-053', name: 'breachCost', displayName: '违约成本', dataType: 'FLOAT', required: false, sortOrder: 3 },
    ],
  },
  {
    id: 'et-cc-007',
    name: 'Counterparty',
    description: '合同相对方，如客户采购中心、事业部或合作方。',
    properties: [
      { id: 'ep-cc-061', name: 'counterpartyName', displayName: '相对方名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-cc-062', name: 'counterpartyType', displayName: '相对方类型', dataType: 'STRING', required: false, sortOrder: 2 },
      { id: 'ep-cc-063', name: 'creditLevel', displayName: '信用等级', dataType: 'STRING', required: false, sortOrder: 3 },
    ],
  },
  {
    id: 'et-cc-008',
    name: 'FulfillmentEvent',
    description: '合同履约过程中的关键事件，如交付、验收、回款、违约。',
    properties: [
      { id: 'ep-cc-071', name: 'eventName', displayName: '事件名称', dataType: 'STRING', required: true, sortOrder: 1 },
      { id: 'ep-cc-072', name: 'eventTime', displayName: '发生时间', dataType: 'DATETIME', required: false, sortOrder: 2 },
      { id: 'ep-cc-073', name: 'eventStatus', displayName: '事件状态', dataType: 'STRING', required: false, sortOrder: 3 },
    ],
  },
]

const CONTRACT_CONSTRAINTS_RELATION_TYPES: RelationTypeConfig[] = [
  { id: 'rt-cc-001', name: 'contains_clause', domain: 'ContractTemplate', range: 'ContractClause', description: '合同模板包含具体条款。', properties: [] },
  { id: 'rt-cc-002', name: 'requires_compliance', domain: 'ContractClause', range: 'ComplianceRequirement', description: '条款需要满足特定合规要求。', properties: [] },
  { id: 'rt-cc-003', name: 'triggers_risk', domain: 'ContractClause', range: 'RiskScenario', description: '条款可能触发的风险场景。', properties: [] },
  { id: 'rt-cc-004', name: 'reviewed_at', domain: 'ContractTemplate', range: 'ApprovalCheckpoint', description: '合同在审批节点进行审查。', properties: [] },
  { id: 'rt-cc-005', name: 'defines_obligation', domain: 'ContractClause', range: 'Obligation', description: '条款定义的履约义务。', properties: [] },
  { id: 'rt-cc-006', name: 'signed_with', domain: 'ContractTemplate', range: 'Counterparty', description: '合同模板对应的签约相对方。', properties: [] },
  { id: 'rt-cc-007', name: 'tracked_by_event', domain: 'Obligation', range: 'FulfillmentEvent', description: '履约义务通过事件进行跟踪。', properties: [] },
  { id: 'rt-cc-008', name: 'escalates_to', domain: 'RiskScenario', range: 'ApprovalCheckpoint', description: '高风险场景升级到指定审批节点。', properties: [] },
]

const CONTRACT_CONSTRAINTS_SKILLS: SkillConfig[] = [
  { id: 'sk-cc-001', code: 'data_processing', name: '合同条款拆解', enabled: true, prompt: '将合同模板、法审意见和履约记录拆解为结构化条款、义务和事件', source: 'built_in', tags: ['contract', 'etl'] },
  { id: 'sk-cc-002', code: 'graph_synthesis', name: '合同风控图谱融合', enabled: true, prompt: '融合合同、条款、审批流、相对方与履约事件，生成合同约束关系图谱', source: 'built_in', tags: ['contract', 'graph'] },
  { id: 'sk-cc-003', code: 'custom', name: '法审规则编排', enabled: true, prompt: '依据红线条款、知识产权、交付验收与赔付规则自动输出法审意见', source: 'built_in', tags: ['contract', 'review'] },
]

const CONTRACT_CONSTRAINTS_AI_INSIGHT_RUN: AiInsightRun = {
  id: 'ai-cc-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T09:30:00.000Z',
  completedAt: '2026-03-10T09:38:00.000Z',
  scannedDocumentCount: 8,
  addedEntityCount: 8,
  addedRelationCount: 8,
  addedEntityNames: ['ContractTemplate', 'ContractClause', 'ComplianceRequirement', 'RiskScenario', 'ApprovalCheckpoint', 'Obligation', 'Counterparty', 'FulfillmentEvent'],
  addedRelationNames: ['contains_clause', 'requires_compliance', 'triggers_risk', 'reviewed_at', 'defines_obligation', 'signed_with', 'tracked_by_event', 'escalates_to'],
  warnings: [],
  stage: '完成',
  currentDocument: '高风险合同条款审查样本.jsonl',
  logs: [
    '扫描 8 份合同模板、法审规则、审批策略与履约异常样本',
    '补齐合同模板、条款、合规要求、风险场景、审批节点、履约义务、交易对手和履约事件八类实体',
    '建立合同审查、审批协同、履约跟踪和违约升级八条关键关系链路',
  ],
}

const CONTRACT_CONSTRAINTS_RUN: ExtractionRun = {
  id: 'run-cc-001',
  status: 'COMPLETED',
  progress: 100,
  createdAt: '2026-03-10T10:00:00.000Z',
  completedAt: '2026-03-10T10:15:00.000Z',
  candidateEntityCount: 68,
  candidateRelationCount: 54,
  pendingReviewCount: 0,
  stage: '完成',
  currentDocument: '合同履约异常与赔付案例库.jsonl',
  logs: [
    '抽取设备采购与维保合同中的高风险条款、审批流与履约记录',
    '识别逾期交付、验收模糊、账期拖长与知识产权争议等合同风险场景',
    '生成合同约束候选实体 68 个、关系 54 条，支撑法审、审批和履约预警',
  ],
  warnings: [],
  reviewItems: [
    { id: 'ri-cc-001', kind: 'ENTITY', title: '设备采购主协议 (ContractTemplate)', evidence: '设备采购主协议模板与红线条款清单.xlsx', confidence: 0.99, status: 'APPROVED' },
    { id: 'ri-cc-002', kind: 'ENTITY', title: '违约赔偿条款 (ContractClause)', evidence: '高风险合同条款审查样本.jsonl', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-cc-003', kind: 'ENTITY', title: '高风险条款需法审会签 (ComplianceRequirement)', evidence: '法务合同审查规则与风险分级标准.md', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-cc-004', kind: 'ENTITY', title: '逾期交付赔付风险 (RiskScenario)', evidence: '合同履约异常与赔付案例库.jsonl', confidence: 0.97, status: 'APPROVED' },
    { id: 'ri-cc-005', kind: 'ENTITY', title: '法务专员复核 (ApprovalCheckpoint)', evidence: '审批流节点与会签策略配置.xlsx', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-cc-006', kind: 'ENTITY', title: '7日内完成交付 (Obligation)', evidence: '履约义务跟踪与违约事件归档模板.docx', confidence: 0.96, status: 'APPROVED' },
    { id: 'ri-cc-007', kind: 'RELATION', title: '设备采购主协议 (ContractTemplate) → contains_clause → 违约赔偿条款 (ContractClause)', evidence: '合同模板关系', confidence: 0.98, status: 'APPROVED' },
    { id: 'ri-cc-008', kind: 'RELATION', title: '违约赔偿条款 (ContractClause) → triggers_risk → 逾期交付赔付风险 (RiskScenario)', evidence: '风险映射关系', confidence: 0.97, status: 'APPROVED' },
  ],
}

const CONTRACT_CONSTRAINTS_VERSION: OntologyVersion = {
  id: 'ver-cc-001',
  version: 'v1.1',
  label: '合同审查与履约风控图谱',
  createdAt: '2026-03-10T10:20:00.000Z',
  sourceRunId: 'run-cc-001',
  entityCount: 68,
  relationCount: 54,
}

const CONTRACT_CONSTRAINTS_ACTIONS: ActionDefinition[] = [
  {
    id: 'act-cc-001',
    name: 'scan_contract_clause_risk',
    displayName: '扫描合同条款风险',
    description: '对合同草案进行条款级风险扫描，识别红线内容和高风险修改点。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-cc-002',
    triggerType: 'MANUAL',
    triggerConfigJson: '[{"functionId":"fn-cc-001","order":1,"triggerType":"MANUAL","triggerConfig":"{\\"entry\\":\\"workspace.button\\",\\"includeRedline\\":true}"},{"functionId":"fn-cc-002","order":2,"triggerType":"MANUAL","triggerConfig":"{\\"riskThreshold\\":0.7}"}]',
    exceptionPolicy: 'SKIP',
    exceptionConfigJson: '{"retainDraft":true,"fallback":"manual_legal_review","notifyRole":"法务专员"}',
    parametersJson: '[{"name":"contractTemplateId","displayName":"合同模板ID","dataType":"STRING","required":true},{"name":"clauseText","displayName":"条款文本","dataType":"STRING","required":true},{"name":"counterpartyName","displayName":"相对方名称","dataType":"STRING","required":true}]',
    rulesJson: '[{"ruleType":"UPDATE_OBJECT","target":"ContractClause","conditionJson":"{\\"when\\":\\"contractTemplateId_present\\"}","propertyMappingsJson":"{\\"riskLevel\\":\\"predicted_risk_level\\",\\"reviewNote\\":\\"auto_review_note\\"}","sortOrder":1},{"ruleType":"CREATE_LINK","target":"RiskScenario","conditionJson":"{\\"when\\":\\"predicted_risk_level in [\\\\\\"HIGH\\\\\\",\\\\\\"CRITICAL\\\\\\"]\\"}","propertyMappingsJson":"{\\"from\\":\\"$contractTemplateId\\",\\"relation\\":\\"triggers_risk\\",\\"to\\":\\"predicted_risk_scenario\\"}","sortOrder":2}]',
    validationRulesJson: '[{"name":"template_required","condition":"contractTemplateId != \\"\\"","message":"合同模板ID不能为空"},{"name":"clause_required","condition":"clauseText != \\"\\"","message":"条款文本不能为空"},{"name":"counterparty_required","condition":"counterpartyName != \\"\\"","message":"相对方名称不能为空"}]',
  },
  {
    id: 'act-cc-002',
    name: 'launch_contract_approval_flow',
    displayName: '发起合同审批流',
    description: '依据合同金额、风险等级和条款类型自动编排审批路径与会签节点。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-cc-005',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-cc-003","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"contract.review.completed\\",\\"includeFinance\\":true}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":1,"fallback":"manual_workflow_assignment","notifyRole":"合同管理员"}',
    parametersJson: '[{"name":"contractTemplateId","displayName":"合同模板ID","dataType":"STRING","required":true},{"name":"contractAmount","displayName":"合同金额","dataType":"FLOAT","required":true},{"name":"riskLevel","displayName":"风险等级","dataType":"STRING","required":true}]',
    rulesJson: '[{"ruleType":"CREATE_LINK","target":"ApprovalCheckpoint","conditionJson":"{\\"when\\":\\"riskLevel in [\\\\\\"HIGH\\\\\\",\\\\\\"CRITICAL\\\\\\"]\\"}","propertyMappingsJson":"{\\"from\\":\\"$contractTemplateId\\",\\"relation\\":\\"reviewed_at\\",\\"to\\":\\"escalated_checkpoint\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"template_required","condition":"contractTemplateId != \\"\\"","message":"合同模板ID不能为空"},{"name":"amount_non_negative","condition":"contractAmount >= 0","message":"合同金额不能为负数"},{"name":"risk_range","condition":"riskLevel in [\\"LOW\\",\\"MEDIUM\\",\\"HIGH\\",\\"CRITICAL\\"]","message":"风险等级仅支持 LOW/MEDIUM/HIGH/CRITICAL"}]',
  },
  {
    id: 'act-cc-003',
    name: 'monitor_contract_breach_signal',
    displayName: '监控履约违约信号',
    description: '结合交付、验收、回款和售后事件，自动监测合同履约风险并触发升级。',
    status: 'ACTIVE',
    targetObjectTypeId: 'et-cc-008',
    triggerType: 'EVENT',
    triggerConfigJson: '[{"functionId":"fn-cc-004","order":1,"triggerType":"EVENT","triggerConfig":"{\\"event\\":\\"fulfillment.event.updated\\",\\"window\\":\\"14d\\"}"}]',
    exceptionPolicy: 'RETRY',
    exceptionConfigJson: '{"maxRetries":2,"fallback":"manual_breach_review","notifyRole":"风控经理"}',
    parametersJson: '[{"name":"obligationId","displayName":"履约义务ID","dataType":"STRING","required":true},{"name":"eventStatus","displayName":"事件状态","dataType":"STRING","required":true},{"name":"delayDays","displayName":"延期天数","dataType":"INTEGER","required":true}]',
    rulesJson: '[{"ruleType":"CREATE_LINK","target":"RiskScenario","conditionJson":"{\\"when\\":\\"delayDays > 0\\"}","propertyMappingsJson":"{\\"from\\":\\"$obligationId\\",\\"relation\\":\\"tracked_by_event\\",\\"to\\":\\"breach_event\\"}","sortOrder":1}]',
    validationRulesJson: '[{"name":"obligation_required","condition":"obligationId != \\"\\"","message":"履约义务ID不能为空"},{"name":"delay_non_negative","condition":"delayDays >= 0","message":"延期天数不能为负数"},{"name":"status_required","condition":"eventStatus != \\"\\"","message":"事件状态不能为空"}]',
  },
]

const CONTRACT_CONSTRAINTS_FUNCTIONS: FunctionDefinition[] = [
  {
    id: 'fn-cc-001',
    name: '高风险条款提取',
    description: '从合同文本中抽取高风险条款和红线表达。',
    scriptContent: 'def extract_high_risk_clauses(clause_texts: list[str], redline_keywords: list[str]):\n    """提取高风险条款。"""\n    findings = []\n    for text in clause_texts:\n        hits = [keyword for keyword in redline_keywords if keyword in text]\n        if hits:\n            findings.append({"clauseText": text, "matchedKeywords": hits, "riskLevel": "HIGH" if len(hits) >= 2 else "MEDIUM"})\n    return findings',
    status: 'ACTIVE',
  },
  {
    id: 'fn-cc-002',
    name: '合同条款风险评分',
    description: '基于条款类型、红线命中和相对方属性输出风险评分。',
    scriptContent: 'def score_contract_clause_risk(clause_type: str, redline_hit_count: int, counterparty_credit: str):\n    """计算合同条款风险评分。"""\n    score = 20\n    if clause_type in ("违约", "知识产权", "保密"):\n        score += 25\n    score += min(max(redline_hit_count, 0), 5) * 10\n    if counterparty_credit in ("B", "C"):\n        score += 15\n    return {"riskScore": min(score, 100), "riskLevel": "CRITICAL" if score >= 80 else "HIGH" if score >= 60 else "MEDIUM" if score >= 40 else "LOW"}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-cc-003',
    name: '审批路径推荐',
    description: '根据风险等级和合同金额推荐审批路径。',
    scriptContent: 'def recommend_contract_approval_path(contract_amount: float, risk_level: str):\n    """推荐合同审批路径。"""\n    path = ["销售经理初审"]\n    if risk_level in ("HIGH", "CRITICAL"):\n        path.append("法务专员复核")\n    if contract_amount >= 3000000 or risk_level == "CRITICAL":\n        path.append("风控经理复核")\n    if contract_amount >= 8000000:\n        path.append("总监级审批")\n    return {"approvalPath": path}',
    status: 'ACTIVE',
  },
  {
    id: 'fn-cc-004',
    name: '违约预警评估',
    description: '根据履约事件延期和事件状态评估违约预警级别。',
    scriptContent: 'def evaluate_breach_alert(delay_days: int, event_status: str, obligation_weight: float = 1.0):\n    """评估违约预警级别。"""\n    score = max(delay_days, 0) * 8 * max(obligation_weight, 0.5)\n    if event_status in ("FAILED", "REJECTED"):\n        score += 25\n    level = "P1" if score >= 70 else "P2" if score >= 40 else "P3"\n    return {"alertLevel": level, "score": round(score, 1)}',
    status: 'ACTIVE',
  },
]

const FAULT_DIAGNOSIS_SKILLS: SkillConfig[] = [
  { id: 'sk-fd-001', code: 'fault_graph_loading', name: '图谱加载', enabled: true, prompt: '从 graph.jsonl 加载设备故障诊断本体的节点与关系数据', source: 'built_in', tags: ['graph', 'loading'] },
  { id: 'sk-fd-002', code: 'symptom_matching', name: '现象匹配', enabled: true, prompt: '根据报警码、趋势信号和描述匹配最可能的故障现象与细分特征', source: 'built_in', tags: ['diagnosis', 'matching'] },
  { id: 'sk-fd-003', code: 'root_cause_analysis', name: '根因追溯', enabled: true, prompt: '沿故障链路追溯根因并输出标准排查与处置建议', source: 'built_in', tags: ['diagnosis', 'analysis'] },
]

const FAULT_DIAGNOSIS_ACTIONS: ActionDefinition[] = [
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

const FAULT_DIAGNOSIS_FUNCTIONS: FunctionDefinition[] = [
  {
    id: 'fn-fd-006',
    name: '故障诊断',
    description: '汇总候选根因、优先级和处置建议，输出可直接展示在诊断页和工单页的结论摘要。',
    scriptContent: 'def assemble_diagnosis_report(equipment_id: str, phenomenon_label: str, suspected_causes: list[dict], priority: str, recommended_actions: list[str], next_checkpoints: list[str]):\n    """汇总诊断结论，生成标准化诊断摘要。"""\n    top_cause = suspected_causes[0]["cause"] if suspected_causes else "待人工确认"\n    confidence = suspected_causes[0].get("confidence", 0.0) if suspected_causes else 0.0\n    summary = f"{phenomenon_label}，建议优先排查 {top_cause}"\n    return {\n        "equipmentId": equipment_id,\n        "summary": summary,\n        "priority": priority,\n        "confidence": round(confidence, 2),\n        "recommendedActions": recommended_actions[:3],\n        "nextCheckpoints": next_checkpoints[:3],\n    }',
    status: 'ACTIVE',
  },
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

  const mergedSkills = mergeUniqueById(project.schemaConfig.skills, cloneProjectData(FAULT_DIAGNOSIS_SKILLS))
  if (mergedSkills.changed) {
    project.schemaConfig.skills = mergedSkills.items
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

  const mergedActions = mergeUniqueById(project.actions, cloneProjectData(FAULT_DIAGNOSIS_ACTIONS))
  if (mergedActions.changed) {
    project.actions = mergedActions.items
    changed = true
  }

  const mergedFunctions = mergeUniqueById(project.functions, cloneProjectData(FAULT_DIAGNOSIS_FUNCTIONS))
  if (mergedFunctions.changed) {
    project.functions = mergedFunctions.items
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

function isCustomer360Project(project: Pick<ProjectDetail, 'id' | 'name'>): boolean {
  return project.id === CUSTOMER_360_PROJECT_ID || project.name === CUSTOMER_360_PROJECT_NAME
}

function ensureCustomer360Seed(project: ProjectDetail): boolean {
  if (!isCustomer360Project(project)) {
    return false
  }

  let changed = false

  if (project.name !== CUSTOMER_360_PROJECT_NAME) {
    project.name = CUSTOMER_360_PROJECT_NAME
    changed = true
  }

  if (project.category !== 'manufacturing') {
    project.category = 'manufacturing'
    changed = true
  }

  if (project.description !== CUSTOMER_360_DESCRIPTION) {
    project.description = CUSTOMER_360_DESCRIPTION
    changed = true
  }

  if ((Date.parse(project.updatedAt || '') || 0) < Date.parse(CUSTOMER_360_UPDATED_AT)) {
    project.updatedAt = CUSTOMER_360_UPDATED_AT
    changed = true
  }

  const cleanedDocuments = removeItemsById(project.documents, ['doc-1.5.23-1', 'doc-1.5.23-2'])
  if (cleanedDocuments.changed) {
    project.documents = cleanedDocuments.items
    changed = true
  }

  const mergedDocuments = mergeUniqueById(project.documents, cloneProjectData(CUSTOMER_360_DOCUMENTS))
  if (mergedDocuments.changed) {
    project.documents = mergedDocuments.items.sort(byIsoDesc)
    changed = true
  }

  const mergedDataSources = mergeUniqueById(project.dataSources, cloneProjectData(CUSTOMER_360_DATA_SOURCES))
  if (mergedDataSources.changed) {
    project.dataSources = mergedDataSources.items.sort(byIsoDesc)
    changed = true
  }

  const cleanedEntityTypes = removeItemsById(project.schemaConfig.entityTypes, ['et-1.5.23-s', 'et-1.5.23-o'])
  if (cleanedEntityTypes.changed) {
    project.schemaConfig.entityTypes = cleanedEntityTypes.items
    changed = true
  }

  const mergedEntityTypes = mergeUniqueById(project.schemaConfig.entityTypes, cloneProjectData(CUSTOMER_360_ENTITY_TYPES))
  if (mergedEntityTypes.changed) {
    project.schemaConfig.entityTypes = mergedEntityTypes.items
    changed = true
  }

  const cleanedRelationTypes = removeItemsById(project.schemaConfig.relationTypes, ['rt-1.5.23-1'])
  if (cleanedRelationTypes.changed) {
    project.schemaConfig.relationTypes = cleanedRelationTypes.items
    changed = true
  }

  const mergedRelationTypes = mergeUniqueById(project.schemaConfig.relationTypes, cloneProjectData(CUSTOMER_360_RELATION_TYPES))
  if (mergedRelationTypes.changed) {
    project.schemaConfig.relationTypes = mergedRelationTypes.items
    changed = true
  }

  const mergedSkills = mergeUniqueById(project.schemaConfig.skills, cloneProjectData(CUSTOMER_360_SKILLS))
  if (mergedSkills.changed) {
    project.schemaConfig.skills = mergedSkills.items
    changed = true
  }

  if (project.schemaConfig.entityScope !== '销售与客户经营场景中的客户、集团账户、触达渠道、互动事件、商机、服务工单、偏好标签与客户分层等核心经营实体') {
    project.schemaConfig.entityScope = '销售与客户经营场景中的客户、集团账户、触达渠道、互动事件、商机、服务工单、偏好标签与客户分层等核心经营实体'
    changed = true
  }

  if (project.schemaConfig.relationScope !== '覆盖客户归属、触达互动、商机推进、服务反馈、偏好标签和客户分层的完整客户360经营关系链路') {
    project.schemaConfig.relationScope = '覆盖客户归属、触达互动、商机推进、服务反馈、偏好标签和客户分层的完整客户360经营关系链路'
    changed = true
  }

  if (project.schemaConfig.updatedAt !== CUSTOMER_360_UPDATED_AT) {
    project.schemaConfig.updatedAt = CUSTOMER_360_UPDATED_AT
    changed = true
  }

  if (!project.aiInsightRun) {
    project.aiInsightRun = cloneProjectData(CUSTOMER_360_AI_INSIGHT_RUN)
    changed = true
  }

  const mergedRuns = mergeUniqueById(project.runs, cloneProjectData([CUSTOMER_360_RUN]))
  if (mergedRuns.changed) {
    project.runs = mergedRuns.items.sort(byIsoDesc)
    changed = true
  }

  const mergedVersions = mergeUniqueById(project.versions, cloneProjectData([CUSTOMER_360_VERSION]))
  if (mergedVersions.changed) {
    project.versions = mergedVersions.items.sort(byIsoDesc)
    changed = true
  }

  const mergedActions = mergeUniqueById(project.actions, cloneProjectData(CUSTOMER_360_ACTIONS))
  if (mergedActions.changed) {
    project.actions = mergedActions.items
    changed = true
  }

  const mergedFunctions = mergeUniqueById(project.functions, cloneProjectData(CUSTOMER_360_FUNCTIONS))
  if (mergedFunctions.changed) {
    project.functions = mergedFunctions.items
    changed = true
  }

  const versionExists = project.versions.some(version => version.id === project.currentVersionId)
  if (!versionExists) {
    project.currentVersionId = CUSTOMER_360_VERSION.id
    changed = true
  }

  return changed
}

function isContractConstraintsProject(project: Pick<ProjectDetail, 'id' | 'name'>): boolean {
  return project.id === CONTRACT_CONSTRAINTS_PROJECT_ID || project.name === CONTRACT_CONSTRAINTS_PROJECT_NAME
}

function isTaskSchedulingProject(project: Pick<ProjectDetail, 'id' | 'name'>): boolean {
  return project.id === TASK_SCHEDULING_PROJECT_ID || project.name === TASK_SCHEDULING_PROJECT_NAME
}

function isOmnichannelInventoryProject(project: Pick<ProjectDetail, 'id' | 'name'>): boolean {
  return project.id === OMNICHANNEL_INVENTORY_PROJECT_ID || project.name === OMNICHANNEL_INVENTORY_PROJECT_NAME
}

function isMemberProfileProject(project: Pick<ProjectDetail, 'id' | 'name'>): boolean {
  return project.id === MEMBER_PROFILE_PROJECT_ID || project.name === MEMBER_PROFILE_PROJECT_NAME
}

function isSupplierProfileProject(project: Pick<ProjectDetail, 'id' | 'name'>): boolean {
  return project.id === SUPPLIER_PROFILE_PROJECT_ID || project.name === SUPPLIER_PROFILE_PROJECT_NAME
}

function isInventoryRiskProject(project: Pick<ProjectDetail, 'id' | 'name'>): boolean {
  return project.id === INVENTORY_RISK_PROJECT_ID || project.name === INVENTORY_RISK_PROJECT_NAME
}

function ensureTaskSchedulingSeed(project: ProjectDetail): boolean {
  if (!isTaskSchedulingProject(project)) {
    return false
  }

  let changed = false

  if (project.name !== TASK_SCHEDULING_PROJECT_NAME) {
    project.name = TASK_SCHEDULING_PROJECT_NAME
    changed = true
  }

  if (project.category !== 'manufacturing') {
    project.category = 'manufacturing'
    changed = true
  }

  if (project.description !== TASK_SCHEDULING_DESCRIPTION) {
    project.description = TASK_SCHEDULING_DESCRIPTION
    changed = true
  }

  if ((Date.parse(project.updatedAt || '') || 0) < Date.parse(TASK_SCHEDULING_UPDATED_AT)) {
    project.updatedAt = TASK_SCHEDULING_UPDATED_AT
    changed = true
  }

  const cleanedDocuments = removeItemsById(project.documents, ['doc-1.3.12-1', 'doc-1.3.12-2'])
  if (cleanedDocuments.changed) {
    project.documents = cleanedDocuments.items
    changed = true
  }

  const mergedDocuments = mergeUniqueById(project.documents, cloneProjectData(TASK_SCHEDULING_DOCUMENTS))
  if (mergedDocuments.changed) {
    project.documents = mergedDocuments.items.sort(byIsoDesc)
    changed = true
  }

  const mergedDataSources = mergeUniqueById(project.dataSources, cloneProjectData(TASK_SCHEDULING_DATA_SOURCES))
  if (mergedDataSources.changed) {
    project.dataSources = mergedDataSources.items.sort(byIsoDesc)
    changed = true
  }

  const cleanedEntityTypes = removeItemsById(project.schemaConfig.entityTypes, ['et-1.3.12-s', 'et-1.3.12-o'])
  if (cleanedEntityTypes.changed) {
    project.schemaConfig.entityTypes = cleanedEntityTypes.items
    changed = true
  }

  const mergedEntityTypes = mergeUniqueById(project.schemaConfig.entityTypes, cloneProjectData(TASK_SCHEDULING_ENTITY_TYPES))
  if (mergedEntityTypes.changed) {
    project.schemaConfig.entityTypes = mergedEntityTypes.items
    changed = true
  }

  const cleanedRelationTypes = removeItemsById(project.schemaConfig.relationTypes, ['rt-1.3.12-1'])
  if (cleanedRelationTypes.changed) {
    project.schemaConfig.relationTypes = cleanedRelationTypes.items
    changed = true
  }

  const mergedRelationTypes = mergeUniqueById(project.schemaConfig.relationTypes, cloneProjectData(TASK_SCHEDULING_RELATION_TYPES))
  if (mergedRelationTypes.changed) {
    project.schemaConfig.relationTypes = mergedRelationTypes.items
    changed = true
  }

  const mergedSkills = mergeUniqueById(project.schemaConfig.skills, cloneProjectData(TASK_SCHEDULING_SKILLS))
  if (mergedSkills.changed) {
    project.schemaConfig.skills = mergedSkills.items
    changed = true
  }

  if (project.schemaConfig.entityScope !== '生产执行与动态排产场景中的工单、工序、设备资源、班次日历、人员技能、约束规则、排程计划与派工任务等核心调度实体') {
    project.schemaConfig.entityScope = '生产执行与动态排产场景中的工单、工序、设备资源、班次日历、人员技能、约束规则、排程计划与派工任务等核心调度实体'
    changed = true
  }

  if (project.schemaConfig.relationScope !== '覆盖工单拆解、工序资源匹配、约束校验、设备班次分配、插单重排与派工下发的完整任务调度关系链路') {
    project.schemaConfig.relationScope = '覆盖工单拆解、工序资源匹配、约束校验、设备班次分配、插单重排与派工下发的完整任务调度关系链路'
    changed = true
  }

  if (project.schemaConfig.updatedAt !== TASK_SCHEDULING_UPDATED_AT) {
    project.schemaConfig.updatedAt = TASK_SCHEDULING_UPDATED_AT
    changed = true
  }

  if (!project.aiInsightRun) {
    project.aiInsightRun = cloneProjectData(TASK_SCHEDULING_AI_INSIGHT_RUN)
    changed = true
  }

  const mergedRuns = mergeUniqueById(project.runs, cloneProjectData([TASK_SCHEDULING_RUN]))
  if (mergedRuns.changed) {
    project.runs = mergedRuns.items.sort(byIsoDesc)
    changed = true
  }

  const mergedVersions = mergeUniqueById(project.versions, cloneProjectData([TASK_SCHEDULING_VERSION]))
  if (mergedVersions.changed) {
    project.versions = mergedVersions.items.sort(byIsoDesc)
    changed = true
  }

  const mergedActions = mergeUniqueById(project.actions, cloneProjectData(TASK_SCHEDULING_ACTIONS))
  if (mergedActions.changed) {
    project.actions = mergedActions.items
    changed = true
  }

  const mergedFunctions = mergeUniqueById(project.functions, cloneProjectData(TASK_SCHEDULING_FUNCTIONS))
  if (mergedFunctions.changed) {
    project.functions = mergedFunctions.items
    changed = true
  }

  const versionExists = project.versions.some(version => version.id === project.currentVersionId)
  if (!versionExists) {
    project.currentVersionId = TASK_SCHEDULING_VERSION.id
    changed = true
  }

  return changed
}

function ensureOmnichannelInventorySeed(project: ProjectDetail): boolean {
  if (!isOmnichannelInventoryProject(project)) {
    return false
  }

  let changed = false

  if (project.name !== OMNICHANNEL_INVENTORY_PROJECT_NAME) {
    project.name = OMNICHANNEL_INVENTORY_PROJECT_NAME
    changed = true
  }

  if (project.category !== 'retail') {
    project.category = 'retail'
    changed = true
  }

  if (project.description !== OMNICHANNEL_INVENTORY_DESCRIPTION) {
    project.description = OMNICHANNEL_INVENTORY_DESCRIPTION
    changed = true
  }

  if ((Date.parse(project.updatedAt || '') || 0) < Date.parse(OMNICHANNEL_INVENTORY_UPDATED_AT)) {
    project.updatedAt = OMNICHANNEL_INVENTORY_UPDATED_AT
    changed = true
  }

  const cleanedDocuments = removeItemsById(project.documents, ['doc-2.4.21-1', 'doc-2.4.21-2'])
  if (cleanedDocuments.changed) {
    project.documents = cleanedDocuments.items
    changed = true
  }

  const mergedDocuments = mergeUniqueById(project.documents, cloneProjectData(OMNICHANNEL_INVENTORY_DOCUMENTS))
  if (mergedDocuments.changed) {
    project.documents = mergedDocuments.items.sort(byIsoDesc)
    changed = true
  }

  const mergedDataSources = mergeUniqueById(project.dataSources, cloneProjectData(OMNICHANNEL_INVENTORY_DATA_SOURCES))
  if (mergedDataSources.changed) {
    project.dataSources = mergedDataSources.items.sort(byIsoDesc)
    changed = true
  }

  const cleanedEntityTypes = removeItemsById(project.schemaConfig.entityTypes, ['et-2.4.21-s', 'et-2.4.21-o'])
  if (cleanedEntityTypes.changed) {
    project.schemaConfig.entityTypes = cleanedEntityTypes.items
    changed = true
  }

  const mergedEntityTypes = mergeUniqueById(project.schemaConfig.entityTypes, cloneProjectData(OMNICHANNEL_INVENTORY_ENTITY_TYPES))
  if (mergedEntityTypes.changed) {
    project.schemaConfig.entityTypes = mergedEntityTypes.items
    changed = true
  }

  const cleanedRelationTypes = removeItemsById(project.schemaConfig.relationTypes, ['rt-2.4.21-1'])
  if (cleanedRelationTypes.changed) {
    project.schemaConfig.relationTypes = cleanedRelationTypes.items
    changed = true
  }

  const mergedRelationTypes = mergeUniqueById(project.schemaConfig.relationTypes, cloneProjectData(OMNICHANNEL_INVENTORY_RELATION_TYPES))
  if (mergedRelationTypes.changed) {
    project.schemaConfig.relationTypes = mergedRelationTypes.items
    changed = true
  }

  const mergedSkills = mergeUniqueById(project.schemaConfig.skills, cloneProjectData(OMNICHANNEL_INVENTORY_SKILLS))
  if (mergedSkills.changed) {
    project.schemaConfig.skills = mergedSkills.items
    changed = true
  }

  if (project.schemaConfig.entityScope !== '零售门店与履约运营场景中的商品SKU、履约节点、库存快照、渠道订单、库存预占、调拨任务、履约策略与履约决策等核心库存协同实体') {
    project.schemaConfig.entityScope = '零售门店与履约运营场景中的商品SKU、履约节点、库存快照、渠道订单、库存预占、调拨任务、履约策略与履约决策等核心库存协同实体'
    changed = true
  }

  if (project.schemaConfig.relationScope !== '覆盖节点库存、订单预占、履约分单、策略约束、跨店跨仓调拨和缺货兜底决策的完整全渠道库存运营关系链路') {
    project.schemaConfig.relationScope = '覆盖节点库存、订单预占、履约分单、策略约束、跨店跨仓调拨和缺货兜底决策的完整全渠道库存运营关系链路'
    changed = true
  }

  if (project.schemaConfig.updatedAt !== OMNICHANNEL_INVENTORY_UPDATED_AT) {
    project.schemaConfig.updatedAt = OMNICHANNEL_INVENTORY_UPDATED_AT
    changed = true
  }

  if (!project.aiInsightRun) {
    project.aiInsightRun = cloneProjectData(OMNICHANNEL_INVENTORY_AI_INSIGHT_RUN)
    changed = true
  }

  const mergedRuns = mergeUniqueById(project.runs, cloneProjectData([OMNICHANNEL_INVENTORY_RUN]))
  if (mergedRuns.changed) {
    project.runs = mergedRuns.items.sort(byIsoDesc)
    changed = true
  }

  const mergedVersions = mergeUniqueById(project.versions, cloneProjectData([OMNICHANNEL_INVENTORY_VERSION]))
  if (mergedVersions.changed) {
    project.versions = mergedVersions.items.sort(byIsoDesc)
    changed = true
  }

  const mergedActions = mergeUniqueById(project.actions, cloneProjectData(OMNICHANNEL_INVENTORY_ACTIONS))
  if (mergedActions.changed) {
    project.actions = mergedActions.items
    changed = true
  }

  const mergedFunctions = mergeUniqueById(project.functions, cloneProjectData(OMNICHANNEL_INVENTORY_FUNCTIONS))
  if (mergedFunctions.changed) {
    project.functions = mergedFunctions.items
    changed = true
  }

  const versionExists = project.versions.some(version => version.id === project.currentVersionId)
  if (!versionExists) {
    project.currentVersionId = OMNICHANNEL_INVENTORY_VERSION.id
    changed = true
  }

  return changed
}

function ensureMemberProfileSeed(project: ProjectDetail): boolean {
  if (!isMemberProfileProject(project)) {
    return false
  }

  let changed = false

  if (project.name !== MEMBER_PROFILE_PROJECT_NAME) {
    project.name = MEMBER_PROFILE_PROJECT_NAME
    changed = true
  }

  if (project.category !== 'retail') {
    project.category = 'retail'
    changed = true
  }

  if (project.description !== MEMBER_PROFILE_DESCRIPTION) {
    project.description = MEMBER_PROFILE_DESCRIPTION
    changed = true
  }

  if ((Date.parse(project.updatedAt || '') || 0) < Date.parse(MEMBER_PROFILE_UPDATED_AT)) {
    project.updatedAt = MEMBER_PROFILE_UPDATED_AT
    changed = true
  }

  const cleanedDocuments = removeItemsById(project.documents, ['doc-2.5.22-1', 'doc-2.5.22-2'])
  if (cleanedDocuments.changed) {
    project.documents = cleanedDocuments.items
    changed = true
  }

  const mergedDocuments = mergeUniqueById(project.documents, cloneProjectData(MEMBER_PROFILE_DOCUMENTS))
  if (mergedDocuments.changed) {
    project.documents = mergedDocuments.items.sort(byIsoDesc)
    changed = true
  }

  const mergedDataSources = mergeUniqueById(project.dataSources, cloneProjectData(MEMBER_PROFILE_DATA_SOURCES))
  if (mergedDataSources.changed) {
    project.dataSources = mergedDataSources.items.sort(byIsoDesc)
    changed = true
  }

  const cleanedEntityTypes = removeItemsById(project.schemaConfig.entityTypes, ['et-2.5.22-s', 'et-2.5.22-o'])
  if (cleanedEntityTypes.changed) {
    project.schemaConfig.entityTypes = cleanedEntityTypes.items
    changed = true
  }

  const mergedEntityTypes = mergeUniqueById(project.schemaConfig.entityTypes, cloneProjectData(MEMBER_PROFILE_ENTITY_TYPES))
  if (mergedEntityTypes.changed) {
    project.schemaConfig.entityTypes = mergedEntityTypes.items
    changed = true
  }

  const cleanedRelationTypes = removeItemsById(project.schemaConfig.relationTypes, ['rt-2.5.22-1'])
  if (cleanedRelationTypes.changed) {
    project.schemaConfig.relationTypes = cleanedRelationTypes.items
    changed = true
  }

  const mergedRelationTypes = mergeUniqueById(project.schemaConfig.relationTypes, cloneProjectData(MEMBER_PROFILE_RELATION_TYPES))
  if (mergedRelationTypes.changed) {
    project.schemaConfig.relationTypes = mergedRelationTypes.items
    changed = true
  }

  const mergedSkills = mergeUniqueById(project.schemaConfig.skills, cloneProjectData(MEMBER_PROFILE_SKILLS))
  if (mergedSkills.changed) {
    project.schemaConfig.skills = mergedSkills.items
    changed = true
  }

  if (project.schemaConfig.entityScope !== '零售营销与CRM场景中的会员、会员等级、触达渠道、消费事件、偏好标签、券资产、生命周期分层与营销任务等核心会员经营实体') {
    project.schemaConfig.entityScope = '零售营销与CRM场景中的会员、会员等级、触达渠道、消费事件、偏好标签、券资产、生命周期分层与营销任务等核心会员经营实体'
    changed = true
  }

  if (project.schemaConfig.relationScope !== '覆盖等级归属、触达互动、消费沉淀、标签强化、权益绑定、生命周期分层和精准营销编排的完整会员画像运营关系链路') {
    project.schemaConfig.relationScope = '覆盖等级归属、触达互动、消费沉淀、标签强化、权益绑定、生命周期分层和精准营销编排的完整会员画像运营关系链路'
    changed = true
  }

  if (project.schemaConfig.updatedAt !== MEMBER_PROFILE_UPDATED_AT) {
    project.schemaConfig.updatedAt = MEMBER_PROFILE_UPDATED_AT
    changed = true
  }

  if (!project.aiInsightRun) {
    project.aiInsightRun = cloneProjectData(MEMBER_PROFILE_AI_INSIGHT_RUN)
    changed = true
  }

  const mergedRuns = mergeUniqueById(project.runs, cloneProjectData([MEMBER_PROFILE_RUN]))
  if (mergedRuns.changed) {
    project.runs = mergedRuns.items.sort(byIsoDesc)
    changed = true
  }

  const mergedVersions = mergeUniqueById(project.versions, cloneProjectData([MEMBER_PROFILE_VERSION]))
  if (mergedVersions.changed) {
    project.versions = mergedVersions.items.sort(byIsoDesc)
    changed = true
  }

  const mergedActions = mergeUniqueById(project.actions, cloneProjectData(MEMBER_PROFILE_ACTIONS))
  if (mergedActions.changed) {
    project.actions = mergedActions.items
    changed = true
  }

  const mergedFunctions = mergeUniqueById(project.functions, cloneProjectData(MEMBER_PROFILE_FUNCTIONS))
  if (mergedFunctions.changed) {
    project.functions = mergedFunctions.items
    changed = true
  }

  const versionExists = project.versions.some(version => version.id === project.currentVersionId)
  if (!versionExists) {
    project.currentVersionId = MEMBER_PROFILE_VERSION.id
    changed = true
  }

  return changed
}

function ensureSupplierProfileSeed(project: ProjectDetail): boolean {
  if (!isSupplierProfileProject(project)) {
    return false
  }

  let changed = false

  if (project.name !== SUPPLIER_PROFILE_PROJECT_NAME) {
    project.name = SUPPLIER_PROFILE_PROJECT_NAME
    changed = true
  }

  if (project.category !== 'manufacturing') {
    project.category = 'manufacturing'
    changed = true
  }

  if (project.description !== SUPPLIER_PROFILE_DESCRIPTION) {
    project.description = SUPPLIER_PROFILE_DESCRIPTION
    changed = true
  }

  if ((Date.parse(project.updatedAt || '') || 0) < Date.parse(SUPPLIER_PROFILE_UPDATED_AT)) {
    project.updatedAt = SUPPLIER_PROFILE_UPDATED_AT
    changed = true
  }

  const cleanedDocuments = removeItemsById(project.documents, ['doc-1.4.16-1', 'doc-1.4.16-2'])
  if (cleanedDocuments.changed) {
    project.documents = cleanedDocuments.items
    changed = true
  }

  const mergedDocuments = mergeUniqueById(project.documents, cloneProjectData(SUPPLIER_PROFILE_DOCUMENTS))
  if (mergedDocuments.changed) {
    project.documents = mergedDocuments.items.sort(byIsoDesc)
    changed = true
  }

  const mergedDataSources = mergeUniqueById(project.dataSources, cloneProjectData(SUPPLIER_PROFILE_DATA_SOURCES))
  if (mergedDataSources.changed) {
    project.dataSources = mergedDataSources.items.sort(byIsoDesc)
    changed = true
  }

  const cleanedEntityTypes = removeItemsById(project.schemaConfig.entityTypes, ['et-1.4.16-s', 'et-1.4.16-o'])
  if (cleanedEntityTypes.changed) {
    project.schemaConfig.entityTypes = cleanedEntityTypes.items
    changed = true
  }

  const mergedEntityTypes = mergeUniqueById(project.schemaConfig.entityTypes, cloneProjectData(SUPPLIER_PROFILE_ENTITY_TYPES))
  if (mergedEntityTypes.changed) {
    project.schemaConfig.entityTypes = mergedEntityTypes.items
    changed = true
  }

  const cleanedRelationTypes = removeItemsById(project.schemaConfig.relationTypes, ['rt-1.4.16-1'])
  if (cleanedRelationTypes.changed) {
    project.schemaConfig.relationTypes = cleanedRelationTypes.items
    changed = true
  }

  const mergedRelationTypes = mergeUniqueById(project.schemaConfig.relationTypes, cloneProjectData(SUPPLIER_PROFILE_RELATION_TYPES))
  if (mergedRelationTypes.changed) {
    project.schemaConfig.relationTypes = mergedRelationTypes.items
    changed = true
  }

  const mergedSkills = mergeUniqueById(project.schemaConfig.skills, cloneProjectData(SUPPLIER_PROFILE_SKILLS))
  if (mergedSkills.changed) {
    project.schemaConfig.skills = mergedSkills.items
    changed = true
  }

  if (project.schemaConfig.entityScope !== '供应链与采购协同场景中的供应商、供货物料、服务工厂、交付表现、质量事件、财务风险、合规资质与供应商分层等核心供方实体') {
    project.schemaConfig.entityScope = '供应链与采购协同场景中的供应商、供货物料、服务工厂、交付表现、质量事件、财务风险、合规资质与供应商分层等核心供方实体'
    changed = true
  }

  if (project.schemaConfig.relationScope !== '覆盖供货范围、工厂绑定、交付评分、质量异常、财务预警、资质覆盖和供应商分层的完整供应商画像治理关系链路') {
    project.schemaConfig.relationScope = '覆盖供货范围、工厂绑定、交付评分、质量异常、财务预警、资质覆盖和供应商分层的完整供应商画像治理关系链路'
    changed = true
  }

  if (project.schemaConfig.updatedAt !== SUPPLIER_PROFILE_UPDATED_AT) {
    project.schemaConfig.updatedAt = SUPPLIER_PROFILE_UPDATED_AT
    changed = true
  }

  if (!project.aiInsightRun) {
    project.aiInsightRun = cloneProjectData(SUPPLIER_PROFILE_AI_INSIGHT_RUN)
    changed = true
  }

  const mergedRuns = mergeUniqueById(project.runs, cloneProjectData([SUPPLIER_PROFILE_RUN]))
  if (mergedRuns.changed) {
    project.runs = mergedRuns.items.sort(byIsoDesc)
    changed = true
  }

  const mergedVersions = mergeUniqueById(project.versions, cloneProjectData([SUPPLIER_PROFILE_VERSION]))
  if (mergedVersions.changed) {
    project.versions = mergedVersions.items.sort(byIsoDesc)
    changed = true
  }

  const mergedActions = mergeUniqueById(project.actions, cloneProjectData(SUPPLIER_PROFILE_ACTIONS))
  if (mergedActions.changed) {
    project.actions = mergedActions.items
    changed = true
  }

  const mergedFunctions = mergeUniqueById(project.functions, cloneProjectData(SUPPLIER_PROFILE_FUNCTIONS))
  if (mergedFunctions.changed) {
    project.functions = mergedFunctions.items
    changed = true
  }

  const versionExists = project.versions.some(version => version.id === project.currentVersionId)
  if (!versionExists) {
    project.currentVersionId = SUPPLIER_PROFILE_VERSION.id
    changed = true
  }

  return changed
}

function ensureInventoryRiskSeed(project: ProjectDetail): boolean {
  if (!isInventoryRiskProject(project)) {
    return false
  }

  let changed = false

  if (project.name !== INVENTORY_RISK_PROJECT_NAME) {
    project.name = INVENTORY_RISK_PROJECT_NAME
    changed = true
  }

  if (project.category !== 'manufacturing') {
    project.category = 'manufacturing'
    changed = true
  }

  if (project.description !== INVENTORY_RISK_DESCRIPTION) {
    project.description = INVENTORY_RISK_DESCRIPTION
    changed = true
  }

  if ((Date.parse(project.updatedAt || '') || 0) < Date.parse(INVENTORY_RISK_UPDATED_AT)) {
    project.updatedAt = INVENTORY_RISK_UPDATED_AT
    changed = true
  }

  const cleanedDocuments = removeItemsById(project.documents, ['doc-1.4.18-1', 'doc-1.4.18-2'])
  if (cleanedDocuments.changed) {
    project.documents = cleanedDocuments.items
    changed = true
  }

  const mergedDocuments = mergeUniqueById(project.documents, cloneProjectData(INVENTORY_RISK_DOCUMENTS))
  if (mergedDocuments.changed) {
    project.documents = mergedDocuments.items.sort(byIsoDesc)
    changed = true
  }

  const mergedDataSources = mergeUniqueById(project.dataSources, cloneProjectData(INVENTORY_RISK_DATA_SOURCES))
  if (mergedDataSources.changed) {
    project.dataSources = mergedDataSources.items.sort(byIsoDesc)
    changed = true
  }

  const cleanedEntityTypes = removeItemsById(project.schemaConfig.entityTypes, ['et-1.4.18-s', 'et-1.4.18-o'])
  if (cleanedEntityTypes.changed) {
    project.schemaConfig.entityTypes = cleanedEntityTypes.items
    changed = true
  }

  const mergedEntityTypes = mergeUniqueById(project.schemaConfig.entityTypes, cloneProjectData(INVENTORY_RISK_ENTITY_TYPES))
  if (mergedEntityTypes.changed) {
    project.schemaConfig.entityTypes = mergedEntityTypes.items
    changed = true
  }

  const cleanedRelationTypes = removeItemsById(project.schemaConfig.relationTypes, ['rt-1.4.18-1'])
  if (cleanedRelationTypes.changed) {
    project.schemaConfig.relationTypes = cleanedRelationTypes.items
    changed = true
  }

  const mergedRelationTypes = mergeUniqueById(project.schemaConfig.relationTypes, cloneProjectData(INVENTORY_RISK_RELATION_TYPES))
  if (mergedRelationTypes.changed) {
    project.schemaConfig.relationTypes = mergedRelationTypes.items
    changed = true
  }

  const mergedSkills = mergeUniqueById(project.schemaConfig.skills, cloneProjectData(INVENTORY_RISK_SKILLS))
  if (mergedSkills.changed) {
    project.schemaConfig.skills = mergedSkills.items
    changed = true
  }

  if (project.schemaConfig.entityScope !== '供应链与库存治理场景中的物料、仓库、工厂需求、库存快照、风险信号、安全库存策略、补货建议与供应商选项等核心库存实体') {
    project.schemaConfig.entityScope = '供应链与库存治理场景中的物料、仓库、工厂需求、库存快照、风险信号、安全库存策略、补货建议与供应商选项等核心库存实体'
    changed = true
  }

  if (project.schemaConfig.relationScope !== '覆盖库存归属、需求牵引、库存快照、风险预警、安全库存约束、补货建议和供应商分摊的完整库存风险治理关系链路') {
    project.schemaConfig.relationScope = '覆盖库存归属、需求牵引、库存快照、风险预警、安全库存约束、补货建议和供应商分摊的完整库存风险治理关系链路'
    changed = true
  }

  if (project.schemaConfig.updatedAt !== INVENTORY_RISK_UPDATED_AT) {
    project.schemaConfig.updatedAt = INVENTORY_RISK_UPDATED_AT
    changed = true
  }

  if (!project.aiInsightRun) {
    project.aiInsightRun = cloneProjectData(INVENTORY_RISK_AI_INSIGHT_RUN)
    changed = true
  }

  const mergedRuns = mergeUniqueById(project.runs, cloneProjectData([INVENTORY_RISK_RUN]))
  if (mergedRuns.changed) {
    project.runs = mergedRuns.items.sort(byIsoDesc)
    changed = true
  }

  const mergedVersions = mergeUniqueById(project.versions, cloneProjectData([INVENTORY_RISK_VERSION]))
  if (mergedVersions.changed) {
    project.versions = mergedVersions.items.sort(byIsoDesc)
    changed = true
  }

  const mergedActions = mergeUniqueById(project.actions, cloneProjectData(INVENTORY_RISK_ACTIONS))
  if (mergedActions.changed) {
    project.actions = mergedActions.items
    changed = true
  }

  const mergedFunctions = mergeUniqueById(project.functions, cloneProjectData(INVENTORY_RISK_FUNCTIONS))
  if (mergedFunctions.changed) {
    project.functions = mergedFunctions.items
    changed = true
  }

  const versionExists = project.versions.some(version => version.id === project.currentVersionId)
  if (!versionExists) {
    project.currentVersionId = INVENTORY_RISK_VERSION.id
    changed = true
  }

  return changed
}

function ensureContractConstraintsSeed(project: ProjectDetail): boolean {
  if (!isContractConstraintsProject(project)) {
    return false
  }

  let changed = false

  if (project.name !== CONTRACT_CONSTRAINTS_PROJECT_NAME) {
    project.name = CONTRACT_CONSTRAINTS_PROJECT_NAME
    changed = true
  }

  if (project.category !== 'manufacturing') {
    project.category = 'manufacturing'
    changed = true
  }

  if (project.description !== CONTRACT_CONSTRAINTS_DESCRIPTION) {
    project.description = CONTRACT_CONSTRAINTS_DESCRIPTION
    changed = true
  }

  if ((Date.parse(project.updatedAt || '') || 0) < Date.parse(CONTRACT_CONSTRAINTS_UPDATED_AT)) {
    project.updatedAt = CONTRACT_CONSTRAINTS_UPDATED_AT
    changed = true
  }

  const cleanedDocuments = removeItemsById(project.documents, ['doc-1.5.24-1', 'doc-1.5.24-2'])
  if (cleanedDocuments.changed) {
    project.documents = cleanedDocuments.items
    changed = true
  }

  const mergedDocuments = mergeUniqueById(project.documents, cloneProjectData(CONTRACT_CONSTRAINTS_DOCUMENTS))
  if (mergedDocuments.changed) {
    project.documents = mergedDocuments.items.sort(byIsoDesc)
    changed = true
  }

  const mergedDataSources = mergeUniqueById(project.dataSources, cloneProjectData(CONTRACT_CONSTRAINTS_DATA_SOURCES))
  if (mergedDataSources.changed) {
    project.dataSources = mergedDataSources.items.sort(byIsoDesc)
    changed = true
  }

  const cleanedEntityTypes = removeItemsById(project.schemaConfig.entityTypes, ['et-1.5.24-s', 'et-1.5.24-o'])
  if (cleanedEntityTypes.changed) {
    project.schemaConfig.entityTypes = cleanedEntityTypes.items
    changed = true
  }

  const mergedEntityTypes = mergeUniqueById(project.schemaConfig.entityTypes, cloneProjectData(CONTRACT_CONSTRAINTS_ENTITY_TYPES))
  if (mergedEntityTypes.changed) {
    project.schemaConfig.entityTypes = mergedEntityTypes.items
    changed = true
  }

  const cleanedRelationTypes = removeItemsById(project.schemaConfig.relationTypes, ['rt-1.5.24-1'])
  if (cleanedRelationTypes.changed) {
    project.schemaConfig.relationTypes = cleanedRelationTypes.items
    changed = true
  }

  const mergedRelationTypes = mergeUniqueById(project.schemaConfig.relationTypes, cloneProjectData(CONTRACT_CONSTRAINTS_RELATION_TYPES))
  if (mergedRelationTypes.changed) {
    project.schemaConfig.relationTypes = mergedRelationTypes.items
    changed = true
  }

  const mergedSkills = mergeUniqueById(project.schemaConfig.skills, cloneProjectData(CONTRACT_CONSTRAINTS_SKILLS))
  if (mergedSkills.changed) {
    project.schemaConfig.skills = mergedSkills.items
    changed = true
  }

  if (project.schemaConfig.entityScope !== '销售与合同治理场景中的合同模板、合同条款、合规要求、风险场景、审批节点、履约义务、交易对手与履约事件等核心法务实体') {
    project.schemaConfig.entityScope = '销售与合同治理场景中的合同模板、合同条款、合规要求、风险场景、审批节点、履约义务、交易对手与履约事件等核心法务实体'
    changed = true
  }

  if (project.schemaConfig.relationScope !== '覆盖合同条款拆解、法审规则、审批协同、风险升级、履约跟踪和违约预警的完整合同约束关系链路') {
    project.schemaConfig.relationScope = '覆盖合同条款拆解、法审规则、审批协同、风险升级、履约跟踪和违约预警的完整合同约束关系链路'
    changed = true
  }

  if (project.schemaConfig.updatedAt !== CONTRACT_CONSTRAINTS_UPDATED_AT) {
    project.schemaConfig.updatedAt = CONTRACT_CONSTRAINTS_UPDATED_AT
    changed = true
  }

  if (!project.aiInsightRun) {
    project.aiInsightRun = cloneProjectData(CONTRACT_CONSTRAINTS_AI_INSIGHT_RUN)
    changed = true
  }

  const mergedRuns = mergeUniqueById(project.runs, cloneProjectData([CONTRACT_CONSTRAINTS_RUN]))
  if (mergedRuns.changed) {
    project.runs = mergedRuns.items.sort(byIsoDesc)
    changed = true
  }

  const mergedVersions = mergeUniqueById(project.versions, cloneProjectData([CONTRACT_CONSTRAINTS_VERSION]))
  if (mergedVersions.changed) {
    project.versions = mergedVersions.items.sort(byIsoDesc)
    changed = true
  }

  const mergedActions = mergeUniqueById(project.actions, cloneProjectData(CONTRACT_CONSTRAINTS_ACTIONS))
  if (mergedActions.changed) {
    project.actions = mergedActions.items
    changed = true
  }

  const mergedFunctions = mergeUniqueById(project.functions, cloneProjectData(CONTRACT_CONSTRAINTS_FUNCTIONS))
  if (mergedFunctions.changed) {
    project.functions = mergedFunctions.items
    changed = true
  }

  const versionExists = project.versions.some(version => version.id === project.currentVersionId)
  if (!versionExists) {
    project.currentVersionId = CONTRACT_CONSTRAINTS_VERSION.id
    changed = true
  }

  return changed
}

function isLegalRegulationsProject(project: Pick<ProjectDetail, 'id' | 'name'>): boolean {
  return project.id === LEGAL_REGULATIONS_PROJECT_ID || project.name === LEGAL_REGULATIONS_PROJECT_NAME
}

function ensureLegalRegulationsSeed(project: ProjectDetail): boolean {
  if (!isLegalRegulationsProject(project)) {
    return false
  }

  let changed = false

  if (project.name !== LEGAL_REGULATIONS_PROJECT_NAME) {
    project.name = LEGAL_REGULATIONS_PROJECT_NAME
    changed = true
  }

  if (project.category !== 'general') {
    project.category = 'general'
    changed = true
  }

  if (project.description !== LEGAL_REGULATIONS_DESCRIPTION) {
    project.description = LEGAL_REGULATIONS_DESCRIPTION
    changed = true
  }

  if ((Date.parse(project.updatedAt || '') || 0) < Date.parse(LEGAL_REGULATIONS_UPDATED_AT)) {
    project.updatedAt = LEGAL_REGULATIONS_UPDATED_AT
    changed = true
  }

  const cleanedDocuments = removeItemsById(project.documents, ['doc-5.6.12-1', 'doc-5.6.12-2'])
  if (cleanedDocuments.changed) {
    project.documents = cleanedDocuments.items
    changed = true
  }

  const mergedDocuments = mergeUniqueById(project.documents, cloneProjectData(LEGAL_REGULATIONS_DOCUMENTS))
  if (mergedDocuments.changed) {
    project.documents = mergedDocuments.items.sort(byIsoDesc)
    changed = true
  }

  const cleanedEntityTypes = removeItemsById(project.schemaConfig.entityTypes, ['et-5.6.12-s', 'et-5.6.12-o'])
  if (cleanedEntityTypes.changed) {
    project.schemaConfig.entityTypes = cleanedEntityTypes.items
    changed = true
  }

  const mergedEntityTypes = mergeUniqueById(project.schemaConfig.entityTypes, cloneProjectData(LEGAL_REGULATIONS_ENTITY_TYPES))
  if (mergedEntityTypes.changed) {
    project.schemaConfig.entityTypes = mergedEntityTypes.items
    changed = true
  }

  const cleanedRelationTypes = removeItemsById(project.schemaConfig.relationTypes, ['rt-5.6.12-1'])
  if (cleanedRelationTypes.changed) {
    project.schemaConfig.relationTypes = cleanedRelationTypes.items
    changed = true
  }

  const mergedRelationTypes = mergeUniqueById(project.schemaConfig.relationTypes, cloneProjectData(LEGAL_REGULATIONS_RELATION_TYPES))
  if (mergedRelationTypes.changed) {
    project.schemaConfig.relationTypes = mergedRelationTypes.items
    changed = true
  }

  const mergedSkills = mergeUniqueById(project.schemaConfig.skills, cloneProjectData(LEGAL_REGULATIONS_SKILLS))
  if (mergedSkills.changed) {
    project.schemaConfig.skills = mergedSkills.items
    changed = true
  }

  if (project.schemaConfig.entityScope !== '风险与合规场景中的法律法规、监管机构、合规义务、数据处理活动、合同条款与处罚案例等核心法务实体') {
    project.schemaConfig.entityScope = '风险与合规场景中的法律法规、监管机构、合规义务、数据处理活动、合同条款与处罚案例等核心法务实体'
    changed = true
  }

  if (project.schemaConfig.relationScope !== '覆盖法规发布、法规义务约束、数据处理活动适用、合同条款审查与处罚追溯的完整合规关系链路') {
    project.schemaConfig.relationScope = '覆盖法规发布、法规义务约束、数据处理活动适用、合同条款审查与处罚追溯的完整合规关系链路'
    changed = true
  }

  if (project.schemaConfig.updatedAt !== LEGAL_REGULATIONS_UPDATED_AT) {
    project.schemaConfig.updatedAt = LEGAL_REGULATIONS_UPDATED_AT
    changed = true
  }

  if (!project.aiInsightRun) {
    project.aiInsightRun = cloneProjectData(LEGAL_REGULATIONS_AI_INSIGHT_RUN)
    changed = true
  }

  const mergedRuns = mergeUniqueById(project.runs, cloneProjectData(LEGAL_REGULATIONS_RUNS))
  if (mergedRuns.changed) {
    project.runs = mergedRuns.items.sort(byIsoDesc)
    changed = true
  }

  const mergedVersions = mergeUniqueById(project.versions, cloneProjectData(LEGAL_REGULATIONS_VERSIONS))
  if (mergedVersions.changed) {
    project.versions = mergedVersions.items.sort(byIsoDesc)
    changed = true
  }

  const versionExists = project.versions.some(version => version.id === project.currentVersionId)
  if (!versionExists) {
    project.currentVersionId = 'ver-lr-002'
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
    if (ensureCustomer360Seed(project)) {
      changed = true
    }
    if (ensureTaskSchedulingSeed(project)) {
      changed = true
    }
    if (ensureOmnichannelInventorySeed(project)) {
      changed = true
    }
    if (ensureMemberProfileSeed(project)) {
      changed = true
    }
    if (ensureSupplierProfileSeed(project)) {
      changed = true
    }
    if (ensureInventoryRiskSeed(project)) {
      changed = true
    }
    if (ensureContractConstraintsSeed(project)) {
      changed = true
    }
    if (ensureLegalRegulationsSeed(project)) {
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
    skills: cloneProjectData(FAULT_DIAGNOSIS_SKILLS),
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
  first.actions = cloneProjectData(FAULT_DIAGNOSIS_ACTIONS)
  first.functions = cloneProjectData(FAULT_DIAGNOSIS_FUNCTIONS)
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
  if (!inMemoryProjectStore) {
    inMemoryProjectStore = { projects: defaultProjects(), idSeq: 5000, _v: DATA_VERSION }
  }
  if (normalizeStore(inMemoryProjectStore)) {
    saveStore(inMemoryProjectStore)
  }
  return inMemoryProjectStore
}

function saveStore(store: ProjectStore) {
  inMemoryProjectStore = store
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

function resetProjectStoreForTests() {
  inMemoryProjectStore = null
}

export const __PROJECT_STORE_LEGACY_HELPERS = { nextId, findProject, resetProjectStoreForTests }

function cloneProjectData<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

export const FEATURED_PROJECT_ORDER = [
  '故障诊断本体',
  '商品补货本体',
  '客户360本体',
  '合同约束本体',
  '任务调度本体',
  '库存风险本体',
  '供应商画像本体',
  '会员画像本体',
  '全渠道库存本体',
  '品类架构本体',
  '疾病诊断本体(ICD-11)',
  '临床路径(CP)本体',
  '医疗设备孪生本体',
  '电子病历质控本体',
  '路网拓扑本体',
  '订单履约本体',
  '组织架构与职能本体',
  '法律法规库本体',
] as const

function getPinnedProjectRank(project: Pick<ProjectDetail, 'name'>): number {
  const index = FEATURED_PROJECT_ORDER.indexOf(project.name as (typeof FEATURED_PROJECT_ORDER)[number])
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
  assemble_diagnosis_report: {
    equipment_id: 'equip-vm850',
    phenomenon_label: '主轴温升异常',
    suspected_causes: [
      { cause: '主轴轴承早期剥落', confidence: 0.91 },
      { cause: '润滑油路局部堵塞', confidence: 0.72 },
    ],
    priority: 'P1',
    recommended_actions: ['检查主轴润滑回路', '测量轴承预紧力', '安排低速空转复测'],
    next_checkpoints: ['确认振动频谱 BPFO 峰值', '校验主轴端跳', '复核温升趋势'],
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
  calc_supplier_delivery_score: {
    on_time_rate: 0.96,
    lead_time_days: 9,
    expedite_count: 1,
    shortage_incidents: 0,
  },
  calc_supplier_risk_index: {
    debt_ratio: 0.48,
    cash_flow_alerts: 1,
    litigation_count: 0,
    quality_ppm: 220,
  },
  recommend_supplier_segment: {
    delivery_score: 91.2,
    risk_index: 28.5,
    quality_ppm: 180,
    certificate_status: 'VALID',
  },
  build_procurement_weight_plan: {
    current_weight: 0.32,
    segment_name: '战略供方',
    risk_index: 28.5,
    capacity_share: 0.38,
    backup_supplier_ready: true,
  },
  calc_inventory_cover_days: {
    on_hand_qty: 320,
    in_transit_qty: 80,
    daily_demand: 45,
  },
  evaluate_inventory_risk: {
    shortage_days: 3,
    demand_volatility: 0.42,
    supplier_lead_time: 12,
    single_source: true,
  },
  recommend_replenishment_qty: {
    target_cover_days: 14,
    daily_demand: 45,
    on_hand_qty: 320,
    in_transit_qty: 80,
    moq: 200,
  },
  allocate_supplier_split: {
    replenishment_qty: 240,
    supplier_options: [
      { supplierName: '宁波舜宇精密结构件', capacityShare: 0.5, riskScore: 22 },
      { supplierName: '苏州汇川电驱系统', capacityShare: 0.3, riskScore: 30 },
      { supplierName: '深圳拓普连接器', capacityShare: 0.2, riskScore: 45 },
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

  if (functionName === 'calc_supplier_delivery_score') {
    const onTimeRate = Number(input.on_time_rate ?? 0)
    const leadTimeDays = Number(input.lead_time_days ?? 0)
    const expediteCount = Number(input.expedite_count ?? 0)
    const shortageIncidents = Number(input.shortage_incidents ?? 0)
    const base = Math.max(0, Math.min(onTimeRate, 1)) * 70
    const leadTimePenalty = Math.min(Math.max(leadTimeDays - 7, 0) * 1.8, 18)
    const expeditePenalty = Math.min(Math.max(expediteCount, 0) * 2.5, 10)
    const shortagePenalty = Math.min(Math.max(shortageIncidents, 0) * 6, 18)
    const deliveryScore = roundNumber(Math.max(0, Math.min(100, base + 30 - leadTimePenalty - expeditePenalty - shortagePenalty)), 1)
    const band = deliveryScore >= 90 ? 'A' : deliveryScore >= 75 ? 'B' : 'C'
    return {
      output: { deliveryScore, band },
      logLines: [`准时交付率 ${roundNumber(onTimeRate * 100, 1)}%`, `平均交期 ${leadTimeDays} 天`, `加急次数 ${expediteCount}`],
    }
  }

  if (functionName === 'calc_supplier_risk_index') {
    const debtRatio = Number(input.debt_ratio ?? 0)
    const cashFlowAlerts = Number(input.cash_flow_alerts ?? 0)
    const litigationCount = Number(input.litigation_count ?? 0)
    const qualityPpm = Number(input.quality_ppm ?? 0)
    const riskIndex = roundNumber(Math.min(
      100,
      Math.max(0, Math.min(debtRatio, 1)) * 35
      + Math.min(Math.max(cashFlowAlerts, 0) * 12, 24)
      + Math.min(Math.max(litigationCount, 0) * 10, 20)
      + Math.min(Math.max(qualityPpm, 0) / 50, 21),
    ), 1)
    const riskLevel = riskIndex >= 65 ? 'HIGH' : riskIndex >= 40 ? 'MEDIUM' : 'LOW'
    return {
      output: { riskIndex, riskLevel },
      logLines: [`负债率 ${roundNumber(debtRatio * 100, 1)}%`, `现金流预警 ${cashFlowAlerts} 次`, `质量PPM ${qualityPpm}`],
    }
  }

  if (functionName === 'recommend_supplier_segment') {
    const deliveryScore = Number(input.delivery_score ?? 0)
    const riskIndex = Number(input.risk_index ?? 0)
    const qualityPpm = Number(input.quality_ppm ?? 0)
    const certificateStatus = String(input.certificate_status ?? 'VALID').toUpperCase()
    const segmentName = certificateStatus !== 'VALID' || riskIndex >= 75 || qualityPpm >= 1200
      ? '观察名单'
      : deliveryScore >= 88 && riskIndex < 35 && qualityPpm < 300
        ? '战略供方'
        : deliveryScore >= 75 && riskIndex < 55
          ? '核心供方'
          : '条件供方'
    return {
      output: { segmentName },
      logLines: [`交付得分 ${deliveryScore}`, `风险指数 ${riskIndex}`, `资质状态 ${certificateStatus}`],
    }
  }

  if (functionName === 'build_procurement_weight_plan') {
    const currentWeight = Number(input.current_weight ?? 0)
    const segmentName = String(input.segment_name ?? '')
    const riskIndex = Number(input.risk_index ?? 0)
    const capacityShare = Number(input.capacity_share ?? 0)
    const backupSupplierReady = Boolean(input.backup_supplier_ready)
    const segmentDeltaMap: Record<string, number> = {
      战略供方: 0.08,
      核心供方: 0.02,
      条件供方: -0.05,
      观察名单: -0.12,
    }
    let delta = segmentDeltaMap[segmentName] ?? 0
    if (riskIndex >= 70) delta -= 0.08
    else if (riskIndex <= 30) delta += 0.03
    if (backupSupplierReady && riskIndex >= 55) delta -= 0.05
    const upperBound = Math.max(Math.min(capacityShare + 0.12, 0.75), 0.05)
    const recommendedWeight = roundNumber(Math.max(0.05, Math.min(currentWeight + delta, upperBound)), 3)
    return {
      output: {
        recommendedWeight,
        adjustment: roundNumber(recommendedWeight - currentWeight, 3),
        procurementAction: recommendedWeight === currentWeight ? 'hold' : 'rebalance',
      },
      logLines: [`当前份额 ${roundNumber(currentWeight * 100, 1)}%`, `建议上限 ${roundNumber(upperBound * 100, 1)}%`, `备用供方 ${backupSupplierReady ? '已就绪' : '未就绪'}`],
    }
  }

  if (functionName === 'calc_inventory_cover_days') {
    const onHandQty = Number(input.on_hand_qty ?? 0)
    const inTransitQty = Number(input.in_transit_qty ?? 0)
    const dailyDemand = Number(input.daily_demand ?? 0)
    const availableQty = Math.max(onHandQty, 0) + Math.max(inTransitQty, 0)
    const coverDays = dailyDemand > 0 ? roundNumber(availableQty / dailyDemand, 2) : 999
    return {
      output: { availableQty, coverDays },
      logLines: [`现存 ${onHandQty}`, `在途 ${inTransitQty}`, `日需求 ${dailyDemand}`],
    }
  }

  if (functionName === 'evaluate_inventory_risk') {
    const shortageDays = Number(input.shortage_days ?? 0)
    const demandVolatility = Number(input.demand_volatility ?? 0)
    const supplierLeadTime = Number(input.supplier_lead_time ?? 0)
    const singleSource = Boolean(input.single_source)
    const riskScore = roundNumber(Math.min(
      100,
      Math.min(Math.max(shortageDays, 0), 15) * 4
      + Math.min(Math.max(demandVolatility, 0), 1) * 25
      + Math.min(Math.max(supplierLeadTime, 0), 30) * 1.5
      + (singleSource ? 12 : 0),
    ), 1)
    const riskLevel = riskScore >= 65 ? 'HIGH' : riskScore >= 35 ? 'MEDIUM' : 'LOW'
    return {
      output: { riskScore, riskLevel },
      logLines: [`缺口天数 ${shortageDays}`, `波动系数 ${demandVolatility}`, `单一供方 ${singleSource ? '是' : '否'}`],
    }
  }

  if (functionName === 'recommend_replenishment_qty') {
    const targetCoverDays = Number(input.target_cover_days ?? 0)
    const dailyDemand = Number(input.daily_demand ?? 0)
    const onHandQty = Number(input.on_hand_qty ?? 0)
    const inTransitQty = Number(input.in_transit_qty ?? 0)
    const moq = Number(input.moq ?? 0)
    const targetStock = targetCoverDays * dailyDemand
    const currentStock = Math.max(onHandQty, 0) + Math.max(inTransitQty, 0)
    const gapQty = Math.max(targetStock - currentStock, 0)
    const recommendedQty = gapQty > 0 ? Math.max(gapQty, moq) : 0
    return {
      output: {
        targetStock: roundNumber(targetStock, 1),
        currentStock: roundNumber(currentStock, 1),
        recommendedQty: roundNumber(recommendedQty, 1),
      },
      logLines: [`目标覆盖 ${targetCoverDays} 天`, `目标库存 ${roundNumber(targetStock, 1)}`, `当前库存 ${roundNumber(currentStock, 1)}`],
    }
  }

  if (functionName === 'allocate_supplier_split') {
    const replenishmentQty = Number(input.replenishment_qty ?? 0)
    const supplierOptions = Array.isArray(input.supplier_options) ? input.supplier_options as Array<Record<string, unknown>> : []
    const ranked = [...supplierOptions].sort((left, right) => {
      const leftRisk = Number(left.riskScore ?? 100)
      const rightRisk = Number(right.riskScore ?? 100)
      if (leftRisk !== rightRisk) return leftRisk - rightRisk
      return Number(right.capacityShare ?? 0) - Number(left.capacityShare ?? 0)
    })
    let remainQty = replenishmentQty
    const allocations = ranked.map((item) => {
      const capacityShare = Math.max(Number(item.capacityShare ?? 0), 0)
      const allocatedQty = Math.min(remainQty, replenishmentQty * capacityShare)
      remainQty = Math.max(remainQty - allocatedQty, 0)
      return {
        supplierName: item.supplierName,
        allocatedQty: roundNumber(allocatedQty, 1),
      }
    })
    return {
      output: { allocations, remainQty: roundNumber(remainQty, 1) },
      logLines: [`补货总量 ${replenishmentQty}`, `供应商候选 ${ranked.length} 个`, `剩余未分摊 ${roundNumber(remainQty, 1)}`],
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

  if (functionName === 'assemble_diagnosis_report') {
    const equipmentId = String(input.equipment_id ?? '')
    const phenomenonLabel = String(input.phenomenon_label ?? '未识别现象')
    const suspectedCauses = Array.isArray(input.suspected_causes) ? input.suspected_causes as Array<Record<string, unknown>> : []
    const recommendedActions = Array.isArray(input.recommended_actions) ? input.recommended_actions.map(item => String(item)) : []
    const nextCheckpoints = Array.isArray(input.next_checkpoints) ? input.next_checkpoints.map(item => String(item)) : []
    const priority = String(input.priority ?? 'P2')
    const topCause = suspectedCauses[0]
    const topCauseName = String(topCause?.cause ?? '待人工确认')
    const confidence = roundNumber(Number(topCause?.confidence ?? 0))

    return {
      output: {
        equipmentId,
        summary: `${phenomenonLabel}，建议优先排查 ${topCauseName}`,
        priority,
        confidence,
        recommendedActions: recommendedActions.slice(0, 3),
        nextCheckpoints: nextCheckpoints.slice(0, 3),
      },
      logLines: [`设备 ${equipmentId || '未填写'}`, `最高优先根因 ${topCauseName}`, `输出优先级 ${priority}`],
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
