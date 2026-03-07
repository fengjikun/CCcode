# 本体属性与数据源映射设计文档

**日期**: 2026-03-07  
**功能**: 实体属性来源映射 + 数据源映射 Map 配置

---

## 目标与边界

- 仅支持**实体属性**映射，关系属性不在本次范围。
- 映射信息由属性侧保存: `dataSourceId/sourceTable/sourceColumn`。
- 表列来源由数据源集中维护: `mappingMap`。
- 不做实时库探测，使用配置驱动下拉选项。

---

## 方案结论

采用“**数据源维护 mappingMap + 实体属性绑定来源**”方案。

### 方案对比

| 方案 | 描述 | 结论 |
|---|---|---|
| A | 前端临时维护映射，不入库 | 不可持久化，不采用 |
| B | 数据源中维护 `mappingMap`，实体属性存来源 | 推荐，满足需求 |
| C | 新建独立映射表 | 复杂度过高，暂不采用 |

---

## 数据模型设计

### 1. 数据源映射 Map

在 `pm_project_data_sources` 新增字段:

```python
mapping_map_json = Column(Text)  # {"table_name": ["column_a", "column_b"]}
```

语义:
- key: 表名
- value: 该表可选列名数组

### 2. 实体属性来源

在 `pm_schema_properties` 新增字段:

```python
data_source_id = Column(String, nullable=True)
source_table = Column(String(128), nullable=True)
source_column = Column(String(128), nullable=True)
```

---

## 后端设计

### 1. Schema 与 API

- `DataSourceUpsertRequest` / `ProjectDataSource` 新增:
  - `mapping_map: dict[str, list[str]] = Field(default_factory=dict)`
- `SchemaProperty` / `SchemaPropertyUpsert` 新增:
  - `data_source_id: Optional[str]`
  - `source_table: Optional[str]`
  - `source_column: Optional[str]`

### 2. 校验规则

#### 数据源 `mapping_map`
- 必须是对象。
- 表名不能为空。
- 列名必须是非空字符串数组。

#### 实体属性来源映射
- 三字段要么全空，要么同时有值。
- `data_source_id` 必须属于当前项目数据源。
- `source_table` 必须存在于该数据源 `mapping_map`。
- `source_column` 必须在 `mapping_map[source_table]` 中。

### 3. 服务层处理

- 数据源创建/更新:
  - 归一化并持久化 `mapping_map_json`
  - 响应返回 `mapping_map`
- 实体类型创建/更新:
  - 在属性归一化与持久化链路中透传来源字段
  - 入库前执行映射合法性校验
- 关系类型创建/更新:
  - 不处理来源映射字段

---

## 前端设计

### 1. 数据源配置页（新增/编辑数据源）

文件: `frontend/src/pages/workspace/modals/DataSourceModal.tsx`

- 增加“映射 Map”配置区:
  - 多行配置: `表名 + 列名数组(tags)`
  - 支持新增/删除行
- 提交 payload 增加 `mappingMap`

### 2. 实体属性编辑

文件: `frontend/src/pages/workspace/modals/SchemaFormModal.tsx`

- 仅在实体模式属性卡显示 3 个下拉:
  - 数据源
  - 来源表（来自所选数据源 `mappingMap` keys）
  - 来源列（来自 `mappingMap[selectedTable]`）
- 联动行为:
  - 更换数据源时清空表和列
  - 更换表时清空列

### 3. Schema 展示

文件: `frontend/src/pages/workspace/tabs/SchemaTab.tsx`

- 在实体属性节点追加映射标签:
  - `数据源名 · sourceTable.sourceColumn`
- 无映射时不展示。

---

## 错误处理

- `mapping_map` 结构非法: 400
- 属性来源只填部分字段: 400
- 引用不存在数据源/表/列: 400
- 保持前端提示 + 后端兜底双重校验

---

## 数据流

```text
数据源编辑(DataSourceModal)
  -> 配置 mappingMap(table -> columns[])
  -> 存储 pm_project_data_sources.mapping_map_json

实体属性编辑(SchemaFormModal)
  -> 选择 dataSourceId/sourceTable/sourceColumn
  -> 存储 pm_schema_properties 对应字段

项目详情(ProjectDetail)
  -> 返回 dataSources[].mappingMap
  -> 返回 entity.properties[].dataSourceId/sourceTable/sourceColumn
  -> SchemaTab 展示映射标签
```

---

## 变更文件清单

- `backend/app/models/project_mgmt.py`
- `backend/app/schemas/project_mgmt.py`
- `backend/app/services/project_mgmt_service.py`
- `backend/alembic/versions/<new_revision>_add_datasource_mapping_and_property_source_fields.py`
- `frontend/src/types/projectMvp.ts`
- `frontend/src/api/projectManagement.ts`
- `frontend/src/pages/workspace/modals/DataSourceModal.tsx`
- `frontend/src/pages/workspace/modals/SchemaFormModal.tsx`
- `frontend/src/pages/workspace/tabs/SchemaTab.tsx`

---

## 约束与后续

- 本次不引入实时数据库元数据探测。
- 本次不覆盖关系属性映射。
- 后续可在 `mappingMap` 基础上扩展自动探测与刷新。
