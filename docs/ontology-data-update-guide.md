# 本体数据更新指南

> 只保留当前项目里真实生效的更新方式。
> 不再使用旧的 `backend/mock_data/*.json` 本体模式。

---

## 一、当前正确架构

本体项目数据的唯一有效入口是：

- `frontend/src/api/projectManagement.ts`

前端页面和工作台直接读取这里生成的本体项目数据：

- 本体列表：`listProjects()`
- 本体详情：`getProjectDetail(projectId)`
- 工作台数据：同样来自 `projectManagement.ts`

当前链路：

```text
ONTOLOGY_DEFS / 完整 seed 常量
  -> generateProject()
  -> ensureXxxSeed()
  -> normalizeStore()
  -> listProjects() / getProjectDetail()
  -> 前端页面
```

---

## 二、更新本体时要改哪里

### 1. 只更新本体目录卡片

只改：

- `frontend/src/api/projectManagement.ts` 中的 `ONTOLOGY_DEFS`

适用场景：

- 改本体名称
- 改行业、阶段、样例三元组
- 改 Agent 场景描述
- 改数据量

这类改动只会影响目录级项目基础信息。

---

### 2. 更新一个“完整本体”

如果你要让某个本体在工作台里有完整数据，不能只改 `ONTOLOGY_DEFS`，还要补完整 seed。

需要在 `frontend/src/api/projectManagement.ts` 中补这些内容：

- `PROJECT_ID / PROJECT_NAME / UPDATED_AT / DESCRIPTION`
- `DOCUMENTS`
- `DATA_SOURCES`
- `ENTITY_TYPES`
- `RELATION_TYPES`
- `SKILLS`
- `AI_INSIGHT_RUN`
- `RUN`
- `VERSION`
- `ACTIONS`
- `FUNCTIONS`
- `ensureXxxSeed(project)`

然后把 `ensureXxxSeed(project)` 接入：

- `normalizeStore()`

最后递增：

- `DATA_VERSION`

否则本地已缓存的数据不会自动升级。

---

### 3. 如果要优化抽取候选名称

补：

- `PROJECT_ENTITY_NAME_POOLS`

这会影响自动生成 review items 时的候选实体名称质量。

---

### 4. 如果要把本体放到置顶区

改：

- `FEATURED_PROJECT_ORDER`

---

## 三、推荐操作流程

### 场景 A：继续完善一个已经有完整 seed 的本体

直接修改该本体对应的 seed 常量和 `ensureXxxSeed()`。

标准顺序：

1. 改 `DESCRIPTION / DOCUMENTS / DATA_SOURCES / ENTITY_TYPES / RELATION_TYPES / ACTIONS / FUNCTIONS`
2. 如有需要，补 `AI_INSIGHT_RUN / RUN / VERSION`
3. 调整 `ensureXxxSeed()`，保证旧数据也会被迁移到新结构
4. `DATA_VERSION + 1`
5. 补或更新测试

如果你只是想把这些已补齐本体的文档列表变多，不改 schema、动作、函数，可按下面的最小改法：

1. 只改该本体对应的 `XXX_DOCUMENTS`
2. 新增文档对象时保证：
   - `id` 唯一，不要复用旧文档 `id`
   - `name` 唯一，避免前端看起来像重复文档
   - `uploadedAt` 合理，列表会按时间倒序展示
   - `status / enabled / fileType / size` 填完整
3. 如果该本体写死了 `XXX_AI_INSIGHT_RUN.scannedDocumentCount`，同步改成新的文档数量
4. 如果测试里断言了 `documents.length` 或 `aiInsightRun.scannedDocumentCount`，同步更新测试
5. `DATA_VERSION + 1`

这类“只增文档数量”的场景通常不需要改：

- `ONTOLOGY_DEFS`
- `DATA_SOURCES`
- `ENTITY_TYPES`
- `RELATION_TYPES`
- `ACTIONS`
- `FUNCTIONS`
- `ensureXxxSeed()` 的合并逻辑

除非：

- 你还想删旧文档，这时要同步检查 `removeItemsById(...)`
- 你新增文档后希望 AI 洞察 / 抽取 run 的日志和统计也更真实，这时再补 `XXX_AI_INSIGHT_RUN` 或 `XXX_RUN`

---

### 场景 B：新增一个目录里已有、但工作台还是默认模板的本体

标准顺序：

1. 在 `ONTOLOGY_DEFS` 里确认该本体存在
2. 新增一套完整 seed 常量
3. 新增 `isXxxProject()` 和 `ensureXxxSeed()`
4. 在 `normalizeStore()` 中调用 `ensureXxxSeed()`
5. `DATA_VERSION + 1`
6. 增加测试

当前“全渠道库存本体”和“会员画像本体”都已经按这条路径补齐为完整 seed，可分别作为零售履约场景和零售 CRM 场景参考。

---

### 场景 C：新增一个全新的本体

标准顺序：

1. 先加 `ONTOLOGY_DEFS`
2. 再补完整 seed
3. 接入 `normalizeStore()`
4. 视需要加入 `FEATURED_PROJECT_ORDER`
5. `DATA_VERSION + 1`
6. 增加测试

---

## 四、最少需要关注的代码位置

核心文件：

- `frontend/src/api/projectManagement.ts`
- `frontend/src/api/projectManagement.local.test.ts`

常见关键点：

- `const DATA_VERSION = ...`
- `export const ONTOLOGY_DEFS`
- `function generateProject(...)`
- `function ensureXxxSeed(...)`
- `function normalizeStore(...)`
- `export const FEATURED_PROJECT_ORDER`

---

## 五、推荐模板

新增完整本体时，建议按这个结构组织：

```ts
const XXX_PROJECT_ID = 'proj-xxxx'
const XXX_PROJECT_NAME = '某某本体'
const XXX_UPDATED_AT = '2026-03-11T11:20:00.000Z'
const XXX_DESCRIPTION = '...'

const XXX_DOCUMENTS: ProjectDocument[] = [...]
const XXX_DATA_SOURCES: StructuredDataSource[] = [...]
const XXX_ENTITY_TYPES: EntityTypeConfig[] = [...]
const XXX_RELATION_TYPES: RelationTypeConfig[] = [...]
const XXX_SKILLS: SkillConfig[] = [...]
const XXX_AI_INSIGHT_RUN: AiInsightRun = {...}
const XXX_RUN: ExtractionRun = {...}
const XXX_VERSION: OntologyVersion = {...}
const XXX_ACTIONS: ActionDefinition[] = [...]
const XXX_FUNCTIONS: FunctionDefinition[] = [...]

function isXxxProject(project: Pick<ProjectDetail, 'id' | 'name'>): boolean {
  return project.id === XXX_PROJECT_ID || project.name === XXX_PROJECT_NAME
}

function ensureXxxSeed(project: ProjectDetail): boolean {
  // 合并文档、数据源、schema、技能、run、version、actions、functions
  // 修正 description/category/updatedAt/currentVersionId
  return changed
}
```

---

## 六、测试要求

每次更新完整本体，至少补一个本地测试：

- `frontend/src/api/projectManagement.local.test.ts`

建议断言：

- 本体名称正确
- 文档数量正确
- 数据源数量正确
- 关键实体类型存在
- 关键关系类型存在
- 关键动作存在
- 关键函数存在
- 抽取 run 的实体/关系数量正确
- 当前版本 `currentVersionId` 正确

---

## 七、验证方式

在前端目录执行：

```bash
npm test -- --run src/api/projectManagement.local.test.ts
```

如果只是改了某个本体，至少要保证对应测试通过。

---

## 八、不要再做的事

以下内容不属于当前正确更新路径：

- 不要改 `backend/mock_data/ontology_store.json`
- 不要改 `backend/mock_data/ontology_overview.json`
- 不要把本体项目更新建立在旧 `/api/ontology/*` mock 数据上

这些不是当前本体项目页和工作台的主数据源。

---

## 九、实操判断

以后你问“继续更新一个本体是不是按这个文档就行”，判断标准只有一个：

- 如果你改的是 `frontend/src/api/projectManagement.ts` 这条链路，就是对的
- 如果你改的是旧 `backend/mock_data/*.json`，就不是当前模式

---

## 十、参考样例

当前仓库里已经完成的完整样例可直接参考：

- `故障诊断本体`
- `商品补货本体`
- `客户360本体`
- `任务调度本体`
- `合同约束本体`
- `法律法规库本体`

---

## 十一、全渠道库存本体专项优化方案

### 1. 当前判断

`全渠道库存本体` 当前已经存在于：

- `frontend/src/api/projectManagement.ts` 的 `ONTOLOGY_DEFS`
- `frontend/src/api/projectManagement.ts` 的 `FEATURED_PROJECT_ORDER`

但目前没有：

- `proj-2421` 的完整 seed 常量
- `isOmnichannelInventoryProject()`
- `ensureOmnichannelInventorySeed()`
- 对应本地测试

所以它现在仍然是“目录里有卡片、工作台还是默认模板”的状态，应该按上面的“场景 B”补齐。

---

### 2. 推荐定位

建议把“全渠道库存本体”从一个泛化库存主题，收敛成一个明确的 O2O 履约决策本体：

- 目标：回答“这笔订单应该由哪个库存池履约”
- 决策核心：可售库存、履约时效、履约成本、门店距离、渠道优先级、是否支持自提/店发
- 输出结果：库存承诺、预占结果、履约决策、调拨任务

建议描述：

> 零售业 · O2O 全渠道库存与履约决策本体，覆盖商品 SKU、销售渠道、履约节点、库存池、全渠道订单、库存预占、履约承诺、分配决策与调拨任务；支持根据 ATP、距离、时效与成本在仓发、店发和门店自提之间自动选择最优履约路径。

---

### 3. 推荐 seed 结构

在 `frontend/src/api/projectManagement.ts` 中新增这一组常量：

```ts
const OMNICHANNEL_INVENTORY_PROJECT_ID = 'proj-2421'
const OMNICHANNEL_INVENTORY_PROJECT_NAME = '全渠道库存本体'
const OMNICHANNEL_INVENTORY_UPDATED_AT = '2026-03-11T12:00:00.000Z'
const OMNICHANNEL_INVENTORY_DESCRIPTION = '...'

const OMNICHANNEL_INVENTORY_DOCUMENTS: ProjectDocument[] = [...]
const OMNICHANNEL_INVENTORY_DATA_SOURCES: StructuredDataSource[] = [...]
const OMNICHANNEL_INVENTORY_ENTITY_TYPES: EntityTypeConfig[] = [...]
const OMNICHANNEL_INVENTORY_RELATION_TYPES: RelationTypeConfig[] = [...]
const OMNICHANNEL_INVENTORY_SKILLS: SkillConfig[] = [...]
const OMNICHANNEL_INVENTORY_AI_INSIGHT_RUN: AiInsightRun = {...}
const OMNICHANNEL_INVENTORY_RUN: ExtractionRun = {...}
const OMNICHANNEL_INVENTORY_VERSION: OntologyVersion = {...}
const OMNICHANNEL_INVENTORY_ACTIONS: ActionDefinition[] = [...]
const OMNICHANNEL_INVENTORY_FUNCTIONS: FunctionDefinition[] = [...]
```

然后补：

- `isOmnichannelInventoryProject(project)`
- `ensureOmnichannelInventorySeed(project)`
- `normalizeStore()` 中接入 `ensureOmnichannelInventorySeed()`
- `PROJECT_ENTITY_NAME_POOLS['proj-2421']`
- `DATA_VERSION + 1`

---

### 4. 推荐数据源

建议至少 3 个数据源：

1. `OMS全渠道订单中心`
   - 表：`omni_order`, `order_line`, `delivery_promise`
   - 用途：订单来源、配送方式、承诺时效、履约状态

2. `WMS + 门店POS库存快照库`
   - 表：`inventory_pool_snapshot`, `store_inventory`, `warehouse_inventory`
   - 用途：仓库库存、门店库存、可售库存、预留库存、在途库存

3. `门店地理与履约规则中心`
   - 表：`store_fulfillment_profile`, `pickup_service_area`, `dispatch_sla_rule`
   - 用途：门店是否支持自提/店发、服务半径、截单时间、履约 SLA

---

### 5. 推荐实体类型

建议至少补齐 9 类实体，避免只停留在“订单 + 门店 + 库存”三元组层面：

1. `ProductSku`
   - 表示被履约的商品 SKU
   - 核心属性：`skuCode` `productName` `brand` `category` `temperatureZone`

2. `SalesChannel`
   - 表示渠道来源，如小程序、电商旗舰店、抖音即时零售
   - 核心属性：`channelCode` `channelName` `channelType` `priorityLevel`

3. `FulfillmentNode`
   - 表示可履约节点，如中心仓、前置仓、门店
   - 核心属性：`nodeCode` `nodeName` `nodeType` `city` `supportsPickup` `supportsShipFromStore`

4. `InventoryPool`
   - 表示节点上的库存池，而不是泛化库存值
   - 核心属性：`snapshotTime` `onHandQty` `reservedQty` `atpQty` `safetyQty` `poolType`

5. `OmniOrder`
   - 表示全渠道订单或订单行
   - 核心属性：`orderNo` `orderSource` `fulfillmentMode` `promiseDate` `orderStatus`

6. `Reservation`
   - 表示库存预占结果
   - 核心属性：`reservationNo` `reservedQty` `reservationStatus` `expireAt`

7. `FulfillmentPromise`
   - 表示面对消费者的履约承诺
   - 核心属性：`promiseType` `expectedDeliveryTime` `slaHours` `promiseStatus`

8. `AllocationDecision`
   - 表示系统做出的履约分配决策
   - 核心属性：`decisionNo` `decisionMode` `costScore` `distanceScore` `decisionReason`

9. `TransferTask`
   - 表示需要跨仓/跨店补货或调拨时生成的执行任务
   - 核心属性：`taskNo` `taskType` `sourceNodeCode` `targetNodeCode` `taskStatus`

---

### 6. 推荐关系类型

建议关系重点围绕“订单如何命中库存池并产生承诺”来设计：

1. `sold_through`
   - `OmniOrder -> SalesChannel`

2. `orders_sku`
   - `OmniOrder -> ProductSku`

3. `fulfilled_by_node`
   - `OmniOrder -> FulfillmentNode`

4. `tracked_in_pool`
   - `ProductSku -> InventoryPool`

5. `pool_located_at`
   - `InventoryPool -> FulfillmentNode`

6. `reserves_inventory`
   - `Reservation -> InventoryPool`

7. `reserves_for_order`
   - `Reservation -> OmniOrder`

8. `promises_for_order`
   - `FulfillmentPromise -> OmniOrder`

9. `promised_by_node`
   - `FulfillmentPromise -> FulfillmentNode`

10. `decides_for_order`
   - `AllocationDecision -> OmniOrder`

11. `chooses_node`
   - `AllocationDecision -> FulfillmentNode`

12. `creates_transfer_task`
   - `AllocationDecision -> TransferTask`

---

### 7. 推荐动作与函数

建议动作不要做成“库存展示型”，而是做成“库存决策型”：

推荐动作：

1. `refresh_atp_snapshot`
   - 根据现存、预留、安全库存刷新 `atpQty`

2. `decide_omnichannel_fulfillment`
   - 在仓发、店发、自提之间计算最优履约节点

3. `reserve_inventory_for_order`
   - 为订单创建预占记录并回写库存池

4. `create_transfer_task_for_shortage`
   - 当目标节点 ATP 不足时生成调拨任务

推荐函数：

1. `calc_atp_qty`
   - `atp = onHand - reserved - safety + inTransitAdjust`

2. `score_fulfillment_options`
   - 综合时效、距离、成本、渠道优先级输出节点评分

3. `build_reservation_payload`
   - 生成订单预占负载

4. `build_transfer_task_payload`
   - 生成跨仓/跨店调拨任务负载

---

### 8. 推荐技能与抽取候选池

建议技能至少 3 个：

- `库存快照与ATP整编`
- `O2O履约链路融合`
- `门店自提与店发规则编排`

建议补 `PROJECT_ENTITY_NAME_POOLS['proj-2421']`：

```ts
'proj-2421': {
  ProductSku: ['Nike Air Max 270', 'Belle云感通勤鞋', '资生堂红腰子精华', 'iPhone 16 128G 黑色'],
  SalesChannel: ['天猫旗舰店', '微信小程序商城', '抖音即时零售', '美团闪购'],
  FulfillmentNode: ['上海静安门店', '华东上海中心仓', '浦东前置仓', '南京西路旗舰店'],
  InventoryPool: ['上海静安门店现货池', '华东中心仓ATP池', '浦东前置仓小时达库存池'],
  OmniOrder: ['OO-20260311-001', 'OO-20260311-018', 'OO-20260311-032', 'OO-20260311-047'],
  Reservation: ['RES-20260311-001', 'RES-20260311-002', 'RES-20260311-003'],
  FulfillmentPromise: ['2小时达承诺', '次日达承诺', '门店自提承诺'],
  AllocationDecision: ['履约决策单#AD-001', '履约决策单#AD-002', '履约决策单#AD-003'],
  TransferTask: ['门店调拨任务#TR-001', '跨仓补货任务#TR-002', '自提备货任务#TR-003'],
}
```

这会比默认的“实体A/实体B”候选名更适合抽取和 review。

---

### 9. 推荐测试断言

在 `frontend/src/api/projectManagement.local.test.ts` 至少增加一条：

- `getProjectDetail('proj-2421')`

建议断言：

- `detail.name === '全渠道库存本体'`
- `documents.length === 8`
- `dataSources.length === 3`
- `entityTypes` 包含 `FulfillmentNode` / `InventoryPool` / `AllocationDecision`
- `relationTypes` 包含 `promised_by_node` / `creates_transfer_task`
- `actions` 包含 `decide_omnichannel_fulfillment`
- `functions` 包含 `score_fulfillment_options`
- `currentVersionId` 指向新版本

---

### 10. 优化重点

这个本体最容易做错的地方有三个：

- 不要把“库存”只建成一个数字字段，要建成 `InventoryPool`，否则无法表达 ATP、预占、安全库存和库存归属
- 不要把“门店”和“仓库”拆成两套完全独立模型，建议统一抽象成 `FulfillmentNode`
- 不要只表达“订单 -> 门店”结果关系，要把“承诺”和“决策”建成独立实体，否则后面很难扩展解释原因、成本评分和履约 SLA

如果后续直接落代码，建议优先参考：

- `商品补货本体` 的零售补货结构
- `库存风险本体` 的库存策略与函数结构

然后把两者合并成“全渠道库存 + 履约决策”这一条更完整的零售链路。

其中“任务调度本体”“全渠道库存本体”和“会员画像本体”都是最近按当前模式补齐的标准案例。

---

## 十一、最小实操清单

以后继续更新一个本体，直接按这张清单过一遍。

### 只改目录信息

- 改 `ONTOLOGY_DEFS`
- 确认 `name / category / phase / triple / agentScene / dataCount` 是否正确
- 如果影响置顶顺序，再改 `FEATURED_PROJECT_ORDER`

---

### 改完整本体数据

- 找到该本体对应的 `XXX_PROJECT_ID`
- 改 `XXX_DESCRIPTION`
- 改 `XXX_DOCUMENTS`
- 改 `XXX_DATA_SOURCES`
- 改 `XXX_ENTITY_TYPES`
- 改 `XXX_RELATION_TYPES`
- 改 `XXX_SKILLS`
- 改 `XXX_AI_INSIGHT_RUN`
- 改 `XXX_RUN`
- 改 `XXX_VERSION`
- 改 `XXX_ACTIONS`
- 改 `XXX_FUNCTIONS`
- 检查 `ensureXxxSeed()` 是否同步更新
- 检查 `normalizeStore()` 里是否已接入 `ensureXxxSeed()`
- `DATA_VERSION + 1`
- 补或更新 `projectManagement.local.test.ts`
- 运行测试

### 只增加文档数量

- 找到该本体对应的 `XXX_DOCUMENTS`
- 追加新的 `ProjectDocument`
- 确认新增文档 `id / name / uploadedAt` 唯一且合理
- 如有固定统计，更新 `XXX_AI_INSIGHT_RUN.scannedDocumentCount`
- 更新 `projectManagement.local.test.ts` 里的 `documents.length` 与相关文档名断言
- `DATA_VERSION + 1`
- 运行测试

---

### 新增完整本体

- 先加 `ONTOLOGY_DEFS`
- 新增 `XXX_PROJECT_ID / XXX_PROJECT_NAME / XXX_UPDATED_AT / XXX_DESCRIPTION`
- 新增完整 seed 常量
- 新增 `isXxxProject()`
- 新增 `ensureXxxSeed()`
- 在 `normalizeStore()` 注册
- 如需要，补 `PROJECT_ENTITY_NAME_POOLS`
- 如需要，补 `FEATURED_PROJECT_ORDER`
- `DATA_VERSION + 1`
- 新增测试
- 运行测试

---

### 提交前最后检查

- 本体详情页能打开
- 文档数量符合预期
- 数据源数量符合预期
- Schema 中关键实体和关系存在
- Actions / Functions 能看到
- `currentVersionId` 指向正确版本
- 本地测试通过

---

### 验证命令

```bash
cd frontend
npm test -- --run src/api/projectManagement.local.test.ts
```
