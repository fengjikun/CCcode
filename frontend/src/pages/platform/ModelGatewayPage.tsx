import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Table, Tabs, Tag, Typography, Space } from 'antd'
import {
  CloudServerOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  GatewayOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'
import { listModels, listRoutes, getGatewayStats } from '../../api/modelGateway'
import type { RegisteredModel, ModelStage } from '../../types/modelGateway'
import { MODEL_STAGE_COLORS } from '../../types/modelGateway'

const { Title, Text } = Typography

const FRAMEWORK_COLORS: Record<string, string> = {
  PyTorch: 'red', TensorFlow: 'orange', 'scikit-learn': 'blue', Transformers: 'purple',
}

export default function ModelGatewayPage() {
  const [stats, setStats] = useState(() => getGatewayStats())
  const [models, setModels] = useState(() => listModels())
  const [routes, setRoutes] = useState(() => listRoutes())

  useEffect(() => {
    setStats(getGatewayStats())
    setModels(listModels())
    setRoutes(listRoutes())
  }, [])

  const statItems = [
    { title: '已部署模型', value: stats.deployedModels, icon: <CloudServerOutlined />, cls: 'stat-primary' },
    { title: '日请求量', value: stats.totalQps, icon: <ThunderboltOutlined />, cls: 'stat-info' },
    { title: '平均延迟', value: stats.avgLatency, icon: <DashboardOutlined />, cls: 'stat-success' },
    { title: '可用率', value: stats.availability, icon: <SafetyCertificateOutlined />, cls: 'stat-purple' },
    { title: 'Production', value: stats.productionCount, icon: <CheckCircleOutlined />, cls: 'stat-primary' },
    { title: 'Canary', value: stats.canaryCount, icon: <ExperimentOutlined />, cls: 'stat-warning' },
  ]

  /* Model Registry 列 */
  const modelColumns = [
    {
      title: '模型',
      key: 'model',
      render: (_: unknown, r: RegisteredModel) => (
        <div>
          <Text strong>{r.displayName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{r.name}</Text>
        </div>
      ),
    },
    { title: '版本', dataIndex: 'version', key: 'version', width: 70 },
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      width: 100,
      filters: ['Production', 'Staging', 'Canary', 'Archived'].map(s => ({ text: s, value: s })),
      onFilter: (value: unknown, record: RegisteredModel) => record.stage === value,
      render: (v: ModelStage) => (
        <span>
          <span className={`status-dot ${v === 'Production' ? 'active' : v === 'Staging' ? 'warning' : v === 'Canary' ? 'active' : ''}`} />
          <Tag color={MODEL_STAGE_COLORS[v]}>{v}</Tag>
        </span>
      ),
    },
    { title: '准确率', dataIndex: 'accuracy', key: 'accuracy', width: 80, render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '框架', dataIndex: 'framework', key: 'framework', width: 100, render: (v: string) => <Tag color={FRAMEWORK_COLORS[v]}>{v}</Tag> },
    {
      title: 'QPS',
      dataIndex: 'qps',
      key: 'qps',
      width: 80,
      sorter: (a: RegisteredModel, b: RegisteredModel) => a.qps - b.qps,
      render: (v: number) => v > 0 ? (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v) : '—',
    },
    {
      title: '延迟 (P50/P99)',
      key: 'latency',
      width: 120,
      render: (_: unknown, r: RegisteredModel) => r.latencyP50 !== '—' ? (
        <span style={{ fontSize: 12 }}>{r.latencyP50} / {r.latencyP99}</span>
      ) : '—',
    },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    { title: '部署时间', dataIndex: 'lastDeployed', key: 'lastDeployed', width: 100 },
  ]

  /* Gateway Route 列 */
  const routeColumns = [
    { title: '路径', dataIndex: 'path', key: 'path', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: '模型', dataIndex: 'model', key: 'model', render: (v: string) => <Text strong>{v}</Text> },
    { title: '版本', dataIndex: 'version', key: 'version', width: 70 },
    {
      title: '流量权重',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      render: (v: number) => <Tag color={v === 100 ? 'green' : 'blue'}>{v}%</Tag>,
    },
    {
      title: '限流 (req/s)',
      dataIndex: 'rateLimit',
      key: 'rateLimit',
      width: 110,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) => <Tag color={v === 'Active' ? 'green' : 'default'}>{v}</Tag>,
    },
  ]

  const tabItems = [
    {
      key: 'registry',
      label: <span><CloudServerOutlined /> Model Registry ({models.length})</span>,
      children: <Table dataSource={models} columns={modelColumns} rowKey="key" pagination={false} size="small" />,
    },
    {
      key: 'routes',
      label: <span><GatewayOutlined /> Gateway Routes ({routes.length})</span>,
      children: <Table dataSource={routes} columns={routeColumns} rowKey="key" pagination={false} size="small" />,
    },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>模型网关</Title>
          <Text type="secondary">L6 统一 AI 推理入口 — 智能路由、限流、灰度发布与全链路监控</Text>
        </div>

        <Row gutter={[12, 12]} style={{ margin: '16px 0 20px' }}>
          {statItems.map(s => (
            <Col span={4} key={s.title}>
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

        {/* Canary 说明 */}
        {stats.canaryCount > 0 && (
          <Card size="small" style={{ background: '#fffbe6', marginBottom: 16, borderColor: '#ffe58f' }} styles={{ body: { padding: '8px 16px' } }}>
            <Space>
              <ExperimentOutlined style={{ color: '#faad14' }} />
              <Text>当前有 <Text strong>{stats.canaryCount}</Text> 个模型处于灰度发布状态（Canary），部分流量正在验证新版本。</Text>
            </Space>
          </Card>
        )}

        <Tabs items={tabItems} />
      </Card>
    </div>
  )
}
