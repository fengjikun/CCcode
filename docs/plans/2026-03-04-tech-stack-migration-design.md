# 后端迁移设计：Java Spring Boot → Python FastAPI

## 概述

将大族智控设备故障诊断系统后端从 Spring Boot (Java) 迁移到 FastAPI (Python)。前端暂不迁移，保持原生 HTML/JS，仅需更改 API 地址。

## 当前系统

- **后端**: Spring Boot 3.5 / Java 25 / JPA / H2（46 个 Java 文件，70+ REST 端点）
- **前端**: 原生 HTML + JS + D3.js（内嵌于 Spring Boot static 目录）
- **AI**: Claude API 手动 HTTP 调用（RestTemplate），Tool Use Agent 循环
- **知识图谱**: JSONL 文件加载到内存
- **脚本引擎**: Groovy

## 目标技术栈

- **后端**: FastAPI + SQLAlchemy 2.0 (同步) + SQLite + Pydantic
- **前端**: 不变（原生 HTML/JS）
- **AI**: anthropic Python SDK
- **脚本引擎**: Python exec 替代 Groovy

## 迁移范围

仅后端。前端通过 CORS 访问新的 FastAPI 后端（端口 8000）。

---

## 项目结构

```
backend/
├── app/
│   ├── main.py                       # FastAPI 入口，CORS，启动事件（加载知识图谱）
│   ├── database.py                   # SQLAlchemy 引擎 + Session
│   ├── models/
│   │   ├── device.py                 # Device
│   │   ├── fault_record.py           # FaultRecord
│   │   └── ontology.py               # 11 个本体相关模型
│   ├── schemas/
│   │   ├── device.py                 # Pydantic 请求/响应模型
│   │   ├── diagnosis.py
│   │   └── ontology.py
│   ├── routers/
│   │   ├── devices.py                # /api/devices (7 端点)
│   │   ├── diagnosis.py              # /api/diagnosis (11 端点)
│   │   ├── ontology_schema.py        # /api/ontology schema (16 端点)
│   │   ├── ontology_objects.py       # /api/ontology objects/links (8 端点)
│   │   ├── ontology_functions.py     # /api/ontology functions (7 端点)
│   │   └── ontology_actions.py       # /api/ontology actions (14 端点)
│   ├── services/
│   │   ├── device_service.py
│   │   ├── diagnosis_service.py      # Claude Agent 循环
│   │   ├── fault_knowledge_service.py # JSONL 知识图谱
│   │   ├── ontology_schema_service.py
│   │   ├── ontology_object_service.py
│   │   ├── ontology_function_service.py
│   │   └── ontology_action_service.py
│   └── utils/
│       └── script_executor.py        # Python exec 沙箱（30s 超时）
├── data/
│   └── fault-ontology/graph.jsonl    # 从 Java 项目复制
└── requirements.txt
```

## 依赖

```
fastapi
uvicorn[standard]
sqlalchemy
pydantic
anthropic
python-dotenv
```

## 数据库

- SQLite 文件: `./data/devicedb.sqlite`
- SQLAlchemy 2.0 同步模式
- `create_all` 自动建表（不使用 Alembic）
- 所有表名和字段名与 Java 版一致

---

## 数据模型 (13 个表)

| 模型 | 表名 | 关键字段 |
|------|------|---------|
| Device | devices | id, name, type, location, status(ONLINE/OFFLINE/MAINTENANCE/FAULT), description, created_at, updated_at |
| FaultRecord | fault_records | id, device_id, device_name, device_type, symptoms, description, severity(LOW/MEDIUM/HIGH/CRITICAL), status(OPEN/DIAGNOSING/RESOLVED), diagnosis_result(TEXT), reported_at, resolved_at |
| OntologyObjectType | onto_object_types | id, name(unique), display_name, description, primary_key_property, icon, color, created_at, updated_at |
| OntologyObject | onto_objects | id, object_type_id(FK), external_id, properties_json(TEXT), created_at, updated_at |
| OntologyProperty | onto_properties | id, object_type_id(FK), name, display_name, data_type, required, default_value, description, sort_order |
| OntologyLinkType | onto_link_types | id, name(unique), display_name, source_object_type_id(FK), target_object_type_id(FK), cardinality, description, created_at |
| OntologyLink | onto_links | id, link_type_id(FK), source_object_id(FK), target_object_id(FK), created_at |
| OntologyActionType | onto_action_types | id, name(unique), display_name, description, status(ACTIVE/DRAFT/DEPRECATED), target_object_type_id, trigger_type(MANUAL/EVENT/SCHEDULE), trigger_config_json, exception_policy(IGNORE/ROLLBACK/RETRY), exception_config_json, validation_rules_json, created_at, updated_at |
| OntologyActionParameter | onto_action_parameters | id, action_type_id(FK), name, display_name, data_type, required, default_value, constraints_json, sort_order |
| OntologyActionRule | onto_action_rules | id, action_type_id(FK), rule_type(CREATE_OBJECT/MODIFY_OBJECT/DELETE_OBJECT/CREATE_LINK/DELETE_LINK), target_object_type_name, target_link_type_name, property_mappings_json, condition_json, sort_order |
| OntologyActionExecution | onto_action_executions | id, action_type_id(FK), parameters_json, result_json, status(SUCCESS/PARTIAL/FAILED), error_message, executed_at |
| OntologyFunction | onto_functions | id, action_type_id(FK nullable), name(unique), display_name, description, script_type(PYTHON), script_content(TEXT), input_schema_json, output_schema_json, status(ACTIVE/DRAFT/DEPRECATED), created_at, updated_at |
| OntologyFunctionLog | onto_function_logs | id, function_id(FK), action_execution_id(FK nullable), input_data_json, output_data_json, status(SUCCESS/FAILED/TIMEOUT), error_message, duration_ms, executed_at |

---

## API 端点

完全保持与 Java 版一致的路径和请求/响应格式。

### 设备管理 `/api/devices` (7 端点)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 搜索设备（query: keyword, status, type） |
| GET | /{id} | 获取设备 |
| POST | / | 创建设备 |
| PUT | /{id} | 更新设备 |
| PATCH | /{id}/status | 仅更新状态 |
| DELETE | /{id} | 删除设备 |
| GET | /types | 获取所有设备类型 |

### 故障诊断 `/api/diagnosis` (11 端点)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /analyze | 提交诊断（Claude Agent 循环，最多 8 轮） |
| GET | /records | 所有诊断记录（按时间倒序） |
| GET | /records/device/{deviceId} | 设备的诊断记录 |
| GET | /records/{id} | 单条记录 |
| DELETE | /records/{id} | 删除记录 |
| GET | /phenomena | 所有现象列表 |
| GET | /phenomena/search?q= | 搜索现象 |
| GET | /phenomena/{id}/detail | 现象完整诊断路径（递归树） |
| GET | /checkpoints?nodeId= | 获取检查点 |
| GET | /causes-solutions?subPhenId= | 原因和解决方案 |
| GET | /graph | 完整知识图谱数据（节点+边） |

### 本体管理 `/api/ontology` (~50 端点)

**Schema 管理:**
- CRUD: /object-types, /object-types/{id}/properties, /properties/{id}
- CRUD: /link-types
- GET /schema — Schema 力导向图数据

**对象实例:**
- CRUD: /object-types/{typeId}/objects
- POST /links, DELETE /links/{id}
- GET /object-types/{typeId}/objects/{id}/links

**动作管理:**
- CRUD: /action-types, /action-types/{id}/parameters, /action-types/{id}/rules
- POST /action-types/{id}/execute — 执行动作
- GET /action-types/{id}/executions — 执行历史

**函数管理:**
- CRUD: /functions
- POST /functions/{id}/execute — 执行 Python 脚本
- GET /functions/{id}/logs — 执行日志

---

## 关键业务逻辑

### Claude Agent 诊断循环

使用 `anthropic` Python SDK：
- 6 个工具: search_phenomena, get_sub_phenomena, get_checkpoints, get_causes_and_solutions, get_parameter_config, record_diagnosis
- 最多 8 轮 Agent 循环
- 环境变量: `CLAUDE_API_KEY`, `CLAUDE_MODEL`(默认 claude-opus-4-6)
- 无 API key 时回退到本地知识图谱诊断

### 知识图谱服务

- 启动时从 `data/fault-ontology/graph.jsonl` 加载到内存
- 8 种实体: Equipment, Phenomenon, SubPhenomenon, Checkpoint, Cause, Solution, Component, Parameter
- 8 种关系: prone_to, contains, needs_check, discovers, located_at, caused_by, solved_by, supports
- 支持搜索、路径查询、递归树构建、完整图数据输出

### Action 执行引擎

- 验证 Action 为 ACTIVE 状态
- 验证必填参数
- 按 sort_order 执行规则（CREATE_OBJECT, MODIFY_OBJECT, DELETE_OBJECT, CREATE_LINK, DELETE_LINK）
- 条件判断 + 参数映射
- 触发关联函数
- 记录执行结果

### Python 脚本引擎（替代 Groovy）

- `exec()` 执行用户脚本
- `threading.Timer` 30 秒超时
- 绑定变量: input (dict), context (dict with timestamp), 以及 input 中每个 key
- 记录执行日志: input/output/duration/status

---

## 错误处理

- FastAPI `HTTPException`: 404（资源不存在）, 400（参数错误）
- Pydantic 自动校验: 422（请求体格式错误）
- Claude API 失败: 回退到本地知识图谱
- 脚本超时: 返回 TIMEOUT 状态

## 前端兼容

- 所有 API 路径和请求/响应格式与 Java 版完全一致
- CORS 允许所有来源
- 前端只需将 API 地址从 `localhost:8080` 改为 `localhost:8000`
- 后端端口: 8000
