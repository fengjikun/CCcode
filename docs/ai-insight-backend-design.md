# AI洞察后端实现梳理与改造方案

更新时间：2026-03-06

## 1. 目标

本文档分两部分：

1. 梳理当前 `AI洞察` 后端真实实现（已上线逻辑）。
2. 给出目标改造方案：`xlsx内容解析 -> OpenAI模型抽取实体/关系 -> 严格字段校验 -> 入库`。

---

## 2. 当前实现梳理（现状）

### 2.1 接口入口

- 路由：`POST /api/projects/{project_id}/schema/ai-insight`
- 代码位置：`backend/app/routers/projects.py` 中 `run_ai_schema_insight`
- 调用服务：`project_mgmt_service.run_ai_schema_insight(...)`

### 2.2 服务主流程

当前 `run_ai_schema_insight` 逻辑（`backend/app/services/project_mgmt_service.py`）：

1. 校验项目归属与启用文档列表（至少 1 个 enabled 文档）。
2. 调用 `_collect_xlsx_insight_inputs(enabled_docs)`：
   - 仅处理 `xlsx` 文档；
   - 解析工作表、表头、数据行，推断实体模板/关系模板与示例实例。
3. 若 `xlsx` 未提取到实体模板：
   - 通过 `_pick_ai_entity_templates(doc_names)` 从内置 `AI_ENTITY_TEMPLATES` 选择；
   - 关系使用内置 `AI_RELATION_TEMPLATES`。
4. 调用 `_apply_schema_templates(...)` 将模板写入数据库（只新增，不覆盖同名）。
5. 返回统计：
   - `scanned_document_count`
   - `added_entity_count`
   - `added_relation_count`
   - `added_entity_names`
   - `added_relation_names`

### 2.3 xlsx 解析能力（现有）

当前已具备较完整的 xlsx 解析（Zip/XML 级）：

1. `_parse_xlsx_tables`：读取所有 sheet 行数据。
2. `_sheet_with_headers`：自动识别表头行并标准化。
3. `_parse_entity_schema_sheet`：识别“实体类型/属性”结构表。
4. `_parse_relation_schema_sheet`：识别“关系类型/domain/range/属性”结构表。
5. `_parse_data_sheet`：将普通数据表转为实体模板+候选关系（按外键列名模式匹配）。
6. `_build_xlsx_analysis`：汇总实体模板、关系模板、实例证据。

### 2.4 入库模型（现有）

当前洞察直接落以下表：

- `pm_entity_types`（实体类型）
- `pm_relation_types`（关系类型）
- `pm_schema_properties`（实体/关系属性，`owner_kind` 区分）

辅助：

- `pm_schema_configs.updated_at`
- `pm_projects.updated_at`

### 2.5 现状结论

当前 `AI洞察` 是“规则/模板驱动”，不是 LLM 抽取：

1. 没有调用 OpenAI API。
2. 没有 Prompt 版本化与模型输出审计。
3. 没有“模型输出字段级严格校验”的独立层。

---

## 3. 目标改造方案（xlsx + OpenAI + 校验 + 入库）

## 3.1 端到端流程

建议将 `run_ai_schema_insight` 改造为 6 个阶段：

1. **输入准备**
   - 获取 enabled 文档；
   - xlsx 解析为结构化上下文（sheet/header/sample rows）。
2. **提示词构建**
   - 组合项目上下文（已有实体/关系）+ 文档上下文 + 字段规范。
3. **LLM 调用**
   - 使用 OpenAI-compatible Responses API；
   - 强制 JSON 结构输出（优先 schema mode）。
4. **输出解析**
   - JSON parse；
   - Pydantic schema 反序列化。
5. **业务校验**
   - 字段长度、枚举、去重、domain/range 引用完整性校验。
6. **事务入库**
   - 先实体再关系再属性；
   - 成功 commit，失败 rollback；
   - 返回新增统计与校验警告。

---

## 4. 模型输出字段规范（必须）

建议定义 LLM 输出顶层对象 `AiInsightExtraction`：

```json
{
  "entities": [
    {
      "name": "FaultPhenomenon",
      "display_name": "故障现象",
      "description": "设备表现出的故障症状",
      "properties": [
        {
          "name": "symptom_desc",
          "display_name": "现象描述",
          "data_type": "TEXT",
          "required": true,
          "default_value": "",
          "description": "故障现象原文描述"
        }
      ],
      "evidence": [
        {
          "sheet": "现象表",
          "row": 12,
          "snippet": "主轴温度异常升高"
        }
      ],
      "confidence": 0.93
    }
  ],
  "relations": [
    {
      "name": "triggered_by",
      "display_name": "由报警触发",
      "description": "故障现象由报警码触发",
      "domain_entity_name": "FaultPhenomenon",
      "range_entity_name": "AlarmCode",
      "properties": [],
      "evidence": [
        {
          "sheet": "关系表",
          "row": 8,
          "snippet": "故障现象与报警码映射"
        }
      ],
      "confidence": 0.88
    }
  ],
  "warnings": [
    "某些表头语义不明确，已忽略低置信度候选"
  ]
}
```

### 4.1 字段硬约束

1. `name/display_name`：非空，最大长度 64。
2. `data_type`：仅允许 `STRING|INTEGER|FLOAT|BOOLEAN|DATE|DATETIME|JSON|TEXT`。
3. `confidence`：`0 <= confidence <= 1`。
4. `domain_entity_name/range_entity_name`：必须引用最终实体集合（本次提取 + 现有实体）。
5. `properties[].name` 在同一 owner 内唯一。
6. `evidence` 至少 1 条（无法提供时整项降级为 warning，不入库）。

---

## 5. Prompt 设计建议

## 5.1 Developer Prompt（约束）

建议固定模板（需版本化）：

1. 你是工业设备知识图谱建模助手。
2. 任务是从给定 xlsx 结构化内容提取“实体类型+关系类型”。
3. 只允许返回一个 JSON 对象，不要 Markdown，不要解释文本。
4. 所有字段必须符合提供的 JSON schema。
5. 关系的 `domain_entity_name/range_entity_name` 必须指向实体名。
6. 不确定项宁可不输出，放入 `warnings`。
7. 中文业务词可保留在 `display_name/description`，`name` 要规范化。

## 5.2 User Prompt（上下文）

拼接以下内容：

1. 项目名、业务域说明。
2. 已有实体/关系列表（避免重复）。
3. xlsx 解析摘要：
   - sheet 名；
   - header 列表；
   - 每个 sheet 采样行（限制行数避免 token 爆炸）。
4. 输出字段定义与示例。

---

## 6. 校验与清洗策略

建议新增独立校验层（不要直接信任模型）：

1. **语法层**：JSON 可解析。
2. **结构层**：Pydantic 模型校验。
3. **字段层**：
   - 字段长度截断（复用 `_safe_schema_name`）；
   - `data_type` 枚举校验；
   - 空字符串清洗为 `""`。
4. **语义层**：
   - 关系引用实体存在性；
   - 同名实体/关系去重；
   - 属性名冲突去重。
5. **规模控制**：
   - 限制单次最大实体数、关系数、属性数；
   - 超限项进入 warning，避免脏数据爆库。

---

## 7. 入库策略（事务化）

建议以“新增优先，不破坏人工配置”为原则：

1. 开启事务。
2. 加载现有 `entity_by_name` 与 relation key。
3. 新增实体类型（不存在才插入）。
4. 为新增实体写入属性（`pm_schema_properties`，`owner_kind=ENTITY`）。
5. 新增关系类型（domain/range 映射到 entity id）。
6. 为新增关系写属性（`owner_kind=RELATION`）。
7. 更新 `pm_schema_configs.updated_at` 与 `pm_projects.updated_at`。
8. commit；任意异常 rollback。

说明：

- 保留现有 `_apply_schema_templates` 的幂等风格。
- 不建议覆盖已有实体/关系描述与属性，避免误伤已人工维护的 schema。

---

## 8. 建议代码改造点

### 8.1 服务层

- 文件：`backend/app/services/project_mgmt_service.py`
- 改造：
  1. 新增 `_build_ai_insight_prompt(...)`
  2. 新增 `_call_ai_insight_model(...)`
  3. 新增 `_parse_and_validate_ai_output(...)`
  4. `run_ai_schema_insight(...)` 串联完整链路

### 8.2 Schema 层

- 文件：`backend/app/schemas/project_mgmt.py`
- 改造：
  1. 新增 LLM 输出模型（内部用）
  2. 可选扩展 `AiInsightResult`（增加 warnings/invalid_count 等字段）

### 8.3 配置层

- 复用现有环境变量：
  - `LLM_API_KEY`
  - `LLM_BASE_URL`
  - `LLM_MODEL`
- 与诊断模块保持一致的 OpenAI 客户端初始化方式。

### 8.4 可观测性（建议）

建议新增运行日志表（可选但推荐）：

- `pm_ai_insight_runs`
  - `id, project_id, model, prompt_version, status, error_message, created_at, completed_at`
  - `request_json, response_json, warnings_json, token_usage_json`

用途：问题追溯、Prompt 迭代、失败复盘。

---

## 9. 伪代码（目标实现）

```python
def run_ai_schema_insight(db, user_id, project_id):
    project = _ensure_project_owned(...)
    enabled_docs = _list_enabled_docs(...)
    if not enabled_docs:
        raise ValueError("请至少启用一个文档后再进行 AI 洞察")

    xlsx_ctx = _collect_xlsx_insight_inputs(enabled_docs)  # 保留现有解析能力
    prompt = _build_ai_insight_prompt(project, xlsx_ctx, existing_schema=_load_schema(project.id))
    raw_output = _call_ai_insight_model(prompt)
    extraction = _parse_and_validate_ai_output(raw_output, existing_schema=_load_schema(project.id))

    applied = _apply_schema_templates(
        db,
        project=project,
        entity_templates=extraction.entity_templates,
        relation_templates=extraction.relation_templates,
        now=_now(),
    )
    db.commit()

    return {
        "scanned_document_count": len(enabled_docs),
        "added_entity_count": len(applied["added_entity_names"]),
        "added_relation_count": len(applied["added_relation_names"]),
        "added_entity_names": applied["added_entity_names"],
        "added_relation_names": applied["added_relation_names"],
        "warnings": extraction.warnings,
    }
```

---

## 10. 验收标准

1. 上传 xlsx 并启用后，点击 AI洞察可触发模型调用。
2. 模型输出不符合 schema 时，接口返回可读错误且不入库。
3. 合法输出会正确写入 `pm_entity_types / pm_relation_types / pm_schema_properties`。
4. 同名实体/关系不会重复创建。
5. 非法关系（引用不存在实体）会被拦截并记录 warning。
6. 返回统计与前端展示一致（新增实体数、关系数）。

