# Skills Market Ontology Mapping Data Guide

## 1. 背景

Skills Hub 需要从“单条静态示例数据”升级为可持续迭代的混合市场：

- 一部分是由本体直接驱动的业务 Skill
- 一部分是跨行业复用的通用 Skill

当前项目已经在 `frontend/src/api/projectManagement.ts` 中维护了本体预设，因此这次改造将该文件视为 mock 数据的源头，再通过规则生成 Skills Market 默认数据。

## 2. 源数据结构

本体源字段来自 `ONTOLOGY_DEFS`，每条记录包含：

1. `code`
2. `name`
3. `industry`
4. `phase`
5. `triple`
6. `agentScene`
7. `trainingType`
8. `dataCount`

### 当前数量说明

产品口径通常称“108 个行业本体”，但代码源数据当前实际为：

- `108` 个行业本体
- `1` 个置顶故障诊断演示本体 `0.0.1`

因此当前生成逻辑覆盖的是 `109` 条源记录。后续如果产品口径必须严格维持 108，需要明确是否排除 `0.0.1` 演示本体。

## 3. 数据分层

当前 mock 数据分为四层：

### 3.1 本体目录层

文件：`frontend/src/mocks/skills/ontologyCatalog.ts`

职责：

- 从 `ONTOLOGY_DEFS` 读取源记录
- 转换为 Skills Market 可直接消费的标准结构

### 3.2 通用 Skill 模板层

文件：`frontend/src/mocks/skills/skillTemplates.ts`

职责：

- 定义稳定的跨行业通用能力模板
- 提供关键词、能力标签、覆盖等级、展示属性

当前模板覆盖：

- 文档解析
- 数据清洗
- 实体抽取
- 关系抽取
- 图谱合成
- 根因分析
- 报告生成
- 流程编排
- 告警通知
- 合规审查
- 风险评分
- 指标归因
- 知识问答
- 工单生成
- 数据校验
- 仿真规划
- 资源调度
- 推荐策略
- 知识检索
- 决策支持
- 影像报告
- 追溯链监控

### 3.3 业务 Skill 生成层

文件：`frontend/src/mocks/skills/skillGenerator.ts`

职责：

- 每个本体生成一个主业务 Skill
- 给每个本体再挂接 2 到 4 个通用 Skill
- 输出 market store、推荐区、行业覆盖和本体映射

### 3.4 API 持久化层

文件：`frontend/src/api/skillsMarket.ts`

职责：

- 用 mock store API 持久化默认数据
- 暴露 CRUD、导入和聚合接口

## 4. Skill 数据字段

保留字段：

- `id`
- `name`
- `displayName`
- `category`
- `status`
- `description`
- `instructions`
- `reference`
- `templates`
- `scripts`
- `dependencies`
- `tags`
- `installs`
- `author`
- `createdAt`
- `updatedAt`

新增字段：

- `marketType`
  - `business | general`
- `industry`
  - `manufacturing | retail | medical | transport | general`
- `phase`
- `featured`
- `recommendedScore`
- `usageCount`
- `successRate`
- `avgLatencyMs`
- `sourceOntologyCodes`
- `sourceOntologyNames`
- `recommendedFor`
- `capabilities`
- `coverageLevel`
  - `core | enhanced | optional`
- `recommendationReason`

## 5. 业务 Skill 生成规则

每个本体生成 1 个主业务 Skill。

### 输入

- 本体名称
- 行业
- 业务阶段
- Agent 场景
- 训练类型
- 三元组示例
- 数据量

### 输出规则

1. `displayName`
   - `${本体名称}专家技能`
2. `marketType`
   - 固定为 `business`
3. `sourceOntologyCodes`
   - 当前本体编码
4. `sourceOntologyNames`
   - 当前本体名称
5. `recommendedFor`
   - 当前 Agent 场景
6. `capabilities`
   - 根据关键字推断
7. `recommendationReason`
   - 说明该 Skill 为什么适合当前本体

### 能力推断示例

- 包含“故障 / 诊断 / 根因”
  - `根因分析`
  - `处置建议`
- 包含“合同 / 合规 / 法规 / 政策”
  - `合规审查`
  - `规则校验`
- 包含“调度 / 排程 / 补货 / 排班”
  - `流程编排`
  - `资源调度`
- 包含“图谱 / 知识 / 语义 / 本体”
  - `知识检索`
  - `图谱融合`

## 6. 通用 Skill 挂接规则

每个本体额外挂接 2 到 4 个通用 Skill。

通用 Skill 的选择由两部分组成：

1. 训练类型基础映射
2. 文本关键词打分

### 训练类型基础映射

- `分析类`
  - 数据清洗
  - 根因分析
  - 报告生成
- `执行类`
  - 流程编排
  - 告警通知
  - 工单生成
- `决策类`
  - 决策支持
  - 指标归因
  - 风险评分
- `治理类`
  - 合规审查
  - 数据校验
  - 文档解析

### 关键词加权规则

在 `name + phase + agentScene + trainingType + triple` 拼成的文本上做匹配：

- 命中模板关键词：`+3`
- 模板行业匹配：`+2`
- 模板无行业限制：`+1`
- 模板阶段匹配：`+2`
- 命中训练类型基础映射：`+4`

按得分排序后，补足到 2 到 4 个通用 Skill。

## 7. 推荐分数规则

### 业务 Skill

业务 Skill 推荐分数综合：

- 数据量档位
- 本体重要性
- 稳定哈希扰动

### 通用 Skill

通用 Skill 推荐分数综合：

- 模板权重
- 覆盖本体数量

这样可以保证：

- 演示排序稳定
- 每次刷新不随机跳动

## 8. 示例

### 示例 A：制造业

本体：`故障诊断本体`

主业务 Skill：

- `故障诊断本体专家技能`

典型通用 Skill：

- `根因分析助手`
- `图谱合成工坊`
- `工单生成器`

推荐原因：

- 本体链路天然包含故障、原因、方案，适合诊断和处置型能力组合

### 示例 B：零售业

本体：`合同约束本体`

主业务 Skill：

- `合同约束本体专家技能`

典型通用 Skill：

- `文档解析协同器`
- `合规审查守卫`
- `数据校验哨兵`

推荐原因：

- 合同条款具备明显文档解析和规则审查特征

### 示例 C：通用业务

本体：`法律法规库本体`

主业务 Skill：

- `法律法规库本体专家技能`

典型通用 Skill：

- `合规审查守卫`
- `知识检索层`
- `报告生成工坊`

推荐原因：

- 法规解释与审查需要检索、比对和汇报能力组合

## 9. 页面消费方式

页面 `frontend/src/pages/platform/SkillsMarketPage.tsx` 当前按以下方式消费：

1. 顶部统计
2. 推荐 Skill 卡片
3. 统一筛选栏
4. 管理表格
5. 详情弹窗

统一筛选项包括：

- 市场类型
- 行业
- 分类
- 业务阶段
- 覆盖等级
- 文本搜索

## 10. 迭代策略

后续新增或调整数据时，优先改规则和模板，不直接手改大批 Skill 记录。

建议顺序：

1. 先改 `skillTemplates.ts`
2. 再改 `skillGenerator.ts`
3. 如果源本体变化，再改 `ONTOLOGY_DEFS`

## 11. 接真实后端时的迁移建议

未来如果 Skills Market 走真实后端，建议拆成三类表或接口：

1. `skill_catalog`
   - Skill 基础定义
2. `ontology_skill_mapping`
   - 本体与 Skill 的映射关系
3. `skill_recommendation_stats`
   - 调用量、成功率、推荐分、行业覆盖等聚合指标

前端届时只需要保留：

- 筛选逻辑
- 推荐区展示逻辑
- 详情页展示逻辑

不再负责生成默认 market store。
