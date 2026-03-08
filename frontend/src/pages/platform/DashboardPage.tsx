import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Table, Tag, Timeline, Typography } from 'antd'
import {
  DatabaseOutlined,
  SwapOutlined,
  ApartmentOutlined,
  RobotOutlined,
  ExperimentOutlined,
  ApiOutlined,
  TeamOutlined,
  ArrowRightOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  UserOutlined,
  AppstoreOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { getHealthData, getActivityData, getPlatformStats } from '../../api/dashboard'
import type { HealthEntry, ActivityEntry } from '../../types/dashboard'
import type { ReactNode } from 'react'

const { Title, Text } = Typography

/* ───── L1→L7 pipeline stages ───── */
interface Stage { key: string; label: string; labelZh: string; icon: ReactNode; color: string; count: number }

const stages: Stage[] = [
  { key: 'L1', label: 'Datasource',    labelZh: '数据源',   icon: <DatabaseOutlined />,   color: '#16a34a', count: 24 },
  { key: 'L2', label: 'Transform',     labelZh: '数据转换', icon: <SwapOutlined />,       color: '#d97706', count: 156 },
  { key: 'L3', label: 'Ontology',      labelZh: '本体层',   icon: <ApartmentOutlined />,  color: '#4f46e5', count: 89 },
  { key: 'L4', label: 'Co-worker',     labelZh: '智能体',   icon: <RobotOutlined />,      color: '#7c3aed', count: 59 },
  { key: 'L5', label: 'Model Train',   labelZh: '模型训练', icon: <ExperimentOutlined />, color: '#e11d48', count: 6 },
  { key: 'L6', label: 'Model Gateway', labelZh: '模型网关', icon: <ApiOutlined />,        color: '#ea580c', count: 23 },
  { key: 'L7', label: 'Workflow Apps',  labelZh: '数字员工', icon: <TeamOutlined />,       color: '#0891b2', count: 15 },
]

/* ───── 健康度表格列 ───── */
const healthColumns = [
  { title: '组件', dataIndex: 'component', key: 'component', render: (v: string) => <Text strong>{v}</Text> },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (v: HealthEntry['status']) => (
      <span>
        <span className={`status-dot ${v === 'Healthy' ? 'active' : v === 'Degraded' ? 'warning' : 'error'}`} />
        <Tag color={v === 'Healthy' ? 'green' : v === 'Degraded' ? 'orange' : 'red'}>
          {v === 'Healthy' ? '健康' : v === 'Degraded' ? '降级' : '离线'}
        </Tag>
      </span>
    ),
  },
  { title: '可用率', dataIndex: 'uptime', key: 'uptime', width: 90 },
  { title: 'QPS', dataIndex: 'qps', key: 'qps', width: 90, render: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v },
  { title: '延迟', dataIndex: 'latency', key: 'latency', width: 80 },
  { title: '最近检查', dataIndex: 'lastCheck', key: 'lastCheck', width: 100 },
]

/* ───── 活动日志颜色 ───── */
const levelColor: Record<ActivityEntry['level'], string> = {
  info: 'blue', success: 'green', warning: 'orange', error: 'red',
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthEntry[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [stats, setStats] = useState(() => getPlatformStats())

  useEffect(() => {
    setHealth(getHealthData())
    setActivities(getActivityData())
    setStats(getPlatformStats())
  }, [])

  /* 统计卡片 */
  const statCards = [
    { title: '数据源', value: stats.datasources, icon: <DatabaseOutlined />, color: '#16a34a' },
    { title: 'Object Types', value: stats.objectTypes, icon: <AppstoreOutlined />, color: '#4f46e5' },
    { title: 'Agent / Skills', value: `${stats.agents} / ${stats.skills}`, icon: <RobotOutlined />, color: '#7c3aed' },
    { title: '已部署模型', value: stats.deployedModels, icon: <CloudServerOutlined />, color: '#ea580c' },
    { title: '日请求总量', value: stats.totalRequests, icon: <ThunderboltOutlined />, color: '#e11d48' },
    { title: '平均延迟', value: stats.avgLatency, icon: <DashboardOutlined />, color: '#0891b2' },
    { title: '平台可用率', value: stats.uptime, icon: <SafetyCertificateOutlined />, color: '#16a34a' },
    { title: '活跃用户', value: stats.activeUsers, icon: <UserOutlined />, color: '#d97706' },
  ]

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
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{s.labelZh} · {s.count}</div>
              </div>
              {i < stages.length - 1 && (
                <ArrowRightOutlined style={{ fontSize: 16, color: '#cbd5e1', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Stat cards ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {statCards.map(s => (
          <Col span={6} key={s.title}>
            <Card size="small" className="stat-card card-hover">
              <Statistic
                title={s.title}
                value={s.value}
                prefix={<span style={{ color: s.color, fontSize: 20, marginRight: 4 }}>{s.icon}</span>}
                valueStyle={{ color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Health + Activity ── */}
      <Row gutter={16}>
        <Col span={16}>
          <Card className="section-card" title={<span><SafetyCertificateOutlined style={{ marginRight: 8 }} />平台健康度监控</span>}>
            <Table
              dataSource={health}
              columns={healthColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="section-card" title={<span><ClockCircleOutlined style={{ marginRight: 8 }} />实时活动</span>}>
            <Timeline
              items={activities.map(a => ({
                color: levelColor[a.level],
                children: (
                  <div style={{ fontSize: 12 }}>
                    <Text type="secondary" style={{ fontFamily: 'monospace', marginRight: 8 }}>{a.time}</Text>
                    <Tag color={levelColor[a.level]} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{a.user}</Tag>
                    <br />
                    <span>{a.action}</span>
                    <Text type="secondary" style={{ marginLeft: 4 }}>{a.target}</Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      {/* ── 平台资源概览 ── */}
      <Card className="section-card" title={<span><ToolOutlined style={{ marginRight: 8 }} />平台资源一览</span>}>
        <Row gutter={[16, 16]}>
          {stages.map(s => (
            <Col span={6} key={s.key}>
              <Card size="small" hoverable styles={{ body: { padding: '12px 16px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8,
                    background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: s.color, fontSize: 18,
                  }}>
                    {s.icon}
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>{s.key} {s.labelZh}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>{s.count} 个资源</Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  )
}
