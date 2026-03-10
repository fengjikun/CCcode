import { describe, expect, it } from 'vitest'
import { buildGraphFromReviews, parseEntityTitle, parseRelationTitle, UNTYPED_ENTITY_TYPE } from './projectGraph.helpers'
import type { ReviewItem, ReviewStatus } from '../types/projectMvp'

describe('projectGraph helpers', () => {
  it('parses current entity title format', () => {
    expect(parseEntityTitle('VM-850 立式加工中心 (Equipment)')).toEqual({
      name: 'VM-850 立式加工中心',
      type: 'Equipment',
    })
  })

  it('falls back to an untyped entity when title has no explicit type', () => {
    expect(parseEntityTitle('主轴组件')).toEqual({
      name: '主轴组件',
      type: UNTYPED_ENTITY_TYPE,
    })
  })

  it('parses current relation title format', () => {
    expect(parseRelationTitle('VM-850 立式加工中心 → prone_to → 主轴温升异常')).toEqual({
      domain: undefined,
      domainName: 'VM-850 立式加工中心',
      range: undefined,
      rangeName: '主轴温升异常',
      rel: 'prone_to',
    })
  })

  it('builds graph from name-only relation titles', () => {
    const approved = new Set<ReviewStatus>(['APPROVED'])
    const reviews: ReviewItem[] = [
      {
        id: '1',
        kind: 'ENTITY',
        title: 'VM-850 立式加工中心 (Equipment)',
        evidence: 'graph.jsonl - equip_vm850',
        confidence: 0.98,
        status: 'APPROVED',
      },
      {
        id: '2',
        kind: 'ENTITY',
        title: '主轴温升异常 (Phenomenon)',
        evidence: 'graph.jsonl - phen_spindle_hot',
        confidence: 0.97,
        status: 'APPROVED',
      },
      {
        id: '3',
        kind: 'RELATION',
        title: 'VM-850 立式加工中心 → prone_to → 主轴温升异常',
        evidence: 'graph.jsonl relation',
        confidence: 0.97,
        status: 'APPROVED',
      },
    ]

    expect(buildGraphFromReviews(reviews, approved)).toEqual({
      nodes: [
        {
          id: 'node_1',
          type: 'Equipment',
          label: 'VM-850 立式加工中心',
          props: {
            status: 'APPROVED',
            confidence: '98%',
            evidence: 'graph.jsonl - equip_vm850',
          },
        },
        {
          id: 'node_2',
          type: 'Phenomenon',
          label: '主轴温升异常',
          props: {
            status: 'APPROVED',
            confidence: '97%',
            evidence: 'graph.jsonl - phen_spindle_hot',
          },
        },
      ],
      links: [
        {
          source: 'node_1',
          target: 'node_2',
          rel: 'prone_to',
        },
      ],
    })
  })

  it('builds graph from untyped entity review items', () => {
    const approved = new Set<ReviewStatus>(['APPROVED'])
    const reviews: ReviewItem[] = [
      {
        id: '1',
        kind: 'ENTITY',
        title: '主轴组件',
        evidence: '文档第3页',
        confidence: 0.91,
        status: 'APPROVED',
      },
      {
        id: '2',
        kind: 'ENTITY',
        title: '液压站',
        evidence: '文档第4页',
        confidence: 0.88,
        status: 'APPROVED',
      },
      {
        id: '3',
        kind: 'RELATION',
        title: '主轴组件 → depends_on → 液压站',
        evidence: '文档第4页',
        confidence: 0.86,
        status: 'APPROVED',
      },
    ]

    expect(buildGraphFromReviews(reviews, approved)).toEqual({
      nodes: [
        {
          id: 'node_1',
          type: UNTYPED_ENTITY_TYPE,
          label: '主轴组件',
          props: {
            status: 'APPROVED',
            confidence: '91%',
            evidence: '文档第3页',
          },
        },
        {
          id: 'node_2',
          type: UNTYPED_ENTITY_TYPE,
          label: '液压站',
          props: {
            status: 'APPROVED',
            confidence: '88%',
            evidence: '文档第4页',
          },
        },
      ],
      links: [
        {
          source: 'node_1',
          target: 'node_2',
          rel: 'depends_on',
        },
      ],
    })
  })
})
