import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd'
import {
  CloudServerOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

const registryData = [
  { key: '1', name: 'purchase-order-classifier', version: 'v2.1.0', stage: 'Production', accuracy: '95.3%', framework: 'PyTorch' },
  { key: '2', name: 'equipment-fault-predictor',  version: 'v1.8.2', stage: 'Production', accuracy: '92.7%', framework: 'TensorFlow' },
  { key: '3', name: 'demand-forecaster',          version: 'v3.0.1', stage: 'Staging',    accuracy: '88.4%', framework: 'scikit-learn' },
  { key: '4', name: 'sentiment-analyzer',         version: 'v1.2.0', stage: 'Production', accuracy: '91.2%', framework: 'Transformers' },
]

const stageColor: Record<string, string> = { Production: 'green', Staging: 'orange', Archived: 'default' }

const columns = [
  { title: '模型名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
  { title: '版本', dataIndex: 'version', key: 'version' },
  {
    title: '阶段',
    dataIndex: 'stage',
    key: 'stage',
    render: (v: string) => (
      <span>
        <span className={`status-dot ${v === 'Production' ? 'active' : 'warning'}`} />
        <Tag color={stageColor[v] || 'default'}>{v}</Tag>
      </span>
    ),
  },
  { title: '准确率', dataIndex: 'accuracy', key: 'accuracy' },
  { title: '框架', dataIndex: 'framework', key: 'framework' },
]

const statItems = [
  { title: '已部署模型', value: 23, icon: <CloudServerOutlined />, cls: 'stat-primary' },
  { title: '日请求量', value: '156K', icon: <ThunderboltOutlined />, cls: 'stat-info' },
  { title: '平均延迟', value: '45ms', icon: <DashboardOutlined />, cls: 'stat-success' },
  { title: '可用率', value: '99.8%', icon: <SafetyCertificateOutlined />, cls: 'stat-purple' },
]

export default function ModelGatewayPage() {
  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>模型网关</Title>
          <Text type="secondary">统一推理入口、路由与监控</Text>
        </div>

        <Row gutter={16} style={{ margin: '20px 0' }}>
          {statItems.map((s) => (
            <Col span={6} key={s.title}>
              <Card size="small" className={`stat-card card-hover ${s.cls}`}>
                <Statistic
                  title={s.title}
                  value={s.value}
                  prefix={<span style={{ fontSize: 18, marginRight: 4 }}>{s.icon}</span>}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card className="section-card" title="Model Registry">
        <Table dataSource={registryData} columns={columns} pagination={false} size="middle" />
      </Card>
    </div>
  )
}
