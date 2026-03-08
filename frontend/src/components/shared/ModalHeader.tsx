import type { ReactNode } from 'react'
import { Space } from 'antd'

interface ModalHeaderProps {
  icon: ReactNode
  title: string
  /** 图标颜色，默认 #1677ff */
  color?: string
}

/**
 * 统一弹窗标题：Icon + 文字。
 */
export default function ModalHeader({ icon, title, color = '#1677ff' }: ModalHeaderProps) {
  return (
    <Space>
      <span style={{ color }}>{icon}</span>
      {title}
    </Space>
  )
}
