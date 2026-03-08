import type { Skill, SkillCategory, SkillStatus, SkillTemplateFile, SkillScriptFile } from '../types/skill'

const STORAGE_KEY = 'deepexios_skills_v2'

const DEFAULT_SKILLS: Skill[] = [
  {
    id: 'sk-001',
    name: 'equipment-fault-diagnosis',
    displayName: '设备故障诊断专家',
    category: 'domain-expert',
    status: 'Active',
    description: '基于设备本体与故障知识图谱，分析传感器数据、定位故障根因、输出结构化维修方案。适用于设备运维 Agent。',
    instructions: `# 设备故障诊断专家

> **触发时机**：当收到设备告警、用户提问设备故障、或请求维修方案时自动加载。

## 可用工具

- \`ontology-api\` — 查询设备本体与故障知识图谱
- \`sensor-data-api\` — 获取传感器时序数据（振动、温度、电流）

## 执行流程

1. **信息采集**：收集设备编号、故障代码、告警时间、相关传感器数据
2. **知识匹配**：调用 ontology-api 在故障知识图谱中检索相似故障案例
3. **根因分析**：结合传感器时序数据定位根因，必要时执行 \`scripts/analyze_vibration.py\`
4. **方案生成**：按 \`template/diagnosis_report.md\` 模板输出结构化维修方案

## 输出规范

- 始终使用中文回复
- 维修方案按紧急程度标注 HIGH / MEDIUM / LOW
- 涉及安全风险时必须置顶安全警告
- 引用知识图谱中的故障案例编号`,
    reference: `# 参考资料

## 故障代码格式

故障代码格式为 \`FC-{设备类型}-{编号}\`，例如：
- FC-PUMP-001 — 泵体振动超标
- FC-MOTOR-012 — 电机温升异常
- FC-VALVE-003 — 阀门泄漏

## 诊断报告填写示例

**故障根因判定**：轴承内圈磨损导致振动值超标（当前 12.5mm/s，标准 ≤ 7.1mm/s）
**紧急程度**：HIGH
**维修步骤**：
1. 停机并挂牌锁定（LOTO）
2. 拆卸轴承端盖，检查轴承状态
3. 更换轴承（型号 SKF 6205-2RS）
4. 重新对中并试运行

## 专有名词

| 缩写 | 全称 | 说明 |
|------|------|------|
| LOTO | Lock Out Tag Out | 上锁挂牌 |
| RCA | Root Cause Analysis | 根因分析 |
| MTBF | Mean Time Between Failures | 平均故障间隔 |
| CBM | Condition Based Maintenance | 状态维修 |`,
    templates: [
      { name: 'diagnosis_report.md', description: '诊断报告输出模板' },
    ],
    scripts: [
      { name: 'analyze_vibration.py', description: '振动频谱分析脚本' },
    ],
    dependencies: 'ontology-api, sensor-data-api',
    tags: ['设备运维', '故障诊断', 'IoT'],
    installs: 2341,
    author: 'DeepexiOS',
    createdAt: '2024-06-01T08:00:00.000Z',
    updatedAt: '2024-11-20T10:00:00.000Z',
  },
  {
    id: 'sk-002',
    name: 'purchase-order-approval',
    displayName: '采购审批流程助手',
    category: 'enterprise',
    status: 'Active',
    description: '自动化采购订单审批：校验金额权限、供应商资质、合规性检查，输出审批意见并触发 SAP 流程。',
    instructions: `# 采购审批流程助手

> **触发时机**：当收到采购订单审批请求、或用户询问采购相关审批规则时自动加载。

## 可用工具

- \`sap-api\` — 查询供应商名录、预算余额、订单状态
- \`approval-engine\` — 提交审批结果、触发后续流程

## 执行流程

1. **订单解析**：提取采购金额、供应商、物料清单
2. **合规检查**：按 reference.md 中的审批规则逐项校验
3. **风险评估**：检查关联交易、预算充足性、交货期
4. **意见生成**：输出通过/驳回建议及风险提示

## 审批规则

| 金额范围 | 审批层级 | 审批人 |
|---------|---------|--------|
| < 5万 | L1 | 部门经理 |
| 5万-50万 | L2 | 事业部总经理 |
| > 50万 | L3 | VP + CFO |

## 输出格式

审批意见包含：通过/驳回建议、风险提示、补充说明`,
    reference: `# 参考资料

## 合格供应商名录查询

通过 sap-api 查询，供应商等级：
- **A 级**：年度评审合格，可直接采购
- **B 级**：需附加质量检查
- **C 级**：仅限小额采购（< 1万）

## 常见驳回原因示例

1. 供应商不在合格供应商名录中
2. 部门预算余额不足
3. 存在关联交易嫌疑（需合规部复核）
4. 交货期无法满足生产计划`,
    templates: [
      { name: 'approval_opinion.md', description: '审批意见输出模板' },
    ],
    scripts: [],
    dependencies: 'sap-api, approval-engine',
    tags: ['采购管理', '审批流程', 'SAP'],
    installs: 1245,
    author: 'DeepexiOS',
    createdAt: '2024-06-15T08:00:00.000Z',
    updatedAt: '2024-11-18T10:00:00.000Z',
  },
  {
    id: 'sk-003',
    name: 'sensor-anomaly-detection',
    displayName: '传感器异常检测',
    category: 'data-analysis',
    status: 'Active',
    description: '对传感器时序数据进行在线异常识别：基于统计方法和规则引擎，输出异常分数、异常类型和根因定位。',
    instructions: `# 传感器异常检测

> **触发时机**：当需要分析传感器数据、检测设备异常、或评估传感器健康状态时自动加载。

## 可用工具

- \`sensor-data-api\` — 获取传感器时序数据
- \`code-executor\` — 执行 scripts/ 下的分析脚本

## 执行流程

1. **数据获取**：调用 sensor-data-api 获取指定时间窗口的传感器数据
2. **阈值检测**：超出正常范围 (μ ± 3σ) 的数据点标记为异常
3. **趋势分析**：执行 \`scripts/analyze_timeseries.py\` 进行趋势检测
4. **关联分析**：多传感器同时异常时进行关联分析
5. **结果输出**：按规定 JSON 格式输出异常报告

## 输出格式

\`\`\`json
{
  "anomalyScore": 0.85,
  "type": "threshold_breach",
  "sensor": "vibration_x",
  "severity": "HIGH",
  "recommendation": "建议立即检查轴承状态"
}
\`\`\``,
    templates: [],
    scripts: [
      { name: 'analyze_timeseries.py', description: '时序异常分析脚本' },
      { name: 'spectral_analysis.py', description: '振动频谱分析脚本' },
    ],
    dependencies: 'sensor-data-api, numpy, scipy',
    tags: ['异常检测', '传感器', '时序分析'],
    installs: 756,
    author: 'DeepexiOS',
    createdAt: '2024-08-15T08:00:00.000Z',
    updatedAt: '2024-11-20T10:00:00.000Z',
  },
  {
    id: 'sk-004',
    name: 'maintenance-ticket-creator',
    displayName: '维修工单生成器',
    category: 'enterprise',
    status: 'Active',
    description: '根据故障诊断结果自动生成标准化维修工单，关联备件、技术人员和安全规范。',
    instructions: `# 维修工单生成器

> **触发时机**：当故障诊断完成需要生成维修工单、或用户请求创建工单时自动加载。

## 可用工具

- \`cmms-api\` — 查询备件库存、技术人员排班
- \`code-executor\` — 执行工单编号生成脚本

## 执行流程

1. **信息提取**：从诊断报告中提取故障信息
2. **编号生成**：执行 \`scripts/gen_workorder_id.py\` 生成工单编号（WO-YYYYMMDD-XXXX）
3. **备件匹配**：调用 cmms-api 查询所需备件库存
4. **人员指派**：根据技能矩阵和排班表指派技术人员
5. **工单生成**：按 \`template/workorder.md\` 模板生成工单

## 优先级定义

- P1(4h) — 停产故障，紧急抢修
- P2(24h) — 影响产能，计划维修
- P3(72h) — 性能降低，排期维修
- P4(计划) — 预防性维护

## 安全规范

- P1/P2 工单必须包含安全隔离措施
- 高压设备必须要求双人操作
- 特种作业需检查操作证有效期`,
    reference: `# 参考资料

## 工单字段说明

| 字段 | 说明 | 示例 |
|------|------|------|
| 工单编号 | 自动生成 | WO-20241201-0012 |
| 设备编号 | 关联设备台账 | EQ-PUMP-003 |
| 维修类型 | 紧急/计划/预防 | 紧急抢修 |
| 所需备件 | 从备件目录匹配 | SKF 6205-2RS x2 |

## 安全隔离措施模板

1. 断开设备电源并挂锁
2. 释放残余压力/能量
3. 设置安全警示标识
4. 确认零能量状态`,
    templates: [
      { name: 'workorder.md', description: '维修工单输出模板' },
    ],
    scripts: [
      { name: 'gen_workorder_id.py', description: '工单编号生成脚本' },
    ],
    dependencies: 'cmms-api',
    tags: ['工单管理', '设备维修', '安全规范'],
    installs: 876,
    author: 'DeepexiOS',
    createdAt: '2024-07-01T08:00:00.000Z',
    updatedAt: '2024-11-22T10:00:00.000Z',
  },
  {
    id: 'sk-005',
    name: 'inventory-demand-forecast',
    displayName: '库存需求预测',
    category: 'data-analysis',
    status: 'Active',
    description: '基于历史销量、季节因子与促销日历，预测未来物料需求，生成补货建议和安全库存调整方案。',
    instructions: `# 库存需求预测

> **触发时机**：当用户查询库存预测、补货建议、或安全库存调整时自动加载。

## 可用工具

- \`erp-api\` — 查询历史销量、库存水位、促销日历
- \`code-executor\` — 执行预测计算脚本

## 执行流程

1. **数据加载**：调用 erp-api 获取历史销量数据（最近 12 个月）
2. **模式识别**：识别季节性模式和趋势
3. **因子叠加**：叠加促销日历影响因子
4. **预测计算**：执行 \`scripts/forecast_model.py\` 进行预测
5. **方案生成**：计算安全库存水位并生成补货建议

## 预测模型

- 短期（7天）：加权移动平均
- 中期（30天）：Holt-Winters
- 长期（90天）：季节分解 + 趋势外推

## 输出内容

- 未来 N 天每日预测需求量
- 建议补货时间点和数量
- 安全库存调整建议
- 置信区间（80%/95%）`,
    templates: [],
    scripts: [
      { name: 'forecast_model.py', description: '需求预测计算脚本' },
      { name: 'seasonal_decompose.py', description: '季节因子分解脚本' },
    ],
    dependencies: 'erp-api, numpy, pandas, statsmodels',
    tags: ['库存管理', '需求预测', '供应链'],
    installs: 534,
    author: 'DeepexiOS',
    createdAt: '2024-07-10T08:00:00.000Z',
    updatedAt: '2024-11-25T10:00:00.000Z',
  },
  {
    id: 'sk-006',
    name: 'quality-inspection-report',
    displayName: '质量检测报告生成',
    category: 'document',
    status: 'Active',
    description: '根据检测数据和质量标准，自动生成结构化质检报告，包含合格判定、偏差分析和改进建议。',
    instructions: `# 质量检测报告生成

> **触发时机**：当收到检测数据需要生成质检报告、或用户请求质量分析时自动加载。

## 可用工具

- \`qms-api\` — 查询质量标准库、历史检测记录
- \`code-executor\` — 执行统计分析脚本

## 执行流程

1. **数据解析**：提取批次号、产品型号、检测项目和实测值
2. **标准匹配**：调用 qms-api 获取对应产品的质量标准
3. **合格判定**：逐项对比实测值与标准值
4. **偏差分析**：对超标项执行 \`scripts/spc_analysis.py\` 进行统计分析
5. **报告生成**：按 \`template/inspection_report.md\` 模板输出

## 判定规则

- 全部指标合格 → 批次合格
- 关键指标不合格 → 批次不合格
- 非关键指标超标但在允差内 → 有条件放行`,
    reference: `# 参考资料

## 质检报告结构

1. **基础信息**：批次号、产品型号、检测日期、检测人
2. **检测结果**：各项指标实测值 vs 标准值
3. **合格判定**：逐项判定 + 整体结论
4. **偏差分析**：超标项的原因分析
5. **改进建议**：针对偏差项的工艺改进建议

## 填写示例

| 检测项 | 标准值 | 实测值 | 判定 |
|--------|--------|--------|------|
| 尺寸A | 50±0.1mm | 50.05mm | ✅ 合格 |
| 硬度 | HRC 58-62 | HRC 56 | ❌ 不合格 |`,
    templates: [
      { name: 'inspection_report.md', description: '质检报告模板' },
    ],
    scripts: [
      { name: 'spc_analysis.py', description: 'SPC 统计过程控制分析' },
    ],
    dependencies: 'qms-api, numpy',
    tags: ['质量管理', '检测报告', '合规'],
    installs: 421,
    author: 'DeepexiOS',
    createdAt: '2024-07-05T08:00:00.000Z',
    updatedAt: '2024-11-15T10:00:00.000Z',
  },
  {
    id: 'sk-007',
    name: 'supplier-notification',
    displayName: '供应商协同通知',
    category: 'communication',
    status: 'Active',
    description: '根据订单状态变更自动生成供应商通知内容：发货催促、交期确认、质量反馈、付款通知等场景化模板。',
    instructions: `# 供应商协同通知

> **触发时机**：当订单状态变更需要通知供应商、或用户请求生成供应商通知时自动加载。

## 可用工具

- \`scm-api\` — 查询订单状态、供应商联系信息
- \`notification-api\` — 发送邮件/短信通知

## 执行流程

1. **场景识别**：判断通知场景（交期确认/发货催促/质量反馈/付款通知）
2. **信息组装**：从 scm-api 获取订单详情和供应商信息
3. **内容生成**：使用 \`template/\` 下对应场景模板生成通知内容
4. **格式审查**：确保包含必要信息（订单编号、物料清单、截止日期）

## 通知场景

1. **交期确认** — 新订单下达后请求交期回复
2. **发货催促** — 临近交期未发货时催促
3. **质量反馈** — 来料检验不合格时通知
4. **付款通知** — 付款计划或已付款通知

## 格式要求

- 正式商务语气
- 明确要求回复截止日期
- 质量反馈需附照片/数据引用`,
    reference: `# 参考资料

## 通知语气规范

- 交期确认：礼貌请求，给予合理回复期限（3个工作日）
- 发货催促：明确但不失礼，说明影响和紧迫性
- 质量反馈：客观陈述事实，附数据佐证，要求改善方案
- 付款通知：简洁明了，列明金额和付款方式`,
    templates: [
      { name: 'delivery_confirm.md', description: '交期确认通知模板' },
      { name: 'shipping_reminder.md', description: '发货催促通知模板' },
      { name: 'quality_feedback.md', description: '质量反馈通知模板' },
      { name: 'payment_notice.md', description: '付款通知模板' },
    ],
    scripts: [],
    dependencies: 'scm-api, notification-api',
    tags: ['供应商管理', '通知推送', '供应链'],
    installs: 312,
    author: 'DeepexiOS',
    createdAt: '2024-09-01T08:00:00.000Z',
    updatedAt: '2024-11-28T10:00:00.000Z',
  },
  {
    id: 'sk-008',
    name: 'code-review-assistant',
    displayName: '代码审查助手',
    category: 'development',
    status: 'Draft',
    description: '自动审查代码变更：检查编码规范、安全漏洞、性能问题，生成结构化 Review 意见。',
    instructions: `# 代码审查助手

> **触发时机**：当收到代码审查请求、PR 提交、或用户请求代码质量检查时自动加载。

## 可用工具

- \`git-api\` — 获取代码变更 diff
- \`code-executor\` — 执行静态分析脚本

## 执行流程

1. **变更获取**：调用 git-api 获取代码变更内容
2. **规范检查**：对照 reference.md 中的编码规范逐项检查
3. **安全扫描**：执行 \`scripts/security_scan.py\` 检测常见安全漏洞
4. **性能分析**：识别 N+1 查询、内存泄漏等性能问题
5. **意见生成**：按严重程度分类输出 Review 意见

## 审查维度

1. **编码规范** — 命名、格式、注释是否符合团队规范
2. **安全风险** — SQL 注入、XSS、敏感信息泄露
3. **性能问题** — N+1 查询、内存泄漏、不必要的计算
4. **可维护性** — 代码复杂度、重复代码、耦合度

## 输出格式

每个问题包含：严重程度、文件路径和行号、问题描述、修复建议`,
    reference: `# 参考资料

## 严重程度定义

- 🔴 **Critical** — 必须修复：安全漏洞、数据丢失风险、线上崩溃
- 🟡 **Warning** — 建议修复：性能问题、潜在 Bug、不规范写法
- 🔵 **Suggestion** — 可选优化：代码风格、可读性改进

## 编码规范摘要

- Python：遵循 PEP 8，函数名 snake_case，类名 PascalCase
- TypeScript：遵循 ESLint recommended，变量 camelCase
- 提交信息：\`type(scope): description\`，如 \`fix(auth): handle token expiry\``,
    templates: [],
    scripts: [
      { name: 'security_scan.py', description: '安全漏洞扫描脚本' },
    ],
    dependencies: 'git-api',
    tags: ['代码审查', '开发工具', '质量保证'],
    installs: 189,
    author: 'DeepexiOS',
    createdAt: '2024-10-01T08:00:00.000Z',
    updatedAt: '2024-11-30T10:00:00.000Z',
  },
]

function load(): Skill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      save(DEFAULT_SKILLS)
      return DEFAULT_SKILLS
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function save(list: Skill[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function listSkills(): Skill[] {
  return load()
}

export function getSkill(id: string): Skill | null {
  return load().find(s => s.id === id) ?? null
}

export function createSkill(input: {
  name: string
  displayName: string
  category: SkillCategory
  description: string
  instructions: string
  reference?: string
  templates?: SkillTemplateFile[]
  scripts?: SkillScriptFile[]
  dependencies?: string
  tags?: string[]
}): Skill {
  const now = new Date().toISOString()
  const skill: Skill = {
    id: `sk-${Date.now()}`,
    name: input.name,
    displayName: input.displayName,
    category: input.category,
    status: 'Draft',
    description: input.description,
    instructions: input.instructions,
    reference: input.reference,
    templates: input.templates || [],
    scripts: input.scripts || [],
    dependencies: input.dependencies,
    tags: input.tags || [],
    installs: 0,
    author: 'Current User',
    createdAt: now,
    updatedAt: now,
  }
  const list = load()
  list.push(skill)
  save(list)
  return skill
}

export function updateSkill(
  id: string,
  patch: Partial<Pick<Skill, 'displayName' | 'description' | 'instructions' | 'reference' | 'status' | 'category' | 'dependencies' | 'templates' | 'scripts' | 'tags'>>,
): Skill | null {
  const list = load()
  const idx = list.findIndex(s => s.id === id)
  if (idx < 0) return null
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() }
  save(list)
  return list[idx]
}

export function deleteSkill(id: string): void {
  save(load().filter(s => s.id !== id))
}

export function toggleSkillStatus(id: string): Skill | null {
  const list = load()
  const idx = list.findIndex(s => s.id === id)
  if (idx < 0) return null
  const current = list[idx].status
  const next: SkillStatus = current === 'Active' ? 'Disabled' : 'Active'
  list[idx] = { ...list[idx], status: next, updatedAt: new Date().toISOString() }
  save(list)
  return list[idx]
}

/** 重置为默认数据（开发用） */
export function resetSkills(): void {
  save(DEFAULT_SKILLS)
}

/* ──────────── 从本体 Function 导入 ──────────── */

export interface OntologyFunctionItem {
  id: string
  name: string
  projectName: string
  projectId: string
  description: string
  scriptContent: string
  status: string
}

/** Mock: 获取可导入的本体 Function 列表 */
export function listImportableFunctions(): OntologyFunctionItem[] {
  return [
    {
      id: 'fn-001',
      name: 'checkMotorHealth',
      projectName: '设备运维本体',
      projectId: 'proj-001',
      description: '检查电机健康状态，分析轴承温度、振动和电流数据，返回健康评分和异常诊断',
      scriptContent: 'def check_motor_health(device_id, time_range):\n    sensor_data = get_sensor_data(device_id, time_range)\n    health_score = analyze(sensor_data)\n    return {"score": health_score, "anomalies": detect_anomalies(sensor_data)}',
      status: 'ACTIVE',
    },
    {
      id: 'fn-002',
      name: 'calculateSafetyStock',
      projectName: '供应链本体',
      projectId: 'proj-002',
      description: '基于历史消耗和供应周期，计算物料安全库存水位和补货点',
      scriptContent: 'def calculate_safety_stock(sku_id, service_level=0.95):\n    demand = get_demand_history(sku_id, 90)\n    lead_time = get_avg_lead_time(sku_id)\n    return {"safety_stock": compute(demand, lead_time, service_level)}',
      status: 'ACTIVE',
    },
    {
      id: 'fn-003',
      name: 'matchFaultPattern',
      projectName: '设备运维本体',
      projectId: 'proj-001',
      description: '在故障知识图谱中匹配故障模式，返回相似案例和维修建议',
      scriptContent: 'def match_fault_pattern(fault_code, symptoms):\n    patterns = query_knowledge_graph(fault_code)\n    matches = rank_by_similarity(patterns, symptoms)\n    return {"top_matches": matches[:5], "confidence": matches[0].score}',
      status: 'ACTIVE',
    },
    {
      id: 'fn-004',
      name: 'generateCostAnalysis',
      projectName: '财务分析本体',
      projectId: 'proj-003',
      description: '汇总成本数据，生成多维度成本分析报告（产品/部门/时间维度）',
      scriptContent: 'def generate_cost_analysis(dimensions, period):\n    data = aggregate_costs(dimensions, period)\n    return {"summary": data, "trends": compute_trends(data)}',
      status: 'ACTIVE',
    },
    {
      id: 'fn-005',
      name: 'evaluateSupplierRisk',
      projectName: '供应链本体',
      projectId: 'proj-002',
      description: '评估供应商风险：交期达成率、质量合格率、财务稳定性综合评分',
      scriptContent: 'def evaluate_supplier_risk(supplier_id):\n    metrics = get_supplier_metrics(supplier_id)\n    risk_score = weighted_score(metrics)\n    return {"risk_level": classify(risk_score), "details": metrics}',
      status: 'ACTIVE',
    },
  ]
}

/** 将本体 Function 导入为 Skill */
export function importFunctionAsSkill(fn: OntologyFunctionItem): Skill {
  return createSkill({
    name: fn.name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''),
    displayName: fn.description.split('，')[0] || fn.name,
    category: 'domain-expert',
    description: `从本体项目「${fn.projectName}」导入的 Function。${fn.description}`,
    instructions: `# ${fn.name}\n\n> **来源**：本体项目「${fn.projectName}」\n> **触发时机**：${fn.description}\n\n## 执行逻辑\n\n\`\`\`python\n${fn.scriptContent}\n\`\`\`\n\n## 输出规范\n\n- 返回结构化 JSON 结果\n- 包含置信度/评分字段`,
    scripts: [{ name: `${fn.name}.py`, description: `从本体 Function 导入` }],
    tags: ['本体导入', fn.projectName],
  })
}
