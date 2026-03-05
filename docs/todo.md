# TODO 清单

基于前后端代码全面分析，整理出以下可改进项和待实现功能，按优先级和类别分组。

---

## 高优先级

### 安全性

- [ ] **添加认证与授权机制** — 当前所有 API 端点完全开放，无任何身份验证。建议引入 JWT Token 或 OAuth2 认证中间件。
- [ ] **脚本执行沙箱加固** — `script_executor.py` 使用 `exec()` 执行用户提交的代码，仅有超时保护，缺少：
  - 限制可导入的模块（禁止 os, subprocess, sys 等）
  - 限制文件系统访问
  - 限制网络访问
  - 内存使用限制
- [ ] **CORS 策略收紧** — 生产环境应限制 `allow_origins`，当前为 `["*"]`

### 数据完整性

- [x] **添加数据库迁移工具** — 当前使用 `create_all()` 自动建表，无法处理表结构变更。建议引入 Alembic 进行数据库版本管理。
- [ ] **级联删除完善** — 删除 ObjectType 时仅删除关联的 Property，未处理关联的 Object、LinkType。删除 ActionType 时仅删除 Parameter 和 Rule，未清理 Execution 记录。
- [ ] **事务一致性** — 动作执行引擎中多步规则执行未做整体事务管理，部分规则失败可能导致数据不一致

---

## 中优先级

### 功能增强

- [ ] **API 分页支持** — 所有列表端点返回全量数据，数据量增长后性能下降。建议添加 `page` + `pageSize` 参数，返回分页结果和 `total` 计数。
- [ ] **知识图谱编辑 API** — 当前知识图谱从 JSONL 文件启动时加载到内存，仅支持只读查询。缺少：
  - 新增/编辑/删除节点和关系的 API
  - 修改后持久化回 JSONL 文件
  - 热重载能力
- [ ] **定时触发动作** — `OntologyActionType.trigger_type` 支持 `SCHEDULED` 值，但未实现调度器。可引入 APScheduler 或 Celery Beat。
- [ ] **诊断结果结构化存储** — `diagnosis_result` 字段存储为纯 JSON 文本，难以按字段查询。可拆分为独立表或添加索引。
- [ ] **设备与故障记录关联约束** — `fault_records.device_id` 无外键约束，设备删除后孤儿记录不会清理
- [ ] **诊断并发控制** — 无队列或速率限制，多个同时诊断请求会并发调用 Claude API

### 代码质量

- [ ] **添加单元测试** — 当前无任何测试。优先覆盖：
  - Service 层业务逻辑
  - 动作执行引擎的规则处理
  - 知识图谱查询
  - 脚本执行器
- [ ] **添加集成测试** — 使用 TestClient 测试 API 端点
- [ ] **统一错误响应格式** — 当前部分用 HTTPException，部分用 ValueError。建议定义统一的错误响应 Schema（code, message, detail）
- [ ] **日志系统** — 缺少结构化日志（logging），仅靠 print 或默认 uvicorn 日志。建议引入 structlog 或标准 logging 配置。

---

## 低优先级

### 性能优化

- [ ] **知识图谱搜索优化** — 当前使用子串匹配（`in` 操作符），无模糊搜索或相关度排序。可引入简单的 TF-IDF 或 jieba 分词匹配。
- [ ] **数据库查询优化** — 缺少常用查询的索引（如 device.status、fault_record.device_id、fault_record.reported_at）
- [ ] **异步化** — FastAPI 路由当前使用同步函数，可改为 `async def` + 异步 SQLAlchemy 会话，提升并发性能
- [ ] **静态文件缓存** — SPA 静态资源服务未配置缓存头

### 功能扩展

- [ ] **Groovy 脚本支持** — `OntologyFunction.script_type` 支持 `GROOVY` 值，但执行器仅实现 Python。可通过 subprocess 调用 Groovy 或移除该选项。
- [ ] **导入/导出功能** — 支持本体定义和实例数据的 JSON/CSV 导入导出
- [ ] **WebSocket 实时通知** — 诊断完成、动作执行结果等可通过 WebSocket 推送
- [ ] **操作审计日志** — 记录所有增删改操作的操作人、时间、变更内容
- [ ] **批量操作 API** — 支持批量创建/更新/删除对象和链接
- [ ] **API 版本管理** — 当前无版本号（`/api/v1/`），后续 Breaking Change 无法平滑过渡

### 运维相关

- [ ] **健康检查端点** — 添加 `/api/health` 端点，检查数据库连接和知识图谱加载状态
- [ ] **API 限流** — 引入 slowapi 或自定义中间件，防止滥用
- [ ] **Docker 化** — 提供 Dockerfile 和 docker-compose.yml，简化部署
- [ ] **配置管理优化** — 硬编码的配置项（如数据库路径、CORS 域名、超时时间）提取为环境变量

---

---

## 前端 — 高优先级

### 错误处理完善
- [ ] `useOntology` 系列 Hook 增加 `error` 状态返回（当前静默失败，用户无感知）
- [ ] 本体编辑器页面增加错误状态 UI 展示（Toast 或 Alert）
- [ ] API 请求失败时提供重试按钮（至少在页面级别）
- [ ] `fetchJSON` 增加网络断开检测，提示用户检查网络

### 前端表单验证
- [ ] DeviceForm 增加字段长度/格式校验（名称、位置等）
- [ ] ActionDetail 参数编辑增加类型约束校验
- [ ] NotebookPanel 函数名唯一性前端校验
- [ ] DiagnosisForm 问题描述最小长度限制

### 前端删除保护
- [ ] EntitiesAndLinks 中 LinkType 删除增加确认弹窗
- [ ] ActionDetail 中参数/规则删除增加确认提示
- [ ] 批量关联检查：删除 ObjectType 前提示关联的 Object/Link 数量

---

## 前端 — 中优先级

### 本体编辑器增强
- [ ] 属性/参数/规则支持拖拽排序（当前只能通过 sortOrder 字段手动输入）
- [ ] ActionDetail 的 JSON 配置字段增加语法高亮编辑器（如 Monaco Editor）
- [ ] 本体 Schema 导入/导出功能（JSON 格式，配合后端导入导出 API）
- [ ] 操作撤销/重做（至少支持最近一步回退）
- [ ] OntologyGraph 增加右键菜单（快捷创建关系/查看属性）

### 设备管理增强
- [ ] 设备批量导入（CSV/Excel 上传）
- [ ] 设备批量操作（多选删除、批量状态变更）
- [ ] 设备详情页（独立页面，展示完整信息 + 关联诊断记录）
- [ ] 设备状态变更历史时间线

### 故障诊断增强
- [ ] 诊断结果导出为 PDF 报告
- [ ] 诊断历史高级筛选（按时间范围、严重程度、设备类型）
- [ ] 诊断记录批量删除
- [ ] AI 诊断支持流式输出（SSE），实时展示分析过程
- [ ] 诊断结果对比功能（选择两条记录并排展示）

### 知识图谱增强
- [ ] 图谱节点右键菜单（查看详情/关联设备/高亮路径）
- [ ] 图谱布局算法切换（力导向/树形/环形/分层）
- [ ] 图谱快照保存与恢复（保存当前视图状态到 localStorage）
- [ ] 节点属性在详情面板中可编辑
- [ ] 子图筛选（只显示某类型节点及其 N 跳邻居）

---

## 前端 — 低优先级

### 前端性能优化
- [ ] 长列表虚拟滚动（现象列表、设备类型列表数据量大时）
- [ ] D3 图谱大数据量优化（WebGL 渲染或 Canvas 替代 SVG）
- [ ] 路由级别懒加载（React.lazy + Suspense）
- [ ] API 响应缓存（引入 SWR 或 React Query 替代手写 Hook）
- [ ] 图谱筛选计算 useMemo 优化，避免重复渲染

### 交互体验改进
- [ ] 全局加载进度条（NProgress 或顶部进度指示）
- [ ] 各页面空状态优化：引导性插画和操作提示
- [ ] 键盘快捷键支持（Ctrl+S 保存、Esc 关闭弹窗等）
- [ ] 表格列宽可调、列显隐可配置
- [ ] 深色/浅色主题切换

### 响应式适配
- [ ] 移动端基本适配（当前仅适配桌面端）
- [ ] 侧边栏折叠/展开状态持久化（localStorage）
- [ ] 图谱页面在小屏下隐藏侧边栏，改用 Drawer 抽屉

### 前端工程化
- [ ] 组件单元测试（Vitest + React Testing Library）
- [ ] Hook 单元测试（renderHook）
- [ ] API 模块 Mock 测试（MSW）
- [ ] E2E 测试（Playwright 或 Cypress）
- [ ] ESLint strict TypeScript 规则 + Prettier 格式化
- [ ] Husky + lint-staged 提交前检查
- [ ] Storybook 组件文档（至少覆盖通用组件）

### 无障碍 (a11y)
- [ ] 图标按钮增加 ARIA label
- [ ] 图谱 Tooltip 支持键盘访问
- [ ] 表单校验错误对屏幕阅读器可感知
- [ ] 状态指示不仅依赖颜色（增加文字/图标辅助）

### 国际化
- [ ] i18n 框架接入（react-intl 或 i18next）
- [ ] 中/英文切换支持

---

## 全栈 — CI/CD 与运维

- [ ] GitHub Actions：lint + type-check + build + 后端测试
- [ ] 自动化部署脚本（构建前端 → 拷贝到 backend 静态目录）
- [ ] Docker Compose 一键部署（前端 nginx + 后端 uvicorn + SQLite 数据卷）

---

## 已知技术债务

| 项目 | 说明 |
|------|------|
| `java/` 目录 | 遗留的 Spring Boot 旧代码，仅供参考，可在合适时机清理 |
| `properties_json` 等 TEXT 字段 | 复杂数据存储为 JSON 字符串，无 Schema 校验 |
| 无外键约束 | 部分关联字段（如 device_id）未设置数据库级外键 |
| Agent 循环硬编码 | 最大轮次、模型名称等配置分散在代码中 |
| 前端无全局状态管理 | 数据依赖组件级 state 传递，复杂交互场景可能需引入 Context 或 Zustand |
| Hook 错误处理不一致 | useDevices/useGraphData 返回 error，useOntology 系列静默吞掉错误 |
| 无测试覆盖 | 前后端均无单元/集成测试 |
