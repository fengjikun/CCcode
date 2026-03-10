import { useEffect, useState } from 'react'
import { Card, Col, Row, Table, Tag, Timeline, Typography } from 'antd'
import {
  DatabaseOutlined,
  SwapOutlined,
  ApartmentOutlined,
  RobotOutlined,
  ExperimentOutlined,
  ApiOutlined,
  TeamOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  UserOutlined,
  AppstoreOutlined,
  ToolOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons'
import { getHealthData, getActivityData, getPlatformStats, type PlatformStats } from '../../api/dashboard'
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
  const [stats, setStats] = useState<PlatformStats>({ datasources: 0, transformJobs: 0, objectTypes: 0, agents: 0, skills: 0, trainingJobs: 0, deployedModels: 0, digitalWorkers: 0, totalRequests: '', avgLatency: '', uptime: '', activeUsers: 0 })

  useEffect(() => {
    getHealthData().then(setHealth)
    getActivityData().then(setActivities)
    getPlatformStats().then(setStats)
  }, [])

  /* 统计卡片 — 带图标背景 */
  const statCards = [
    { title: '数据源', value: stats.datasources, icon: <DatabaseOutlined />, color: '#16a34a', bg: '#f0fdf4', trend: '+3' },
    { title: 'Object Types', value: stats.objectTypes, icon: <AppstoreOutlined />, color: '#4f46e5', bg: '#eef2ff', trend: '+12' },
    { title: 'Agent / Skills', value: `${stats.agents} / ${stats.skills}`, icon: <RobotOutlined />, color: '#7c3aed', bg: '#f5f3ff', trend: '+5' },
    { title: '已部署模型', value: stats.deployedModels, icon: <CloudServerOutlined />, color: '#ea580c', bg: '#fff7ed', trend: '+2' },
    { title: '日请求总量', value: stats.totalRequests, icon: <ThunderboltOutlined />, color: '#e11d48', bg: '#fff1f2', trend: '+18%' },
    { title: '平均延迟', value: stats.avgLatency, icon: <DashboardOutlined />, color: '#0891b2', bg: '#ecfeff', trend: '-5ms' },
    { title: '平台可用率', value: stats.uptime, icon: <SafetyCertificateOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: '活跃用户', value: stats.activeUsers, icon: <UserOutlined />, color: '#d97706', bg: '#fffbeb', trend: '+8' },
  ]

  return (
    <div className="page-container dashboard-page">
      {/* ── Pipeline flow ── */}
      <Card className="section-card dashboard-hero-card" styles={{ body: { padding: '24px 28px' } }}>
        <div className="page-header">
          <Title level={4}>Pipeline Overview</Title>
          <Text type="secondary">端到端 AI 流水线：从数据源接入到智能体应用</Text>
        </div>

        <div className="dashboard-pipeline">
          {stages.map((s, i) => (
            <div key={s.key} className="dashboard-pipeline-item">
              <div
                className="pipeline-stage"
                style={{
                  background: `linear-gradient(135deg, ${s.color} 0%, ${s.color}bb 100%)`,
                  color: '#fff',
                  minWidth: 140,
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.9 }}>{s.icon}</div>
                <div style={{
                  fontSize: 10, opacity: 0.65, marginBottom: 2, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{s.key}</div>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{s.label}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                  {s.labelZh} · <span style={{ fontWeight: 600 }}>{s.count}</span>
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className="pipeline-arrow" style={{ margin: '0 4px' }}>
                  <svg width="28" height="12" viewBox="0 0 28 12">
                    <path d="M0 6h22M18 1l6 5-6 5" stroke="#cbd5e1" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Stat cards — 带图标和趋势 ── */}
      <Row gutter={[14, 14]} className="dashboard-stat-row" style={{ marginBottom: 16 }}>
        {statCards.map(s => (
          <Col xs={24} sm={12} xl={6} key={s.title} className="dashboard-grid-col">
            <Card
              size="small"
              className="stat-card card-hover dashboard-stat-card"
              styles={{ body: { padding: '16px 18px' } }}
            >
              <div className="dashboard-stat-card-content">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text className="dashboard-stat-title" type="secondary" style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>{s.title}</Text>
                  <div className="dashboard-stat-value" style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>
                    {s.value}
                  </div>
                  {s.trend && (
                    <Text className="dashboard-stat-trend" style={{ fontSize: 11, color: '#16a34a', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      <ArrowUpOutlined style={{ fontSize: 10 }} />
                      {s.trend}
                    </Text>
                  )}
                </div>
                <div
                  className="stat-icon-wrap"
                  style={{
                    background: s.bg,
                    color: s.color,
                  }}
                >
                  {s.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Health + Activity ── */}
      <Row gutter={[16, 16]} className="dashboard-main-row">
        <Col xs={24} xl={16}>
          <Card
            className="section-card dashboard-main-card"
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: '#f0fdf4', color: '#16a34a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}>
                  <SafetyCertificateOutlined />
                </div>
                <span style={{ fontWeight: 600 }}>平台健康度监控</span>
              </div>
            }
          >
            <Table
              dataSource={health}
              columns={healthColumns}
              pagination={false}
              size="small"
              scroll={{ x: 720 }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card
            className="section-card dashboard-main-card"
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: '#eef2ff', color: '#4f46e5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}>
                  <ClockCircleOutlined />
                </div>
                <span style={{ fontWeight: 600 }}>实时活动</span>
              </div>
            }
          >
            <Timeline
              items={activities.map(a => ({
                color: levelColor[a.level],
                children: (
                  <div style={{ fontSize: 12 }}>
                    <Text type="secondary" style={{ fontFamily: 'monospace', marginRight: 8, fontSize: 11 }}>{a.time}</Text>
                    <Tag color={levelColor[a.level]} style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', borderRadius: 4 }}>{a.user}</Tag>
                    <br />
                    <span style={{ color: '#1a1f36' }}>{a.action}</span>
                    <Text type="secondary" style={{ marginLeft: 4, fontSize: 11 }}>{a.target}</Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      {/* ── 平台资源概览 ── */}
      <Card
        className="section-card"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#f5f3ff', color: '#7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>
              <ToolOutlined />
            </div>
            <span style={{ fontWeight: 600 }}>平台资源一览</span>
          </div>
        }
      >
        <Row gutter={[14, 14]}>
          {stages.map(s => (
            <Col xs={24} sm={12} xl={6} key={s.key} className="dashboard-grid-col">
              <Card
                size="small"
                className="dashboard-resource-card"
                hoverable
                styles={{ body: { padding: '14px 16px' } }}
                style={{ borderColor: 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: s.color, fontSize: 20,
                    transition: 'all 0.25s',
                  }}>
                    {s.icon}
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13, color: '#1a1f36' }}>{s.key} {s.labelZh}</Text>
                    <br />
                    <Text style={{ fontSize: 12, color: '#5e6687' }}>
                      <span style={{ fontWeight: 600, color: s.color }}>{s.count}</span> 个资源
                    </Text>
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
