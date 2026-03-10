# 模型中心 LLM/VL 重构设计文档

**日期**: 2026-03-10  
**功能**: 模型中心仅保留大模型能力，并重构为 LLM/VL 信息架构

---

## 目标与边界

- 将 `模型中心` 从“通用机器学习模型集合”收敛为“仅服务大模型的平台模块”。
- 覆盖 `LLM` 与 `VL/VLM` 两类模型，不再在该模块内展示传统预测算法、分类器、时序回归模型。
- 本次范围限定在前端页面、前端类型定义和前端 mock 数据结构，不修改后端真实业务接口。
- 保留现有 `model-lab/*` 路由，降低波及面，但页面标题、菜单标题、字段语义与 mock 数据全部切换为大模型体系。

---

## 方案结论

采用“**信息架构重排 + 类型重定义 + mock 数据重建**”方案。

### 方案对比

| 方案 | 描述 | 结论 |
|---|---|---|
| A | 仅替换页面文案，保留现有传统模型字段和 mock 结构 | 改动小，但语义仍然混乱，不采用 |
| B | 保留页面骨架，重写类型定义和 mock 数据为大模型领域对象 | 风险可控，但产品表达仍偏旧，不作为最终方案 |
| C | 重排模型中心信息架构，同时重写类型、页面语义和 mock 数据 | 能彻底满足“只保留大模型”的目标，采用 |

---

## 信息架构

模型中心维持四个入口，但全部改为大模型平台语义：

1. `训练与微调`
   - 对应现有 `模型训练`
   - 聚焦 `SFT`、`LoRA`、`QLoRA`、`DPO`、`Continued Pretraining`
   - 支持 `LLM` 与 `VL`

2. `评测与对齐`
   - 对应现有 `模型评估`
   - 聚焦能力评测、对齐评测、Judge 评分、人审结果和多模态理解质量

3. `推理网关`
   - 对应现有 `模型网关`
   - 聚焦模型注册、版本发布、灰度、回滚、流量和推理 SLA

4. `训练语料`
   - 对应现有 `训练数据集`
   - 聚焦指令数据、偏好数据、多轮对话、图文对、文档理解数据集

### 导航与命名规则

- 路由保持不变：
  - `/model-lab/training`
  - `/model-lab/evaluation`
  - `/model-lab/gateway`
  - `/model-lab/datasets`
- 菜单和页面标题切换为：
  - `训练与微调`
  - `评测与对齐`
  - `推理网关`
  - `训练语料`
- `AppLayout` 中的页面 breadcrumb 标题同步切换为上述命名。

---

## 领域模型与数据结构

现有类型定义以“通用 ML 项目”为中心，字段偏向 `accuracy`、`framework`、`classification`、`feature vector`。本次需要重定义为大模型平台对象。

### 共用维度

建议在类型定义中统一表达以下维度：

- `modelFamily`: `LLM | VL`
- `modality`: `text | image-text`
- `trainStage`: `pretrain | sft | lora | qlora | dpo`
- `capability`: 如 `chat`、`reasoning`、`vision-language-understanding`、`document-parsing`
- `baseModel`: 如 `Deepexi-R1-Industry-32B`、`Deepexi-Industry-60B-Instruct`、`Deepexi-VL-Industry-32B`
- `alignmentTags`: 如 `安全对齐`、`工业知识增强`、`OCR增强`、`长上下文`

### 训练对象

`TrainingProject` 与 `TrainingJob` 重写为大模型训练对象，重点表达：

- 模型家族、模态、训练阶段、基座模型
- 语料包名称、语料类型、token 数或图像数
- 上下文长度、LoRA rank、学习率、epoch、checkpoint
- 训练日志中的 tokenizer、adapter、judge-eval、merge checkpoint 等事件

移除或弱化：

- `scikit-learn`、`TensorFlow`、`MAPE`、传统预测型 `framework`
- 仅适合传统 ML 的项目命名和业务案例

### 评测对象

`EvalTask`、`EvalSample`、`EvalComparison` 改为大模型评测结构，重点表达：

- 任务类型：`generation`、`instruction-following`、`hallucination`、`grounded-vqa`、`document-understanding`
- 指标：`passRate`、`winRate`、`hallucinationRate`、`groundedScore`、`faithfulnessScore`
- 多模态指标：`ocrScore`、`chartScore`、`docParseScore`
- 样本结构：`prompt`、`expected`、`response`、`judgeVerdict`、`humanLabel`

混淆矩阵不再是默认主视图，仅作为少数分类场景的兜底能力，不作为本次主设计。

### 网关对象

`RegisteredModel` 和 `GatewayRoute` 改为推理服务对象，重点表达：

- 模型家族、模态、上下文窗口、最大输出 token
- 服务入口和能力入口，如 `/chat/completions`、`/responses`、`/vl/understand`
- 阶段：`Staging`、`Canary`、`Production`
- 配额：`rpm`、`tpm`
- SLA：`P50/P95/P99`
- 是否支持图片输入、文档理解或 OCR

### 语料对象

`TrainingDataset` 改为训练语料包，重点表达：

- `datasetType`: `instruction`、`conversation`、`preference`、`image-caption`、`vqa`
- `modality`
- `sampleCount`、`tokenCount`、`imageCount`
- `qualityScore`
- `annotationSchema`
- `linkedRuns`
- `sampleData` 中展示对话样本、偏好对样本、图文问答样本，而不是结构化业务字段样本

---

## 页面交互设计

### 1. 训练与微调

- 保留现有训练页整体布局与任务表，但内容改为大模型训练语义。
- 页面显式区分 `LLM` 与 `VL`，可使用 `Tabs` 或筛选条件。
- 训练项目和任务展示：
  - `基座模型`
  - `训练阶段`
  - `语料类型`
  - `token/图像规模`
  - `显卡资源`
  - `checkpoint`
- 创建项目弹窗改为：
  - `模型家族`
  - `训练类型`
  - `基座模型`
  - `训练语料`
  - `context length`
  - `epochs`
  - `learning rate`
  - `lora rank`

### 2. 评测与对齐

- 任务列表聚焦能力评测与对齐评测，不再突出分类指标。
- 详情抽屉以以下视图为主：
  - 核心指标卡
  - 评测维度条形图
  - 样本对比表
  - Judge 结论与人工标注
- 页面中的样本示例改为大模型 prompt-response 样式。

### 3. 推理网关

- 模型注册表展示：
  - `模型名`
  - `模型家族`
  - `模态`
  - `上下文窗口`
  - `部署阶段`
  - `RPM/TPM`
  - `P50/P95/P99`
  - `图片输入支持`
- 路由表展示统一能力路由，而不是每个传统模型单独一条预测路径。
- 灰度、上线、回滚交互保留，文案统一为推理服务语义。

### 4. 训练语料

- 语料表展示：
  - `语料类型`
  - `模态`
  - `样本数`
  - `token 数`
  - `图像数`
  - `质量评分`
  - `关联训练任务`
- 详情抽屉支持查看：
  - 指令样本
  - 多轮对话样本
  - 偏好对样本
  - 图文问答样本
- 构建日志改为清洗、脱敏、切分、模板展开、图文对齐、质检等事件。

---

## Mock 数据策略

### 替换原则

- 传统模型条目全部移出模型中心 mock 数据：
  - `purchase-order-classifier`
  - `demand-forecaster`
  - `supplier-risk-scorer`
  - `equipment-fault-predictor`
  - `churn-predictor`
- 替换为大模型命名：
  - `deepexi-factory-copilot-sft`
  - `deepexi-vl-inspection-assistant`
  - `deepexi-doc-parser-lora`
  - `factory-copilot-dpo-run`

### 样本表达

- 训练 mock 数据以 token、图像、adapter、checkpoint 为核心。
- 评测 mock 数据以 prompt、judge verdict、人审标签、多模态问答为核心。
- 网关 mock 数据以模型服务能力、模态和 SLA 为核心。
- 语料 mock 数据以对话样本、偏好对、图文对样本为核心。

### 状态闭环

所有创建、删除、构建、停止、发布、灰度、回滚交互仍保留 mock 闭环，避免页面改造后失去交互性。

---

## 变更文件

- `docs/plans/2026-03-10-model-center-llm-vl-design.md`
- `docs/plans/2026-03-10-model-center-llm-vl.md`
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/types/modelTraining.ts`
- `frontend/src/types/modelEvaluation.ts`
- `frontend/src/types/modelGateway.ts`
- `frontend/src/types/trainingDataset.ts`
- `frontend/src/api/modelTraining.ts`
- `frontend/src/api/modelEvaluation.ts`
- `frontend/src/api/modelGateway.ts`
- `frontend/src/api/trainingDataset.ts`
- `frontend/src/pages/platform/ModelTrainingPage.tsx`
- `frontend/src/pages/platform/ModelEvaluationPage.tsx`
- `frontend/src/pages/platform/ModelGatewayPage.tsx`
- `frontend/src/pages/platform/TrainingDatasetsPage.tsx`

---

## 风险与约束

- `ModelEvaluationPage` 当前强依赖混淆矩阵展示，切换到大模型评测视图时改造量最大。
- `ModelTrainingPage` 与 `TrainingDatasetsPage` 通过数据集字段存在耦合，类型调整必须同步完成。
- 由于保留原路由，文件名与 URL 不变，代码内部命名会存在一个短期“旧名承载新语义”的过渡期。
- 本次不修改后端真实接口，因此所有语义升级均基于前端 mock 层完成。
