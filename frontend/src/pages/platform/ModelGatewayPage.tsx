import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Descriptions,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  CheckCircleOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  GatewayOutlined,
  LineChartOutlined,
  RocketOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  deployModel,
  getGatewayStats,
  getHourlyTraffic,
  getMonitoringStats,
  getRecentErrors,
  listModels,
  listRoutes,
  promoteModel,
  rollbackModel,
  updateTrafficWeight,
} from '../../api/modelGateway'
import ModalHeader from '../../components/shared/ModalHeader'
import { MODEL_CENTER_PAGE_LABELS } from '../../types/modelCenter'
import type { DeployConfig, GatewayRoute, ModelStage, RegisteredModel } from '../../types/modelGateway'
import { MODEL_STAGE_COLORS } from '../../types/modelGateway'
import type { GatewayStats, HourlyTraffic, MonitoringStats, RecentError } from '../../api/modelGateway'
import { formatGatewayQuota, summarizeGatewayCapability } from './modelGateway.helpers'

const { Title, Text } = Typography

const GPU_OPTIONS = [
  { label: 'A100-80GB', value: 'A100-80GB' },
  { label: 'H100-80GB', value: 'H100-80GB' },
]

export default function ModelGatewayPage() {
  const [stats, setStats] = useState<GatewayStats>({
    deployedModels: 0,
    totalQps: '0',
    avgLatency: '—',
    availability: '—',
    productionCount: 0,
    canaryCount: 0,
    stagingCount: 0,
  })
  const [models, setModels] = useState<RegisteredModel[]>([])
  const [routes, setRoutes] = useState<GatewayRoute[]>([])
  const [deployModalOpen, setDeployModalOpen] = useState(false)
  const [deployTarget, setDeployTarget] = useState<RegisteredModel | null>(null)
  const [deployConfig, setDeployConfig] = useState<DeployConfig>({
    replicas: 2,
    gpuType: 'A100-40GB',
    maxQps: 1000,
    canaryWeight: 10,
  })
  const [deployTargetStage, setDeployTargetStage] = useState<'Staging' | 'Canary' | 'Production'>('Staging')
  const [trafficModalOpen, setTrafficModalOpen] = useState(false)
  const [trafficRoute, setTrafficRoute] = useState<GatewayRoute | null>(null)
  const [trafficWeight, setTrafficWeight] = useState(50)
  const [monitorStats, setMonitorStats] = useState<MonitoringStats>({
    todayRequests: 0,
    successRate: '—',
    avgLatency: '—',
    p99Latency: '—',
  })
  const [hourlyTraffic, setHourlyTraffic] = useState<HourlyTraffic[]>([])
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([])
  const maxTraffic = Math.max(1, ...hourlyTraffic.map(item => item.requests))

  useEffect(() => {
    getGatewayStats().then(setStats)
    listModels().then(setModels)
    listRoutes().then(setRoutes)
    getMonitoringStats().then(setMonitorStats)
    getHourlyTraffic().then(setHourlyTraffic)
    getRecentErrors().then(setRecentErrors)
  }, [])

  const refreshData = () => {
    getGatewayStats().then(setStats)
    listModels().then(setModels)
    listRoutes().then(setRoutes)
  }

  const statItems = [
    { title: '已部署服务', value: stats.deployedModels, icon: <CloudServerOutlined />, color: '#4f46e5', bg: '#eef2ff' },
    { title: '日请求量', value: stats.totalQps, icon: <ThunderboltOutlined />, color: '#0891b2', bg: '#ecfeff' },
    { title: '平均延迟', value: stats.avgLatency, icon: <DashboardOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: '可用率', value: stats.availability, icon: <SafetyCertificateOutlined />, color: '#7c3aed', bg: '#f5f3ff' },
    { title: 'Production', value: stats.productionCount, icon: <CheckCircleOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: 'Canary', value: stats.canaryCount, icon: <ExperimentOutlined />, color: '#d97706', bg: '#fffbeb' },
  ]

  const handleOpenDeploy = (record: RegisteredModel) => {
    setDeployTarget(record)
    setDeployConfig({
      replicas: record.replicas || 2,
      gpuType: record.gpuType || 'A100-80GB',
      maxQps: record.rpm,
      canaryWeight: 10,
    })
    setDeployTargetStage(record.stage === 'Staging' ? 'Canary' : 'Staging')
    setDeployModalOpen(true)
  }

  const handleDeploy = async () => {
    if (!deployTarget) return
    const result = await deployModel(deployTarget.key, deployConfig)
    if (result.success) {
      message.success(result.message)
      setDeployModalOpen(false)
      refreshData()
    }
  }

  const handlePromote = async (record: RegisteredModel, toStage: string) => {
    const result = await promoteModel(record.key, record.stage, toStage)
    if (result.success) {
      message.success(result.message)
      refreshData()
    }
  }

  const handleRollback = async (record: RegisteredModel) => {
    const result = await rollbackModel(record.key)
    if (result.success) {
      message.success(result.message)
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
    const result = await updateTrafficWeight(trafficRoute.key, trafficWeight)
    if (result.success) {
      message.success(result.message)
      setTrafficModalOpen(false)
      refreshData()
    }
  }

  const modelColumns = [
    {
      title: '服务',
      key: 'service',
      render: (_: unknown, record: RegisteredModel) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.displayName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.name}</Text>
          <Text code style={{ fontSize: 11 }}>{record.endpoint}</Text>
        </Space>
      ),
    },
    {
      title: '能力',
      key: 'capability',
      render: (_: unknown, record: RegisteredModel) => (
        <Space direction="vertical" size={2}>
          <Text>{summarizeGatewayCapability(record)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>Context {record.contextWindow.toLocaleString()} / Max Output {record.maxOutputTokens.toLocaleString()}</Text>
        </Space>
      ),
    },
    {
      title: '配额',
      key: 'quota',
      render: (_: unknown, record: RegisteredModel) => (
        <Space direction="vertical" size={2}>
          <Text>{formatGatewayQuota(record)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.supportsImageInput ? '支持图片输入' : '仅文本输入'}</Text>
        </Space>
      ),
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      width: 110,
      filters: ['Production', 'Staging', 'Canary', 'Archived'].map(stage => ({ text: stage, value: stage })),
      onFilter: (value: unknown, record: RegisteredModel) => record.stage === value,
      render: (value: ModelStage) => <Tag color={MODEL_STAGE_COLORS[value]}>{value}</Tag>,
    },
    {
      title: '延迟',
      key: 'latency',
      render: (_: unknown, record: RegisteredModel) => (
        <Space direction="vertical" size={2}>
          <Text>{record.latencyP50} / {record.latencyP99}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.gpuType} x {record.replicas}</Text>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: unknown, record: RegisteredModel) => {
        if (record.stage === 'Archived') return <Text type="secondary">已归档</Text>
        return (
          <Space size={4} wrap>
            {record.stage === 'Staging' && (
              <>
                <Button type="link" size="small" icon={<RocketOutlined />} onClick={() => handleOpenDeploy(record)}>
                  发布
                </Button>
                <Popconfirm title="确认推进到灰度？" onConfirm={() => handlePromote(record, 'Canary')}>
                  <Button type="link" size="small" icon={<ExperimentOutlined />}>灰度</Button>
                </Popconfirm>
              </>
            )}
            {record.stage === 'Canary' && (
              <>
                <Popconfirm title="确认全量上线？" onConfirm={() => handlePromote(record, 'Production')}>
                  <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }}>上线</Button>
                </Popconfirm>
                <Popconfirm title="确认回滚？" onConfirm={() => handleRollback(record)}>
                  <Button type="link" size="small" icon={<RollbackOutlined />} danger>回滚</Button>
                </Popconfirm>
              </>
            )}
            {record.stage === 'Production' && (
              <Popconfirm title="确认回滚？" onConfirm={() => handleRollback(record)}>
                <Button type="link" size="small" icon={<RollbackOutlined />} danger>回滚</Button>
              </Popconfirm>
            )}
          </Space>
        )
      },
    },
  ]

  const routeColumns = [
    { title: '能力入口', dataIndex: 'path', key: 'path', render: (value: string) => <Text code>{value}</Text> },
    { title: '服务', dataIndex: 'model', key: 'model', render: (value: string) => <Text strong>{value}</Text> },
    { title: '能力', key: 'capability', render: (_: unknown, route: GatewayRoute) => summarizeGatewayCapability(route) },
    { title: '版本', dataIndex: 'version', key: 'version', width: 110 },
    { title: '流量权重', dataIndex: 'weight', key: 'weight', width: 100, render: (value: number) => `${value}%` },
    { title: '限流', dataIndex: 'rateLimit', key: 'rateLimit', width: 100, render: (value: number) => `${value} RPM` },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: unknown, route: GatewayRoute) => (
        <Button type="link" size="small" onClick={() => handleOpenTraffic(route)}>
          调整流量
        </Button>
      ),
    },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>{MODEL_CENTER_PAGE_LABELS.gateway}</Title>
          <Text type="secondary">统一发布 LLM / VL 推理服务，管理能力入口、流量权重、灰度推进和延迟 SLA</Text>
        </div>

        <Row gutter={[14, 14]} style={{ margin: '16px 0 20px' }}>
          {statItems.map(item => (
            <Col span={4} key={item.title}>
              <Card size="small" className="stat-card card-hover" styles={{ body: { padding: '16px 18px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="stat-icon-wrap" style={{ background: item.bg, color: item.color }}>{item.icon}</div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>{item.title}</Text>
                    <div style={{ fontSize: 24, fontWeight: 700, color: item.color, lineHeight: 1.2 }}>{item.value}</div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Card size="small" title="服务注册表">
              <Table dataSource={models} columns={modelColumns} rowKey="key" pagination={false} size="small" />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="运行概览" style={{ marginBottom: 16 }}>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="今日请求">{monitorStats.todayRequests.toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="成功率">{monitorStats.successRate}</Descriptions.Item>
                <Descriptions.Item label="平均延迟">{monitorStats.avgLatency}</Descriptions.Item>
                <Descriptions.Item label="P99 延迟">{monitorStats.p99Latency}</Descriptions.Item>
              </Descriptions>
            </Card>
            <Card size="small" title="小时流量">
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {hourlyTraffic.map(item => (
                  <div key={item.hour}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text>{item.hour}</Text>
                      <Text type="secondary">{item.requests.toLocaleString()}</Text>
                    </Space>
                    <div style={{ height: 8, borderRadius: 999, background: '#f3f4f6', overflow: 'hidden' }}>
                      <div style={{ width: `${(item.requests / maxTraffic) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #1677ff 0%, #52c41a 100%)' }} />
                    </div>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={16}>
            <Card size="small" title="能力路由">
              <Table dataSource={routes} columns={routeColumns} rowKey="key" pagination={false} size="small" />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="最近错误">
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {recentErrors.map(error => (
                  <Card key={error.key} size="small" styles={{ body: { padding: 12 } }}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space size={8}>
                        <WarningOutlined style={{ color: '#f59e0b' }} />
                        <Text strong>{error.model}</Text>
                        <Tag>{error.errorCode}</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>{error.time}</Text>
                      <Text style={{ fontSize: 12 }}>{error.errorMessage}</Text>
                    </Space>
                  </Card>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      <Modal
        title={<ModalHeader icon={<GatewayOutlined />} title="发布推理服务" />}
        open={deployModalOpen}
        onCancel={() => setDeployModalOpen(false)}
        onOk={() => void handleDeploy()}
        okText="提交发布"
        cancelText="取消"
      >
        <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 16 }}>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="目标服务">{deployTarget?.displayName ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="当前阶段">{deployTarget?.stage ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="能力入口">{deployTarget?.endpoint ?? '—'}</Descriptions.Item>
          </Descriptions>
          <Row gutter={16}>
            <Col span={8}>
              <Text type="secondary">部署副本</Text>
              <InputNumber
                min={1}
                style={{ width: '100%', marginTop: 8 }}
                value={deployConfig.replicas}
                onChange={value => setDeployConfig(current => ({ ...current, replicas: value ?? 1 }))}
              />
            </Col>
            <Col span={8}>
              <Text type="secondary">GPU 规格</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                options={GPU_OPTIONS}
                value={deployConfig.gpuType}
                onChange={value => setDeployConfig(current => ({ ...current, gpuType: value }))}
              />
            </Col>
            <Col span={8}>
              <Text type="secondary">目标阶段</Text>
              <Radio.Group
                value={deployTargetStage}
                onChange={event => setDeployTargetStage(event.target.value)}
                style={{ marginTop: 8 }}
              >
                <Radio.Button value="Staging">Staging</Radio.Button>
                <Radio.Button value="Canary">Canary</Radio.Button>
                <Radio.Button value="Production">Production</Radio.Button>
              </Radio.Group>
            </Col>
          </Row>
        </Space>
      </Modal>

      <Modal
        title={<ModalHeader icon={<LineChartOutlined />} title="调整能力路由流量" />}
        open={trafficModalOpen}
        onCancel={() => setTrafficModalOpen(false)}
        onOk={() => void handleUpdateTraffic()}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 16 }}>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="能力入口">{trafficRoute?.path ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="服务版本">{trafficRoute ? `${trafficRoute.model} / ${trafficRoute.version}` : '—'}</Descriptions.Item>
          </Descriptions>
          <div>
            <Text type="secondary">流量权重</Text>
            <InputNumber
              min={0}
              max={100}
              style={{ width: '100%', marginTop: 8 }}
              value={trafficWeight}
              onChange={value => setTrafficWeight(value ?? 0)}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}
