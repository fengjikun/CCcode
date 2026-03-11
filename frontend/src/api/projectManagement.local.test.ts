import { beforeEach, describe, expect, it } from 'vitest'

import {
  __PROJECT_STORE_LEGACY_HELPERS,
  batchUpdateRunReviewItems,
  createProject,
  createProjectFunction,
  FEATURED_PROJECT_ORDER,
  getVersionItems,
  deleteProject,
  getProjectFunctionInputTemplate,
  getProjectDetail,
  listProjects,
  publishRunVersion,
  runProjectFunction,
  runAiSchemaInsight,
  runProjectExtraction,
  setProjectDocumentEnabled,
  updateProjectFunction,
  updateRunReviewItem,
  updateProject,
  uploadCustomSkill,
  uploadProjectDocument,
} from './projectManagement'

function createLocalStorageMock() {
  const store = new Map<string, string>()
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

describe('projectManagement local mock store', () => {
  beforeEach(() => {
    __PROJECT_STORE_LEGACY_HELPERS.resetProjectStoreForTests()
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true,
      writable: true,
    })
  })

  it('lists seeded projects from the local mock store', async () => {
    const projects = await listProjects()

    expect(projects.length).toBeGreaterThan(100)
    expect(projects.some(project => project.name === '故障诊断本体')).toBe(true)
    expect(projects.some(project => project.name === '商品补货本体')).toBe(true)
    expect(projects[0]?.name).toBe('故障诊断本体')
    expect(projects[1]?.name).toBe('商品补货本体')
  })

  it('curates the first 18 ontology cards with common business ontologies across industries', async () => {
    const projects = await listProjects()

    expect(projects.slice(0, 18).map(project => project.name)).toEqual(FEATURED_PROJECT_ORDER)
  })

  it('seeds 8D fault diagnosis documents and ontology mock data into the pinned project', async () => {
    const detail = await getProjectDetail('proj-001')

    expect(detail.documents.some((item) => item.name.includes('最终线入口EL402升降机带车在高位不下降'))).toBe(true)
    expect(detail.documents.some((item) => item.name.includes('07EL360升降机失速故障导致配重导向轴轮损坏'))).toBe(true)
    expect(detail.documents).toHaveLength(33)
    expect(detail.aiInsightRun?.id).toBe('ai-fd-001')
    expect(detail.runs.some((run) => run.id === 'run-fd-002')).toBe(true)
    expect(detail.currentVersionId).toBe('ver-fd-002')
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'EightDReport')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'implements_prevention')).toBe(true)
    expect(detail.schemaConfig.skills.some((item) => item.id === 'sk-fd-003')).toBe(true)
    expect(detail.actions.some((item) => item.id === 'act-fd-003')).toBe(true)
    expect(detail.functions.some((item) => item.id === 'fn-fd-006')).toBe(true)
  })

  it('seeds product replenishment demo data into the second pinned project', async () => {
    const detail = await getProjectDetail('proj-2418')

    expect(detail.name).toBe('商品补货本体')
    expect(detail.documents.some((item) => item.name.includes('百丽城市单品补货业务本体模型数据说明文档'))).toBe(true)
    expect(detail.documents).toHaveLength(10)
    expect(detail.dataSources).toHaveLength(3)
    expect(detail.aiInsightRun?.id).toBe('ai-rp-001')
    expect(detail.aiInsightRun?.scannedDocumentCount).toBe(10)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'ReplenishmentPlan')).toBe(true)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'PurchaseOrder')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'generated_purchase_order')).toBe(true)
    expect(detail.actions.some((item) => item.id === 'act-rp-003')).toBe(true)
    expect(detail.functions.some((item) => item.id === 'fn-rp-004')).toBe(true)
    expect(detail.runs.find((item) => item.id === 'run-rp-001')?.candidateEntityCount).toBe(90)
    expect(detail.runs.find((item) => item.id === 'run-rp-001')?.candidateRelationCount).toBe(70)
    expect(detail.versions.find((item) => item.id === 'ver-rp-001')?.entityCount).toBe(90)
    expect(detail.versions.find((item) => item.id === 'ver-rp-001')?.relationCount).toBe(70)
    expect(detail.currentVersionId).toBe('ver-rp-001')
  })

  it('seeds customer 360 demo data with complete ontology assets', async () => {
    const detail = await getProjectDetail('proj-1523')

    expect(detail.name).toBe('客户360本体')
    expect(detail.documents.some((item) => item.name.includes('客户360业务本体模型说明书'))).toBe(true)
    expect(detail.documents.some((item) => item.name.includes('交叉销售机会识别训练样本'))).toBe(true)
    expect(detail.documents).toHaveLength(8)
    expect(detail.dataSources).toHaveLength(3)
    expect(detail.aiInsightRun?.id).toBe('ai-c360-001')
    expect(detail.aiInsightRun?.scannedDocumentCount).toBe(8)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'Customer')).toBe(true)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'ServiceTicket')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'promotes_opportunity')).toBe(true)
    expect(detail.schemaConfig.skills.some((item) => item.id === 'sk-c360-003')).toBe(true)
    expect(detail.actions.some((item) => item.id === 'act-c360-002')).toBe(true)
    expect(detail.functions.some((item) => item.id === 'fn-c360-004')).toBe(true)
    expect(detail.runs.find((item) => item.id === 'run-c360-001')?.candidateEntityCount).toBe(76)
    expect(detail.runs.find((item) => item.id === 'run-c360-001')?.candidateRelationCount).toBe(58)
    expect(detail.versions.find((item) => item.id === 'ver-c360-001')?.entityCount).toBe(76)
    expect(detail.versions.find((item) => item.id === 'ver-c360-001')?.relationCount).toBe(58)
    expect(detail.currentVersionId).toBe('ver-c360-001')
  })

  it('seeds task scheduling demo data with complete ontology assets', async () => {
    const detail = await getProjectDetail('proj-1312')

    expect(detail.name).toBe('任务调度本体')
    expect(detail.documents.some((item) => item.name.includes('任务调度本体模型说明书'))).toBe(true)
    expect(detail.documents.some((item) => item.name.includes('班次派工单回写与执行确认样本'))).toBe(true)
    expect(detail.documents).toHaveLength(8)
    expect(detail.dataSources).toHaveLength(3)
    expect(detail.aiInsightRun?.id).toBe('ai-ts-001')
    expect(detail.aiInsightRun?.scannedDocumentCount).toBe(8)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'WorkOrder')).toBe(true)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'DispatchTask')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'issues_dispatch_task')).toBe(true)
    expect(detail.schemaConfig.skills.some((item) => item.id === 'sk-ts-003')).toBe(true)
    expect(detail.actions.some((item) => item.id === 'act-ts-002')).toBe(true)
    expect(detail.functions.some((item) => item.id === 'fn-ts-004')).toBe(true)
    expect(detail.runs.find((item) => item.id === 'run-ts-001')?.candidateEntityCount).toBe(72)
    expect(detail.runs.find((item) => item.id === 'run-ts-001')?.candidateRelationCount).toBe(60)
    expect(detail.versions.find((item) => item.id === 'ver-ts-001')?.entityCount).toBe(72)
    expect(detail.versions.find((item) => item.id === 'ver-ts-001')?.relationCount).toBe(60)
    expect(detail.currentVersionId).toBe('ver-ts-001')
  })

  it('seeds supplier profile demo data with complete ontology assets', async () => {
    const detail = await getProjectDetail('proj-1416')

    expect(detail.name).toBe('供应商画像本体')
    expect(detail.documents.some((item) => item.name.includes('供应商画像本体模型说明书'))).toBe(true)
    expect(detail.documents.some((item) => item.name.includes('采购份额调整与风险复核样本'))).toBe(true)
    expect(detail.documents).toHaveLength(8)
    expect(detail.dataSources).toHaveLength(3)
    expect(detail.aiInsightRun?.id).toBe('ai-sp-001')
    expect(detail.aiInsightRun?.scannedDocumentCount).toBe(8)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'Supplier')).toBe(true)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'FinancialRisk')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'exposed_to_financial_risk')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'classified_into_segment')).toBe(true)
    expect(detail.schemaConfig.skills.some((item) => item.id === 'sk-sp-003')).toBe(true)
    expect(detail.actions.some((item) => item.id === 'act-sp-002')).toBe(true)
    expect(detail.functions.some((item) => item.id === 'fn-sp-004')).toBe(true)
    expect(detail.runs.find((item) => item.id === 'run-sp-001')?.candidateEntityCount).toBe(74)
    expect(detail.runs.find((item) => item.id === 'run-sp-001')?.candidateRelationCount).toBe(56)
    expect(detail.versions.find((item) => item.id === 'ver-sp-001')?.entityCount).toBe(74)
    expect(detail.versions.find((item) => item.id === 'ver-sp-001')?.relationCount).toBe(56)
    expect(detail.currentVersionId).toBe('ver-sp-001')
  })

  it('seeds member profile demo data with complete ontology assets', async () => {
    const detail = await getProjectDetail('proj-2522')

    expect(detail.name).toBe('会员画像本体')
    expect(detail.documents.some((item) => item.name.includes('会员画像本体模型说明书'))).toBe(true)
    expect(detail.documents.some((item) => item.name.includes('精准营销活动编排样本'))).toBe(true)
    expect(detail.documents).toHaveLength(8)
    expect(detail.dataSources).toHaveLength(3)
    expect(detail.aiInsightRun?.id).toBe('ai-mp-001')
    expect(detail.aiInsightRun?.scannedDocumentCount).toBe(8)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'Member')).toBe(true)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'CouponAsset')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'classified_into_lifecycle')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'campaign_uses_coupon')).toBe(true)
    expect(detail.schemaConfig.skills.some((item) => item.id === 'sk-mp-003')).toBe(true)
    expect(detail.actions.some((item) => item.id === 'act-mp-003')).toBe(true)
    expect(detail.functions.some((item) => item.id === 'fn-mp-004')).toBe(true)
    expect(detail.runs.find((item) => item.id === 'run-mp-001')?.candidateEntityCount).toBe(82)
    expect(detail.runs.find((item) => item.id === 'run-mp-001')?.candidateRelationCount).toBe(64)
    expect(detail.versions.find((item) => item.id === 'ver-mp-001')?.entityCount).toBe(82)
    expect(detail.versions.find((item) => item.id === 'ver-mp-001')?.relationCount).toBe(64)
    expect(detail.currentVersionId).toBe('ver-mp-001')
  })

  it('seeds inventory risk demo data with complete ontology assets', async () => {
    const detail = await getProjectDetail('proj-1418')

    expect(detail.name).toBe('库存风险本体')
    expect(detail.documents.some((item) => item.name.includes('库存风险本体模型说明书'))).toBe(true)
    expect(detail.documents.some((item) => item.name.includes('自动补货与调拨建议样本'))).toBe(true)
    expect(detail.documents).toHaveLength(8)
    expect(detail.dataSources).toHaveLength(3)
    expect(detail.aiInsightRun?.id).toBe('ai-ir-001')
    expect(detail.aiInsightRun?.scannedDocumentCount).toBe(8)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'Material')).toBe(true)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'RiskSignal')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'triggers_risk_signal')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'mitigated_by_replenishment')).toBe(true)
    expect(detail.schemaConfig.skills.some((item) => item.id === 'sk-ir-003')).toBe(true)
    expect(detail.actions.some((item) => item.id === 'act-ir-003')).toBe(true)
    expect(detail.functions.some((item) => item.id === 'fn-ir-004')).toBe(true)
    expect(detail.runs.find((item) => item.id === 'run-ir-001')?.candidateEntityCount).toBe(78)
    expect(detail.runs.find((item) => item.id === 'run-ir-001')?.candidateRelationCount).toBe(62)
    expect(detail.versions.find((item) => item.id === 'ver-ir-001')?.entityCount).toBe(78)
    expect(detail.versions.find((item) => item.id === 'ver-ir-001')?.relationCount).toBe(62)
    expect(detail.currentVersionId).toBe('ver-ir-001')
  })

  it('seeds contract constraints demo data with complete ontology assets', async () => {
    const detail = await getProjectDetail('proj-1524')

    expect(detail.name).toBe('合同约束本体')
    expect(detail.documents.some((item) => item.name.includes('合同约束本体模型说明书'))).toBe(true)
    expect(detail.documents.some((item) => item.name.includes('合同履约异常与赔付案例库'))).toBe(true)
    expect(detail.documents).toHaveLength(8)
    expect(detail.dataSources).toHaveLength(3)
    expect(detail.aiInsightRun?.id).toBe('ai-cc-001')
    expect(detail.aiInsightRun?.scannedDocumentCount).toBe(8)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'ContractTemplate')).toBe(true)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'FulfillmentEvent')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'tracked_by_event')).toBe(true)
    expect(detail.schemaConfig.skills.some((item) => item.id === 'sk-cc-003')).toBe(true)
    expect(detail.actions.some((item) => item.id === 'act-cc-002')).toBe(true)
    expect(detail.functions.some((item) => item.id === 'fn-cc-004')).toBe(true)
    expect(detail.runs.find((item) => item.id === 'run-cc-001')?.candidateEntityCount).toBe(68)
    expect(detail.runs.find((item) => item.id === 'run-cc-001')?.candidateRelationCount).toBe(54)
    expect(detail.versions.find((item) => item.id === 'ver-cc-001')?.entityCount).toBe(68)
    expect(detail.versions.find((item) => item.id === 'ver-cc-001')?.relationCount).toBe(54)
    expect(detail.currentVersionId).toBe('ver-cc-001')
  })

  it('seeds legal regulations demo data with richer documents and versions', async () => {
    const detail = await getProjectDetail('proj-5612')

    expect(detail.name).toBe('法律法规库本体')
    expect(detail.documents.some((item) => item.name.includes('个人信息保护法适用条款'))).toBe(true)
    expect(detail.documents.some((item) => item.name.includes('SaaS主协议与数据处理协议审查样本'))).toBe(true)
    expect(detail.documents).toHaveLength(8)
    expect(detail.aiInsightRun?.id).toBe('ai-lr-001')
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'ComplianceObligation')).toBe(true)
    expect(detail.schemaConfig.entityTypes.some((item) => item.name === 'ContractClause')).toBe(true)
    expect(detail.schemaConfig.relationTypes.some((item) => item.name === 'constrains_clause')).toBe(true)
    expect(detail.schemaConfig.skills.some((item) => item.id === 'sk-lr-003')).toBe(true)
    expect(detail.runs.find((item) => item.id === 'run-lr-002')?.candidateEntityCount).toBe(52)
    expect(detail.runs.find((item) => item.id === 'run-lr-002')?.candidateRelationCount).toBe(44)
    expect(detail.versions).toHaveLength(2)
    expect(detail.versions.find((item) => item.id === 'ver-lr-002')?.entityCount).toBe(52)
    expect(detail.versions.find((item) => item.id === 'ver-lr-002')?.relationCount).toBe(44)
    expect(detail.currentVersionId).toBe('ver-lr-002')
  })

  it('keeps pinned projects ahead of newer projects in the configured order', async () => {
    const created = await createProject('最新测试本体', '用于验证置顶排序', 'general')
    await updateProject(created.id, '最新测试本体', '再次更新时间', 'general')

    const projects = await listProjects()

    expect(projects[0]?.name).toBe('故障诊断本体')
    expect(projects[1]?.name).toBe('商品补货本体')
    expect(projects.some(project => project.id === created.id)).toBe(true)
  })

  it('supports local create, update, detail, and delete flows', async () => {
    const created = await createProject('测试本体', '用于验证 mock 项目服务', 'general')
    expect(created.name).toBe('测试本体')

    const detail = await getProjectDetail(created.id)
    expect(detail.description).toBe('用于验证 mock 项目服务')

    const updated = await updateProject(created.id, '测试本体-已更新', '更新后的描述', 'manufacturing')
    expect(updated.name).toBe('测试本体-已更新')
    expect(updated.category).toBe('manufacturing')

    const updatedDetail = await getProjectDetail(created.id)
    expect(updatedDetail.description).toBe('更新后的描述')

    await deleteProject(created.id)
    const projects = await listProjects()
    expect(projects.some(project => project.id === created.id)).toBe(false)
  })

  it('supports local document, ai insight, extraction, review, version, and skill flows', async () => {
    const created = await createProject('流程测试本体', '验证完整 mock 工作流', 'general')

    const document = await uploadProjectDocument(
      created.id,
      new File(['# test'], 'workflow-spec.md', { type: 'text/markdown' }),
    )
    expect(document.fileType).toBe('md')

    await setProjectDocumentEnabled(created.id, document.id, true)

    const aiRun = await runAiSchemaInsight(created.id)
    expect(aiRun.addedEntityCount).toBeGreaterThan(0)

    const extractionRun = await runProjectExtraction(created.id)
    expect(extractionRun.status).toBe('COMPLETED')
    expect(extractionRun.reviewItems.length).toBeGreaterThan(0)

    const firstItem = extractionRun.reviewItems[0]
    const updatedItem = await updateRunReviewItem(created.id, extractionRun.id, firstItem.id, 'APPROVED')
    expect(updatedItem.status).toBe('APPROVED')

    const pendingIds = extractionRun.reviewItems.slice(1, 3).map(item => item.id)
    const batchResult = await batchUpdateRunReviewItems(created.id, extractionRun.id, pendingIds, 'REJECTED')
    expect(batchResult.updatedCount).toBe(pendingIds.length)

    const version = await publishRunVersion(created.id, extractionRun.id, 'v1 mock publish')
    expect(version.version).toBe('v1')

    const versionItems = await getVersionItems(created.id, version.id)
    expect(versionItems.length).toBeGreaterThan(0)

    const skill = await uploadCustomSkill(
      created.id,
      new File(['zip-content'], 'custom-skill.zip', { type: 'application/zip' }),
    )
    expect(skill.source).toBe('uploaded')

    const detail = await getProjectDetail(created.id)
    expect(detail.currentVersionId).toBe(version.id)
    expect(detail.schemaConfig.skills.some(item => item.id === skill.id)).toBe(true)
  })

  it('supports local function save and run flows', async () => {
    const created = await createProject('函数测试本体', '验证函数管理能力', 'general')

    const fn = await createProjectFunction(created.id, {
      name: '目标库存缺口计算',
      description: '用于验证保存与运行',
      scriptContent: 'def calc_target_stock_gap(daily_sales_velocity: float, coverage_days: int, on_hand_qty: int, in_transit_qty: int = 0):\n    return {"targetStock": round(daily_sales_velocity * coverage_days), "currentStock": on_hand_qty + in_transit_qty, "gapQty": max(round(daily_sales_velocity * coverage_days) - (on_hand_qty + in_transit_qty), 0)}',
      status: 'ACTIVE',
    })

    const updated = await updateProjectFunction(created.id, fn.id, {
      name: '目标库存缺口计算-已保存',
      description: '保存后的描述',
      scriptContent: fn.scriptContent,
    })
    expect(updated.name).toBe('目标库存缺口计算-已保存')
    expect(updated.description).toBe('保存后的描述')

    const template = getProjectFunctionInputTemplate(updated)
    expect(template).toMatchObject({
      daily_sales_velocity: 3.8,
      coverage_days: 12,
      on_hand_qty: 21,
    })

    const result = await runProjectFunction(created.id, fn.id, {
      input: {
        daily_sales_velocity: 3.8,
        coverage_days: 12,
        on_hand_qty: 21,
        in_transit_qty: 6,
      },
      scriptContent: updated.scriptContent,
      name: updated.name,
    })

    expect(result.status).toBe('SUCCESS')
    expect(result.mode).toBe('HANDLER')
    expect(result.output).toMatchObject({
      targetStock: 46,
      currentStock: 27,
      gapQty: 19,
    })
  })

  it('ignores localStorage and always reseeds project data from memory on reset', async () => {
    localStorage.setItem('deepexios_projects_v3', JSON.stringify({
      projects: [],
      idSeq: 1,
      _v: 1,
    }))

    const detail = await getProjectDetail('proj-001')

    expect(detail.schemaConfig.skills.some((item) => item.id === 'sk-fd-001')).toBe(true)
    expect(detail.actions.some((item) => item.id === 'act-fd-001')).toBe(true)
    expect(detail.functions.some((item) => item.id === 'fn-fd-006')).toBe(true)
  })

  it('runs the seeded fault diagnosis summary function with a dedicated handler', async () => {
    const detail = await getProjectDetail('proj-001')
    const fn = detail.functions.find((item) => item.id === 'fn-fd-006')

    expect(fn).toBeTruthy()
    if (!fn) {
      return
    }

    const result = await runProjectFunction('proj-001', fn.id, {
      input: getProjectFunctionInputTemplate(fn),
      scriptContent: fn.scriptContent,
      name: fn.name,
    })

    expect(result.status).toBe('SUCCESS')
    expect(result.mode).toBe('HANDLER')
    expect(result.output).toMatchObject({
      equipmentId: 'equip-vm850',
      priority: 'P1',
      summary: '主轴温升异常，建议优先排查 主轴轴承早期剥落',
    })
  })

  it('returns preview output for functions without dedicated handlers', async () => {
    const created = await createProject('预览函数本体', '验证预览执行', 'general')
    const fn = await createProjectFunction(created.id, {
      name: '自定义试验函数',
      description: '没有专用 handler',
      scriptContent: 'def custom_preview(foo: str, bar: int = 0):\n    return {"foo": foo, "bar": bar}',
      status: 'DRAFT',
    })

    const result = await runProjectFunction(created.id, fn.id, {
      input: { foo: 'demo' },
      scriptContent: fn.scriptContent,
      name: fn.name,
    })

    expect(result.status).toBe('SUCCESS')
    expect(result.mode).toBe('PREVIEW')
    expect(result.output).toMatchObject({
      missingParams: ['bar'],
    })
  })
})
