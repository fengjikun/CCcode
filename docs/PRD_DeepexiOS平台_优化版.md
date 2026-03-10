# DeepexiOS V2.0 — 产品需求文档（PRD）

*Intelligent Business Operating Platform — Product Requirements Document*

---

| 字段 | 内容 |
|------|------|
| **文档类型** | 产品需求文档 (PRD) |
| **产品版本** | v1.0 |
| **目标受众** | 产品经理 / 架构师 / 开发团队 / 实施团队 |
| **版本日期** | 2025年3月 |
| **参考原型** | Palantir Foundry五级流水线架构 + AIP Agent |

---

## 一、背景与目标

### 1.1 产品背景

概述：包含了数据融合平台（含数据源、数据处理、本体管理）、deepexi大模型训练及管理，智能体与Skills的开发与管理，智能应用的数字员工；
产品流程：
一）基于本体的智能场景创建流程：
1、接入数据源（结构化、非结构化数据）->数据转换->本体定义->本体结合数据生成本体实例（知识图谱）->Skllis生成->skills广场->多智能体编排及skill调用->发布智能体为数字员工；
操作流程注：
1、数据源页面（可操作：结构化和非结构数据添加）
2、数据转换（静态datapipeline）
3、 **本体定义->本体结合数据生成本体实例（知识图谱）->SKLLIS生成（Function）**保持原流程操作不变；
4、Skills广场(可操作：注册Skills功能)
5、多智能体编排（静态界面？）
6、数字员工（可操作：保持原流程不变）

二）训练本体意识的大模型流程：
1、训练数据准备（本体schema数据、知识图谱数据）；2、模型训练；3、训练监控；4、模型评估；5、模型发布
操作流程注：
1、训练数据集（静态页面）
2、训练大模型流程（静态页面）

### 1.2 产品目标

- 构建以 Ontology 为中心的统一语义层，消除数据孤岛，实现跨团队数据复用
- 提供从数据接入到智能体部署的端到端流水线，每个阶段有明确输入/输出边界
- 支持模型全生命周期管理（训练 → 评估 → 注册 → 服务化 → 监控）
- 实现 AI Agent 与业务操作的深度集成，支持自然语言驱动的业务流程
- 全链路权限控制、审计追踪和版本管理

### 1.3 用户角色

| 角色 | 职责 | 主要使用模块 |
|------|------|-------------|
| 数据源开发者 | 配置数据连接、清洗原始数据、定义同步频率 | Datasource Project |
| 数据工程师 | 构建转换管道、定义语义层 | Transform + Ontology Project |
| 模型开发者 | 训练/评估/注册模型 | Model Training Project |
| 平台管理员 | 管理模型网关、路由策略、安全策略 | Model Gateway |
| 智能体开发者 | 设计 Agent Prompt、绑定工具、配置工作流 | Agent Studio |
| 应用开发者 | 构建仪表盘和操作应用 | Workflow Project |
| 业务用户 | 使用应用和 Agent 完成业务操作 | Workflow + Agent |

---

## 二、总体架构

### 2.1 流水线全景

平台的核心功能，数据从左到右单向流动，每一级通过 `/output` 接口暴露给下游。

| 序号 | 流水线级别 | 英文名称 | 核心职责 | 典型输出 |
|------|-----------|---------|---------|---------|
| L1 | 数据源接入 | Datasource | 原始数据同步、清洗、标准化 | 清洗后数据集 |
| L2 | 数据转换 | Transform | 跨源关联、聚合、规范化 | 规范数据集 |
| L3 | 本体语义层 | Ontology | 对象/属性/链接/Action定义/Function | Object Types + Actions |
| L4 | workspace 工作台 | Studio | Agent设计、Skills注册与管理、工具绑定、编排、部署 | AI Agent服务 |
| L5 | 模型训练 | Model Training | 数据准备、训练、评估、注册 | 已注册模型 |
| L6 | 模型网关 | Model Gateway | 统一推理入口、路由、限流、监控 | 模型服务API |
| L7 | 数字员工应用 | Workflow | 业务数字员工空间、DIC数字员工空间、事件流、用户交互 | 业务应用 |
### 2.2 架构分层约束

- **单向依赖**：数据从 L1→L8 单向流动，禁止循环依赖（Ontology Writeback 除外）
- **接口约束**：每个 Project 仅通过 `/output` 文件夹暴露数据集给下游
- **权限隔离**：Project 为主要安全边界，不同团队通过角色控制访问
- **1:1原则**：每个 Project 对应一个 Code Repository，保持范围紧凑
- **环境分离**：Dev / Staging / Prod 三环境通过 Branch 管理，发布经审批流

### 2.3 产品目录结构全景

以下为平台在一个 Space 下的完整目录树布局。目录按照 **数据流水线自上而下** 的顺序组织（L1→L7），符合用户从"数据接入→语义建模→能力构建→应用交付"的操作动线。每个 `[Project]` 是独立的权限边界，内部文件夹通过 `/output` 对外暴露标准化接口。

```
DeepexiOS v2.0
│
├─ 🏠 总览（Overview）
│   ├── 流水线全景                  # 端到端数据流水线可视化
│   └── 平台健康度监控              # 各层级运行状态、告警汇总
│
│
├─ 📥 数据源（Datasource）                               ← L1 数据源接入
│   ├── 结构化数据源                # 数据库、API、ERP 等
│   ├── 非结构化数据源              # 文档、图片、日志等
│   └── 数据源监控                  # 同步状态、数据质量概览
│
├─ 🔄 数据转换（Transform）                              ← L2 数据转换
│   ├── 转换管道                    # Pipeline 列表与执行状态
│   ├── 数据集管理                  # 中间结果与输出数据集
│   └── 数据质量报告                # 数据校验与质量评分
│
│
├─ 🧬 本体中心（Ontology）                               ← L3 本体语义层
│   ├── 本体概览                    # 实体/关系统计、覆盖度仪表盘
│   ├── 本体管理              
│   │    ├── 本体定义                    # 实体类型、关系类型、属性定义
│   │    ├── 本体实例（知识图谱）         # 图谱浏览、搜索、可视化
│   │    └── Action & Function          # 业务操作与函数注册
│   └── 图谱检索
│
│
├─ 🧠 模型中心（Model Hub）                              ← L5 + L6 模型训练 & 网关
│   ├── 训练工作台                  # 训练任务创建、监控、日志
│   │   ├── 训练数据集              # 数据版本管理、数据切分
│   │   ├── 训练任务                # 任务配置、执行、实验追踪
│   │   └── 模型评估                # 评估报告、模型对比、指标曲线
│   ├── 模型管理                    # 已注册模型版本、状态流转（Staging→Prod）# 统一推理入口、路由策略、限流监控
│                                  
│
├─ 🤖 workspace 工作台（Studio）                         ← L4 智能体 & Skills
│   ├── Skills 管理
│   │   ├── Skills 广场             # 已发布 Skills 浏览与搜索
│   │   └── Skills 注册             # Action / Function / 自定义 Skill 注册
│   ├── 智能体管理
│   │   ├── 智能体设计              # Agent 创建、Prompt 编辑、工具绑定
│   │   ├── 智能体编排              # 多 Agent 协作工作流（串行/并行/路由）
│   │   └── 智能体评估              # 响应质量、工具调用准确率测试
│   └── 运行日志                    # Agent 调用日志、工具执行记录
│
│
└─ 👤 AI员工（AI Workforce）                           ← L7 业务应用
    ├── 业务AI员工
    │   ├── 设备故障诊断助手          # 改为AI员工用到的智能体、skill、本体实例、数据源、权限信息、调用情况
    │   ├── 商品补货助手
    │   └── ......                  # 按业务场景扩展
    └── 通用AI员工
        ├── 本体建模助手
        └── ......                  # 平台级通用能力
```

#### 2.3.1 目录设计原则

| 原则 | 说明 |
|------|------|
| **流水线顺序** | 目录从上到下严格遵循 L1→L7 数据流方向，用户按操作动线逐级深入 |
| **分区归类** | 按"数据基座→语义中枢→模型能力→智能构建→业务应用"五大区块组织，职责边界清晰 |
| **命名一致** | 一级目录采用"中文名（English）"双语格式，二级及以下统一中文；避免缩写歧义 |
| **深度适度** | 目录层级控制在 3 级以内，减少用户点击深度 |
| **角色友好** | 数据工程师关注前两部分，AI 开发者关注中间两部分，业务用户只需进入最后一部分 |



## 三、L1-L5 经典数据流水线

### 3.1 L1 数据源接入层（Datasource Project）

**职责：** 每个逻辑数据源对应一个 Project，完成原始数据落地、类型解析、基础清洗和 schema 标准化。

| 文件夹 | 内容 | 说明 |
|--------|------|------|
| `/raw` | 原始同步数据集 | 从Agent同步落地，不允许手动修改 |
| `/clean` | 清洗后数据集 | 类型解析、空值处理、格式统一 |
| `/output` | 对外暴露的标准化数据集 | 下游 Transform Project 唯一引用源 |
| `/analysis` | 数据质量报告、统计分析 | 用于验证清洗效果 |
| `/scratchpad` | 临时实验数据集 | 禁止被下游引用 |
| `/documentation` | Data Lineage图 + 源系统说明 | 包含同步频率、数据量级等 |

### 3.2 L2 数据转换层（Transform Project）

**职责：** 从多个 Datasource Project 导入数据，进行跨源关联、查找表扩展、规范化和聚合，产出可复用的规范数据集。

| 文件夹 | 内容 | 说明 |
|--------|------|------|
| `/logic` | Code Repository（转换代码） | Python/SQL 转换逻辑 |
| `/datasets/transformed` | 中间转换结果 | 仅内部使用 |
| `/datasets/output` | 最终输出数据集 | 下游 Ontology Project 唯一引用源 |
| `/analysis` | 数据质量报告、管道测试 | |
| `/documentation` | Data Lineage图 + 管道说明文档 | |

### 3.3 L3 本体语义层（Ontology Project）

**职责：** 这是平台的核心层。将 Transform 输出的规范数据集映射为业务对象（Object Types）、属性（Properties）、链接（Links）和操作（Actions），形成统一的业务语义层。

| 文件夹 | 内容 | 说明 |
|--------|------|------|
| `/logic` | Ontology数据准备代码 | 为 backing dataset 做最后的列裁剪、重命名 |
| `/output` | 用于 backing Object Type 的数据集 | 每个数据集只能 backing 一个 Object Type |
| `/ontology-config` | Object/Link/Action Type定义 | 本体模型设计书的实现 |
| `/functions` | TypeScript Functions Repository | Action副作用、业务逻辑、外部集成 |
| `/documentation` | Ontology ER图 + 状态机图 | |

> **核心约束**
> - 一个 Dataset 只能 backing 一个 Object Type，一个 Object Type 只能被一个 Dataset backing
> - 数据清洗和格式化必须在上游 Transform 完成，禁止在 Ontology 层做数据处理
> - 列名必须 `snake_case`，数据类型必须与 Object Property 一致


---

## 四、L5 模型训练层（Model Training Project）

### 4.1 功能需求

| 功能模块 | 需求描述 | 优先级 |
|---------|---------|-------|
| 数据准备 | 从 Ontology 导入结构化数据集，支持特征工程、数据切分（train/test/val）、版本快照 | P0 |
| 训练环境 | 支持 Jupyter Notebook、Python脚本、分布式训练；可配置 GPU/CPU 资源 | P0 |
| 实验追踪 | 自动记录每次训练的超参数、指标、数据版本、代码版本 | P0 |
| 模型评估 | 支持多模型对比、A/B测试、偏差检测、公平性审计 | P0 |
| 模型注册 | 将评估通过的模型注册到 Model Registry，含版本、元数据、运行时依赖 | P0 |
| 多方审批 | 模型上线前需经数据科学家、业务方、合规方多角色审批 | P1 |
| LLM微调 | 支持大语言模型的 LoRA/QLoRA 微调、Prompt模板管理 | P1 |

### 4.2 目录结构

| 文件夹 | 内容 | 说明 |
|--------|------|------|
| `/data` | 训练/测试/验证数据集 | 从 Ontology 导入，版本化管理 |
| `/notebooks` | Jupyter Notebook 开发环境 | 探索性分析和原型开发 |
| `/pipelines` | 训练管道代码 | 可复现的训练流程定义 |
| `/experiments` | 实验追踪记录 | 超参数、指标、数据版本快照 |
| `/models` | 训练产出的模型工件 | 模型文件 + 元数据 + 依赖清单 |
| `/registry` | Model Registry 注册信息 | 版本号、状态（Staging/Production/Archived） |
| `/evaluation` | 评估报告、对比报告 | 含指标曲线、混淆矩阵等 |
| `/documentation` | 建模目标文档 + 审批记录 | |

### 4.3 与其他层的关系

- **上游依赖**：从 L3 Ontology Project 的 `/output` 导入结构化数据集作为训练输入
- **下游输出**：已注册模型发布到 L6 Model Gateway 进行服务化部署
- **反向反馈**：模型监控数据可回流到 L3 Ontology 作为新的 Object Type

---

## 五、L6 模型网关层（Model Gateway）

> **新增模块**：模型网关是模型能力的统一发布入口。它屏蔽底层模型实现差异（自训练模型、第三方LLM、微调模型），向上层 Agent 和 Workflow 提供统一的调用接口。

### 5.1 功能需求

| 功能模块 | 需求描述 | 优先级 |
|---------|---------|-------|
| 统一API接口 | 提供标准化的 REST/gRPC 推理接口，屏蔽底层模型实现差异 | P0 |
| 模型路由 | 按模型名称+版本路由，支持灰度发布、A/B测试、金丝雀发布 | P0 |
| 负载均衡 | 多实例负载均衡，支持自动扩缩容 | P0 |
| 限流熔断 | 按租户/用户/API Key 的请求速率限制，防止级联失败 | P0 |
| 认证授权 | OAuth 2.0 / API Key 认证，细粒度模型级别权限控制 | P0 |
| 可观测性 | 请求日志、延迟监控、吞吐量统计、Token消耗追踪 | P0 |
| 缓存层 | 语义缓存（Semantic Cache）减少重复调用成本 | P1 |
| Prompt管理 | Prompt模板版本管理、变量注入、A/B测试 | P1 |
| 内容安全 | 输入/输出内容过滤（PII脱敏、有害内容拦截、Guardrails） | P0 |
| 多模型编排 | 支持串联/并联调用多个模型，结果融合 | P2 |

### 5.2 架构设计

| 组件 | 职责 | 技术要求 |
|------|------|---------|
| API Gateway层 | 路由、认证、限流、日志 | 支持每秒 10K+ 并发请求 |
| Router层 | 模型选择、版本路由、流量分配 | 支持权重、随机、hash 路由策略 |
| 推理引擎层 | 调用底层模型服务 | 兼容自部署模型 + 第三方API（OpenAI等） |
| Cache层 | 语义缓存 + 精确匹配缓存 | 支持可配置 TTL 和失效策略 |
| Guardrails层 | 输入/输出内容安全过滤 | 可插拔规则引擎 |
| Observability层 | 日志、指标、链路追踪 | OpenTelemetry 兼容 |

### 5.3 模型注册表规范

*模型网关从 Model Registry 读取模型元数据，以下为注册表必填字段。*

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `model_name` | String | 模型唯一标识符 | `purchase-order-classifier` |
| `version` | String | 语义化版本号 | `v2.1.0` |
| `stage` | Enum | Staging / Production / Archived | `Production` |
| `framework` | String | 训练框架 | `PyTorch` / `Transformers` / `sklearn` |
| `input_schema` | JSON | 输入数据格式定义 | `{"type":"object","properties":{...}}` |
| `output_schema` | JSON | 输出数据格式定义 | `{"type":"object","properties":{...}}` |
| `endpoint_type` | Enum | batch / realtime / streaming | `realtime` |
| `owner` | String | 模型负责人 | `ml-team@company.com` |
| `metrics` | JSON | 核心评估指标 | `{"accuracy":0.95,"f1":0.93}` |
| `approved_by` | String[] | 审批人列表 | `["alice","bob"]` |

---

## 六、L4 workspace平台（Studio）

>  Studio 是平台的智能体和Skills的开发与管理层。它将 Ontology 的语义能力、Model Gateway 的推理能力和 Action 的操作能力统一编排，实现自然语言驱动的业务流程自动化。

### 6.1 功能需求

| 功能模块 | 需求描述 | 优先级 |
|---------|---------|-------|
| Agent设计器 | 可视化 Agent 创建：角色定义、System Prompt 编辑、行为规则配置 | P0 |
| Tools工具绑定 | 将 Ontology Action、Function、Object Query 注册为 Agent 可调用工具 | P0 |
| 参数映射 | 配置工具参数来源：App State / LLM Dynamic / Static | P0 |
| 确认流程 | 关键操作的二次确认卡片设计（展示字段、影响说明、按钮文案） | P0 |
| Application State | 定义 Agent 可访问的应用状态变量（如 `selectedOrder`、`currentUser`） | P0 |
| 多Agent编排 | 支持多个 Agent 协作：串行链、并行团、分层委派、路由分发 | P1 |
| Memory管理 | 短期记忆（会话内）+ 长期记忆（跨会话）+ 共享记忆 | P1 |
| RAG集成 | 向量数据库集成，支持文档检索增强 | P1 |
| 评估框架 | Agent 响应质量评估、工具调用准确率、安全性测试 | P0 |
| 部署管理 | Agent 版本发布、A/B测试、回滚、监控告警 | P0 |

### 6.2 目录结构

| 文件夹 | 内容 | 说明 |
|--------|------|------|
| `/agents` | Agent定义（System Prompt + 配置） | 每个Agent一个子文件夹 |
| `/tools` | 工具注册表（Action/Query/Function映射） | 与 Ontology Action 一一对应 |
| `/workflows` | 多Agent编排工作流定义 | DAG / Chain / Router 定义 |
| `/memory` | Memory Store配置 | 向量库、KV存储配置 |
| `/evaluation` | Agent评估用例集 + 报告 | 含期望输出、评分规则 |
| `/deployments` | 部署配置、版本历史 | 含环境变量、资源配额 |
| `/documentation` | Agent配置文档 + 对话场景示例 | |

### 6.3 Studio与Ontology的集成模式

Studio 与 Ontology 层的集成是平台的核心设计。Agent 通过以下三种方式与 Ontology 交互：

| 集成方式 | 描述 | 示例 |
|---------|------|------|
| Action执行 | Agent 调用 Ontology Action 修改对象状态 | Agent 调用 `ApprovePurchaseOrder` 审批订单 |
| Object Query | Agent 查询 Ontology 对象集获取信息 | Agent 搜索 `status=Pending` 的待审批订单 |
| Function调用 | Agent 触发 TypeScript Function 执行复杂逻辑 | Agent 调用 `sendOrderToSAP()` 同步外部系统 |

### 6.4 多Agent编排模式

| 编排模式 | 描述 | 适用场景 |
|---------|------|---------|
| Sequential Chain | Agent A → Agent B → Agent C 串行执行 | 多步骤审批流程 |
| Parallel Fan-out | 同时调用多个 Agent，汇聚结果 | 多维度分析（财务+法务+合规） |
| Hierarchical Delegation | 主管 Agent 将子任务分配给专家 Agent | 复杂工单处理（分类→派单→处理） |
| Router | 根据输入意图路由到不同 Agent | 智能客服（售前/售后/技术支持） |



