import { Tag } from 'antd'
import type { ExtractionRun, ActionStatus, FunctionStatus, StructuredDataSource } from '../../types/projectMvp'

export function RunStatusTag({ status }: { status: ExtractionRun['status'] }) {
  if (status === 'RUNNING') return <Tag color="processing">运行中</Tag>
  if (status === 'FAILED') return <Tag color="error">失败</Tag>
  return <Tag color="success">已完成</Tag>
}

export function ActionStatusTag({ status }: { status: ActionStatus }) {
  if (status === 'ACTIVE') return <Tag color="success">ACTIVE</Tag>
  return <Tag color="default">DRAFT</Tag>
}

export function FunctionStatusTag({ status }: { status: FunctionStatus }) {
  if (status === 'ACTIVE') return <Tag color="success">ACTIVE</Tag>
  return <Tag color="default">DRAFT</Tag>
}

export function DataSourceStatusTag({ status }: { status: StructuredDataSource['status'] }) {
  if (status === 'SUCCESS') return <Tag color="success">已连接</Tag>
  if (status === 'FAILED') return <Tag color="error">连接失败</Tag>
  return <Tag>未测试</Tag>
}
