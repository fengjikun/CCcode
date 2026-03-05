# 前端实现文档

## 概述

前端基于 React 18 + TypeScript + Vite 构建，使用 Ant Design 5 作为 UI 组件库，D3.js v7 实现知识图谱可视化。项目采用页面 → 组件 → Hook → API 的分层架构，无全局状态管理，依赖组件级 state 和自定义 Hook 进行数据流转。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18 | UI 框架 |
| TypeScript | - | 类型安全 |
| Vite | - | 构建工具，开发代理 `/api` → `localhost:9000` |
| Ant Design | 5 | UI 组件库 |
| D3.js | v7 | 力导向图可视化 |
| React Router | v6 | 客户端路由 |

## 项目结构

```
frontend/src/
├── main.tsx                          # 应用入口
├── App.tsx                           # 路由配置 (4 条路由)
├── api/
│   ├── client.ts                     # fetchJSON 通用请求封装
│   ├── devices.ts                    # 设备管理 API (6 个函数)
│   ├── diagnosis.ts                  # 故障诊断 API (6 个函数)
│   └── ontology.ts                   # 本体管理 API (30+ 个函数)
├── types/
│   ├── device.ts                     # Device, DevicePayload
│   ├── diagnosis.ts                  # Phenomenon, DiagnosisPayload, DiagnosisResult
│   ├── ontology.ts                   # ObjectType, Property, LinkType, ActionType 等
│   └── graph.ts                      # GraphNode, GraphLink, NodeConfig, LinkConfig
├── hooks/
│   ├── useDevices.ts                 # useDevices, useDeviceTypes
│   ├── useDiagnosis.ts              # usePhenomena, useFaultRecords
│   ├── useOntology.ts               # useObjectTypes, useLinkTypes, useActionTypes 等
│   └── useGraphData.ts              # useGraphData
├── pages/
│   ├── DevicesPage.tsx               # 设备管理页
│   ├── DiagnosisPage.tsx             # 故障诊断页
│   ├── OntologyPage.tsx              # 本体编辑器页 (3 步向导)
│   └── GraphPage.tsx                 # 知识图谱可视化页
└── components/
    ├── layout/
    │   └── AppLayout.tsx             # 全局布局 (侧边栏 + 头部 + 内容区)
    ├── devices/
    │   ├── DeviceStats.tsx           # 设备统计卡片 (总数/在线/故障/离线)
    │   ├── DeviceTable.tsx           # 设备列表表格 (搜索/筛选/分页)
    │   └── DeviceForm.tsx            # 设备新增/编辑表单 (Modal)
    ├── diagnosis/
    │   ├── DiagnosisForm.tsx         # 诊断表单 (设备选择 + 现象 + 严重程度)
    │   ├── PhenomenonSelector.tsx    # 现象选择器 (级联选择子现象)
    │   ├── DiagnosisResult.tsx       # AI 诊断结果展示 (原因/检查点/方案)
    │   └── FaultRecordList.tsx       # 诊断历史列表 (点击展开详情)
    ├── ontology/
    │   ├── StepNav.tsx               # 步骤导航条
    │   ├── step1/
    │   │   ├── EntitiesAndLinks.tsx  # 实体类型与关系类型列表
    │   │   ├── OntologyGraph.tsx     # 本体 Schema D3 力导向图
    │   │   └── PropertyPanel.tsx     # 属性管理面板
    │   ├── step2/
    │   │   ├── ActionsPanel.tsx      # 动作类型列表
    │   │   └── ActionDetail.tsx      # 动作详情 (5 个 Tab)
    │   └── step3/
    │       └── NotebookPanel.tsx     # Jupyter 风格函数编辑器
    └── graph/
        ├── ForceGraph.tsx            # D3 力导向图画布 (forwardRef)
        ├── GraphSidebar.tsx          # 图谱侧边栏 (筛选/搜索/统计)
        └── NodeDetail.tsx            # 节点详情面板
```

## 路由配置

| 路径 | 页面组件 | 说明 |
|------|----------|------|
| `/` | — | 重定向到 `/ontology` |
| `/ontology` | OntologyPage | 本体编辑器 (默认首页) |
| `/devices` | DevicesPage | 设备管理 |
| `/diagnosis` | DiagnosisPage | 故障诊断 |
| `/graph` | GraphPage | 知识图谱可视化 |

所有页面包裹在 `AppLayout` 组件中，左侧为深色侧边栏导航菜单。

## 数据流架构

```
用户操作 → 组件 State 更新
    ↓
Hook 触发 (useEffect 依赖变更)
    ↓
API 调用 (fetchJSON)
    ↓
响应 → Hook State (data / loading / error)
    ↓
组件重新渲染 + Ant Design message 提示错误
```

### 状态管理

- **无全局状态**：不使用 Redux/Zustand/Context
- **组件级 State**：通过 `useState` 管理，父组件持有数据并向子组件传递回调
- **自定义 Hook**：统一返回 `{ data, loading, error?, reload }` 签名
- **Ref 命令式控制**：ForceGraph 通过 `useImperativeHandle` 暴露缩放/布局 API

## API 层

### fetchJSON 客户端 (`api/client.ts`)

通用请求封装，基于原生 `fetch()`：
- 自动 JSON 序列化/反序列化
- 统一错误处理：解析错误响应体，通过 `message.error()` 全局提示
- 204 响应返回 `null`
- 支持 GET / POST / PUT / DELETE

### API 模块

| 模块 | 文件 | 函数数量 | 主要功能 |
|------|------|----------|----------|
| 设备 | `api/devices.ts` | 6 | CRUD + 搜索筛选 + 获取设备类型 |
| 诊断 | `api/diagnosis.ts` | 6 | 触发 AI 诊断 + 历史记录 + 知识图谱数据 |
| 本体 | `api/ontology.ts` | 30+ | 对象类型/属性/关系/动作/参数/规则/函数 全套 CRUD |

## 自定义 Hooks

| Hook | 文件 | 返回 | 说明 |
|------|------|------|------|
| `useDevices(params?)` | `useDevices.ts` | data, loading, error, reload | 设备列表，支持 keyword/status/type 筛选 |
| `useDeviceTypes()` | `useDevices.ts` | data, loading | 设备类型列表 |
| `usePhenomena()` | `useDiagnosis.ts` | data, loading, reload | 故障现象列表 |
| `useFaultRecords()` | `useDiagnosis.ts` | data, loading, reload | 诊断历史记录 |
| `useObjectTypes()` | `useOntology.ts` | data, loading, reload | 本体对象类型 |
| `useLinkTypes()` | `useOntology.ts` | data, loading, reload | 本体关系类型 |
| `useActionTypes()` | `useOntology.ts` | data, loading, reload | 本体动作类型 |
| `useOntologyFunctions()` | `useOntology.ts` | data, loading, reload | 本体函数列表 |
| `useOntologyStats()` | `useOntology.ts` | data, loading | 聚合统计 (4 类计数) |
| `useGraphData()` | `useGraphData.ts` | data, loading, error, reload | 知识图谱节点+边数据 |

## 页面详细说明

### 1. 设备管理页 (DevicesPage)

**功能：**
- 顶部统计卡片：总数 / 在线 / 故障 / 离线
- 搜索框 (300ms 防抖) + 状态筛选 + 类型筛选
- 设备表格：8 列，支持分页 (默认 10 条/页)
- 新增/编辑设备 (Modal 表单)
- 删除确认弹窗
- "诊断"按钮跳转到诊断页并携带 `deviceId` 参数

**组件树：**
```
DevicesPage
├── DeviceStats          # 4 张统计卡片
├── DeviceTable          # 搜索/筛选 + Ant Table + 操作列
└── DeviceForm (Modal)   # 新增/编辑表单
```

### 2. 故障诊断页 (DiagnosisPage)

**功能：**
- 左侧：诊断表单 (设备选择 → 现象选择 → 严重程度 → 问题描述)
- 右侧：AI 诊断结果展示 + 历史记录列表
- 分析中显示 Spin 加载状态
- 支持从设备页跳转自动填充设备信息

**诊断结果展示：**
- 现象 + 置信度/紧急度标签
- 匹配的子现象 (Tag 列表)
- 根因分析 (Warning Badge)
- 检查步骤 (Steps 组件)
- 解决方案 (嵌套卡片，含风险等级和预计时间)

**组件树：**
```
DiagnosisPage
├── DiagnosisForm
│   └── PhenomenonSelector    # 现象 + 子现象级联选择
├── DiagnosisResult           # AI 结果富文本展示
└── FaultRecordList           # 历史记录 + 详情弹窗
```

### 3. 本体编辑器页 (OntologyPage)

三步向导式编辑器：

**Step 1 — 实体与关系：**
- 左栏：对象类型列表 + 关系类型列表 (CRUD)
- 中央：D3 力导向图实时展示 Schema 拓扑
- 右栏：选中类型的属性管理 (CRUD)

**Step 2 — 动作定义：**
- 左栏：动作类型列表 (状态指示灯)
- 右栏：5 个 Tab
  - 基本信息 (名称/描述/目标类型/状态)
  - 参数 (CRUD 表格)
  - 规则与执行 (规则表格 + JSON 参数输入 + 执行历史)
  - 验证规则 (条件列表)
  - 触发与异常 (触发类型/配置 + 异常策略/配置)

**Step 3 — 函数编辑 (Notebook)：**
- Jupyter 风格的 Cell 界面
- 每个函数一个 Cell：代码编辑 + 运行 + 输出展示
- 支持新建/保存/删除/执行
- 显示执行时间和状态

**组件树：**
```
OntologyPage
├── StatsBar (4 统计卡片)
├── StepNav
├── Step 1:
│   ├── EntitiesAndLinks
│   ├── OntologyGraph (D3)
│   └── PropertyPanel
├── Step 2:
│   ├── ActionsPanel
│   └── ActionDetail (5 Tabs)
└── Step 3:
    └── NotebookPanel
```

### 4. 知识图谱页 (GraphPage)

**功能：**
- D3 力导向图全屏画布
- 8 种节点类型 (不同形状：矩形/六边形/菱形/圆形)
- 8 种关系类型 (不同虚线样式)
- 交互：拖拽节点 / 缩放平移 / 点击高亮关联 / 悬停提示
- 左侧边栏：搜索 + 类型过滤复选框 + 关系图例 + 统计
- 右上角：选中节点详情面板 (属性 + 关联节点列表)
- 工具栏：放大/缩小/重置/重启布局

**组件树：**
```
GraphPage
├── GraphSidebar         # 搜索/筛选/图例/统计
├── ForceGraph (D3)      # 力导向图画布 (forwardRef)
└── NodeDetail           # 节点详情浮层
```

**ForceGraph 暴露 API：**
- `zoomIn()` / `zoomOut()` / `zoomReset()` — 缩放控制
- `restartLayout()` — 重启力仿真

## 关键设计模式

### 1. Hook 数据获取模式
```typescript
function useXxx(params?) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall(params);
      setData(res);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [params]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}
```

### 2. D3 集成模式
```typescript
// 使用 useRef 持有 DOM 容器 + D3 simulation
const svgRef = useRef<SVGSVGElement>(null);
const simulationRef = useRef<d3.Simulation>();

useEffect(() => {
  // 初始化 D3 力仿真
  const simulation = d3.forceSimulation(nodes)...
  simulationRef.current = simulation;
  return () => simulation.stop(); // cleanup
}, [data]);

// 通过 useImperativeHandle 暴露命令式 API
useImperativeHandle(ref, () => ({
  zoomIn: () => { ... },
  restartLayout: () => { ... },
}));
```

### 3. Modal 表单模式
```typescript
// 父组件控制 open/editItem 状态
const [open, setOpen] = useState(false);
const [editItem, setEditItem] = useState(null);

// 表单组件在 open 时 resetFields + 填充编辑数据
useEffect(() => {
  if (open && editItem) form.setFieldsValue(editItem);
  else form.resetFields();
}, [open]);
```

### 4. 防抖搜索
```typescript
// DevicesPage 自定义 useDebounce Hook (300ms)
const debouncedKeyword = useDebounce(keyword, 300);
const { data } = useDevices({ keyword: debouncedKeyword });
```

## 类型系统

前端 TypeScript 类型与后端 Pydantic Schema 一一对应：
- JSON 字段使用 **camelCase**（后端通过 `alias_generator=to_camel` 转换）
- 枚举值使用字符串联合类型（如 `'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'FAULT'`）
- 复杂配置字段（如 triggerConfig、validationRules）在类型中定义为 `string`（JSON 序列化后的文本）
