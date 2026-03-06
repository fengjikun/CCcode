import { Tag } from 'antd'
import type { ActionStatus, ExtractionRun, FunctionStatus, StructuredDataSource } from '../../types/projectMvp'

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message) || fallback
  }
  return fallback
}

export function runStatusTag(status: ExtractionRun['status']) {
  if (status === 'RUNNING') return <Tag color="processing">运行中</Tag>
  if (status === 'FAILED') return <Tag color="error">失败</Tag>
  return <Tag color="success">已完成</Tag>
}

export function actionStatusTag(status: ActionStatus) {
  if (status === 'ACTIVE') return <Tag color="success">ACTIVE</Tag>
  return <Tag color="default">DRAFT</Tag>
}

export function functionStatusTag(status: FunctionStatus) {
  if (status === 'ACTIVE') return <Tag color="success">ACTIVE</Tag>
  return <Tag color="default">DRAFT</Tag>
}

export function dataSourceStatusTag(status: StructuredDataSource['status']) {
  if (status === 'SUCCESS') return <Tag color="success">已连接</Tag>
  if (status === 'FAILED') return <Tag color="error">连接失败</Tag>
  return <Tag>未测试</Tag>
}
