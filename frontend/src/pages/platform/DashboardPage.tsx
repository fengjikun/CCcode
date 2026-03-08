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
  ProjectOutlined,
  CloudServerOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

const { Title, Text } = Typography

/* ───── L1→L7 pipeline stages ───── */
interface Stage { key: string; label: string; icon: ReactNode; color: string }

const stages: Stage[] = [
  { key: 'L1', label: 'Datasource',    icon: <DatabaseOutlined />,   color: '#16a34a' },
  { key: 'L2', label: 'Transform',     icon: <SwapOutlined />,       color: '#d97706' },
  { key: 'L3', label: 'Ontology',      icon: <ApartmentOutlined />,  color: '#4f46e5' },
  { key: 'L4', label: 'Co-worker',     icon: <RobotOutlined />,      color: '#7c3aed' },
  { key: 'L5', label: 'Model Train',   icon: <ExperimentOutlined />, color: '#e11d48' },
  { key: 'L6', label: 'Model Gateway', icon: <ApiOutlined />,        color: '#ea580c' },
  { key: 'L7', label: 'Workflow Apps', icon: <TeamOutlined />,       color: '#0891b2' },
]

/* ───── Health table mock data ───── */
const healthData = [
  { key: '1', component: 'Data Ingestion Pipeline', status: 'Healthy',  uptime: '99.9%', lastCheck: '2 分钟前' },
  { key: '2', component: 'Model Gateway',           status: 'Healthy',  uptime: '99.8%', lastCheck: '1 分钟前' },
  { key: '3', component: 'Agent Runtime',            status: 'Degraded', uptime: '98.5%', lastCheck: '5 分钟前' },
  { key: '4', component: 'Ontology Service',         status: 'Healthy',  uptime: '99.9%', lastCheck: '1 分钟前' },
]

const healthColumns = [
  { title: '组件', dataIndex: 'component', key: 'component', render: (v: string) => <Text strong>{v}</Text> },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (v: string) => (
      <span>
        <span className={`status-dot ${v === 'Healthy' ? 'active' : 'warning'}`} />
        <Tag color={v === 'Healthy' ? 'green' : 'orange'}>{v === 'Healthy' ? '健康' : '降级'}</Tag>
      </span>
    ),
  },
  { title: '可用率', dataIndex: 'uptime', key: 'uptime' },
  { title: '最近检查', dataIndex: 'lastCheck', key: 'lastCheck' },
]

export default function DashboardPage() {
  return (
    <div className="page-container">
      {/* ── Pipeline flow ── */}
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>Pipeline Overview</Title>
          <Text type="secondary">端到端 AI 流水线：从数据源接入到智能体应用</Text>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          padding: '20px 0 8px',
        }}>
          {stages.map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                className="pipeline-stage"
                style={{
                  background: `linear-gradient(135deg, ${s.color} 0%, ${s.color}cc 100%)`,
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.9 }}>{s.icon}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2, fontWeight: 500 }}>{s.key}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
              </div>
              {i < stages.length - 1 && (
                <ArrowRightOutlined style={{ fontSize: 16, color: '#cbd5e1', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Stat cards ── */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card className="stat-card card-hover">
            <Statistic
              title="活跃项目"
              value={47}
              prefix={<ProjectOutlined style={{ color: '#4f46e5', fontSize: 20, marginRight: 4 }} />}
              valueStyle={{ color: '#4f46e5' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card card-hover">
            <Statistic
              title="已部署 Agent"
              value={12}
              prefix={<DeploymentUnitOutlined style={{ color: '#7c3aed', fontSize: 20, marginRight: 4 }} />}
              valueStyle={{ color: '#7c3aed' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card card-hover">
            <Statistic
              title="已注册模型"
              value={23}
              prefix={<CloudServerOutlined style={{ color: '#0891b2', fontSize: 20, marginRight: 4 }} />}
              valueStyle={{ color: '#0891b2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Health monitoring table ── */}
      <Card className="section-card" title="平台健康度监控">
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
