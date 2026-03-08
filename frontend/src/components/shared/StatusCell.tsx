import { Tag } from 'antd'

interface StatusCellProps {
  value: string
  colors: Record<string, string>
  dotMap?: Record<string, 'active' | 'warning' | 'error'>
}

/**
 * 通用状态列渲染：status-dot + Tag。
 * - `colors`: status → ant Tag color
 * - `dotMap`: status → dot className（active/warning/error），可选
 */
export default function StatusCell({ value, colors, dotMap }: StatusCellProps) {
  const dotClass = dotMap?.[value]
  return (
    <span>
      {dotClass && <span className={`status-dot ${dotClass}`} />}
      <Tag color={colors[value] || 'default'}>{value}</Tag>
    </span>
  )
}
