# DeepexiOS 前端优化 TODO

> 基于 L1-L7 全部平台页面的系统性审查，按优先级排列。
> 演示主流程：数据源 → 数据转换 → 本体定义 → Skills 生成 → Skills Hub → 多智能体编排 → AI员工
> 技术栈：React 19 + TypeScript 5.9 + Vite 7 + Ant Design 6 + D3.js 7 + React Router v7
> 代码规模：~95 个 TSX 文件，~21K LOC

---

## 推荐执行计划

> 按 ROI（投入产出比）分迭代，优先低成本高收益项。

### 迭代 1 — 低成本高收益（1-2天）
1. React.lazy 路由懒加载（19 个页面全静态 import，改动量小收益大）
2. 统一 StatCard span / Table gutter（批量搜索替换）
3. 统一状态命名（英文 enum + 中文 label map）
4. 大模型训练主流程 P0 bug 修复

### 迭代 2 — 核心重构（2-3天）
1. 大文件拆分：SkillsMarketPage(900行) → SkillTable + SkillFormModal + SkillImportModal
2. 大文件拆分：AgentStudioPage(878行) → AgentTable + AgentFormModal + OrchestrationView
3. 封装 `useRequest` hook 统一 loading/error 处理
4. Mock 数据抽离到 `src/mocks/` 目录
5. 跨页面数据联动修复

### 迭代 3 — 体验打磨（按需）
1. 缺失交互功能按演示流程优先级逐个补全
2. 可视化增强（D3 图谱复用 ForceGraph）
3. 响应式断点 + 无障碍 + 中英文一致性

---

## P0 — 高优先级（通用基础设施 + 核心功能）

### 路由与性能
- [ ] **React.lazy 路由懒加载** — App.tsx 中 19 个页面全部静态 import，零代码分割，首屏加载全量 21K LOC。改为 `React.lazy()` + `<Suspense fallback={<Spin />}>`
- [ ] 统一 StatCard span：4 项用 `span={6}`，6 项用 `span={4}`（DICWorkerPage 未设 gutter）
- [ ] 统一 Table gutter：全部使用 `gutter={[12, 12]}`
- [ ] 统一状态命名：当前中英文混用（Active/Draft vs 健康/降级），统一为英文状态 enum + 中文 label map

### 大文件拆分（可维护性瓶颈）
- [ ] **SkillsMarketPage (900行)** — 拆分为 `SkillTable` + `SkillFormModal` + `SkillImportModal` + `SkillDirectoryTree`
- [ ] **AgentStudioPage (878行)** — 拆分为 `AgentTable` + `AgentFormModal` + `OrchestrationView`
- [ ] **ModelTrainingPage (650行)** — 拆分训练表格/创建弹窗/Loss 曲线为独立子组件
- [ ] **ModelEvaluationPage (623行)** — 拆分评估表格/详情面板/混淆矩阵为独立子组件
- [ ] 抽取 `FileListEditor`、`SkillDirectoryTree` 到 `components/shared/`

### 错误处理
- [ ] 所有 API 调用包裹 try-catch，失败时 `message.error()` 提示
- [ ] Modal 内表单提交增加 loading 态 + 失败回滚

### TypeScript 规范
- [ ] Table columns 缺少 `ColumnsType<T>` 泛型标注，render 参数手动声明类型

---

## P0 — 大模型训练主流程 Bug

> 覆盖：训练数据集增强、模型训练增强、模型评估（新建）、模型网关增强
> 演示流程 = 训练数据准备 → 模型训练 → 训练监控 → 模型评估 → 模型发布

### 跨页面数据联动
- [x] **数据集 → 训练**：训练页创建弹窗数据集 Select 改为从 `listDatasets()` 动态获取 ✅
- [x] **训练 → 评估**：评估页创建弹窗模型/数据集 Select 改为从 `listTrainingProjects()`/`listDatasets()` 动态获取 ✅
- [x] **评估 → 网关**：评估报告"发布模型"按钮改为关闭抽屉 + 跳转 `/model-lab/gateway` ✅
- [x] **训练 → 评估快捷入口**：训练详情抽屉 Completed 状态新增"去评估"按钮，跳转 `/model-lab/evaluation` ✅
- [x] **数据集 sampleData 语义不匹配**：customer_churn_v1 改为客户字段、supplier_risk_v1 改为供应商字段 ✅

### 训练数据集页面
- [ ] 新建弹窗 Train/Val/Test 百分比无求和校验，允许合计超过 100%。应加 Form 级 validator
- [x] `handleBuild` 构建进度模拟：setInterval 每 1.5s 推进进度，100% 后自动变为 Ready ✅

### 模型训练页面
- [x] 创建弹窗 Learning Rate InputNumber 移除 `stringMode`，确保值为 number 类型 ✅
- [ ] SVG Loss 曲线宽度固定 620px 不响应式，应改用 `viewBox` 适配容器
- [ ] `handleDelete` 只在 state 中过滤未从 `MOCK_JOBS` 移除，刷新后数据恢复

### 模型评估页面
- [x] 混淆矩阵改为按 task key 切换不同数据（采购订单 4x4、设备故障 5x5、需求预测 3x3） ✅
- [ ] `getEvalComparisons` 仅 2 个模型有对比数据，其他模型 fallback 信息不匹配

### 模型网关页面
- [x] `handleDeploy`/`handlePromote`/`handleRollback`/`handleUpdateTraffic` 成功后调用 `refreshData()` 刷新表格 ✅

---

## P1 — 中优先级（功能增强）

### 新增架构优化项
- [ ] **封装 `useRequest` hook** — 各页面重复写 loading/error/data 三件套，统一为 `useRequest(apiFn, options?)` 减少样板代码
- [ ] **Mock 数据层抽离** — mock 数据散落在各页面组件内部，统一放到 `src/mocks/` 目录，对接真实 API 时可一键切换
- [ ] **Ant Design 6 主题 Token 统一** — 利用 Design Token 统一颜色/间距，减少内联样式

### 演示流程页面 Bug / 缺陷

#### TransformPage
- [ ] 运行中的任务缺少进度指示（可加 `Progress` 组件或脉冲动画）

#### OntologyOverviewPage
- [ ] Actions Tab 缺少按状态 (Active/Draft) 筛选

#### SkillsMarketPage
- [ ] 本体导入的去重逻辑有误：用 `tags.flat()` 匹配名称，应改为按 Skill `name` 或 `displayName` 匹配
- [ ] 分类筛选有两套 UI（卡片 + Select），点击行为不完全同步，逻辑重复应合并为单一交互

#### AgentLogsPage
- [ ] 无日志导出功能（CSV/JSON）

#### DeviceFaultMonitorPage
- [ ] SSE 流式响应无取消机制（长时间无响应时用户无法中断）
- [ ] 聊天记录刷新后丢失，应存储到 localStorage 并提供"清空对话"按钮
- [ ] 三个独立 `useRef` 追踪流式状态（`stepsIdRef`, `replyIdRef`, `isFollowUpRef`），应合并为单个 ref 对象
- [ ] 工单弹窗信息过密，可拆分为 Tab（基础/工具/步骤/安全）

### 大模型训练主流程（P1 级）

#### 训练数据集页面
- [ ] 详情抽屉数据预览表格未处理长文本截断，长字段值会撑开表格
- [ ] Schema 字段选项（`SCHEMA_FIELD_OPTIONS`）固定 12 个，与所选 ontology source 无关，应根据数据来源动态展示
- [ ] 行点击事件中 `e.target.closest('.ant-popconfirm')` 无法拦截 Popconfirm 弹层（渲染在 body 而非 row 内）

#### 模型训练页面
- [ ] Loss 曲线每次进入页面重新 `generateLossCurve()` 随机生成，同一 job 每次曲线不同。应初始化时固定或缓存
- [ ] `generateLogs` 对所有 job 生成相同内容（都引用 purchase_orders_v3），应根据 projectName/dataSource 差异化
- [ ] 框架与训练方式组合缺少逻辑约束：scikit-learn 不应有 LoRA/QLoRA 选项
- [ ] "重新训练"按钮找不到 project 时静默失败，应加错误提示

#### 模型评估页面
- [ ] 创建弹窗"模型版本"下拉是通用版本号（v1.0/v2.0/v3.0），应根据选中模型动态展示可用版本
- [ ] "发布模型"按钮缺少 loading 状态
- [ ] 样本对比用内联 `<style>` 注入 `.row-error-light` CSS，应改为 CSS module 避免全局污染
- [ ] 样本展开行内容与非展开行高度重复，展开后应显示更多信息（特征权重等）
- [ ] 删除操作只在 state 过滤，刷新恢复

#### 模型网关页面
- [ ] 部署流水线"评估通过"数量 = staging + canary + production，语义不准确
- [ ] 调整流量弹窗只更新当前 route 权重，未联动同路径其他版本的权重
- [ ] Radio.Button 颜色设置可能与 antd 主题冲突，需测试深浅主题兼容性
- [ ] Model Registry 表移除了 Endpoint 列，运维场景可能需要保留

### 通用代码质量
- [ ] 4 个页面 Modal 使用已废弃 `destroyOnClose`（antd 5.x deprecated），建议迁移 `destroyOnHidden`
- [ ] `ModelTrainingPage` 和 `ModelEvaluationPage` 的 `STATUS_ICONS` 定义重复，应提取共享常量
- [ ] mock API（`deployModel` 等）使用 async 模拟延迟，但调用方未设 loading 状态，UI 无反馈
- [ ] 数据集页面用 localStorage 持久化，其他页面不持久化，体验不一致
- [ ] mock API 直接操作模块级数组（`MOCK_JOBS.unshift()`），多次调用可能导致数据重复

### 缺失交互功能
- [ ] **OntologyOverviewPage**: 添加 Object Type 创建/编辑弹窗（当前纯只读）
- [ ] **OntologyOverviewPage**: 统计数据从写死→动态聚合（从项目/Schema 实际数据计算）
- [ ] **ModelGatewayPage**: 路由权重调整、模型上下线操作（当前只读）
- [ ] **ModelGatewayPage**: 模型晋升流程 UI（Staging → Canary → Production）
- [ ] **ModelGatewayPage**: Endpoint 列添加一键复制
- [ ] **ModelTrainingPage**: 添加"注册模型"工作流（训练完成 → 注册到 Gateway）
- [ ] **AgentLogsPage**: 时间范围过滤 + 日志详情展开（Skill 调用链、耗时、结果）
- [ ] **AgentStudioPage**: Agent 协作配置 — 路由策略、协作模式（串行/并行/决策树）
- [ ] **所有 Table**: 空数据状态插画（当前过滤无结果时显示空白）

### 缺失可视化
- [ ] **OntologyOverviewPage**: 图谱占位框替换为真实 D3 可视化（已有 ForceGraph 组件可复用）
- [ ] **TransformPage**: 上下游数据血缘图谱（PRD 要求）
- [ ] **ModelTrainingPage**: GPU 利用率仪表盘（当前只显示百分比文本）
- [ ] **DashboardPage**: 请求量/延迟的 24h 趋势图（sparkline 或 mini chart）

### Skill 相关增强
- [ ] **SkillsMarketPage**: 添加 Skill 执行指标（成功率、平均耗时、调用次数）
- [ ] **SkillsMarketPage**: Skill 版本历史记录
- [ ] **SkillsMarketPage**: Skill ↔ Agent 依赖关系图

### Mock 数据丰富
- [ ] 每个页面至少包含 1 条 Error/Failed 状态的数据（当前多数只有正常态）
- [ ] DataSourcePage 添加 Inactive/Error 状态数据源
- [ ] AgentStudioPage 增加到 8-10 个 Agent（当前只有 3 个），统一使用 Deepexi 系列模型
- [ ] DashboardPage Activity 添加 error 级别日志
- [ ] 时间戳改为相对当前时间动态生成（当前全部硬编码）
- [ ] ModelGatewayPage QPS 数据应有差异化，P50/P99 延迟需拉开合理差距
- [ ] AgentLogsPage 工具使用应多样化（部分日志不使用工具、部分使用 3-4 个）
- [ ] DataSourcePage 记录数避免整数（125840→随机化）
- [ ] ModelTrainingPage 训练进度条是静态值，应模拟动态更新或至少变化

---

## P2 — 低优先级（体验打磨）

### UX 细节
- [ ] Modal 打开时显示 Skeleton 加载骨架
- [ ] 代码块（pre.code-block）添加一键复制按钮
- [ ] 所有 icon-only 按钮添加 `aria-label`（无障碍）
- [ ] 删除操作增加 Undo 选项（3s 内可撤回）
- [ ] DashboardPage 活动时间线改为实时刷新（轮询或 WebSocket）
- [ ] DashboardPage Pipeline 横向排列在窄屏溢出，缺少 `flex-wrap` 或滚动提示
- [ ] DashboardPage 缺少数据新鲜度标识（如 "Updated just now"）
- [ ] DigitalHumanListPage 顶部领域类型卡片不可点击过滤，应与列表联动
- [ ] DigitalHumanListPage / AgentStudioPage 缺少"克隆"操作（快速复制已有配置）
- [ ] DeviceFaultMonitorPage 缺少对话导出（Markdown/PDF）
- [ ] DICWorkerPage 卡片中 Skills 列表被折叠到弹窗，应在卡片上显示前 2-3 个

### 中英文一致性
- [ ] DashboardPage 标题 "Pipeline Overview" → 统一中文或统一英文
- [ ] ModelGatewayPage Tab "Model Registry" / "Gateway Routes" → 中文
- [ ] OntologyOverviewPage Tab "Object Types" / "Link Types" / "Actions" → 中文
- [ ] 状态标签统一策略：全英文 Active/Draft/Disabled + 中文 tooltip，或全中文

### 代码质量
- [ ] 统一日期格式化工具函数 `formatDate()` / `formatRelativeTime()`
- [ ] 创建可复用 Form 布局组件（Row + Col + gutter 标准化）
- [ ] 清理 `global.css` 中未使用的 `stat-rose`、`.worker-card` 样式类
- [ ] **ModelTrainingPage / TrainingDatasetsPage**: Select 选项（数据源、框架、GPU）硬编码在 JSX 中，应提取为常量数组
- [ ] SkillsMarketPage: `renderSkillForm()` 提取为独立组件避免每次渲染重建

### 大模型训练主流程（P2 级）

#### 训练数据集页面
- [ ] 数据集版本管理仅静态展示 version 字段，无版本历史
- [ ] 缺少"重新构建"操作确认提示

#### 模型训练页面
- [ ] 训练项目表格缺少操作列（编辑、删除项目）
- [ ] 项目表格列数多，应加 `scroll={{ x: 'max-content' }}`

#### 模型评估页面
- [ ] 缺少"批量评估"或"重新评估"入口
- [ ] 混淆矩阵仅支持 5 分类，对生成/问答类任务应切换为 BLEU/ROUGE 指标展示

#### 模型网关页面
- [ ] 运行监控数据静态，缺少定时刷新模拟实时效果
- [ ] 缺少模型下线/归档操作（Production → Archived）
- [ ] 缺少部署历史/审计日志

### 响应式 & 可访问性
- [ ] 所有页面 Stat Card 使用固定 `Col span`，缺少 `xs/sm/md/lg` 响应式断点
- [ ] DashboardPage Pipeline 横向排列无 `flex-wrap`，窄屏会溢出

### 性能
- [ ] `localStorage` 数据损坏时的 graceful 降级（当前 catch 后静默返回空数组，触发概率低）

---

## 跨页面一致性检查清单

| 项目 | 现状 | 目标 |
|------|------|------|
| **路由加载** | 静态 import 全量加载 | `React.lazy` + `Suspense` |
| **API 调用模式** | useState + useEffect 手写 | 封装 `useRequest(apiFn)` hook |
| **Mock 数据位置** | 分散在各页面组件内 | 统一 `src/mocks/` 目录 |
| Stat Card gutter | 12 / 16 / [12,12] 混用 | 统一 `[12, 12]` |
| Stat Card span | 4 / 6 / flex 混用 | 4项=span6, 6项=span4 |
| Modal width | 560-800 六种 | 小560 / 中640 / 大800 |
| Table size | small / middle 混用 | 统一 `small` |
| Pagination | `> 10 ? {...} : false` | 封装为 `tablePagination(total)` |
| Status dot | 内联 className 拼接 | 封装 `<StatusCell>` 组件 |
| Form layout | Row+Col vs 平铺 | 统一 Row+Col |
| Action 按钮 | 有/无 Tooltip 混用 | 统一有 Tooltip |
| Date format | toLocaleDateString vs 自定义 | 统一 `formatDate()` |
| destroyOnClose | 全部已添加 | 全部 `true`（迁移 `destroyOnHidden`） |
| 表单验证风格 | `.then()` vs `async/await` 混用 | 统一 `async/await` |
| 空数据状态 | `<Empty>` / 条件文本 / 无处理 混用 | 统一 `<Empty>` + 引导操作 |
| 加载状态命名 | `loading/creating/editing/fetching` 混用 | 统一 `isLoading` / `isSubmitting` |
| Scrollbar 样式 | 仅 `-webkit-` 前缀 | 补充 Firefox `scrollbar-*` 属性 |

---

## 已完成项归档

<details>
<summary>点击展开已完成项（不再占用视野）</summary>

### 提取公共组件
- [x] `<StatCards items={[...]} columns={4|6} />` — 统计卡片
- [x] `<PageHeader title="" subtitle="" />` — 页面标题区块
- [x] `<StatusCell value="" colors={{}} />` — 状态列渲染
- [x] `<ModalHeader icon={} title="" />` — 弹窗标题
- [x] `<ActionColumn actions={[...]} />` — 操作列

### 统一设计规范
- [x] 统一 Modal 宽度：小 560、中 640、大 800

### 路由与布局 Bug
- [x] **App.tsx**: 旧路由 `/projects/:projectId` 重定向丢失 `projectId` 参数
- [x] **App.tsx**: 缺少 404 兜底路由
- [x] **AppLayout.tsx**: `findSelectedKey` 前缀匹配可误匹配
- [x] **AppLayout.tsx**: `openKeys` 仅初始化时计算

### 错误处理
- [x] 页面级 ErrorBoundary 组件

### TypeScript 规范
- [x] `catch (err: any)` → `catch (err: unknown)` + 类型守卫

### 核心功能补全
- [x] **TransformPage**: 数据源联动
- [x] **AgentStudioPage**: 编排可视化
- [x] **SkillsMarketPage**: 从 L3 本体工作台 Function 一键导入

### 演示流程页面修复
- [x] DataSourcePage: `testConnection()` 错误处理、Syncing 图标、confirmLoading
- [x] DataSourcePage: 切换分类时清除 testResult
- [x] TransformPage: outputDatasets 空提交校验、handleRun 闪烁修复
- [x] OntologyOverviewPage: Links/Actions Tab 搜索过滤
- [x] AgentStudioPage: SVG 溢出、Skill 搜索、useMemo 优化、listDigitalHumans 修复
- [x] AgentLogsPage: 日志详情展开

### Ant Design 迁移
- [x] `bodyStyle` → `styles={{ body: {...} }}`

### 性能修复
- [x] TrainingDatasetsPage: useMemo deps 修复
- [x] 多页面 useMemo 反模式 → useEffect + useState
- [x] TransformPage: `.then()` → `async/await`
- [x] DICWorkerPage: `<Col>` 补充 `span` 属性

</details>
