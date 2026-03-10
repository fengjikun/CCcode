import { describe, expect, it } from 'vitest'

import {
  DATASET_TYPE_LABELS,
  MODEL_FAMILY_LABELS,
  MODEL_MODALITY_LABELS,
  TRAIN_STAGE_LABELS,
} from './modelCenter'

describe('modelCenter shared domain vocabulary', () => {
  it('supports only llm and vl model families', () => {
    expect(Object.keys(MODEL_FAMILY_LABELS)).toEqual(['LLM', 'VL'])
  })

  it('exposes large-model train stages used by the model center', () => {
    expect(Object.keys(TRAIN_STAGE_LABELS)).toEqual(['pretrain', 'sft', 'lora', 'qlora', 'dpo'])
  })

  it('exposes model modalities with Chinese labels', () => {
    expect(MODEL_MODALITY_LABELS).toEqual({
      text: '文本',
      'image-text': '图文',
    })
  })

  it('covers the large-model dataset types used by training and alignment', () => {
    expect(Object.keys(DATASET_TYPE_LABELS)).toEqual([
      'instruction',
      'conversation',
      'preference',
      'image-caption',
      'vqa',
    ])
  })
})
