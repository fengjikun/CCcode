import type { ReactNode } from 'react'
import { Button, Popconfirm, Space, Tooltip } from 'antd'

export interface ActionItem {
  key: string
  icon: ReactNode
  tooltip: string
  onClick?: () => void
  /** 危险按钮（红色） */
  danger?: boolean
  /** 按钮自定义样式 */
  style?: React.CSSProperties
  /** 是否禁用 */
  disabled?: boolean
  /** 删除确认文案，设置后自动包裹 Popconfirm */
  confirm?: string
}

interface ActionColumnProps {
  actions: ActionItem[]
}

/**
 * 通用表格操作列：Tooltip + Button + 可选 Popconfirm。
 */
export default function ActionColumn({ actions }: ActionColumnProps) {
  return (
    <Space size="small">
      {actions.map(a => {
        const btn = (
          <Tooltip title={a.tooltip} key={a.key}>
            <Button
              type="text"
              size="small"
              icon={a.icon}
              danger={a.danger}
              disabled={a.disabled}
              style={a.style}
              onClick={a.confirm ? undefined : a.onClick}
            />
          </Tooltip>
        )

        if (a.confirm) {
          return (
            <Popconfirm
              key={a.key}
              title={a.confirm}
              onConfirm={a.onClick}
              disabled={a.disabled}
            >
              {btn}
            </Popconfirm>
          )
        }

        return btn
      })}
    </Space>
  )
}
