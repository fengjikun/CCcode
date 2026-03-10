import type {
  ActionDefinition,
  AiInsightRun,
  ActionStatus,
  EntityPropertyConfig,
  EntityTypeConfig,
  ExtractionRun,
  FunctionDefinition,
  FunctionStatus,
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

const STORAGE_KEY = 'deepexios_projects_v3'
/** 当默认数据结构变化时递增此值，触发本地缓存迁移 */
const DATA_VERSION = 8

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
  },
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
  ['2.4.18', '补货策略本体', 'retail', '门店与运营', '(SKU分类:某鞋) -[补货逻辑]-> (定量补货/Min-Max)', '自动订单Agent：根据不同SKU的周期属性，自动计算本次应补货数量', '执行类', 7200],
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

/** 从三元组示例中提取 Subject / Predicate / Object */
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

const PINNED_PROJECT_NAME = '故障诊断本体'

function isPinnedProject(project: Pick<ProjectDetail, 'name'>): boolean {
  return project.name === PINNED_PROJECT_NAME
}

function sortProjectsByUpdatedAt(projects: ProjectDetail[]): ProjectDetail[] {
  return [...projects].sort((a, b) => {
    const aPinned = isPinnedProject(a)
    const bPinned = isPinnedProject(b)
    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1
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
      message: status === 'SUCCESS' ? '已连接到本地 mock 数据源' : '连接信息不完整',
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
