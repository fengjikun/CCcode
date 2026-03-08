import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd'
import {
  DatabaseOutlined,
  SwapOutlined,
  ApartmentOutlined,
  RobotOutlined,
  ExperimentOutlined,
  ApiOutlined,
  TeamOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

const { Title, Text } = Typography

/* ───── L1→L7 pipeline stages ───── */
interface Stage { key: string; label: string; icon: ReactNode; color: string }

const stages: Stage[] = [
  { key: 'L1', label: 'Datasource',      icon: <DatabaseOutlined />,   color: '#52c41a' },
  { key: 'L2', label: 'Transform',        icon: <SwapOutlined />,       color: '#faad14' },
  { key: 'L3', label: 'Ontology',         icon: <ApartmentOutlined />,  color: '#1677ff' },
  { key: 'L4', label: 'Co-worker',        icon: <RobotOutlined />,      color: '#722ed1' },
  { key: 'L5', label: 'Model Training',   icon: <ExperimentOutlined />, color: '#eb2f96' },
  { key: 'L6', label: 'Model Gateway',    icon: <ApiOutlined />,        color: '#fa8c16' },
  { key: 'L7', label: 'Workflow Apps',     icon: <TeamOutlined />,       color: '#13c2c2' },
]

/* ───── Health table mock data ───── */
const healthData = [
  { key: '1', component: 'Data Ingestion Pipeline', status: 'Healthy',  uptime: '99.9%', lastCheck: '2 分钟前' },
  { key: '2', component: 'Model Gateway',           status: 'Healthy',  uptime: '99.8%', lastCheck: '1 分钟前' },
  { key: '3', component: 'Agent Runtime',            status: 'Degraded', uptime: '98.5%', lastCheck: '5 分钟前' },
  { key: '4', component: 'Ontology Service',         status: 'Healthy',  uptime: '99.9%', lastCheck: '1 分钟前' },
]

const healthColumns = [
  { title: '组件', dataIndex: 'component', key: 'component' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (v: string) => (
      <Tag color={v === 'Healthy' ? 'green' : 'orange'}>{v === 'Healthy' ? '健康' : '降级'}</Tag>
    ),
  },
  { title: '可用率', dataIndex: 'uptime', key: 'uptime' },
  { title: '最近检查', dataIndex: 'lastCheck', key: 'lastCheck' },
]

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Pipeline flow ── */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 4 }}>Pipeline Overview</Title>
        <Text type="secondary">端到端数据流水线：从数据源接入到智能体部署</Text>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto',
          padding: '24px 0 8px',
        }}>
          {stages.map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                minWidth: 130,
                background: `linear-gradient(135deg, ${s.color}dd, ${s.color}88)`,
                color: '#fff',
                padding: '18px 14px',
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>{s.key}</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{s.label}</div>
              </div>
              {i < stages.length - 1 && (
                <ArrowRightOutlined style={{ fontSize: 18, color: '#bbb', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Stat cards ── */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card><Statistic title="活跃项目" value={47} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="已部署 Agent" value={12} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="已注册模型" value={23} /></Card>
        </Col>
      </Row>

      {/* ── Health monitoring table ── */}
      <Card title="平台健康度监控">
        <Table
          dataSource={healthData}
          columns={healthColumns}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  )
}
