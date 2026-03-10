import { describe, expect, it } from 'vitest'

import { getPrimaryEvalMetric, summarizeEvalSample } from './modelEvaluation.helpers'

describe('modelEvaluation helpers', () => {
  it('prefers pass rate for instruction-following tasks', () => {
    expect(
      getPrimaryEvalMetric({
        taskType: 'instruction-following',
        passRate: 91.8,
      }),
    ).toEqual({ label: 'Pass Rate', value: '91.8%' })
  })

  it('prefers grounded score for grounded vqa tasks', () => {
    expect(
      getPrimaryEvalMetric({
        taskType: 'grounded-vqa',
        groundedScore: 90.2,
      }),
    ).toEqual({ label: 'Grounded Score', value: '90.2%' })
  })

  it('summarizes judge and human labels when present', () => {
    expect(
      summarizeEvalSample({
        judgeVerdict: '通过',
        humanLabel: 'grounded-vqa',
      }),
    ).toBe('Judge: 通过 / Human: grounded-vqa')
  })
})
