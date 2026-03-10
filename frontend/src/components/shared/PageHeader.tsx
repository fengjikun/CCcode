import { Tag, Typography } from 'antd'

const { Title, Text } = Typography

interface PageHeaderProps {
  title: string
  subtitle?: string
}

/**
 * 统一页面标题区块。
 */
export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="page-header">
      {subtitle && <Text type="secondary">{subtitle}</Text>}
    </div>
  )
}
