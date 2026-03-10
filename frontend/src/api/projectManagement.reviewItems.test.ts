import { describe, expect, it } from 'vitest'
import { buildReviewItemsForRun } from './projectManagement'
import type { ProjectDetail, ExtractionRun } from '../types/projectMvp'

function createTestProject(): ProjectDetail {
  return {
    id: 'proj-test',
    name: '测试本体',
    category: 'general',
    description: 'test',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
    documents: [],
    dataSources: [],
    schemaConfig: {
      entityTypes: [
        { id: 'et-1', name: 'Equipment', properties: [] },
        { id: 'et-2', name: 'Phenomenon', properties: [] },
      ],
      relationTypes: [
        { id: 'rt-1', name: 'prone_to', domain: 'Equipment', range: 'Phenomenon', properties: [] },
      ],
      entityScope: 'test',
      relationScope: 'test',
      skills: [],
      updatedAt: '2026-03-10T00:00:00.000Z',
    },
    runs: [],
    versions: [],
    actions: [],
    functions: [],
  }
}

function createIdFactory() {
  let seq = 0
  return () => `ri-test-${++seq}`
}

describe('buildReviewItemsForRun', () => {
  it('matches candidate counts and pending count', () => {
    const project = createTestProject()
    const run: Pick<ExtractionRun, 'candidateEntityCount' | 'candidateRelationCount' | 'pendingReviewCount' | 'reviewItems'> = {
      candidateEntityCount: 12,
      candidateRelationCount: 8,
      pendingReviewCount: 5,
      reviewItems: [],
    }

    const items = buildReviewItemsForRun(project, run, createIdFactory())

    expect(items).toHaveLength(20)
    expect(items.filter(item => item.kind === 'ENTITY')).toHaveLength(12)
    expect(items.filter(item => item.kind === 'RELATION')).toHaveLength(8)
    expect(items.filter(item => item.status === 'PENDING')).toHaveLength(5)
    expect(items[0]?.title).toMatch(/\(Equipment\)$/)
    expect(items[12]?.title).toContain('→ prone_to →')
  })

  it('preserves existing review items and only appends missing ones', () => {
    const project = createTestProject()
    const existing = [
      {
        id: 'ri-existing-1',
        kind: 'ENTITY' as const,
        title: '设备A (Equipment)',
        evidence: 'seed entity',
        confidence: 0.98,
        status: 'APPROVED' as const,
      },
      {
        id: 'ri-existing-2',
        kind: 'RELATION' as const,
        title: '设备A (Equipment) → prone_to → 现象A (Phenomenon)',
        evidence: 'seed relation',
        confidence: 0.95,
        status: 'PENDING' as const,
      },
    ]
    const run: Pick<ExtractionRun, 'candidateEntityCount' | 'candidateRelationCount' | 'pendingReviewCount' | 'reviewItems'> = {
      candidateEntityCount: 4,
      candidateRelationCount: 3,
      pendingReviewCount: 2,
      reviewItems: existing,
    }

    const items = buildReviewItemsForRun(project, run, createIdFactory())

    expect(items).toHaveLength(7)
    expect(items[0]).toEqual(existing[0])
    expect(items[1]).toEqual(existing[1])
    expect(items.filter(item => item.status === 'PENDING')).toHaveLength(2)
  })
})
