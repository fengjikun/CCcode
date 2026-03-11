import { useEffect, useState } from 'react'
import { Card, Col, Row, Tag, Typography } from 'antd'
import {
  DatabaseOutlined,
  FileSearchOutlined,
  ApartmentOutlined,
  RobotOutlined,
  ExperimentOutlined,
  ApiOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons'
import { getPlatformStats, type PlatformStats } from '../../api/dashboard'
import type { ReactNode } from 'react'

const { Title, Text } = Typography

/* ───── 平台能力阶段 ───── */
interface Stage {
  key: string
  label: string
  labelZh: string
  icon: ReactNode
  color: string
  count: number
  summary: string
}

interface StageTemplate extends Omit<Stage, 'count'> {
  fallbackCount: number
}

const stageTemplates: StageTemplate[] = [
  { key: 'datasource', label: 'Datasource', labelZh: '数据接入', icon: <DatabaseOutlined />, color: '#16a34a', fallbackCount: 0, summary: '统一连接企业数据' },
  { key: 'prep', label: 'Dataset Prep', labelZh: '数据准备', icon: <FileSearchOutlined />, color: '#d97706', fallbackCount: 0, summary: '解析与加工文档数据' },
  { key: 'ontology', label: 'Ontology', labelZh: '本体建模', icon: <ApartmentOutlined />, color: '#4f46e5', fallbackCount: 0, summary: '沉淀业务语义结构' },
  { key: 'workspace', label: 'workspace', labelZh: '智能体编排', icon: <RobotOutlined />, color: '#7c3aed', fallbackCount: 59, summary: '组装可执行业务能力' },
  { key: 'training', label: 'Model Train', labelZh: '模型训练', icon: <ExperimentOutlined />, color: '#e11d48', fallbackCount: 6, summary: '完成训练与评估迭代' },
  { key: 'gateway', label: 'Model Gateway', labelZh: '模型服务', icon: <ApiOutlined />, color: '#ea580c', fallbackCount: 23, summary: '统一推理与调用入口' },
  { key: 'application', label: 'Workflow Apps', labelZh: '业务应用', icon: <TeamOutlined />, color: '#0891b2', fallbackCount: 0, summary: '交付AI员工场景' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<PlatformStats>({ datasources: 0, transformJobs: 0, objectTypes: 0, ontologyProjects: 0, agents: 0, skills: 0, trainingJobs: 0, deployedModels: 0, digitalWorkers: 0, totalRequests: '', avgLatency: '', uptime: '', activeUsers: 0 })

  useEffect(() => {
    getPlatformStats().then(setStats)
  }, [])

  const stages: Stage[] = stageTemplates.map(stage => {
    if (stage.key === 'datasource') return { ...stage, count: stats.datasources }
    if (stage.key === 'prep') return { ...stage, count: stats.transformJobs }
    if (stage.key === 'ontology') return { ...stage, count: stats.ontologyProjects }
    if (stage.key === 'workspace') return { ...stage, count: stats.agents }
    if (stage.key === 'training') return { ...stage, count: stats.trainingJobs }
    if (stage.key === 'gateway') return { ...stage, count: stats.deployedModels }
    if (stage.key === 'application') return { ...stage, count: stats.digitalWorkers }
    return { ...stage, count: stage.fallbackCount }
  })

  /* 统计卡片 — 带图标背景 */
  const statCards = [
    { title: '数据源', value: stats.datasources, icon: <DatabaseOutlined />, color: '#16a34a', bg: '#f0fdf4', trend: '+3' },
    { title: '本体项目', value: stats.ontologyProjects, icon: <AppstoreOutlined />, color: '#4f46e5', bg: '#eef2ff', trend: '+12' },
    { title: 'Agent / Skills', value: `${stats.agents} / ${stats.skills}`, icon: <RobotOutlined />, color: '#7c3aed', bg: '#f5f3ff', trend: '+5' },
    { title: '日请求总量', value: stats.totalRequests, icon: <ThunderboltOutlined />, color: '#e11d48', bg: '#fff1f2', trend: '+18%' },
    { title: '平均延迟', value: stats.avgLatency, icon: <DashboardOutlined />, color: '#0891b2', bg: '#ecfeff', trend: '-5ms' },
  ]

  const businessMetrics = [
    { title: '已上线AI员工', value: stats.digitalWorkers, note: '覆盖设备、采购、客服等核心流程', accent: '#0891b2', bg: '#ecfeff' },
    { title: '活跃业务场景', value: '8', note: '跨制造、供应链、共享服务中心落地', accent: '#7c3aed', bg: '#f5f3ff' },
    { title: '近 7 日智能体会话', value: '18.6K', note: '核心场景协作触达持续增长', accent: '#ea580c', bg: '#fff7ed' },
    { title: '自动完成率', value: '82%', note: '高频流程已形成稳定自动闭环', accent: '#16a34a', bg: '#f0fdf4' },
  ]

  const landingScenarios = [
    {
      name: '设备诊断助手',
      team: '装备运维中心',
      summary: '结合本体与历史维修知识，自动完成故障定位和处理建议生成。',
      metric: '本周完成 1,240 次诊断',
      detail: '平均将首轮排障时间缩短 37%',
      status: '规模运行',
      color: 'blue',
    },
    {
      name: '采购协同助手',
      team: '供应链中心',
      summary: '自动汇总缺料信号，生成采购建议并触发跨团队协同动作。',
      metric: '自动生成 326 单采购建议',
      detail: '重复人工比对动作下降 61%',
      status: '稳定增量',
      color: 'green',
    },
    {
      name: '客服工单助手',
      team: '客户共享中心',
      summary: '对常见工单做自动归因、话术生成和闭环跟进建议。',
      metric: '常见工单自动闭环率 68%',
      detail: '人工接管率已控制在 12%',
      status: '持续优化',
      color: 'purple',
    },
  ] as const

  return (
    <div className="page-container dashboard-page">
      {/* ── Pipeline flow ── */}
      <Card className="section-card dashboard-hero-card" styles={{ body: { padding: '24px 28px' } }}>
        <div className="page-header">
          <Title level={4}>平台能力全景</Title>
          <Text type="secondary">覆盖数据接入、语义建模、智能体编排到业务应用交付的完整闭环</Text>
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
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{s.label}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                  {s.labelZh} · <span style={{ fontWeight: 600 }}>{s.count}</span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.78, marginTop: 6 }}>
                  {s.summary}
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
      <Row justify="center" gutter={[14, 14]} className="dashboard-stat-row" style={{ marginBottom: 16 }}>
        {statCards.map(s => (
          <Col xs={24} sm={12} lg={8} xl={4} key={s.title} className="dashboard-grid-col">
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

      {/* ── Business outcomes ── */}
      <Row gutter={[16, 16]} className="dashboard-main-row">
        <Col span={24}>
          <Card
            className="section-card dashboard-main-card"
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: '#ecfeff', color: '#0891b2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}>
                  <TeamOutlined />
                </div>
                <span style={{ fontWeight: 600 }}>业务落地成效</span>
              </div>
            }
          >
            <div className="dashboard-outcomes">
              <div className="dashboard-outcome-metrics">
                {businessMetrics.map(metric => (
                  <div key={metric.title} className="dashboard-outcome-metric" style={{ background: metric.bg }}>
                    <Text type="secondary" className="dashboard-outcome-label">{metric.title}</Text>
                    <div className="dashboard-outcome-value" style={{ color: metric.accent }}>
                      {metric.value}
                    </div>
                    <Text className="dashboard-outcome-note">{metric.note}</Text>
                  </div>
                ))}
              </div>

              <div className="dashboard-scenario-list">
                {landingScenarios.map(scenario => (
                  <div key={scenario.name} className="dashboard-scenario-card">
                    <div className="dashboard-scenario-head">
                      <div>
                        <Text strong className="dashboard-scenario-name">{scenario.name}</Text>
                        <Text type="secondary" className="dashboard-scenario-team">{scenario.team}</Text>
                      </div>
                      <Tag color={scenario.color}>{scenario.status}</Tag>
                    </div>
                    <Text className="dashboard-scenario-summary">{scenario.summary}</Text>
                    <div className="dashboard-scenario-metric">{scenario.metric}</div>
                    <Text className="dashboard-scenario-detail">{scenario.detail}</Text>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
