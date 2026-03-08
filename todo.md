# DeepexiOS 前端优化 TODO

> 基于 L1-L7 全部平台页面的系统性审查，按优先级排列。
> 演示主流程：数据源 → 数据转换 → 本体定义 → Skills 生成 → Skills 广场 → 多智能体编排 → 数字员工

---

## 🔴 P0 — 高优先级（通用基础设施 + 核心功能）

### 提取公共组件
- [x] `<StatCards items={[...]} columns={4|6} />` — 统计卡片（已应用到 DataSourcePage、TransformPage、AgentStudioPage、AgentLogsPage） ✅
- [x] `<PageHeader title="" subtitle="" />` — 页面标题区块（已应用到 DataSourcePage、TransformPage、AgentStudioPage、AgentLogsPage） ✅
- [x] `<StatusCell value="" colors={{}} />` — 状态列渲染（已应用到 DataSourcePage） ✅
- [ ] `<ModalHeader icon={} title="" />` — 弹窗标题（Space + Icon + Text 重复 30+ 处）
- [ ] `<ActionColumn actions={[...]} />` — 操作列（查看/编辑/删除 Tooltip + Button 组合）

### 统一设计规范
- [ ] 统一 Modal 宽度：小 560、中 640、大 800（当前 560/600/640/680/760/800 混用）
- [ ] 统一 StatCard span：4 项用 `span={6}`，6 项用 `span={4}`（DICWorkerPage 未设 gutter）
- [ ] 统一 Table gutter：全部使用 `gutter={[12, 12]}`
- [ ] 统一状态命名：当前中英文混用（Active/Draft vs 健康/降级），统一为英文状态 + 中文 label

### 路由与布局 Bug
- [x] **App.tsx**: 旧路由 `/projects/:projectId` 重定向丢失 `projectId` 参数，应用 `useParams` 拼接到目标路径 ✅
- [x] **App.tsx**: 缺少 404 兜底路由 `<Route path="*" element={<NotFoundPage />} />` ✅
- [x] **AppLayout.tsx**: `findSelectedKey` 前缀匹配 `pathname.startsWith(key)` 可误匹配（如 `/datasource-new` 匹配 `/datasource`），应改为 `startsWith(key + '/')` ✅
- [x] **AppLayout.tsx**: `openKeys` 仅初始化时计算，之后浏览器直接输入 URL 跳转到子菜单时，侧栏不会自动展开对应父级 ✅

### 错误处理
- [ ] 所有 API 调用包裹 try-catch，失败时 `message.error()` 提示
- [ ] Modal 内表单提交增加 loading 态 + 失败回滚
- [x] 页面级 ErrorBoundary 组件，捕获渲染异常显示 fallback UI ✅
- [ ] localStorage 数据损坏时的 graceful 降级（当前 catch 后静默返回空数组）

### TypeScript 规范
- [x] `catch (err: any)` 应改为 `catch (err: unknown)` + 类型守卫（涉及 DataSourcePage、AgentStudioPage、SkillsMarketPage、ModelTrainingPage、TrainingDatasetsPage） ✅
- [ ] Table columns 缺少 `ColumnsType<T>` 泛型标注，render 参数手动声明类型

### 核心功能补全
- [x] **TransformPage**: 数据源联动 — 从 L1 DataSource 拉取已注册数据源作为输入选项 ✅
- [x] **AgentStudioPage**: 编排可视化 — 多智能体关系图/流程图（节点+连线） ✅
- [x] **SkillsMarketPage**: 从 L3 本体工作台 Function 一键导入/关联 Skill ✅

---

## 🟡 P1 — 中优先级（功能增强）

### 演示流程页面具体 Bug / 缺陷

#### DataSourcePage
- [x] `testConnection()` 无 `.catch()` 错误处理，网络异常时静默失败 ✅
- [x] 切换数据源分类（structured→unstructured）时未清除上次测试结果 `testResult` ✅（已在上轮修复）
- [x] 缺少 "Syncing" 状态的旋转图标反馈（`SyncOutlined spin`） ✅
- [x] 创建表单提交时缺少 `confirmLoading` 加载态 ✅（已有 `confirmLoading={creating}`）

#### TransformPage
- [x] `outputDatasets` 应至少填写一项（当前允许空提交） ✅
- [x] `handleRun` 中 `reload()` + `setRunningIds` 双重状态更新导致闪烁，去掉多余 `reload()` ✅
- [ ] 运行中的任务缺少进度指示（可加 `Progress` 组件或脉冲动画）

#### OntologyOverviewPage
- [x] 搜索框只对 Objects Tab 生效，Links / Actions Tab 无搜索过滤 ✅
- [ ] Actions Tab 缺少按状态 (Active/Draft) 筛选

#### SkillsMarketPage
- [ ] 本体导入的去重逻辑有误：用 `tags.flat()` 匹配名称，应改为按 Skill `name` 或 `displayName` 匹配
- [ ] `FileListEditor` / `SkillDirectoryTree` 应拆分到 `components/shared/` 减小主文件体积（当前 900+ 行）
- [ ] 分类筛选有两套 UI（卡片 + Select），点击行为不完全同步

#### AgentStudioPage
- [x] 编排视图 SVG 节点坐标写死（`x:160, y:80+i*140`），Agent 超过 5 个时溢出 ✅
- [x] Skill 选择器列表无搜索过滤（Skill 数量多时不便） ✅
- [x] `getSkillObj()` 在渲染中重复调用，应 `useMemo` 构建 Map ✅
- [x] `listDigitalHumans()` 在 JSX 中直接调用（统计卡片），每次渲染触发 localStorage 读取 ✅

#### AgentLogsPage
- [x] 日志详情被截断 50 字只能 Tooltip 查看，应支持行展开显示完整内容 ✅
- [ ] 无日志导出功能（CSV/JSON）

#### DeviceFaultMonitorPage
- [ ] SSE 流式响应无取消机制（长时间无响应时用户无法中断）
- [ ] 聊天记录刷新后丢失，应存储到 localStorage 并提供"清空对话"按钮
- [ ] 三个独立 `useRef` 追踪流式状态（`stepsIdRef`, `replyIdRef`, `isFollowUpRef`），应合并为单个 ref 对象
- [ ] 工单弹窗信息过密，可拆分为 Tab（基础/工具/步骤/安全）

### 缺失交互功能
- [ ] **OntologyOverviewPage**: 添加 Object Type 创建/编辑弹窗（当前纯只读）
- [ ] **OntologyOverviewPage**: 统计数据从写死→动态聚合（从项目/Schema 实际数据计算）
- [ ] **ModelGatewayPage**: 路由权重调整、模型上下线操作（当前只读）
- [ ] **ModelGatewayPage**: 模型晋升流程 UI（Staging → Canary → Production）
- [ ] **ModelGatewayPage**: Endpoint 列添加一键复制
- [ ] **ModelTrainingPage**: 添加"注册模型"工作流（训练完成 → 注册到 Gateway）
- [ ] **AgentLogsPage**: 日志导出功能（CSV/JSON）
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
- [ ] AgentStudioPage 增加到 8-10 个 Agent（当前只有 3 个），混用不同模型（DeepSeek/Qwen/GLM-4）
- [ ] DashboardPage Activity 添加 error 级别日志
- [ ] 时间戳改为相对当前时间动态生成（当前全部硬编码）
- [ ] ModelGatewayPage QPS 数据应有差异化（当前数值过于均匀），P50/P99 延迟需拉开合理差距
- [ ] AgentLogsPage 工具使用应多样化（部分日志不使用工具、部分使用 3-4 个）
- [ ] DataSourcePage 记录数避免整数（125840→随机化）
- [ ] ModelTrainingPage 训练进度条是静态值，应模拟动态更新或至少变化

---

## 🟢 P2 — 低优先级（体验打磨）

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

### Ant Design 5 迁移
- [x] `bodyStyle` 已废弃，应迁移为 `styles={{ body: {...} }}`（涉及 DashboardPage、OntologyOverviewPage、SkillsMarketPage、DICWorkerPage、AgentStudioPage、ModelGatewayPage） ✅

### 代码质量
- [ ] 大文件拆分：AgentStudioPage (690行)、SkillsMarketPage (839行)、DataSourcePage (605行) 应提取子组件到独立文件
- [ ] 抽取 `FileListEditor`、`SkillDirectoryTree` 到 `components/shared/`
- [ ] 统一日期格式化工具函数 `formatDate()` / `formatRelativeTime()`
- [ ] 创建可复用 Form 布局组件（Row + Col + gutter 标准化）
- [ ] 清理 `global.css` 中未使用的 `stat-rose`、`.worker-card` 样式类（DICWorkerPage 未使用 `.worker-card`）
- [x] **TransformPage**: `handleCreate`/`handleEdit` 使用 `.then()` 而非 `async/await`，与其他页面风格不一致 ✅
- [ ] **SkillsMarketPage**: 分类筛选有两套 UI（卡片点击 + Select 下拉），逻辑重复应合并
- [x] **AgentStudioPage:404**: `listDigitalHumans()` 在 JSX 渲染中直接调用，每次渲染都触发 API，应移到 state ✅
- [ ] **ModelTrainingPage / TrainingDatasetsPage**: Select 选项（数据源、框架、GPU）硬编码在 JSX `<Select.Option>` 中，应提取为常量数组

### 响应式 & 可访问性
- [ ] 所有页面 Stat Card 使用固定 `Col span`，缺少 `xs/sm/md/lg` 响应式断点
- [ ] DashboardPage Pipeline 横向排列无 `flex-wrap`，窄屏会溢出
- [x] DICWorkerPage 统计卡片 `<Col>` 缺少 `span` 属性，与其他页面不一致 ✅

### 性能
- [x] TrainingDatasetsPage: `useMemo(() => getDatasetStats(), [datasets])` — deps 包含 `datasets` 但函数未使用它，依赖关系有误 ✅
- [x] DashboardPage/OntologyOverviewPage/ModelGatewayPage/ModelTrainingPage/DICWorkerPage: `useMemo(() => fn(), [])` 做初始数据获取是反模式，应改为 `useEffect` + `useState` ✅
- [ ] SkillsMarketPage: `renderSkillForm()` 提取为独立组件避免每次渲染重建
- [ ] React.lazy 按路由懒加载页面（当前 bundle 较大）

---

## 📋 跨页面一致性检查清单

| 项目 | 现状 | 目标 |
|------|------|------|
| Stat Card gutter | 12 / 16 / [12,12] 混用 | 统一 `[12, 12]` |
| Stat Card span | 4 / 6 / flex 混用 | 4项=span6, 6项=span4 |
| Modal width | 560-800 六种 | 小560 / 中640 / 大800 |
| Table size | small / middle 混用 | 统一 `small` |
| Pagination | `> 10 ? {...} : false` | 封装为 `tablePagination(total)` |
| Status dot | 内联 className 拼接 | 封装 `<StatusCell>` 组件 |
| Form layout | Row+Col vs 平铺 | 统一 Row+Col |
| Action 按钮 | 有/无 Tooltip 混用 | 统一有 Tooltip |
| Date format | toLocaleDateString vs 自定义 | 统一 `formatDate()` |
| destroyOnClose | 部分有部分无 | 全部 `true` |
| 表单验证风格 | `.then()` vs `async/await` 混用 | 统一 `async/await` |
| 空数据状态 | `<Empty>` / 条件文本 / 无处理 混用 | 统一 `<Empty>` + 引导操作 |
| 加载状态命名 | `loading/creating/editing/fetching` 混用 | 统一 `isLoading` / `isSubmitting` |
| Scrollbar 样式 | 仅 `-webkit-` 前缀 | 补充 Firefox `scrollbar-*` 属性 |
