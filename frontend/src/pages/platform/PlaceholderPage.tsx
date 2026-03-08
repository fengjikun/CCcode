import { Card, Tag, Typography, Row, Col } from 'antd'
import {
  ExperimentOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

const { Title, Paragraph, Text } = Typography

export interface FeatureItem {
  title: string
  desc: string
  priority?: 'P0' | 'P1' | 'P2'
}

interface PlaceholderPageProps {
  icon?: ReactNode
  title: string
  subtitle: string
  description: string
  features: FeatureItem[]
  pipelineLevel?: string
}

const priorityColor: Record<string, string> = {
  P0: 'red',
  P1: 'orange',
  P2: 'blue',
}

export default function PlaceholderPage({
  icon,
  title,
  subtitle,
  description,
  features,
  pipelineLevel,
}: PlaceholderPageProps) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{icon || <ExperimentOutlined />}</span>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {title}
              {pipelineLevel && (
                <Tag color="geekblue" style={{ marginLeft: 10, fontSize: 12 }}>
                  {pipelineLevel}
                </Tag>
              )}
            </Title>
            <Text type="secondary">{subtitle}</Text>
          </div>
        </div>
        <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>{description}</Paragraph>
      </Card>

      <Row gutter={[16, 16]}>
        {features.map((f, i) => (
          <Col xs={24} sm={12} lg={8} key={i}>
            <Card
              size="small"
              hoverable
              style={{ height: '100%', borderLeft: '3px solid #4096ff' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <Text strong>{f.title}</Text>
                {f.priority && (
                  <Tag color={priorityColor[f.priority]} style={{ marginLeft: 8 }}>
                    {f.priority}
                  </Tag>
                )}
              </div>
              <Paragraph
                type="secondary"
                style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}
              >
                {f.desc}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginTop: 16, textAlign: 'center' }}>
        <Text type="secondary">
          该模块正在建设中，当前为功能规划预览
        </Text>
      </Card>
    </div>
  )
}
