# 后端实现文档

## 概述

后端基于 Python FastAPI 框架构建，采用分层架构：**Routers → Services → Models → Database**。使用 SQLAlchemy 2.0 ORM 操作 SQLite 数据库，Pydantic v2 处理数据校验与序列化。

---

## 技术依赖

| 依赖 | 用途 |
|------|------|
| fastapi | Web 框架 |
| uvicorn[standard] | ASGI 服务器 |
| sqlalchemy>=2.0 | ORM（同步模式） |
| pydantic>=2.0 | 数据校验，支持 camelCase alias |
| anthropic | Claude API SDK |
| python-dotenv | 环境变量加载 |

---

## 项目结构

```
backend/app/
├── main.py                    # FastAPI 入口，启动事件，SPA 静态文件服务
├── database.py                # SQLAlchemy 引擎 + Session 工厂
├── models/
│   ├── device.py              # Device 设备模型
│   ├── fault_record.py        # FaultRecord 故障记录模型
│   └── ontology.py            # 11 个本体相关模型
├── schemas/
│   ├── device.py              # 设备请求/响应 Schema
│   ├── diagnosis.py           # 诊断请求/响应 Schema
│   └── ontology.py            # 本体请求/响应 Schema
├── routers/
│   ├── devices.py             # /api/devices (7 端点)
│   ├── diagnosis.py           # /api/diagnosis (11 端点)
│   ├── ontology_schema.py     # /api/ontology schema CRUD (16 端点)
│   ├── ontology_objects.py    # /api/ontology objects/links (8 端点)
│   ├── ontology_actions.py    # /api/ontology actions (14 端点)
│   └── ontology_functions.py  # /api/ontology functions (7 端点)
├── services/
│   ├── device_service.py              # 设备业务逻辑
│   ├── diagnosis_service.py           # Claude Agent 诊断循环
│   ├── fault_knowledge_service.py     # 知识图谱内存查询
│   ├── ontology_schema_service.py     # 本体模式 CRUD
│   ├── ontology_object_service.py     # 对象实例 CRUD
│   ├── ontology_action_service.py     # 动作执行引擎
│   └── ontology_function_service.py   # 函数执行管理
└── utils/
    └── script_executor.py             # Python 脚本沙箱执行
```

---

## 应用入口 (main.py)

### 启动流程

1. 创建 FastAPI 实例
2. 配置 CORS 中间件（`allow_origins=["*"]`）
3. 注册 6 个路由器
4. `on_startup` 事件：
   - `Base.metadata.create_all()` 自动建表
   - `fault_knowledge_service.load()` 加载知识图谱到内存

### SPA 静态文件服务

生产模式下，`main.py` 挂载 `frontend/dist/` 目录：
- `/assets` 路径提供静态资源
- 非 `/api` 路径回退到 `index.html`（SPA 路由支持）

---

## 数据库配置 (database.py)

- 数据库文件：`./data/devicedb.sqlite`
- `check_same_thread=False`（SQLite 多线程兼容）
- `autocommit=False, autoflush=False`
- `get_db()` 生成器通过 `Depends()` 注入到路由

---

## 数据模型 (13 张表)

### Device (`devices`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| name | String | 设备名称（NOT NULL） |
| type | String | 设备类型 |
| location | String | 安装位置 |
| status | String | 状态（ONLINE/OFFLINE/MAINTENANCE/FAULT），默认 ONLINE |
| description | String(500) | 描述 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间（自动更新） |

### FaultRecord (`fault_records`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| device_id | Integer | 关联设备 ID |
| device_name | String | 设备名称 |
| device_type | String | 设备类型 |
| symptoms | String(1000) | 故障症状（NOT NULL） |
| description | String(2000) | 详细描述 |
| severity | String | 严重程度（HIGH/MEDIUM/LOW），默认 MEDIUM |
| status | String | 状态（OPEN/DIAGNOSING/RESOLVED），默认 OPEN |
| diagnosis_result | Text | 诊断结果 JSON |
| reported_at | DateTime | 上报时间 |
| resolved_at | DateTime | 解决时间 |

### 本体模型 (11 张表)

#### 模式层 (Schema)

| 模型 | 表名 | 用途 |
|------|------|------|
| OntologyObjectType | `onto_object_types` | 实体类型定义（如 Component, Equipment） |
| OntologyProperty | `onto_properties` | 实体类型的属性定义 |
| OntologyLinkType | `onto_link_types` | 关系类型定义（含基数约束） |

#### 实例层 (Instance)

| 模型 | 表名 | 用途 |
|------|------|------|
| OntologyObject | `onto_objects` | 实体实例，属性存储为 JSON |
| OntologyLink | `onto_links` | 实体间关系实例 |

#### 动作层 (Action)

| 模型 | 表名 | 用途 |
|------|------|------|
| OntologyActionType | `onto_action_types` | 动作类型定义（含触发方式、异常策略） |
| OntologyActionParameter | `onto_action_parameters` | 动作输入参数定义 |
| OntologyActionRule | `onto_action_rules` | 动作执行规则（CRUD 操作） |
| OntologyActionExecution | `onto_action_executions` | 动作执行记录 |

#### 函数层 (Function)

| 模型 | 表名 | 用途 |
|------|------|------|
| OntologyFunction | `onto_functions` | 自定义脚本（Python） |
| OntologyFunctionLog | `onto_function_logs` | 脚本执行日志 |

---

## API 端点详情

### 设备管理 `/api/devices`

| 方法 | 路径 | 请求 | 响应 | 说明 |
|------|------|------|------|------|
| GET | `/` | Query: keyword, status, type | `List[DeviceResponse]` | 搜索设备，支持关键词/状态/类型筛选 |
| GET | `/types` | - | `List[str]` | 获取所有设备类型（去重排序） |
| GET | `/{id}` | Path: id | `DeviceResponse` | 获取单个设备，404 不存在 |
| POST | `/` | Body: DeviceCreate | `DeviceResponse` (201) | 创建设备 |
| PUT | `/{id}` | Body: DeviceUpdate | `DeviceResponse` | 更新设备 |
| PATCH | `/{id}/status` | Body: DeviceStatusUpdate | 204 | 仅更新状态 |
| DELETE | `/{id}` | - | 204 | 删除设备 |

### 故障诊断 `/api/diagnosis`

| 方法 | 路径 | 请求 | 响应 | 说明 |
|------|------|------|------|------|
| POST | `/analyze` | Body: DiagnosisRequest | `FaultRecordResponse` | AI 诊断分析（Claude Agent 循环） |
| GET | `/records` | - | `List[FaultRecordResponse]` | 所有诊断记录（时间倒序） |
| GET | `/records/device/{device_id}` | Path: device_id | `List[FaultRecordResponse]` | 指定设备的诊断记录 |
| GET | `/records/{id}` | Path: id | `FaultRecordResponse` | 单条诊断记录 |
| DELETE | `/records/{id}` | - | 204 | 删除记录 |
| GET | `/phenomena` | - | JSON | 所有故障现象列表 |
| GET | `/phenomena/search` | Query: q | JSON | 按关键词搜索现象 |
| GET | `/phenomena/{id}/detail` | Path: id | JSON | 现象完整诊断路径（递归树） |
| GET | `/checkpoints` | Query: nodeId | `List[Dict]` | 获取检查点列表 |
| GET | `/causes-solutions` | Query: subPhenId | `Dict{causes, solutions}` | 获取原因和解决方案 |
| GET | `/graph` | - | `Dict{nodes, links}` | 完整知识图谱（D3 可视化数据） |

### 本体模式 `/api/ontology` (Schema)

**ObjectType CRUD:**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/object-types` | 列出所有对象类型 |
| POST | `/object-types` | 创建对象类型（名称唯一） |
| GET | `/object-types/{id}` | 获取对象类型 |
| PUT | `/object-types/{id}` | 更新对象类型 |
| DELETE | `/object-types/{id}` | 删除（级联删除属性） |

**Property CRUD:**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/object-types/{id}/properties` | 获取属性列表（按 sort_order） |
| POST | `/object-types/{id}/properties` | 添加属性 |
| PUT | `/properties/{id}` | 更新属性 |
| DELETE | `/properties/{id}` | 删除属性 |

**LinkType CRUD:**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/link-types` | 列出关系类型 |
| POST | `/link-types` | 创建关系类型（验证源/目标类型存在） |
| GET | `/link-types/{id}` | 获取关系类型 |
| PUT | `/link-types/{id}` | 更新关系类型 |
| DELETE | `/link-types/{id}` | 删除关系类型 |

**Schema 图:**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/schema` | 获取模式图数据（nodes + edges） |

### 本体实例 `/api/ontology` (Objects)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/object-types/{typeId}/objects` | 列出某类型下的所有对象 |
| POST | `/object-types/{typeId}/objects` | 创建对象实例 |
| GET | `/object-types/{typeId}/objects/{id}` | 获取对象实例 |
| PUT | `/object-types/{typeId}/objects/{id}` | 更新对象实例 |
| DELETE | `/object-types/{typeId}/objects/{id}` | 删除（级联删除关联链接） |
| GET | `/object-types/{typeId}/objects/{id}/links` | 获取对象关联的链接 |
| POST | `/links` | 创建链接（验证源/目标对象和链接类型） |
| DELETE | `/links/{id}` | 删除链接 |

### 本体动作 `/api/ontology` (Actions)

**ActionType CRUD:** 5 端点（同上模式）

**Parameter CRUD:** 4 端点（嵌套在 ActionType 下）

**Rule CRUD:** 4 端点（嵌套在 ActionType 下）

**执行:**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/action-types/{id}/execute` | 执行动作（验证状态 + 参数 → 按序执行规则） |
| GET | `/action-types/{id}/executions` | 获取执行历史 |

### 本体函数 `/api/ontology` (Functions)

**Function CRUD:** 5 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/functions/{id}/execute` | 执行 Python 脚本（30s 超时） |
| GET | `/functions/{id}/logs` | 获取执行日志 |

---

## 核心业务逻辑

### 1. Claude Agent 诊断循环 (`diagnosis_service.py`)

#### 工作流程

1. 创建 FaultRecord（status=DIAGNOSING）
2. 构建系统提示词（中文，描述本体结构和诊断流程）
3. 构建用户消息（设备信息 + 症状描述）
4. 进入 Agent 循环（最多 8 轮）：
   - 调用 Claude API（携带 6 个工具定义）
   - 处理 `tool_use` 响应：执行工具 → 返回结果
   - 处理 `end_turn`：提取 JSON 诊断结果
   - `record_diagnosis` 工具调用时提前结束循环
5. 更新 FaultRecord（status=RESOLVED，存储诊断 JSON）

#### 可用工具

| 工具名 | 功能 |
|--------|------|
| search_phenomena | 搜索知识图谱中匹配的故障现象 |
| get_sub_phenomena | 获取现象的子现象列表 |
| get_checkpoints | 获取诊断检查点 |
| get_causes_and_solutions | 获取根因和解决方案 |
| get_parameter_config | 获取参数采集配置 |
| record_diagnosis | 记录最终诊断结论（退出循环） |

#### 降级策略

无 `CLAUDE_API_KEY` 时回退到本地诊断：
- 按 phenomenon_id 或症状关键词查询知识图谱
- 构建本地诊断结果（检查点 + 原因 + 方案）

### 2. 知识图谱服务 (`fault_knowledge_service.py`)

#### 数据源

`data/fault-ontology/graph.jsonl`，JSONL 格式，每行一个 JSON 对象。

#### 实体类型

Equipment, Phenomenon, SubPhenomenon, Checkpoint, Cause, Solution, Component, Parameter

#### 关系类型

prone_to, contains, needs_check, discovers, located_at, caused_by, solved_by, supports

#### 内存结构

- `_nodes: OrderedDict[id, node_dict]` — 所有节点
- `_relations: List[dict]` — 所有关系

#### 核心查询

| 函数 | 功能 |
|------|------|
| `all_phenomena()` | 所有 Phenomenon 节点 |
| `search_phenomena(query)` | 子串匹配搜索（label/description） |
| `search_by_symptoms(symptoms, device_type)` | 多症状联合搜索 |
| `get_sub_phenomena(phen_id)` | 获取子现象 |
| `get_checkpoints(node_id)` | 获取检查点（按优先级排序） |
| `get_causes_and_solutions(sub_phen_id)` | 获取原因 + 解决方案 |
| `get_phenomenon_detail(phen_id)` | 完整诊断树（递归） |
| `graph_data()` | 全图数据（D3 可视化） |

### 3. 动作执行引擎 (`ontology_action_service.py`)

#### 执行流程

1. 验证 ActionType 状态为 `ACTIVE`
2. 验证所有必填参数已提供
3. 按 `sort_order` 排序规则列表
4. 逐条执行规则：
   - 条件判断：解析 `condition_json`（支持 eq/neq/exists 操作符）
   - 参数映射：解析 `property_mappings_json`，替换 `$parameters.X` 引用
   - 执行操作：CREATE_OBJECT / MODIFY_OBJECT / DELETE_OBJECT / CREATE_LINK / DELETE_LINK
5. 记录执行结果（SUCCESS/FAILED）

### 4. Python 脚本引擎 (`utils/script_executor.py`)

- 使用 `exec()` 在隔离命名空间中执行用户脚本
- 30 秒超时保护（`threading.Thread` + `join(timeout)`）
- 脚本可访问：`input`（输入数据）、`context`（含时间戳）
- 脚本通过设置 `result` 变量返回结果
- 执行日志记录：输入/输出/耗时/状态

---

## Pydantic Schema 约定

所有 Schema 使用统一配置：

```python
class Config:
    populate_by_name = True
    alias_generator = to_camel  # snake_case → camelCase
    from_attributes = True       # ORM 模型自动转换
```

Python 内部使用 `snake_case`，JSON API 使用 `camelCase`。

---

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 资源不存在 | 404 HTTPException |
| 参数错误 | 400 HTTPException |
| 请求体格式错误 | 422（Pydantic 自动） |
| Claude API 失败 | 回退到本地知识图谱诊断 |
| 脚本超时 | 返回 TIMEOUT 状态 |
| 脚本执行错误 | 返回 FAILED 状态 + 错误信息 |
