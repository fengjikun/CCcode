/** L2 数据集准备类型定义 */

export type TransformStatus = 'Success' | 'Running' | 'Failed' | 'Idle'

export type TransformType =
  | 'DocumentParsing'
  | 'LayoutRecovery'
  | 'MultimodalExtraction'
  | 'ChunkAnnotation'
  | 'DatasetPackaging'

export const TRANSFORM_TYPE_LABELS: Record<TransformType, string> = {
  DocumentParsing: '通用文档解析',
  LayoutRecovery: '版面恢复',
  MultimodalExtraction: '多模态要素抽取',
  ChunkAnnotation: '切片与标注准备',
  DatasetPackaging: '数据集封装发布',
}

export const STATUS_COLORS: Record<TransformStatus, string> = {
  Success: 'green',
  Running: 'orange',
  Failed: 'red',
  Idle: 'default',
}

export const TRANSFORM_STATUS_LABELS: Record<TransformStatus, string> = {
  Success: '已完成',
  Running: '运行中',
  Failed: '失败',
  Idle: '待运行',
}

export interface TransformProject {
  id: string
  name: string
  description: string
  type: TransformType
  inputSources: string[]       // 关联的文档源 ID
  inputSourceNames: string[]   // 文档源显示名
  outputDatasets: string[]
  status: TransformStatus
  records: number
  duration: string
  lastRun: string | null
  schedule: string             // 调度策略
  createdAt: string
  updatedAt: string
}
