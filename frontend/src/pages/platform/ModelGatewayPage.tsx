import { useEffect, useState } from 'react'
import {
  Card, Col, Row, Statistic, Table, Tabs, Tag, Typography, Space, Button,
  Modal, InputNumber, Select, Slider, Radio, Popconfirm, Descriptions, message,
} from 'antd'
import {
  CloudServerOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  GatewayOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  RocketOutlined,
  RollbackOutlined,
  FieldTimeOutlined,
  WarningOutlined,
  LineChartOutlined,
} from '@ant-design/icons'
import {
  listModels, listRoutes, getGatewayStats,
  deployModel, promoteModel, rollbackModel, updateTrafficWeight,
  getMonitoringStats, getHourlyTraffic, getRecentErrors,
} from '../../api/modelGateway'
import type { RegisteredModel, ModelStage, DeployConfig, GatewayRoute } from '../../types/modelGateway'
import { MODEL_STAGE_COLORS } from '../../types/modelGateway'
import ModalHeader from '../../components/shared/ModalHeader'

const { Title, Text } = Typography

const FRAMEWORK_COLORS: Record<string, string> = {
  PyTorch: 'red', TensorFlow: 'orange', 'scikit-learn': 'blue', Transformers: 'purple',
}

const GPU_OPTIONS = [
  { label: 'A100-40GB', value: 'A100-40GB' },
  { label: 'V100-16GB', value: 'V100-16GB' },
  { label: 'T4-16GB', value: 'T4-16GB' },
]

export default function ModelGatewayPage() {
  const [stats, setStats] = useState(() => getGatewayStats())
  const [models, setModels] = useState(() => listModels())
  const [routes, setRoutes] = useState(() => listRoutes())

  // Deploy modal state
  const [deployModalOpen, setDeployModalOpen] = useState(false)
  const [deployTarget, setDeployTarget] = useState<RegisteredModel | null>(null)
  const [deployConfig, setDeployConfig] = useState<DeployConfig>({
    replicas: 2, gpuType: 'A100-40GB', maxQps: 1000, canaryWeight: 10,
  })
  const [deployTargetStage, setDeployTargetStage] = useState<'Staging' | 'Canary' | 'Production'>('Staging')
  const [deployLoading, setDeployLoading] = useState(false)

  // Traffic weight modal state
  const [trafficModalOpen, setTrafficModalOpen] = useState(false)
  const [trafficRoute, setTrafficRoute] = useState<GatewayRoute | null>(null)
  const [trafficWeight, setTrafficWeight] = useState(50)

  // Monitoring data
  const monitorStats = getMonitoringStats()
  const hourlyTraffic = getHourlyTraffic()
  const recentErrors = getRecentErrors()
  const maxTraffic = Math.max(...hourlyTraffic.map(h => h.requests))

  useEffect(() => {
    setStats(getGatewayStats())
    setModels(listModels())
    setRoutes(listRoutes())
  }, [])

  const statItems = [
    { title: '已部署模型', value: stats.deployedModels, icon: <CloudServerOutlined />, color: '#4f46e5', bg: '#eef2ff' },
    { title: '日请求量', value: stats.totalQps, icon: <ThunderboltOutlined />, color: '#0891b2', bg: '#ecfeff' },
    { title: '平均延迟', value: stats.avgLatency, icon: <DashboardOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: '可用率', value: stats.availability, icon: <SafetyCertificateOutlined />, color: '#7c3aed', bg: '#f5f3ff' },
    { title: 'Production', value: stats.productionCount, icon: <CheckCircleOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: 'Canary', value: stats.canaryCount, icon: <ExperimentOutlined />, color: '#d97706', bg: '#fffbeb' },
  ]

  /* ============ Deployment Pipeline ============ */
  const pipelineStages = [
    { label: '评估通过', count: stats.stagingCount + stats.canaryCount + stats.productionCount, color: '#8c8c8c', icon: <CheckCircleOutlined /> },
    { label: 'Staging', count: stats.stagingCount, color: '#faad14', icon: <ExperimentOutlined /> },
    { label: 'Canary (灰度)', count: stats.canaryCount, color: '#1677ff', icon: <DashboardOutlined /> },
    { label: 'Production', count: stats.productionCount, color: '#52c41a', icon: <RocketOutlined /> },
  ]

  const refreshData = () => {
    setStats(getGatewayStats())
    setModels(listModels())
    setRoutes(listRoutes())
  }

  /* ============ Handlers ============ */
  const handleOpenDeploy = (record: RegisteredModel) => {
    setDeployTarget(record)
    setDeployConfig({ replicas: record.replicas || 2, gpuType: record.gpuType || 'A100-40GB', maxQps: 1000, canaryWeight: 10 })
    setDeployTargetStage(record.stage === 'Staging' ? 'Canary' : 'Staging')
    setDeployModalOpen(true)
  }

  const handleDeploy = async () => {
    if (!deployTarget) return
    setDeployLoading(true)
    const res = await deployModel(deployTarget.key, deployConfig)
    setDeployLoading(false)
    if (res.success) {
      message.success(res.message)
      setDeployModalOpen(false)
      refreshData()
    }
  }

  const handlePromote = async (record: RegisteredModel, toStage: string) => {
    const res = await promoteModel(record.key, record.stage, toStage)
    if (res.success) {
      message.success(res.message)
      refreshData()
    }
  }

  const handleRollback = async (record: RegisteredModel) => {
    const res = await rollbackModel(record.key)
    if (res.success) {
      message.success(res.message)
      refreshData()
    }
  }

  const handleOpenTraffic = (route: GatewayRoute) => {
    setTrafficRoute(route)
    setTrafficWeight(route.weight)
    setTrafficModalOpen(true)
  }

  const handleUpdateTraffic = async () => {
    if (!trafficRoute) return
    const res = await updateTrafficWeight(trafficRoute.key, trafficWeight)
    if (res.success) {
      message.success(res.message)
      setTrafficModalOpen(false)
      refreshData()
    }
  }

  /* ============ GPU cost estimation ============ */
  const gpuCostPerHour: Record<string, number> = { 'A100-40GB': 3.5, 'V100-16GB': 1.8, 'T4-16GB': 0.6 }
  const estimatedCost = deployConfig.replicas * (gpuCostPerHour[deployConfig.gpuType] || 0)

  /* ============ Model Registry columns ============ */
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
    { title: '部署时间', dataIndex: 'lastDeployed', key: 'lastDeployed', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, r: RegisteredModel) => {
        if (r.stage === 'Archived') return <Text type="secondary">已归档</Text>
        return (
          <Space size={4} wrap>
            {r.stage === 'Staging' && (
              <>
                <Button type="link" size="small" icon={<RocketOutlined />} onClick={() => handleOpenDeploy(r)}>
                  发布
                </Button>
                <Popconfirm
                  title="确认推进到灰度？"
                  description="模型将进入 Canary 阶段，接收部分线上流量。"
                  onConfirm={() => handlePromote(r, 'Canary')}
                >
                  <Button type="link" size="small" icon={<ExperimentOutlined />}>灰度</Button>
                </Popconfirm>
              </>
            )}
            {r.stage === 'Canary' && (
              <>
                <Popconfirm
                  title="确认全量上线？"
                  description={`${r.displayName} ${r.version} 将从灰度推进到 Production，承担 100% 流量。`}
                  onConfirm={() => handlePromote(r, 'Production')}
                >
                  <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }}>上线</Button>
                </Popconfirm>
                <Popconfirm
                  title="确认回滚？"
                  description="灰度版本将被撤回，恢复上一稳定版本。"
                  onConfirm={() => handleRollback(r)}
                >
                  <Button type="link" size="small" icon={<RollbackOutlined />} danger>回滚</Button>
                </Popconfirm>
              </>
            )}
            {r.stage === 'Production' && (
              <Popconfirm
                title="确认回滚？"
                description="将回滚到上一生产版本，当前版本降级为 Canary。"
                onConfirm={() => handleRollback(r)}
              >
                <Button type="link" size="small" icon={<RollbackOutlined />} danger>回滚</Button>
              </Popconfirm>
            )}
          </Space>
        )
      },
    },
  ]

  /* ============ Gateway Route columns ============ */
  const routeColumns = [
    { title: '路径', dataIndex: 'path', key: 'path', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: '模型', dataIndex: 'model', key: 'model', render: (v: string) => <Text strong>{v}</Text> },
    { title: '版本', dataIndex: 'version', key: 'version', width: 70 },
    {
      title: '流量权重',
      dataIndex: 'weight',
      key: 'weight',
      width: 140,
      render: (v: number, r: GatewayRoute) => (
        <Space size={4}>
          <Tag color={v === 100 ? 'green' : 'blue'}>{v}%</Tag>
          {v < 100 && (
            <Button type="link" size="small" style={{ padding: 0, fontSize: 11 }} onClick={() => handleOpenTraffic(r)}>
              调整流量
            </Button>
          )}
        </Space>
      ),
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

  /* ============ Error table columns ============ */
  const errorColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 90 },
    { title: '模型', dataIndex: 'model', key: 'model', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
    {
      title: '错误码', dataIndex: 'errorCode', key: 'errorCode', width: 80,
      render: (v: number) => <Tag color={v >= 500 ? 'red' : v === 429 ? 'orange' : 'default'}>{v}</Tag>,
    },
    { title: '错误信息', dataIndex: 'errorMessage', key: 'errorMessage', render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
  ]

  /* ============ Monitoring Tab ============ */
  const monitoringTab = (
    <div>
      {/* Monitor stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { title: '今日请求量', value: monitorStats.todayRequests.toLocaleString(), icon: <ThunderboltOutlined />, color: '#1677ff' },
          { title: '成功率', value: monitorStats.successRate, icon: <CheckCircleOutlined />, color: '#52c41a' },
          { title: '平均延迟', value: monitorStats.avgLatency, icon: <DashboardOutlined />, color: '#722ed1' },
          { title: 'P99 延迟', value: monitorStats.p99Latency, icon: <FieldTimeOutlined />, color: '#fa541c' },
        ].map(s => (
          <Col span={6} key={s.title}>
            <Card size="small" styles={{ body: { padding: '12px 16px' } }} style={{ borderLeft: `3px solid ${s.color}` }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{s.title}</span>}
                value={s.value}
                prefix={<span style={{ fontSize: 16, color: s.color, marginRight: 4 }}>{s.icon}</span>}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Hourly traffic bars */}
      <Card size="small" title={<span><LineChartOutlined /> 最近 7 小时请求趋势</span>} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hourlyTraffic.map(h => (
            <div key={h.hour} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Text style={{ width: 48, fontSize: 12, textAlign: 'right', flexShrink: 0 }}>{h.hour}</Text>
              <div style={{ flex: 1, background: '#f5f5f5', borderRadius: 4, height: 24, position: 'relative', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(h.requests / maxTraffic) * 100}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, #1677ff, ${h.requests / maxTraffic > 0.8 ? '#52c41a' : '#69b1ff'})`,
                    borderRadius: 4,
                    transition: 'width 0.3s',
                    minWidth: 2,
                  }}
                />
              </div>
              <Text style={{ width: 60, fontSize: 12, textAlign: 'right', flexShrink: 0 }}>
                {h.requests >= 1000 ? `${(h.requests / 1000).toFixed(1)}K` : h.requests}
              </Text>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent errors */}
      <Card size="small" title={<span><WarningOutlined style={{ color: '#fa541c' }} /> 最近错误日志</span>}>
        <Table dataSource={recentErrors} columns={errorColumns} rowKey="key" pagination={false} size="small" />
      </Card>
    </div>
  )

  /* ============ Tab items ============ */
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
    {
      key: 'monitoring',
      label: <span><LineChartOutlined /> 运行监控</span>,
      children: monitoringTab,
    },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>模型网关</Title>
          <Text type="secondary">L6 统一 AI 推理入口 — 智能路由、限流、灰度发布与全链路监控</Text>
        </div>

        {/* Stats row */}
        <Row gutter={[12, 12]} style={{ margin: '16px 0 20px' }}>
          {statItems.map(s => (
            <Col span={4} key={s.title}>
              <Card size="small" className="stat-card card-hover" styles={{ body: { padding: '14px 16px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="stat-icon-wrap" style={{ background: s.bg, color: s.color, width: 38, height: 38, borderRadius: 10, fontSize: 18 }}>
                    {s.icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{s.title}</Text>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1.3 }}>{s.value}</div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Deployment Pipeline Visualization */}
        <Card
          size="small"
          style={{ marginBottom: 16, background: '#f8f9fc', borderColor: '#e2e5f0' }}
          styles={{ body: { padding: '20px 28px' } }}
        >
          <Text strong style={{ display: 'block', marginBottom: 16, fontSize: 13, color: '#5e6687' }}>
            <RocketOutlined style={{ marginRight: 6 }} />
            模型发布流水线
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
            {pipelineStages.map((stage, idx) => (
              <div key={stage.label} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 130 }}>
                  <div
                    style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: `linear-gradient(135deg, ${stage.color}, ${stage.color}cc)`, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, boxShadow: `0 4px 14px ${stage.color}30`,
                    }}
                  >
                    {stage.icon}
                  </div>
                  <Text strong style={{ marginTop: 10, fontSize: 13 }}>{stage.label}</Text>
                  <Tag
                    color={stage.count > 0 ? undefined : 'default'}
                    style={{ marginTop: 4, fontWeight: 600 }}
                  >
                    {stage.count} 个模型
                  </Tag>
                </div>
                {idx < pipelineStages.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', margin: '0 6px', marginBottom: 40 }}>
                    <svg width="40" height="12" viewBox="0 0 40 12">
                      <path d="M0 6h32M28 1l8 5-8 5" stroke={`${pipelineStages[idx + 1].color}80`} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Canary notice */}
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

      {/* ============ Deploy Modal ============ */}
      <Modal
        open={deployModalOpen}
        onCancel={() => setDeployModalOpen(false)}
        onOk={handleDeploy}
        confirmLoading={deployLoading}
        okText="确认发布"
        cancelText="取消"
        width={640}
        destroyOnClose
        title={<ModalHeader icon={<RocketOutlined />} title="发布模型到网关" color="#1677ff" />}
      >
        {deployTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Model info */}
            <Descriptions size="small" bordered column={2} style={{ marginTop: 8 }}>
              <Descriptions.Item label="模型名称">{deployTarget.displayName}</Descriptions.Item>
              <Descriptions.Item label="版本">{deployTarget.version}</Descriptions.Item>
              <Descriptions.Item label="准确率">
                <Tag color="green">{deployTarget.evalAccuracy}%</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="F1 Score">
                <Tag color="blue">{deployTarget.evalF1}%</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="训练来源" span={2}>
                {deployTarget.trainedFrom}
              </Descriptions.Item>
            </Descriptions>

            {/* Target stage */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>目标阶段</Text>
              <Radio.Group
                value={deployTargetStage}
                onChange={e => setDeployTargetStage(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="Staging">
                  <span style={{ color: deployTargetStage === 'Staging' ? '#fff' : '#faad14' }}>Staging</span>
                </Radio.Button>
                <Radio.Button value="Canary">
                  <span style={{ color: deployTargetStage === 'Canary' ? '#fff' : '#1677ff' }}>Canary (灰度)</span>
                </Radio.Button>
                <Radio.Button value="Production">
                  <span style={{ color: deployTargetStage === 'Production' ? '#fff' : '#52c41a' }}>Production</span>
                </Radio.Button>
              </Radio.Group>
            </div>

            {/* Deploy config */}
            <Row gutter={16}>
              <Col span={8}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>副本数</Text>
                <InputNumber
                  min={1} max={8} value={deployConfig.replicas}
                  onChange={v => setDeployConfig(c => ({ ...c, replicas: v ?? 2 }))}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={8}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>GPU 类型</Text>
                <Select
                  value={deployConfig.gpuType}
                  onChange={v => setDeployConfig(c => ({ ...c, gpuType: v }))}
                  options={GPU_OPTIONS}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={8}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>最大 QPS</Text>
                <InputNumber
                  min={100} max={50000} step={100} value={deployConfig.maxQps}
                  onChange={v => setDeployConfig(c => ({ ...c, maxQps: v ?? 1000 }))}
                  style={{ width: '100%' }}
                />
              </Col>
            </Row>

            {/* Canary weight slider */}
            {deployTargetStage === 'Canary' && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>灰度流量比例</Text>
                <Slider
                  min={0} max={100} value={deployConfig.canaryWeight}
                  onChange={v => setDeployConfig(c => ({ ...c, canaryWeight: v }))}
                  marks={{ 0: '0%', 10: '10%', 25: '25%', 50: '50%', 100: '100%' }}
                  tooltip={{ formatter: v => `${v}%` }}
                />
              </div>
            )}

            {/* Resource estimation summary */}
            <Card
              size="small"
              style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <Text strong style={{ display: 'block', marginBottom: 8 }}>资源预估</Text>
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary">GPU 实例</Text>
                  <div><Text strong>{deployConfig.replicas} x {deployConfig.gpuType}</Text></div>
                </Col>
                <Col span={8}>
                  <Text type="secondary">预估费用</Text>
                  <div><Text strong style={{ color: '#52c41a' }}>${estimatedCost.toFixed(1)}/小时</Text></div>
                </Col>
                <Col span={8}>
                  <Text type="secondary">预估 QPS 上限</Text>
                  <div><Text strong>{(deployConfig.maxQps * deployConfig.replicas).toLocaleString()}</Text></div>
                </Col>
              </Row>
            </Card>
          </div>
        )}
      </Modal>

      {/* ============ Traffic Weight Modal ============ */}
      <Modal
        open={trafficModalOpen}
        onCancel={() => setTrafficModalOpen(false)}
        onOk={handleUpdateTraffic}
        okText="确认调整"
        cancelText="取消"
        width={480}
        destroyOnClose
        title={<ModalHeader icon={<GatewayOutlined />} title="调整灰度流量" color="#1677ff" />}
      >
        {trafficRoute && (
          <div style={{ padding: '12px 0' }}>
            <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="路由路径">
                <Text code>{trafficRoute.path}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="模型版本">
                {trafficRoute.model} / {trafficRoute.version}
              </Descriptions.Item>
              <Descriptions.Item label="当前权重">
                <Tag color="blue">{trafficRoute.weight}%</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>新流量权重</Text>
            <Slider
              min={0} max={100} value={trafficWeight}
              onChange={setTrafficWeight}
              marks={{ 0: '0%', 10: '10%', 25: '25%', 50: '50%', 75: '75%', 100: '100%' }}
              tooltip={{ formatter: v => `${v}%` }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              调整后剩余 {100 - trafficWeight}% 流量将分配给同路径其他版本。
            </Text>
          </div>
        )}
      </Modal>
    </div>
  )
}
