# 本体文档抽取 MVP 实现方案

更新时间：2026-03-05

## 1. 背景与目标

当前系统已支持手工维护实体与关系。下一步目标是支持用户上传 Word/MD 文档，借助大模型自动抽取实体和关系，并在可配置本体约束下完成对齐与入库。

MVP 原则：

- 先跑通端到端流程，优先可用性和可追溯性。
- 存储先采用内存 + JSON 文件，不引入重型数据库迁移成本。
- 抽取结果必须经过本体约束校验，避免“自由生成”污染知识库。

## 2. 范围定义

### 2.1 MVP 范围（In）

- 文档上传：`.docx`、`.md`
- 文本切分：按标题和长度分块
- 两阶段抽取：
  - 实体抽取（受本体类型约束）
  - 关系抽取（受关系类型和 domain/range 约束）
- 本体对齐：
  - 已有实体候选召回
  - LLM 在候选中选择“复用”或“新建”
- 审核机制：
  - 高置信自动入库
  - 中低置信进入人工审核
- 存储：
  - 运行态内存索引
  - `snapshot.json` + `events.jsonl` 持久化

### 2.2 非目标（Out）

- 暂不做复杂工作流编排（如消息队列、分布式任务）
- 暂不做跨文档全局向量检索平台化能力
- 暂不引入 PostgreSQL/Neo4j 生产级部署

## 3. 总体架构

```
前端(上传+本体配置+审核)
        |
        v
FastAPI Router
  ├─ 文档解析服务 (docx/md -> chunk)
  ├─ LLM抽取服务 (实体/关系，结构化输出)
  ├─ 本体对齐服务 (候选召回 + LLM决策 + 规则校验)
  ├─ 审核服务 (pending/approved/rejected)
  └─ 存储仓储层 (MemoryRepository + JsonPersistence)
        |
        v
data/ontology_mvp/
  ├─ snapshot.json
  └─ events.jsonl
```

## 4. 处理流程设计

1. 用户上传文档并选择本体版本 `ontology_version`
2. 系统解析文档并切分 chunk（保留 `source_doc_id/chunk_id`）
3. 对每个 chunk 调用 LLM 执行实体抽取（严格 JSON Schema）
4. 对每个 chunk 调用 LLM 执行关系抽取（仅允许配置关系类型）
5. 候选召回并对齐（名称归一化 + 别名匹配 + LLM 选已有/新建）
6. 执行约束校验（类型合法、关系 domain/range 合法）
7. 根据置信度分流：
   - `>= 0.85` 且无冲突：自动入库
   - `< 0.85` 或有冲突：进入审核队列
8. 审核操作写入事件日志并更新内存状态
9. 定时或每 N 次写入生成快照

## 5. 可配置本体模型

用户可配置以下内容：

- 实体类型（`entity_types`）
- 关系类型（`relation_types`）
- 关系约束（`domain`、`range`）
- 实体属性定义（可选）
- 类型同义词、实体别名规则

示例：

```json
{
  "ontology_version": "v1",
  "entity_types": [
    {"name": "Person", "required_attrs": ["name"]},
    {"name": "Org", "required_attrs": ["name"]},
    {"name": "Project", "required_attrs": ["name"]}
  ],
  "relation_types": [
    {"name": "works_for", "domain": "Person", "range": "Org"},
    {"name": "participates_in", "domain": "Person", "range": "Project"}
  ],
  "type_aliases": {
    "Org": ["Company", "企业"]
  }
}
```

## 6. LLM 抽取与对齐设计

### 6.1 调用方式

- 统一走后端 `LLMClient` 抽象，不在业务层直接写供应商 SDK
- 优先使用函数调用或 JSON Schema 输出
- 失败重试 2 次（指数退避）

### 6.2 实体抽取输出契约

```json
{
  "entities": [
    {
      "mention": "张三",
      "type": "Person",
      "attributes": {"name": "张三"},
      "evidence": "张三负责A项目交付",
      "confidence": 0.92
    }
  ]
}
```

约束：

- `type` 必须来自 `entity_types`
- `confidence` 必须是 `[0,1]`
- 必须提供 `evidence`

### 6.3 关系抽取输出契约

```json
{
  "relations": [
    {
      "type": "works_for",
      "head_mention": "张三",
      "tail_mention": "华星科技",
      "evidence": "张三目前任职于华星科技",
      "confidence": 0.88
    }
  ]
}
```

约束：

- `type` 必须来自 `relation_types`
- 关系必须能映射到 chunk 内实体 mention

### 6.4 本体对齐策略

先规则，后 LLM：

1. 规则召回候选：
   - 精确名匹配
   - 归一化匹配（大小写、空白、标点）
   - 别名匹配
2. 若候选 > 1，调用 LLM 判定最优候选或新建实体
3. 执行硬约束校验：
   - 实体类型存在
   - 关系类型存在
   - 关系 `head.type` 符合 domain，`tail.type` 符合 range

## 7. 存储方案（内存 + JSON）

目录：

```
backend/data/ontology_mvp/
  snapshot.json
  events.jsonl
```

运行模型：

- `InMemoryState` 作为读写主状态
- 每次写操作追加 `events.jsonl`
- 每 50 次事件或每 60 秒生成 `snapshot.json`
- 启动恢复：先读 snapshot，再回放 events

核心字段建议：

```json
{
  "entities": [
    {
      "id": "E_001",
      "type": "Person",
      "name": "张三",
      "aliases": [],
      "source_refs": ["doc_1#chunk_3"]
    }
  ],
  "relations": [
    {
      "id": "R_001",
      "type": "works_for",
      "head_id": "E_001",
      "tail_id": "E_002",
      "evidence": "张三目前任职于华星科技",
      "confidence": 0.88,
      "status": "pending"
    }
  ]
}
```

写文件安全策略：

- 进程内写锁（`asyncio.Lock`）
- `tmp` 文件写入完成后 `os.replace` 原子替换

## 8. API 设计（MVP）

建议新增路由前缀：`/api/ontology-mvp`

- `POST /configs`
  - 新建/更新本体配置版本
- `GET /configs/{version}`
  - 获取配置详情
- `POST /documents/upload`
  - 上传 docx/md，返回 `doc_id`
- `POST /extractions/run`
  - 入参：`doc_id`, `ontology_version`
  - 返回：`job_id`
- `GET /extractions/{job_id}`
  - 查询任务状态和统计
- `GET /reviews`
  - 查询待审核实体/关系
- `POST /reviews/{item_id}/approve`
  - 审核通过并入库
- `POST /reviews/{item_id}/reject`
  - 审核驳回并记录原因
- `GET /graph/export`
  - 导出当前实体关系图（JSON）

## 9. 与现有后端代码的对接建议

基于当前 `backend/app/routers` + `services` 结构，新增：

- `backend/app/routers/ontology_mvp.py`
- `backend/app/services/doc_ingest_service.py`
- `backend/app/services/llm_extract_service.py`
- `backend/app/services/ontology_align_service.py`
- `backend/app/services/review_service.py`
- `backend/app/services/repository_mvp.py`
- `backend/app/schemas/ontology_mvp.py`

在 `main.py` 注册新 router，避免破坏现有本体模块接口。

## 10. 前端最小改造建议

新增一个“MVP 抽取”页面或在现有本体页增加 Tab：

- 本体版本选择
- 文档上传（docx/md）
- 抽取任务状态（进行中/完成/失败）
- 待审核列表（证据片段 + 一键通过/驳回）

## 11. 里程碑计划

### 第 1 阶段（1-2 天）

- 完成本体配置 API
- 完成内存仓储 + JSON 持久化（快照/事件）
- 打通上传与文档解析

### 第 2 阶段（2-3 天）

- 完成 LLM 实体抽取和关系抽取
- 完成对齐与约束校验
- 完成任务状态查询接口

### 第 3 阶段（1-2 天）

- 完成审核 API 与前端最小页面
- 完成端到端联调和错误处理
- 完成示例数据验收

## 12. 验收标准

- 能上传 `.docx/.md` 并触发抽取任务
- 抽取结果中类型与关系均受本体配置约束
- 每条关系可追溯到 `source_doc_id/chunk_id/evidence`
- 低置信和冲突数据可在审核页处理
- 重启服务后数据可从 JSON 文件恢复

## 13. 风险与应对

- 风险：LLM 输出不稳定  
  应对：严格 schema 校验 + 重试 + 无效结果降级为待审核

- 风险：同名实体误合并  
  应对：候选召回后增加类型和上下文约束，默认保守新建并待审核

- 风险：JSON 文件损坏  
  应对：原子写 + 事件日志回放 + 启动完整性检查

## 14. 后续升级路径

MVP 验证通过后，可平滑替换 `Repository` 实现：

- `JsonRepository -> PostgresRepository`
- `JsonGraphExport -> Neo4jRepository`

保持上层 Service 与 API 不变，降低迁移成本。
