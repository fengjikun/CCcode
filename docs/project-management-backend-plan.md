# 项目管理模块后端实现方案（规划稿）

更新时间：2026-03-06（已按“文档管理新增数据源”刷新）

## 1. 背景与目标

当前“项目管理模块”已切换到后端 `/api/projects` 服务（历史版本曾由前端 mock + `localStorage` 驱动）。

目标是先完成可落地的后端规划，不急于编码，重点覆盖：

1. 数据结构（表设计、约束、索引、状态机）。
2. 接口契约（与现有前端行为对齐，尽量低成本切换到真实后端）。
3. 技术路线（任务执行、文件存储、安全、演进路径）。

## 2. 现状梳理（与前端对齐）

当前前端项目管理模块的核心能力（已包含“文档+数据源”双输入源）：

1. 项目 CRUD、项目列表和详情。
2. 文档上传/启停/删除（`.docx`、`.md`）。
3. 结构化数据源新增/编辑/删除/启停/连接测试（`TABLE/SQL` 抽取、`FULL/INCREMENTAL` 同步）。
4. Schema 管理（实体类型、关系类型、属性）。
5. Skill 管理（内置 + 上传 zip）。
6. AI 洞察（根据文档建议补全 schema）。
7. 抽取任务（run）、审核（review item）、版本发布（version）。
8. 动作（actions）与函数（functions）管理。

对应类型定义：

- `frontend/src/types/projectMvp.ts`
- `frontend/src/api/projectManagement.ts`

## 3. 设计原则

1. 先兼容：第一版接口返回结构尽量贴近现有 `ProjectDetail`，降低前端改造成本。
2. 可演进：避免与现有 `/api/ontology` 强耦合，新增独立 `/api/projects` 模块。
3. 可追溯：抽取任务、审核和版本发布要可追踪、可回放。
4. 安全优先：数据源密码不明文回传，不落日志。
5. 最小侵入：不破坏当前 diagnosis/ontology 已上线接口。

## 4. 数据结构设计

## 4.1 枚举定义（建议）

- `document_status`: `READY | FAILED | PROCESSING`
- `run_status`: `RUNNING | COMPLETED | FAILED | CANCELED`
- `review_status`: `PENDING | APPROVED | REJECTED`
- `action_status`: `DRAFT | ACTIVE`
- `function_status`: `DRAFT | ACTIVE`
- `data_source_type`: `MYSQL | POSTGRESQL | SQLSERVER | ORACLE | CLICKHOUSE`
- `data_source_status`: `UNKNOWN | SUCCESS | FAILED`
- `extract_mode`: `TABLE | SQL`
- `sync_mode`: `FULL | INCREMENTAL`
- `property_data_type`: `STRING | INTEGER | FLOAT | BOOLEAN | DATE | DATETIME | JSON | TEXT`
- `skill_code`: `data_processing | graph_synthesis | custom`
- `skill_source`: `built_in | uploaded`
- `review_kind`: `ENTITY | RELATION`

## 4.2 表清单（建议 14 张）

### 1) `pm_projects`

字段：

- `id` (uuid, pk)
- `owner_user_id` (int, fk -> users.id)
- `name` (varchar(64), not null)
- `description` (varchar(300), nullable)
- `current_version_id` (uuid, nullable)
- `created_at`, `updated_at`

约束/索引：

- `unique(owner_user_id, name)`
- `index(owner_user_id, updated_at desc)`

### 2) `pm_project_documents`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `name` (varchar(255), not null)
- `file_type` (enum: docx/md)
- `size_bytes` (int)
- `status` (document_status)
- `enabled` (bool, default true)
- `storage_path` (text)
- `uploaded_at`
- `created_at`, `updated_at`

约束/索引：

- `index(project_id, uploaded_at desc)`

### 3) `pm_project_data_sources`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `name` (varchar(128), not null)
- `type` (data_source_type)
- `host` (varchar(255))
- `port` (int)
- `database_name` (varchar(128))
- `schema_name` (varchar(128), nullable)
- `username` (varchar(128))
- `password_encrypted` (text)
- `ssl_enabled` (bool)
- `enabled` (bool)
- `extract_mode` (extract_mode)
- `tables_json` (text/json)
- `custom_sql` (text, nullable)
- `row_limit` (int)
- `sync_mode` (sync_mode)
- `incremental_column` (varchar(128), nullable)
- `status` (data_source_status)
- `last_test_at` (datetime, nullable)
- `last_error` (text, nullable)
- `created_at`, `updated_at`

约束/索引：

- `unique(project_id, name)`
- `index(project_id, enabled)`

专项约束（新增数据源后的关键规则）：

1. `extract_mode=TABLE` 时，`tables_json` 至少 1 张表；`custom_sql` 为空。
2. `extract_mode=SQL` 时，`custom_sql` 必填；`tables_json` 可为空。
3. `sync_mode=INCREMENTAL` 时，`incremental_column` 必填。
4. `password_encrypted` 仅服务端可见；接口响应不返回明文密码。
5. `test-connection` 会回写 `status/last_test_at/last_error`，便于在“文档管理”页直接展示连接健康度。

### 4) `pm_schema_configs`

字段：

- `project_id` (uuid, pk, fk -> pm_projects.id)
- `entity_scope` (text)
- `relation_scope` (text)
- `updated_at`

### 5) `pm_entity_types`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `name` (varchar(64), not null)
- `description` (text, nullable)
- `created_at`, `updated_at`

约束/索引：

- `unique(project_id, name)`

### 6) `pm_relation_types`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `name` (varchar(64), not null)
- `domain_entity_type_id` (uuid, fk -> pm_entity_types.id)
- `range_entity_type_id` (uuid, fk -> pm_entity_types.id)
- `description` (text, nullable)
- `created_at`, `updated_at`

约束/索引：

- `unique(project_id, name)`
- `index(project_id, domain_entity_type_id, range_entity_type_id)`

### 7) `pm_schema_properties`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `owner_kind` (enum: ENTITY/RELATION)
- `owner_id` (uuid)
- `name` (varchar(64))
- `display_name` (varchar(64))
- `data_type` (property_data_type)
- `required` (bool)
- `default_value` (text, nullable)
- `description` (text, nullable)
- `sort_order` (int)
- `created_at`, `updated_at`

约束/索引：

- `unique(project_id, owner_kind, owner_id, name)`
- `index(project_id, owner_kind, owner_id, sort_order)`

说明：

- `owner_id` 采用多态关联（实体或关系），由应用层校验。
- 如果后续想要强外键，可拆成 `pm_entity_properties` 和 `pm_relation_properties` 两张表。

### 8) `pm_skills`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `code` (skill_code)
- `name` (varchar(128))
- `description` (text, nullable)
- `enabled` (bool)
- `prompt` (text)
- `source` (skill_source)
- `tags_json` (text/json, nullable)
- `blocked` (bool)
- `missing` (varchar(255), nullable)
- `file_name` (varchar(255), nullable)
- `package_path` (text, nullable)
- `created_at`, `updated_at`

约束/索引：

- `index(project_id, source, code)`

### 9) `pm_extraction_runs`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `status` (run_status)
- `progress` (int, 0~100)
- `source_snapshot_json` (text/json)
- `candidate_entity_count` (int)
- `candidate_relation_count` (int)
- `pending_review_count` (int)
- `error_message` (text, nullable)
- `created_at`
- `completed_at` (datetime, nullable)
- `updated_at`

约束/索引：

- `index(project_id, created_at desc)`
- `index(project_id, status)`

`source_snapshot_json` 建议最小结构：

```json
{
  "documents": [
    {"id": "doc_xxx", "name": "故障手册.md", "uploadedAt": "2026-03-06T10:00:00Z"}
  ],
  "dataSources": [
    {
      "id": "ds_xxx",
      "name": "MES主库-生产库",
      "extractMode": "TABLE",
      "syncMode": "INCREMENTAL",
      "tables": ["fault_event"],
      "rowLimit": 20000
    }
  ]
}
```

### 10) `pm_review_items`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `run_id` (uuid, fk -> pm_extraction_runs.id)
- `kind` (review_kind)
- `title` (text)
- `evidence` (text)
- `confidence` (numeric(5,4))
- `status` (review_status)
- `entity_type_name` (varchar(64), nullable)
- `entity_name` (varchar(255), nullable)
- `relation_type_name` (varchar(64), nullable)
- `relation_domain_name` (varchar(64), nullable)
- `relation_range_name` (varchar(64), nullable)
- `payload_json` (text/json, nullable)
- `created_at`, `updated_at`

约束/索引：

- `index(run_id, status, kind)`
- `index(project_id, run_id)`

说明：

- 保留 `title` 兼容当前前端。
- 新增结构化字段，后续图谱构建可以不再依赖字符串解析。

### 11) `pm_ontology_versions`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `version_no` (int)
- `version` (varchar(16), 例如 `v3`)
- `label` (varchar(128))
- `notes` (text, nullable)
- `source_run_id` (uuid, fk -> pm_extraction_runs.id)
- `entity_count` (int)
- `relation_count` (int)
- `created_at`

约束/索引：

- `unique(project_id, version_no)`
- `index(project_id, created_at desc)`

### 12) `pm_version_items`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `version_id` (uuid, fk -> pm_ontology_versions.id)
- `run_item_id` (uuid, nullable)
- `kind` (review_kind)
- `title` (text)
- `evidence` (text)
- `confidence` (numeric(5,4))
- `payload_json` (text/json, nullable)
- `created_at`

约束/索引：

- `index(version_id, kind)`

说明：

- 发布版本时做快照，避免 run 继续变更导致版本漂移。

### 13) `pm_project_actions`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `name` (varchar(128))
- `description` (text, nullable)
- `status` (action_status)
- `created_at`, `updated_at`

约束/索引：

- `unique(project_id, name)`

### 14) `pm_project_functions`

字段：

- `id` (uuid, pk)
- `project_id` (uuid, fk -> pm_projects.id)
- `name` (varchar(128))
- `description` (text, nullable)
- `script_content` (text)
- `status` (function_status)
- `created_at`, `updated_at`

约束/索引：

- `unique(project_id, name)`

## 5. API 契约草案（OpenAPI 级别）

建议统一前缀：

- `/api/projects`

鉴权规则：

- 与现有系统一致，全部需要 Bearer Token。
- 仅允许访问 `owner_user_id = current_user.id` 的项目。

响应规则（建议）：

- 成功返回业务 JSON，保持与当前 `fetchJSON` 兼容。
- 失败返回 `{"detail": "错误信息"}`，兼容当前错误处理逻辑。

## 5.1 项目

1. `GET /api/projects`
2. `POST /api/projects`
3. `GET /api/projects/{projectId}`
4. `DELETE /api/projects/{projectId}`

`GET /api/projects` 响应项建议直接对齐 `ProjectSummary`：

- `id, name, description, createdAt, updatedAt, documentCount, versionCount, latestRunStatus`

`GET /api/projects/{projectId}` 响应建议第一版直接对齐 `ProjectDetail`：

- `documents, dataSources, schemaConfig, runs, versions, actions, functions` 全量返回。

## 5.2 文档（文档管理中的文件输入源）

1. `GET /api/projects/{projectId}/documents`
2. `POST /api/projects/{projectId}/documents`（multipart/form-data）
3. `DELETE /api/projects/{projectId}/documents/{documentId}`
4. `PATCH /api/projects/{projectId}/documents/{documentId}`（更新 `enabled`）

上传响应对齐 `ProjectDocument`。

## 5.3 数据源

1. `GET /api/projects/{projectId}/data-sources`
2. `POST /api/projects/{projectId}/data-sources`
3. `PUT /api/projects/{projectId}/data-sources/{dataSourceId}`
4. `DELETE /api/projects/{projectId}/data-sources/{dataSourceId}`
5. `PATCH /api/projects/{projectId}/data-sources/{dataSourceId}`（更新 `enabled`）
6. `POST /api/projects/{projectId}/data-sources/{dataSourceId}/test-connection`

响应建议：

1. `password` 字段不回传。
2. 可回传 `passwordMasked: "******"` 兼容页面展示。
3. 编辑场景下，前端 `password` 留空表示“不更新密码”。

连接测试响应：

```json
{
  "status": "SUCCESS",
  "testedAt": "2026-03-06T10:00:00Z",
  "message": "连接成功，目标数据库可访问"
}
```

## 5.4 Schema 与 Skill

1. `POST /api/projects/{projectId}/schema/entity-types`
2. `PUT /api/projects/{projectId}/schema/entity-types/{entityTypeId}`
3. `DELETE /api/projects/{projectId}/schema/entity-types/{entityTypeId}`
4. `POST /api/projects/{projectId}/schema/relation-types`
5. `PUT /api/projects/{projectId}/schema/relation-types/{relationTypeId}`
6. `DELETE /api/projects/{projectId}/schema/relation-types/{relationTypeId}`
7. `PATCH /api/projects/{projectId}/schema/prompts`（`entityScope/relationScope/skills`）
8. `POST /api/projects/{projectId}/skills/upload`（zip）
9. `DELETE /api/projects/{projectId}/skills/{skillId}`
10. `POST /api/projects/{projectId}/schema/ai-insight`

`ai-insight` 响应：

```json
{
  "scannedDocumentCount": 2,
  "addedEntityCount": 3,
  "addedRelationCount": 2,
  "addedEntityNames": ["AlarmCode"],
  "addedRelationNames": ["triggered_by"]
}
```

## 5.5 抽取、审核、版本

1. `POST /api/projects/{projectId}/runs`
2. `GET /api/projects/{projectId}/runs/{runId}`
3. `PATCH /api/projects/{projectId}/runs/{runId}/review-items/{itemId}`
4. `POST /api/projects/{projectId}/runs/{runId}/publish`

`PATCH review-item` 请求：

```json
{
  "status": "APPROVED"
}
```

`POST publish` 请求：

```json
{
  "label": "本体版本 v3",
  "notes": "新增 C 型设备场景"
}
```

## 5.6 动作与函数

动作：

1. `POST /api/projects/{projectId}/actions`
2. `PATCH /api/projects/{projectId}/actions/{actionId}`（更新 status）
3. `DELETE /api/projects/{projectId}/actions/{actionId}`

函数：

1. `POST /api/projects/{projectId}/functions`
2. `PATCH /api/projects/{projectId}/functions/{functionId}`（更新 status）
3. `DELETE /api/projects/{projectId}/functions/{functionId}`

## 5.7 关键 DTO 草案

`CreateProjectRequest`

```json
{
  "name": "设备故障本体原型",
  "description": "用于前端流程评审"
}
```

`DataSourceUpsertRequest`

```json
{
  "name": "MES主库-生产库",
  "type": "POSTGRESQL",
  "host": "10.23.8.12",
  "port": 5432,
  "database": "mes_prod",
  "schema": "public",
  "username": "readonly_mes",
  "password": "<SECRET>",
  "sslEnabled": true,
  "enabled": true,
  "extractMode": "TABLE",
  "tables": ["work_order", "fault_event"],
  "customSql": "",
  "rowLimit": 20000,
  "syncMode": "INCREMENTAL",
  "incrementalColumn": "updated_at"
}
```

`RunCreateResponse`

```json
{
  "id": "run_xxx",
  "status": "RUNNING",
  "progress": 15,
  "createdAt": "2026-03-06T10:00:00Z",
  "candidateEntityCount": 12,
  "candidateRelationCount": 8,
  "pendingReviewCount": 20,
  "reviewItems": []
}
```

## 6. 技术方案建议

## 6.1 模块组织

新增目录：

- `backend/app/models/project_mgmt.py`
- `backend/app/schemas/project_mgmt.py`
- `backend/app/services/project_mgmt_service.py`
- `backend/app/routers/projects.py`

并在 `main.py` 注册 `projects.router`。

## 6.2 任务执行（run）

第一阶段建议：

1. 使用 `BackgroundTasks` 或轻量线程池执行抽取任务。
2. 前端继续轮询 `GET project detail` 或 `GET run detail`。
3. run 中间状态写 `progress`，结束后回写 `COMPLETED/FAILED`。

第二阶段升级：

1. 切 `Celery + Redis`（若任务耗时明显上升）。
2. 引入事件推送（SSE/WebSocket）减少轮询。

## 6.3 文件存储

第一阶段：

1. 本地文件系统：`backend/data/project_assets/{projectId}/documents/{docId}.ext`
2. DB 存 `storage_path` + 元数据。

第二阶段：

1. 抽象 `StorageProvider`。
2. 可切 MinIO/S3，不影响业务接口。

## 6.4 数据源密码与日志安全

1. 密码字段入库前加密（例如 Fernet/KMS）。
2. 响应默认返回掩码值，不返回明文。
3. 更新数据源时支持“密码为空=不修改”。
4. 连接测试日志禁止打印密码、连接串原文。
5. 抽取任务日志中仅保留数据源 ID/名称，禁止落地 host+username+sql 明文。

## 6.5 版本一致性

1. 发布版本仅固化 `APPROVED` 审核项。
2. 发布时写入 `pm_version_items` 快照。
3. `current_version_id` 指向最新发布版本，可手动切换（二期可加接口）。

## 7. 实施分阶段计划（建议）

## Phase 0：契约冻结（0.5 天）

1. 冻结字段字典与枚举。
2. 冻结 endpoint 清单和错误码语义。
3. 前后端共同确认兼容策略（一次性替换 vs 渐进切换）。

产出：

- 本文档评审通过版。
- OpenAPI 草案（YAML/JSON）。

## Phase 1：基础数据与 CRUD（2~3 天）

1. Alembic 迁移（14 表 + 索引）。
2. 项目/文档/数据源 CRUD + 鉴权隔离。
3. 单元测试覆盖主要校验规则。

## Phase 2：Schema/Skill（2 天）

1. 实体/关系/属性管理。
2. scope 与 skills 配置。
3. skill zip 上传落盘与元数据管理。

## Phase 3：抽取/审核/版本（3~4 天）

1. run 创建与异步执行框架。
2. review item 更新与统计回写。
3. publish version + version 快照。

## Phase 4：动作/函数 + 稳定性（1~2 天）

1. 动作/函数接口落地。
2. 安全检查、日志与异常兜底。
3. 前后端联调 + 回归测试。

## 8. 风险与待决策项

1. 是否需要项目级协作（多人共享项目）？
2. 是否保留“单接口返回全量 ProjectDetail”的模式，还是拆分成多接口按需加载？
3. run 执行是否必须可取消/可重试（当前前端尚无对应 UI）？
4. 数据源连接是否需要网络白名单与审计？
5. 动作/函数是否与现有 `/api/ontology` 体系做后续合并？

## 9. 推荐实施顺序（结论）

优先落地：

1. `projects + documents + data-sources + schema`（先把静态配置层托管到后端）。
2. `runs + reviews + versions`（打通业务闭环）。
3. `actions + functions`（补齐模块能力）。

该顺序可以优先完成前后端闭环，再把复杂任务执行放到中后段，风险最低。
