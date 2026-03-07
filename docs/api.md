# 后端 API 能力文档

> 基础 URL：`http://localhost:9000`
> 所有请求/响应均为 `application/json`，字段命名遵循 **camelCase**。
> 文档更新日期：2026-03-07

---

## 目录

1. [认证机制](#1-认证机制)
2. [认证 Auth](#2-认证-auth)
3. [故障诊断 Diagnosis](#3-故障诊断-diagnosis)
4. [本体 Schema（类型定义）](#4-本体-schema类型定义)
5. [本体 Objects（实例数据）](#5-本体-objects实例数据)
6. [本体 Actions（动作类型）](#6-本体-actions动作类型)
7. [本体 Functions（脚本函数）](#7-本体-functions脚本函数)
8. [项目管理 Projects](#8-项目管理-projects)
9. [Agent 智能体](#9-agent-智能体)

---

## 1. 认证机制

### Token 类型

自定义 HMAC-SHA256 签名 Token（非标准 JWT）。

**格式**：`{base64url(payload)}.{base64url(hmac_sha256_signature)}`

Payload 内容：
```json
{
  "sub": "1",
  "username": "admin",
  "exp": 1234567890
}
```

### 默认过期时间

480 分钟（8 小时），可通过环境变量 `AUTH_TOKEN_EXPIRE_MINUTES` 调整。

### 请求头携带方式

```
Authorization: Bearer <access_token>
```

### 默认账号

| 字段 | 默认值 | 环境变量 |
|------|--------|---------|
| 用户名 | `admin` | `AUTH_DEFAULT_USERNAME` |
| 密码 | `admin123456` | `AUTH_DEFAULT_PASSWORD` |

### 哪些接口需要登录？

| 模块 | 是否需要 Bearer Token |
|------|----------------------|
| 认证 Auth | 除 `/login` 外，`/me` 需要 |
| 故障诊断 Diagnosis | **不需要** |
| 本体 Schema | **不需要** |
| 本体 Objects | **不需要** |
| 本体 Actions | **不需要** |
| 本体 Functions | **不需要** |
| 项目管理 Projects | **全部需要** ✓ |
| Agent 智能体 | **不需要** |

---

## 2. 认证 Auth

前缀：`/api/auth`

### 2.1 登录

```
POST /api/auth/login
```

**请求体**：
```json
{
  "username": "admin",
  "password": "admin123456"
}
```

**响应**：
```json
{
  "accessToken": "eyJ...",
  "tokenType": "bearer",
  "expiresIn": 28800,
  "user": {
    "id": 1,
    "username": "admin"
  }
}
```

**错误**：
- `401` 用户名或密码错误
- `403` 账号已禁用

---

### 2.2 获取当前用户信息

```
GET /api/auth/me
```

> 需要 Bearer Token

**响应**：
```json
{
  "id": 1,
  "username": "admin"
}
```

---

## 3. 故障诊断 Diagnosis

前缀：`/api/diagnosis`
**所有接口均无需登录**

### 3.1 AI 故障分析

```
POST /api/diagnosis/analyze
```

**请求体**：
```json
{
  "deviceId": 1,
  "deviceName": "设备A",
  "deviceType": "变频器",
  "phenomenonId": "ph_001",
  "symptoms": ["异常振动", "温度升高"],
  "description": "设备运行时出现异常噪音",
  "severity": "MEDIUM"
}
```

> `severity` 取值：`LOW` / `MEDIUM` / `HIGH` / `CRITICAL`

**响应**：`FaultRecordResponse`
```json
{
  "id": 1,
  "deviceId": 1,
  "deviceName": "设备A",
  "deviceType": "变频器",
  "symptoms": "[\"异常振动\", \"温度升高\"]",
  "description": "设备运行时出现异常噪音",
  "severity": "MEDIUM",
  "status": "OPEN",
  "diagnosisResult": "AI分析结论文本...",
  "reportedAt": "2026-03-07T10:00:00",
  "resolvedAt": null
}
```

---

### 3.2 查询所有诊断记录

```
GET /api/diagnosis/records
```

**响应**：`FaultRecordResponse[]`（按时间倒序）

---

### 3.3 按设备查询诊断记录

```
GET /api/diagnosis/records/device/{device_id}
```

**响应**：`FaultRecordResponse[]`

---

### 3.4 查询单条诊断记录

```
GET /api/diagnosis/records/{id}
```

**响应**：`FaultRecordResponse`

---

### 3.5 删除诊断记录

```
DELETE /api/diagnosis/records/{id}
```

**响应**：`204 No Content`

---

### 3.6 获取故障现象列表

```
GET /api/diagnosis/phenomena
```

**响应**：知识图谱中的故障现象节点列表

---

### 3.7 搜索故障现象

```
GET /api/diagnosis/phenomena/search?q=振动
```

**响应**：匹配的故障现象列表

---

### 3.8 获取现象详情

```
GET /api/diagnosis/phenomena/{id}/detail
```

**响应**：包含子现象、原因、解决方案的完整现象详情

---

### 3.9 获取检查点

```
GET /api/diagnosis/checkpoints?nodeId=ph_001
```

**响应**：指定节点对应的检查步骤列表

---

### 3.10 获取原因与解决方案

```
GET /api/diagnosis/causes-solutions?subPhenId=sub_001
```

**响应**：子现象对应的原因分析与解决方案

---

### 3.11 获取知识图谱数据

```
GET /api/diagnosis/graph
```

**响应**：完整知识图谱的节点和边数据（用于前端 D3 可视化）

---

## 4. 本体 Schema（类型定义）

前缀：`/api/ontology`
**所有接口均无需登录**

### 4.1 对象类型（ObjectType）

#### 列表
```
GET /api/ontology/object-types
```
**响应**：`ObjectTypeResponse[]`

#### 创建
```
POST /api/ontology/object-types
```
**请求体**：
```json
{
  "name": "Device",
  "displayName": "设备",
  "description": "工厂设备",
  "primaryKeyProperty": "serialNumber",
  "icon": "tool",
  "color": "#1890ff"
}
```

#### 获取单个
```
GET /api/ontology/object-types/{id}
```

#### 更新
```
PUT /api/ontology/object-types/{id}
```
请求体同创建。

#### 删除
```
DELETE /api/ontology/object-types/{id}
```
**响应**：`204 No Content`

---

**ObjectTypeResponse 结构**：
```json
{
  "id": 1,
  "name": "Device",
  "displayName": "设备",
  "description": "工厂设备",
  "primaryKeyProperty": "serialNumber",
  "icon": "tool",
  "color": "#1890ff",
  "createdAt": "2026-03-07T10:00:00",
  "updatedAt": "2026-03-07T10:00:00"
}
```

---

### 4.2 属性（Property）

> 属于某个 ObjectType 的属性定义

#### 列表
```
GET /api/ontology/object-types/{id}/properties
```

#### 新增
```
POST /api/ontology/object-types/{id}/properties
```
**请求体**：
```json
{
  "name": "serialNumber",
  "displayName": "序列号",
  "dataType": "STRING",
  "required": true,
  "defaultValue": null,
  "description": "设备唯一序列号",
  "sortOrder": 0
}
```

> `dataType` 取值：`STRING` / `INTEGER` / `FLOAT` / `BOOLEAN` / `DATE` / `DATETIME` / `JSON` / `TEXT`

#### 更新
```
PUT /api/ontology/properties/{id}
```

#### 删除
```
DELETE /api/ontology/properties/{id}
```
**响应**：`204 No Content`

---

### 4.3 链接类型（LinkType）

#### 列表
```
GET /api/ontology/link-types
```

#### 创建
```
POST /api/ontology/link-types
```
**请求体**：
```json
{
  "name": "belongs_to",
  "displayName": "归属于",
  "sourceObjectTypeId": 1,
  "targetObjectTypeId": 2,
  "cardinality": "ONE_TO_MANY",
  "description": "设备归属于工厂"
}
```

> `cardinality` 取值：`ONE_TO_ONE` / `ONE_TO_MANY` / `MANY_TO_ONE` / `MANY_TO_MANY`

#### 获取单个
```
GET /api/ontology/link-types/{id}
```

#### 更新
```
PUT /api/ontology/link-types/{id}
```

#### 删除
```
DELETE /api/ontology/link-types/{id}
```

---

### 4.4 Schema 图谱

#### 获取完整 Schema 图
```
GET /api/ontology/schema
```
**响应**：包含所有 ObjectType、Property、LinkType 的图结构数据。

#### 清空全部 Schema
```
DELETE /api/ontology/schema
```
**响应**：`204 No Content`
⚠️ **危险操作**，会删除所有本体类型定义。

---

## 5. 本体 Objects（实例数据）

前缀：`/api/ontology`
**所有接口均无需登录**

### 5.1 对象实例（Object）

#### 列表
```
GET /api/ontology/object-types/{type_id}/objects
```

#### 创建
```
POST /api/ontology/object-types/{type_id}/objects
```
**请求体**：
```json
{
  "externalId": "DEV-001",
  "propertiesJson": "{\"serialNumber\": \"SN123\", \"name\": \"1号变频器\"}"
}
```

> `propertiesJson` 是 JSON 字符串，键值对对应 ObjectType 的属性定义。

#### 获取单个
```
GET /api/ontology/object-types/{type_id}/objects/{id}
```

#### 更新
```
PUT /api/ontology/object-types/{type_id}/objects/{id}
```

#### 删除
```
DELETE /api/ontology/object-types/{type_id}/objects/{id}
```

---

**ObjectResponse 结构**：
```json
{
  "id": 1,
  "objectTypeId": 1,
  "externalId": "DEV-001",
  "propertiesJson": "{\"serialNumber\": \"SN123\"}",
  "createdAt": "2026-03-07T10:00:00",
  "updatedAt": "2026-03-07T10:00:00"
}
```

---

### 5.2 链接实例（Link）

#### 获取对象的所有链接
```
GET /api/ontology/object-types/{type_id}/objects/{id}/links
```

#### 创建链接
```
POST /api/ontology/links
```
**请求体**：
```json
{
  "linkTypeId": 1,
  "sourceObjectId": 1,
  "targetObjectId": 2
}
```

#### 删除链接
```
DELETE /api/ontology/links/{id}
```
**响应**：`204 No Content`

---

## 6. 本体 Actions（动作类型）

前缀：`/api/ontology`
**所有接口均无需登录**

### 6.1 动作类型（ActionType）

#### 列表
```
GET /api/ontology/action-types
```

#### 创建
```
POST /api/ontology/action-types
```
**请求体**：
```json
{
  "name": "restart_device",
  "displayName": "重启设备",
  "description": "远程重启指定设备",
  "status": "DRAFT",
  "targetObjectTypeId": 1,
  "triggerType": "MANUAL",
  "triggerConfigJson": null,
  "exceptionPolicy": "IGNORE",
  "exceptionConfigJson": null,
  "validationRulesJson": null
}
```

> `status`：`DRAFT` / `ACTIVE`
> `triggerType`：`MANUAL` / `SCHEDULED` / `EVENT`
> `exceptionPolicy`：`IGNORE` / `RETRY` / `ABORT`

#### 获取单个
```
GET /api/ontology/action-types/{id}
```

#### 更新
```
PUT /api/ontology/action-types/{id}
```

#### 删除
```
DELETE /api/ontology/action-types/{id}
```

---

### 6.2 动作参数（ActionParameter）

#### 列表
```
GET /api/ontology/action-types/{id}/parameters
```

#### 新增
```
POST /api/ontology/action-types/{id}/parameters
```
**请求体**：
```json
{
  "name": "deviceId",
  "displayName": "设备ID",
  "dataType": "INTEGER",
  "required": true,
  "defaultValue": null,
  "constraintsJson": null,
  "sortOrder": 0
}
```

#### 更新
```
PUT /api/ontology/parameters/{id}
```

#### 删除
```
DELETE /api/ontology/parameters/{id}
```

---

### 6.3 动作规则（ActionRule）

#### 列表
```
GET /api/ontology/action-types/{id}/rules
```

#### 新增
```
POST /api/ontology/action-types/{id}/rules
```
**请求体**：
```json
{
  "ruleType": "CREATE_OBJECT",
  "targetObjectTypeName": "Device",
  "targetLinkTypeName": null,
  "propertyMappingsJson": "{\"name\": \"{{deviceName}}\"}",
  "conditionJson": null,
  "sortOrder": 0
}
```

#### 更新
```
PUT /api/ontology/rules/{id}
```

#### 删除
```
DELETE /api/ontology/rules/{id}
```

---

### 6.4 执行动作

```
POST /api/ontology/action-types/{id}/execute
```
**请求体**（动态 key-value）：
```json
{
  "deviceId": 1,
  "reason": "定期维护重启"
}
```

**响应**：`ActionExecutionResponse`
```json
{
  "id": 1,
  "actionTypeId": 1,
  "parametersJson": "{\"deviceId\": 1}",
  "resultJson": "{\"success\": true}",
  "status": "SUCCESS",
  "errorMessage": null,
  "executedAt": "2026-03-07T10:00:00"
}
```

---

### 6.5 查询执行历史

```
GET /api/ontology/action-types/{id}/executions
```
**响应**：`ActionExecutionResponse[]`

---

## 7. 本体 Functions（脚本函数）

前缀：`/api/ontology`
**所有接口均无需登录**

### 7.1 函数 CRUD

#### 列表
```
GET /api/ontology/functions
```

#### 创建
```
POST /api/ontology/functions
```
**请求体**：
```json
{
  "name": "calc_efficiency",
  "displayName": "计算效率",
  "description": "根据输入参数计算设备效率",
  "actionTypeId": null,
  "scriptType": "PYTHON",
  "scriptContent": "def main(input_data):\n    return {'efficiency': 0.95}",
  "inputSchemaJson": "{\"type\": \"object\"}",
  "outputSchemaJson": "{\"type\": \"object\"}",
  "status": "DRAFT"
}
```

> `scriptType` 目前支持：`PYTHON` / `GROOVY`
> `status`：`DRAFT` / `ACTIVE`

#### 获取单个
```
GET /api/ontology/functions/{id}
```

#### 更新
```
PUT /api/ontology/functions/{id}
```

#### 删除
```
DELETE /api/ontology/functions/{id}
```

---

### 7.2 执行函数

```
POST /api/ontology/functions/{id}/execute
```
**请求体**（可选，动态输入数据）：
```json
{
  "param1": "value1",
  "param2": 42
}
```

**响应**：`FunctionLogResponse`
```json
{
  "id": 1,
  "functionId": 1,
  "actionExecutionId": null,
  "inputDataJson": "{\"param1\": \"value1\"}",
  "outputDataJson": "{\"efficiency\": 0.95}",
  "status": "SUCCESS",
  "errorMessage": null,
  "durationMs": 120,
  "executedAt": "2026-03-07T10:00:00"
}
```

---

### 7.3 查询执行日志

```
GET /api/ontology/functions/{id}/logs
```
**响应**：`FunctionLogResponse[]`

---

## 8. 项目管理 Projects

前缀：`/api/projects`
**所有接口均需要 Bearer Token** ✓

### 8.1 项目基础 CRUD

#### 列表（当前用户的项目）
```
GET /api/projects
Authorization: Bearer <token>
```
**响应**：`ProjectSummary[]`
```json
[{
  "id": "proj_abc123",
  "name": "工厂A知识图谱",
  "description": "工厂A设备本体建模",
  "createdAt": "2026-03-01T09:00:00",
  "updatedAt": "2026-03-07T10:00:00",
  "documentCount": 5,
  "versionCount": 2,
  "latestRunStatus": "COMPLETED"
}]
```

#### 创建项目
```
POST /api/projects
```
**请求体**：
```json
{
  "name": "工厂B知识图谱",
  "description": "工厂B设备本体建模"
}
```
**响应**：`ProjectSummary`，状态码 `201`

#### 获取项目详情
```
GET /api/projects/{project_id}
```
**响应**：`ProjectDetail`（含文档、数据源、Schema配置、抽取任务、版本列表等完整信息）

#### 更新项目
```
PATCH /api/projects/{project_id}
```
**请求体**：
```json
{
  "name": "新名称",
  "description": "新描述"
}
```

#### 删除项目
```
DELETE /api/projects/{project_id}
```
**响应**：`204 No Content`

---

### 8.2 文档管理

#### 列表
```
GET /api/projects/{project_id}/documents
```
**响应**：`ProjectDocument[]`
```json
[{
  "id": "doc_abc",
  "name": "设备手册.pdf",
  "fileType": "pdf",
  "size": 204800,
  "status": "READY",
  "enabled": true,
  "uploadedAt": "2026-03-05T10:00:00"
}]
```

> `status`：`READY` / `PROCESSING` / `FAILED`

#### 上传文档
```
POST /api/projects/{project_id}/documents
Content-Type: multipart/form-data
```
**请求**：表单字段 `file`（二进制文件）
**响应**：`ProjectDocument`，状态码 `201`

#### 启用/禁用文档
```
PATCH /api/projects/{project_id}/documents/{document_id}
```
**请求体**：
```json
{ "enabled": false }
```

#### 删除文档
```
DELETE /api/projects/{project_id}/documents/{document_id}
```

---

### 8.3 数据源管理

#### 列表
```
GET /api/projects/{project_id}/data-sources
```
**响应**：`ProjectDataSource[]`

#### 创建数据源
```
POST /api/projects/{project_id}/data-sources
```
**请求体**：
```json
{
  "name": "生产数据库",
  "type": "MYSQL",
  "host": "192.168.1.100",
  "port": 3306,
  "database": "production",
  "schema": null,
  "username": "reader",
  "password": "secret",
  "sslEnabled": false,
  "enabled": true,
  "extractMode": "TABLE",
  "tables": ["devices", "maintenance_logs"],
  "customSql": null,
  "rowLimit": 10000,
  "syncMode": "FULL",
  "incrementalColumn": null
}
```

> `type`：`MYSQL` / `POSTGRESQL` / `SQLSERVER` / `ORACLE` / `CLICKHOUSE`
> `extractMode`：`TABLE`（指定表）/ `SQL`（自定义 SQL）
> `syncMode`：`FULL`（全量）/ `INCREMENTAL`（增量）

**示例：在项目 `proj_01ccfa6841df` 新增结构化数据源（故障工单，`fault.faultOrder`）**
```
POST /api/projects/proj_01ccfa6841df/data-sources
```
**请求体**：
```json
{
  "name": "故障工单",
  "type": "MYSQL",
  "host": "192.168.1.100",
  "port": 3306,
  "database": "fault",
  "schema": null,
  "username": "reader",
  "password": "secret",
  "sslEnabled": false,
  "enabled": true,
  "extractMode": "TABLE",
  "tables": ["faultOrder"],
  "customSql": null,
  "rowLimit": 10000,
  "syncMode": "FULL",
  "incrementalColumn": null
}
```

#### 更新数据源
```
PUT /api/projects/{project_id}/data-sources/{data_source_id}
```

#### 启用/禁用数据源
```
PATCH /api/projects/{project_id}/data-sources/{data_source_id}
```
**请求体**：`{ "enabled": true }`

#### 删除数据源
```
DELETE /api/projects/{project_id}/data-sources/{data_source_id}
```

#### 测试连接
```
POST /api/projects/{project_id}/data-sources/{data_source_id}/test-connection
```
**响应**：
```json
{
  "status": "SUCCESS",
  "testedAt": "2026-03-07T10:00:00",
  "message": "连接成功"
}
```

---

### 8.4 Schema 配置

#### 创建实体类型
```
POST /api/projects/{project_id}/schema/entity-types
```
**请求体**：
```json
{
  "name": "Device",
  "description": "工厂设备",
  "properties": [
    {
      "name": "serialNumber",
      "displayName": "序列号",
      "dataType": "STRING",
      "required": true
    }
  ]
}
```

#### 更新实体类型
```
PUT /api/projects/{project_id}/schema/entity-types/{entity_type_id}
```

#### 删除实体类型
```
DELETE /api/projects/{project_id}/schema/entity-types/{entity_type_id}
```

#### 创建关系类型
```
POST /api/projects/{project_id}/schema/relation-types
```
**请求体**：
```json
{
  "name": "belongs_to",
  "domain": "Device",
  "range": "Factory",
  "description": "设备归属工厂",
  "properties": []
}
```

#### 更新关系类型
```
PUT /api/projects/{project_id}/schema/relation-types/{relation_type_id}
```

#### 删除关系类型
```
DELETE /api/projects/{project_id}/schema/relation-types/{relation_type_id}
```

#### 清空 Schema
```
DELETE /api/projects/{project_id}/schema
```
⚠️ **危险操作**，清空项目所有实体类型和关系类型。

#### 更新 Schema 提示词
```
PATCH /api/projects/{project_id}/schema/prompts
```
**请求体**：
```json
{
  "entityScope": "只关注设备、故障、零部件等实体",
  "relationScope": "只关注归属、包含、导致等关系",
  "skills": []
}
```
**响应**：`SchemaConfig`（含实体类型、关系类型、提示词、技能配置）

---

### 8.5 AI Schema 洞察

#### 启动 AI 洞察任务

```
POST /api/projects/{project_id}/schema/ai-insight
```
**响应**：`AiInsightRun`，状态码 `202`（异步执行）

```json
{
  "id": "run_abc",
  "status": "RUNNING",
  "progress": 0,
  "createdAt": "2026-03-07T10:00:00",
  "completedAt": null,
  "scannedDocumentCount": 0,
  "addedEntityCount": 0,
  "addedRelationCount": 0,
  "addedEntityNames": [],
  "addedRelationNames": [],
  "warnings": [],
  "stage": "initializing",
  "currentDocument": null,
  "logs": [],
  "errorMessage": null
}
```

> AI 洞察会扫描项目文档，自动发现并建议实体类型和关系类型。

#### 查询洞察任务状态

```
GET /api/projects/{project_id}/schema/ai-insight/runs/{run_id}
```
**响应**：`AiInsightRun`（轮询此接口查看进度）

---

### 8.6 信息抽取任务（Extraction Run）

#### 启动抽取任务
```
POST /api/projects/{project_id}/runs
```
**响应**：`ExtractionRun`，状态码 `201`（异步执行）

```json
{
  "id": "run_xyz",
  "status": "RUNNING",
  "progress": 30,
  "createdAt": "2026-03-07T10:00:00",
  "completedAt": null,
  "candidateEntityCount": 15,
  "candidateRelationCount": 8,
  "pendingReviewCount": 23,
  "stage": "extracting",
  "currentDocument": "设备手册.pdf",
  "logs": ["Processing document 1/3..."],
  "warnings": [],
  "errorMessage": null,
  "reviewItems": []
}
```

#### 查询抽取任务详情
```
GET /api/projects/{project_id}/runs/{run_id}
```
**响应**：`ExtractionRun`（含 `reviewItems` 待审核列表）

---

### 8.7 审核条目（Review Items）

抽取任务完成后，候选实体/关系需要人工审核。

#### 更新单条审核状态
```
PATCH /api/projects/{project_id}/runs/{run_id}/review-items/{item_id}
```
**请求体**：
```json
{ "status": "APPROVED" }
```

> `status`：`PENDING` / `APPROVED` / `REJECTED`

**响应**：`ReviewItem`
```json
{
  "id": "item_001",
  "kind": "ENTITY",
  "title": "发现实体：变频器",
  "evidence": "文档第3页：'1号变频器已运行5年'",
  "confidence": 0.92,
  "status": "APPROVED",
  "entityTypeName": "Device",
  "entityName": "1号变频器",
  "relationTypeName": null,
  "relationDomainName": null,
  "relationRangeName": null
}
```

> `kind`：`ENTITY`（实体）/ `RELATION`（关系）

#### 批量更新审核状态
```
PATCH /api/projects/{project_id}/runs/{run_id}/review-items/batch
```
**请求体**：
```json
{
  "itemIds": ["item_001", "item_002", "item_003"],
  "status": "APPROVED"
}
```
**响应**：
```json
{
  "updatedCount": 3,
  "pendingReviewCount": 20
}
```

---

### 8.8 发布本体版本

```
POST /api/projects/{project_id}/runs/{run_id}/publish
```
**请求体**：
```json
{
  "label": "v1.0",
  "notes": "首版本，基于设备手册抽取"
}
```
**响应**：`OntologyVersion`，状态码 `201`
```json
{
  "id": "ver_001",
  "version": "1",
  "label": "v1.0",
  "notes": "首版本，基于设备手册抽取",
  "createdAt": "2026-03-07T12:00:00",
  "sourceRunId": "run_xyz",
  "entityCount": 42,
  "relationCount": 18
}
```

---

### 8.9 技能（Skill）管理

#### 上传自定义技能
```
POST /api/projects/{project_id}/skills/upload
Content-Type: multipart/form-data
```
**请求**：表单字段 `file`（Python 脚本文件）
**响应**：`SkillConfig`，状态码 `201`

```json
{
  "id": "skill_001",
  "code": "custom",
  "name": "my_skill.py",
  "description": null,
  "enabled": true,
  "prompt": "",
  "source": "uploaded",
  "tags": [],
  "blocked": false,
  "missing": null,
  "fileName": "my_skill.py",
  "metadata": {},
  "createdAt": "2026-03-07T10:00:00"
}
```

> `code`：`data_processing` / `graph_synthesis` / `custom`
> `source`：`built_in` / `uploaded`

#### 删除自定义技能
```
DELETE /api/projects/{project_id}/skills/{skill_id}
```

---

### 8.10 Action 管理（项目级）

#### 创建 Action
```
POST /api/projects/{project_id}/actions
```
**请求体**：
```json
{
  "name": "notify_maintenance",
  "description": "触发维护通知",
  "status": "DRAFT"
}
```
**响应**：`ProjectAction`，状态码 `201`

#### 更新 Action 状态
```
PATCH /api/projects/{project_id}/actions/{action_id}
```
**请求体**：`{ "status": "ACTIVE" }`

#### 删除 Action
```
DELETE /api/projects/{project_id}/actions/{action_id}
```

---

### 8.11 Function 管理（项目级）

#### 创建 Function
```
POST /api/projects/{project_id}/functions
```
**请求体**：
```json
{
  "name": "parse_sensor_data",
  "description": "解析传感器数据",
  "scriptContent": "def run(data):\n    return data",
  "status": "DRAFT"
}
```

#### 更新 Function 状态
```
PATCH /api/projects/{project_id}/functions/{function_id}
```
**请求体**：`{ "status": "ACTIVE" }`

#### 删除 Function
```
DELETE /api/projects/{project_id}/functions/{function_id}
```

---

## 9. Agent 智能体

前缀：`/api/agent`
**所有接口均无需登录**

### 9.1 获取告警列表

```
GET /api/agent/alerts
```
**响应**：当前设备故障监控告警列表

---

### 9.2 获取内置技能列表

```
GET /api/agent/skills
```
**响应**：Agent 可调用的内置技能配置列表

---

### 9.3 流式对话（SSE）

```
POST /api/agent/chat
```
**请求体**：
```json
{
  "messages": [
    { "role": "user", "content": "总装升降机 #1 液压系统泄漏怎么处理？" }
  ],
  "projectId": "proj_01ccfa6841df",
  "deviceContext": {
    "deviceId": "EQ-SJ-001",
    "deviceName": "总装升降机 #1",
    "productionLine": "总装一线",
    "faultType": "液压系统泄漏",
    "faultCode": "E-HYD-001",
    "severity": "HIGH",
    "description": "升降机液压缸密封圈破损，液压油渗漏，平台无法正常升降，产线已停线"
  },
  "digitalHumanType": "fault-repair"
}
```

**响应**：`text/event-stream`（SSE 流式）

SSE 事件类型：
| 事件类型 | 含义 |
|---------|------|
| `skill-load` | 正在加载技能 |
| `step-start` | 开始执行步骤 |
| `step-delta` | 步骤执行中（流式输出） |
| `step-end` | 步骤执行完成 |
| `reply-start` | 开始生成回复 |
| `reply-delta` | 回复内容流式输出 |
| `done` | 对话结束 |

---

### 9.4 生成工单

```
POST /api/agent/work-order
```
**请求体**：
```json
{
  "messages": [
    { "role": "user", "content": "总装升降机 #1 液压泄漏，需要生成维修工单" }
  ],
  "projectId": "proj_01ccfa6841df",
  "deviceContext": {
    "deviceId": "EQ-SJ-001",
    "deviceName": "总装升降机 #1",
    "productionLine": "总装一线",
    "faultType": "液压系统泄漏"
  }
}
```
**响应**：生成的工单内容（JSON 对象）

---

## 附录：公共错误码

| HTTP 状态码 | 含义 |
|------------|------|
| 400 | 请求参数错误 |
| 401 | 未登录或 Token 失效 |
| 403 | 账号已禁用 |
| 404 | 资源不存在 |
| 409 | 资源已存在（名称冲突等） |
| 501 | 功能未实现 |
| 204 | 操作成功（无返回体） |

所有错误响应体格式：
```json
{
  "detail": "错误说明文字"
}
```
