import type { ReactNode } from 'react'
import { Alert, Card, Col, Row, Space, Tag, Typography } from 'antd'
import type { StatCardItem } from '../../components/shared/StatCards'
import PageHeader from '../../components/shared/PageHeader'
import StatCards from '../../components/shared/StatCards'

const { Text } = Typography

interface SectionFeature {
  title: string
  description: string
  tags?: string[]
  icon?: ReactNode
}

interface DataPlatformSectionPageProps {
  title: string
  subtitle: string
  statusText: string
  stats: StatCardItem[]
  features: SectionFeature[]
  milestones: string[]
}

export default function DataPlatformSectionPage({
  title,
  subtitle,
  statusText,
  stats,
  features,
  milestones,
}: DataPlatformSectionPageProps) {
  return (
    <div className="page-container">
      <Card className="section-card">
        <PageHeader title={title} subtitle={subtitle} />

        <StatCards items={stats} />

        <Alert
          showIcon
          type="info"
          message={`${title}模块当前已纳入“数据平台”菜单结构`}
          description={`当前先承接信息架构与能力规划，状态：${statusText}。后续可在此页逐步接入真实指标、规则配置和任务联动能力。`}
        />

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} xl={16}>
            <Card title="核心能力规划">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {features.map(feature => (
                  <Card key={feature.title} size="small">
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space size={8}>
                        {feature.icon}
                        <Text strong>{feature.title}</Text>
                      </Space>
                      <Text type="secondary">{feature.description}</Text>
                      {feature.tags && feature.tags.length > 0 && (
                        <Space size={[6, 6]} wrap>
                          {feature.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
                        </Space>
                      )}
                    </Space>
                  </Card>
                ))}
              </Space>
            </Card>
          </Col>

          <Col xs={24} xl={8}>
            <Card title="近期建设重点">
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {milestones.map((milestone, index) => (
                  <Card key={milestone} size="small">
                    <Text strong>{`0${index + 1}`}</Text>
                    <div style={{ marginTop: 6 }}>
                      <Text type="secondary">{milestone}</Text>
                    </div>
                  </Card>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
