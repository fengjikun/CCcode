/** L2 数据转换类型定义 */

export type TransformStatus = 'Success' | 'Running' | 'Failed' | 'Idle'

export type TransformType = 'ETL' | 'Join' | 'Aggregate' | 'Normalize' | 'Custom'

export const TRANSFORM_TYPE_LABELS: Record<TransformType, string> = {
  ETL: '抽取-转换-加载',
  Join: '跨源关联',
  Aggregate: '聚合计算',
  Normalize: '规范化输出',
  Custom: '自定义脚本',
}

export const STATUS_COLORS: Record<TransformStatus, string> = {
  Success: 'green',
  Running: 'orange',
  Failed: 'red',
  Idle: 'default',
}

export interface TransformProject {
  id: string
  name: string
  description: string
  type: TransformType
  inputSources: string[]       // 关联的数据源 ID
  inputSourceNames: string[]   // 数据源显示名
  outputDatasets: string[]
  status: TransformStatus
  records: number
  duration: string
  lastRun: string | null
  schedule: string             // cron 表达式或描述
  createdAt: string
  updatedAt: string
}
