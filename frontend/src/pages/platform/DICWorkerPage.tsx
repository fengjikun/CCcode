import { Card, Col, Row, Typography } from 'antd'

const { Title, Text, Paragraph } = Typography

const workers = [
  { icon: '🏗️', title: '本体建模助手', desc: '智能本体设计与验证' },
  { icon: '📊', title: '数据质量巡检员', desc: '自动化数据质量检查与异常检测' },
  { icon: '🔗', title: '知识图谱维护员', desc: '实体冲突发现、关系缺失检测' },
  { icon: '📝', title: 'Schema 迁移助手', desc: '本体升级迁移脚本自动生成' },
]

export default function DICWorkerPage() {
  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>DIC 数字员工空间</Title>
          <Text type="secondary">面向数据工程和平台运维的内部数字员工</Text>
        </div>

        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          {workers.map((w, i) => (
            <Col span={12} key={i}>
              <Card hoverable size="small" className="worker-card" style={{ height: '100%' }}>
                <Title level={5}>{w.icon} {w.title}</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>{w.desc}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  )
}
