# 本体 Schema 模式参考

本文档从两个真实业务场景中提取了本体建模的标准模式，作为生成新本体时的参考基准。

## 目录

1. [场景一：设备预防性维护本体](#场景一设备预防性维护本体)
2. [场景二：故障诊断与纠正措施本体](#场景二故障诊断与纠正措施本体)
3. [通用建模模式总结](#通用建模模式总结)

---

## 场景一：设备预防性维护本体

### 业务背景
工业制造环境中的升降机设备管理，涵盖设备结构管理、定期检查、维修执行和故障诊断四大业务链路。

### 实体定义模式

| 实体类型 | 英文名 | 描述 | 核心属性 |
|---------|--------|------|---------|
| 设备 | Equipment | 业务管理的核心对象 | equipment_id, name, workshop, location, status |
| 部件 | Component | 设备的一级/二级结构 | component_id, name, description, parent_equipment_id |
| 子部件 | SubComponent | 部件内部的零件 | subcomponent_id, name, is_wear_part, parent_component_id |
| 检查项 | InspectionItem | 针对部件的检查项目 | inspection_id, name, cycle_days, target_component_id, is_critical |
| 检查方法 | InspectionMethod | 执行检查的具体方法 | method_id, method_type, description |
| 检查标准 | InspectionStandard | 检查的判定依据 | standard_id, standard_value, unit, tolerance |
| 维修程序 | MaintenanceProcedure | 维修步骤与要求 | procedure_id, title, safety_measures, steps, estimated_duration_min, urgency_level |
| 失效模式 | FailureMode | 可能的失效类型 | failure_mode_id, name, description |
| 故障现象 | Symptom | 可观测的故障症状 | symptom_id, name, description |
| 工具 | Tool | 维修所需工具 | tool_id, name, category, function, applicable_process, specification |

### 关系定义模式

| 关系名称 | 起点 → 终点 | 关系属性 | 描述 |
|---------|------------|---------|------|
| 设备结构关系 | Equipment → Component | relationship_type, hierarchy_level, installation_date | 设备与部件的组成关系 |
| 部件结构关系 | Component → SubComponent | relationship_type, hierarchy_level, quantity_per_unit | 部件与子部件的组成关系 |
| 设备归属关系 | Equipment → Workshop/Line | since_date, location_detail | 设备与车间的归属 |
| 检查关联关系 | Component/SubComponent → InspectionItem | is_critical, inspection_frequency_days | 部件与检查项关联 |
| 检查方法关系 | InspectionItem → InspectionMethod | method_applicability, required_tools | 检查项与方法关联 |
| 检查标准关系 | InspectionMethod → InspectionStandard | standard_source, effective_date | 方法与标准关联 |
| 维修触发关系 | InspectionItem → MaintenanceProcedure | urgency_level, trigger_condition | 检查触发维修 |
| 工具需求关系 | MaintenanceProcedure → Tool | tool_quantity, is_special_tool, is_mandatory | 维修需要工具 |
| 故障表现关系 | Equipment → Symptom | first_observed, occurrence_frequency, environmental_notes | 设备出现故障现象 |
| 失效因果关系 | Symptom → FailureMode | confidence, causality_type | 现象与失效的因果推断 |
| 失效表现关系 | Component → FailureMode | probability, severity, detection_difficulty | 部件的失效模式 |
| 子部件失效关系 | SubComponent → FailureMode | failure_rate, mtbf_hours, is_wear_out | 零件的可靠性数据 |
| 失效维修关系 | FailureMode → MaintenanceProcedure | applicability, repair_priority, is_standard_procedure | 失效对应维修 |

### 业务链路

1. **设备结构管理链路**: Equipment → Component → SubComponent
2. **设备定检链路**: Component/SubComponent → InspectionItem → InspectionMethod → InspectionStandard
3. **维修执行链路**: InspectionItem → MaintenanceProcedure ← FailureMode; MaintenanceProcedure → Tool
4. **故障诊断链路**: Equipment → Symptom → FailureMode → Component/SubComponent

---

## 场景二：故障诊断与纠正措施本体

### 业务背景
工业设备故障处理的全生命周期管理，基于8D方法论，涵盖故障诊断、临时修复、根本解决、措施有效性评估等链路。

### 实体定义模式

| 实体类型 | 英文名 | 描述 | 核心属性 |
|---------|--------|------|---------|
| 故障模式 | FailureMode | 标准化故障分类 | failure_code, name, category, severity, frequency |
| 故障现象 | FaultPhenomenon | 故障具体表现 | phenomenon_id, description, detection_method, occurrence_condition |
| 故障原因 | RootCause | 根本原因分析 | cause_id, cause_level(1-5), cause_description, is_root_cause |
| 部件 | Component | 设备组成部件 | component_id, name, component_type, manufacturer, specification |
| 设备 | Equipment | 设备主体 | equipment_id, name, line, station, status |
| 临时措施 | ICA | 临时处理措施 | ica_id, description, execution_time, required_tools, effectiveness_evaluation, evaluation_method |
| 永久措施 | PCA | 长期改进措施 | pca_id, description, responsibility, due_date, pca_type, effectiveness_evaluation, evaluation_method |
| 维修方案 | MaintenanceProcedure | 作业指导方案 | procedure_id, name, steps, applicable_equipment |
| 维修工单 | WorkOrder | 故障维修记录 | workorder_id, downtime, report_time, complete_time, technician |
| 技术文档 | Document | 参考技术文档 | doc_id, doc_name, doc_type, version |
| 设备层级结构 | LineStructure | 设备层级 | name, station_name, equipment_name, component_name |

### 关系定义模式

| 关系名称 | 英文名 | 起点 → 终点 | 关系属性 |
|---------|--------|------------|---------|
| 表现为 | manifests_as | FailureMode → FaultPhenomenon | typicality, probability |
| 由...引起 | caused_by | FaultPhenomenon → RootCause | causal_strength, why_level |
| 涉及 | involves | FailureMode → Component | impact_level, is_critical |
| 发生于 | occurs_in | FailureMode → Equipment | occurrence_count, last_occurrence |
| 有临时措施 | has_ica | FailureMode → ICA | priority, time_limit |
| 有永久措施 | has_pca | FailureMode → PCA | implementation_status, effectiveness |
| 参考方案 | references_procedure | ICA/PCA → MaintenanceProcedure | reference_section, mandatory |
| 记录于 | recorded_in | FailureMode → WorkOrder | downtime_impact, cost_impact |
| 参考文档 | references_doc | MaintenanceProcedure → Document | section, relevance |
| 由...组成 | consists_of | Equipment → Component | installation_date, quantity |
| 属于 | belongs_to | Equipment → LineStructure | location_code, hierarchy_level |
| 部件属于 | belongs_to_component | Component → Equipment | part_position, hierarchy_level |
| 触发 | triggers | FaultPhenomenon → WorkOrder | severity_level, response_time |
| 通过...分析 | analyzed_by | RootCause → AnalysisMethod | analysis_method, analyst |
| 发生频率 | has_frequency | FailureMode → LineStructure | frequency_rate, trend |
| 解决现象 | solves_phenomenon | ICA → FaultPhenomenon | is_solved, resolution_rate, verification_result |
| 临时修复 | temporarily_fixes | ICA → FailureMode | is_effective, effect_duration |
| 永久消除 | permanently_eliminates | PCA → FailureMode | is_eliminated, elimination_date |
| 处理原因 | addresses_cause | PCA → RootCause | is_resolved, prevention_effect |
| 由...验证 | validated_by | ICA/PCA → Personnel | validator, validation_date, validation_method |
| 记录效果 | records_effect | WorkOrder → ICA/PCA | problem_status_after, work_result, customer_feedback |

### 业务链路

1. **故障诊断链路**: FaultPhenomenon → FailureMode → Component/Equipment
2. **临时修复链路**: FailureMode → ICA → MaintenanceProcedure → Document
3. **根本解决链路**: FailureMode → PCA → RootCause ← FaultPhenomenon
4. **措施有效性评估链路**:
   - 现象解决评估: ICA →[solves_phenomenon]→ FaultPhenomenon
   - 故障修复评估: ICA →[temporarily_fixes]→ FailureMode; PCA →[permanently_eliminates]→ FailureMode
   - 原因处理评估: PCA →[addresses_cause]→ RootCause
5. **措施效果反馈链路**: WorkOrder →[records_effect]→ ICA/PCA
6. **措施优化链路**: 有效性评估结果 → 优化 ICA/PCA 属性 → 更新 MaintenanceProcedure

---

## 通用建模模式总结

### 模式一：层级结构模式
当业务对象存在"整体-部分"关系时使用。
```
顶层对象 →[contains/consists_of]→ 中间层 →[contains]→ 底层对象
```
关键属性：hierarchy_level（层级编号）、relationship_type（contains/belongsTo）
示例：Equipment → Component → SubComponent

### 模式二：检查/审计链模式
当需要对对象执行检查并依据标准判定时使用。
```
被检对象 →[has_inspection]→ 检查项 →[uses_method]→ 方法 →[follows]→ 标准
```
关键属性：is_critical、cycle_days、method_type、standard_value、tolerance

### 模式三：故障诊断链模式
当需要从现象推导原因时使用。
```
设备 →[shows]→ 现象/症状 →[caused_by]→ 原因/失效模式 →[involves]→ 部件
```
关键属性：confidence、causality_type、severity、detection_difficulty

### 模式四：纠正措施闭环模式
当需要管理故障修复的完整生命周期时使用。
```
故障 →[has_ica]→ 临时措施 →[solves]→ 现象
故障 →[has_pca]→ 永久措施 →[addresses]→ 根因
措施 →[validated_by]→ 验证人员
工单 →[records_effect]→ 措施
```
关键属性：effectiveness_evaluation、implementation_status、is_eliminated

### 模式五：文档/工具引用模式
当操作需要引用外部资源时使用。
```
操作程序 →[references]→ 文档
操作程序 →[requires]→ 工具
```
关键属性：section、relevance、is_mandatory、quantity

### 属性设计通用模式

**ID 属性**：每个实体必须有，命名 `<entity>_id`，不可为空。

**状态属性**：使用枚举值，如 `active/inactive`、`high/medium/low`、`pending/in_progress/completed`。

**时间属性**：`_date` 后缀用于日期，`_time` 后缀用于时间戳。

**布尔属性**：`is_` 前缀，默认值为 `True` 或 `False`。

**度量属性**：附带 `unit`（单位）属性或在描述中注明单位。

**枚举属性**：在属性描述中用括号列出所有可能值，格式：`值说明（value1:中文说明/value2:中文说明）`

### xlsx 文件结构规范

生成的 Excel 文件应包含三个 Sheet：

**Sheet 1: 实体与属性定义**
| 列 | 说明 |
|----|------|
| 实体类型名称 | PascalCase英文名（中文名） — 同一实体的多行属性中，只在首行填写 |
| 描述 | 实体的业务含义 — 只在首行填写 |
| 属性名称 | snake_case |
| 是否可为空 | 是/否 |
| 默认值 | 具体值或 `-` 表示无默认值 |
| 属性描述 | 含义说明，枚举值列表 |

**Sheet 2: 关系与属性定义**
| 列 | 说明 |
|----|------|
| 关系类型名称 | 中文名称 |
| 关系描述 | 关系的业务含义 — 只在首行填写 |
| 起点实体 | PascalCase英文名（中文名） |
| 终点实体 | PascalCase英文名（中文名） |
| 关系属性名称 | snake_case |
| 是否可为空 | 是/否 |
| 默认值 | 具体值或 `-` |
| 属性描述 | 含义说明 |

**Sheet 3: 实体关系图**
- 文字描述的业务链路图
- 格式：`一、X链路\n核心路径：A → B → C`
- 包含关系符号说明：`||--o{：一对多关系` `||--||：一对一关系`
