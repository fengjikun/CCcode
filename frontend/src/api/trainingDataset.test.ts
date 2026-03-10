import { describe, expect, it } from 'vitest'

import { normalizeTrainingDataset } from './trainingDataset'

describe('trainingDataset legacy normalization', () => {
  it('fills missing fields for persisted legacy dataset records', () => {
    const normalized = normalizeTrainingDataset({
      key: '1',
      name: 'purchase_orders_v3',
      source: 'ontology://PurchaseOrder/output',
      trainSplit: 70,
      valSplit: 15,
      testSplit: 15,
      records: 12450,
      version: 'v3.0',
      status: 'Ready',
      size: '156 MB',
      createdAt: '2025-02-15',
      updatedAt: '2025-03-08',
      linkedModels: ['purchase-order-classifier'],
      format: 'JSONL',
      promptTemplate: '{}',
      schemaFields: ['设备编号', '设备名称'],
      buildProgress: 100,
      buildLog: ['done'],
      sampleData: [{ 设备编号: 'PO-1' }],
    })

    expect(normalized.datasetType).toBe('instruction')
    expect(normalized.modality).toBe('text')
    expect(normalized.linkedRuns).toEqual([])
    expect(normalized.annotationSchema).toEqual(['设备编号', '设备名称'])
    expect(normalized.qualityScore).toBeGreaterThan(0)
    expect(normalized.tokenCount).toBeGreaterThan(0)
  })
})
