import type { ReactNode } from 'react'
import { Card, Col, Row, Statistic } from 'antd'

export interface StatCardItem {
  title: string
  value: string | number
  icon?: ReactNode
  cls?: string
}

interface StatCardsProps {
  items: StatCardItem[]
  gutter?: number | [number, number]
  style?: React.CSSProperties
}

/**
 * 通用统计卡片行。
 * - 自动根据项数计算 span（4项=6, 5项=flex, 6项=4）
 * - 统一 gutter 默认 [12, 12]
 */
export default function StatCards({ items, gutter = [12, 12], style }: StatCardsProps) {
  const useSpan = items.length <= 6
  const span = useSpan ? Math.floor(24 / items.length) : undefined

  return (
    <Row gutter={gutter} style={{ margin: '16px 0 20px', ...style }}>
      {items.map(s => (
        <Col span={span} flex={useSpan ? undefined : 1} key={s.title}>
          <Card size="small" className={`stat-card card-hover ${s.cls || ''}`}>
            <Statistic
              title={s.title}
              value={s.value}
              prefix={s.icon ? <span style={{ fontSize: 18, marginRight: 4 }}>{s.icon}</span> : undefined}
            />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
