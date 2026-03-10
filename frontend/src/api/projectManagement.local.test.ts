import { beforeEach, describe, expect, it } from 'vitest'

import {
  batchUpdateRunReviewItems,
  createProject,
  getVersionItems,
  deleteProject,
  getProjectDetail,
  listProjects,
  publishRunVersion,
  runAiSchemaInsight,
  runProjectExtraction,
  setProjectDocumentEnabled,
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
    expect(projects[0]?.name).toBe('故障诊断本体')
  })

  it('keeps 故障诊断本体 pinned ahead of newer projects', async () => {
    const created = await createProject('最新测试本体', '用于验证置顶排序', 'general')
    await updateProject(created.id, '最新测试本体', '再次更新时间', 'general')

    const projects = await listProjects()

    expect(projects[0]?.name).toBe('故障诊断本体')
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
})
