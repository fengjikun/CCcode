import { describe, expect, it } from 'vitest'

import { buildDefaultEvalTasks } from '../api/modelEvaluation'
import { buildDefaultRegisteredModels, buildDefaultGatewayRoutes } from '../api/modelGateway'
import { buildDefaultTrainingProjects } from '../api/modelTraining'
import { buildDefaultTrainingDatasets } from '../api/trainingDataset'
import {
  DATASET_TYPE_LABELS,
  MODEL_CENTER_PAGE_LABELS,
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

  it('replaces legacy training projects with llm and vl project samples', () => {
    const projects = buildDefaultTrainingProjects()

    expect(projects.some(project => project.modelFamily === 'LLM')).toBe(true)
    expect(projects.some(project => project.modelFamily === 'VL')).toBe(true)
    expect(projects.map(project => project.name)).not.toEqual(
      expect.arrayContaining(['demand-forecaster', 'supplier-risk-scorer', 'equipment-fault-predictor']),
    )
  })

  it('uses large-model dataset samples instead of structured feature rows', () => {
    const datasets = buildDefaultTrainingDatasets()

    expect(datasets.some(dataset => dataset.datasetType === 'conversation')).toBe(true)
    expect(datasets.some(dataset => dataset.datasetType === 'vqa')).toBe(true)
    expect(datasets.some(dataset => dataset.tokenCount && dataset.tokenCount > 0)).toBe(true)
    expect(
      datasets.some(dataset =>
        dataset.sampleData.some(sample => 'messages' in sample || 'chosen' in sample || 'image' in sample),
      ),
    ).toBe(true)
  })

  it('uses large-model evaluation tasks instead of traditional classifier tasks', () => {
    const tasks = buildDefaultEvalTasks()

    expect(tasks.some(task => task.taskType === 'instruction-following')).toBe(true)
    expect(tasks.some(task => task.taskType === 'grounded-vqa')).toBe(true)
    expect(tasks.map(task => task.modelName)).not.toEqual(
      expect.arrayContaining(['equipment-fault-predictor', 'demand-forecaster', 'supplier-risk-scorer']),
    )
  })

  it('uses unified llm and vl gateway routes instead of predictor endpoints', () => {
    const models = buildDefaultRegisteredModels()
    const routes = buildDefaultGatewayRoutes()

    expect(models.some(model => model.modelFamily === 'LLM')).toBe(true)
    expect(models.some(model => model.modelFamily === 'VL')).toBe(true)
    expect(models.every(model => (model.contextWindow ?? 0) > 0)).toBe(true)
    expect(routes.map(route => route.path)).toEqual(
      expect.arrayContaining(['/chat/completions', '/responses', '/vl/understand', '/doc/parse']),
    )
  })

  it('exposes the renamed model center navigation labels', () => {
    expect(MODEL_CENTER_PAGE_LABELS).toEqual({
      gateway: '推理网关',
      training: '训练与微调',
      evaluation: '评测与对齐',
      datasets: '训练语料',
    })
  })
})
