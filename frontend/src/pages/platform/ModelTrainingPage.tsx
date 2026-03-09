import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  ExperimentOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  ProjectOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  StopOutlined,
  DeleteOutlined,
  LineChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  listTrainingJobs,
  listTrainingProjects,
  createTrainingProject,
  getTrainingStats,
  stopTraining,
  startTraining,
} from '../../api/modelTraining'
import { listDatasets } from '../../api/trainingDataset'
import type { TrainingJob, TrainingProject, TrainingStatus, Framework } from '../../types/modelTraining'
import { TRAINING_STATUS_COLORS, FRAMEWORK_COLORS } from '../../types/modelTraining'
import type { TrainingStats } from '../../api/modelTraining'
import type { TrainingDataset } from '../../types/trainingDataset'
import ModalHeader from '../../components/shared/ModalHeader'

const { Title, Text } = Typography

const STATUS_ICONS: Record<TrainingStatus, React.ReactNode> = {
  Running: <PlayCircleOutlined />,
  Completed: <CheckCircleOutlined />,
  Failed: <CloseCircleOutlined />,
  Queued: <ClockCircleOutlined />,
  Stopped: <CloseCircleOutlined />,
}

const TRAIN_METHOD_LABELS: Record<string, string> = {
  full: 'Full Fine-tuning',
  lora: 'LoRA',
  qlora: 'QLoRA',
}

/** 简单 SVG 折线图：双线 (train + val) */
function LossMiniChart({ trainLoss, valLoss }: { trainLoss: number[]; valLoss: number[] }) {
  if (trainLoss.length === 0) return <Text type="secondary">暂无数据</Text>

  const width = 620
  const height = 180
  const pad = { top: 20, right: 20, bottom: 30, left: 50 }
  const iw = width - pad.left - pad.right
  const ih = height - pad.top - pad.bottom

  const allVals = [...trainLoss, ...valLoss]
  const maxV = Math.max(...allVals) * 1.05
  const minV = Math.min(...allVals) * 0.95

  const toX = (i: number, len: number) => pad.left + (i / Math.max(len - 1, 1)) * iw
  const toY = (v: number) => pad.top + (1 - (v - minV) / (maxV - minV || 1)) * ih

  const polyline = (data: number[]) =>
    data.map((v, i) => `${toX(i, data.length).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')

  // Y-axis ticks
  const yTicks = 5
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const v = minV + ((maxV - minV) / (yTicks - 1)) * i
    return { v, y: toY(v) }
  })

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* grid lines */}
      {yLabels.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} y1={t.y} x2={width - pad.right} y2={t.y} stroke="#f0f0f0" />
          <text x={pad.left - 6} y={t.y + 4} textAnchor="end" fontSize={10} fill="#999">{t.v.toFixed(2)}</text>
        </g>
      ))}
      {/* X-axis label */}
      <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={10} fill="#999">Epoch</text>
      {/* Train loss */}
      <polyline points={polyline(trainLoss)} fill="none" stroke="#1677ff" strokeWidth={1.5} />
      {/* Val loss */}
      <polyline points={polyline(valLoss)} fill="none" stroke="#ff7a45" strokeWidth={1.5} strokeDasharray="4,3" />
      {/* legend */}
      <line x1={pad.left} y1={8} x2={pad.left + 20} y2={8} stroke="#1677ff" strokeWidth={2} />
      <text x={pad.left + 24} y={12} fontSize={10} fill="#666">Train Loss</text>
      <line x1={pad.left + 90} y1={8} x2={pad.left + 110} y2={8} stroke="#ff7a45" strokeWidth={2} strokeDasharray="4,3" />
      <text x={pad.left + 114} y={12} fontSize={10} fill="#666">Val Loss</text>
    </svg>
  )
}

export default function ModelTrainingPage() {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  const [stats, setStats] = useState<TrainingStats>({ projects: 0, totalJobs: 0, running: 0, completed: 0, gpuUtilization: '—', avgTrainTime: '—' })
  const [jobs, setJobs] = useState<TrainingJob[]>([])
  const [projects, setProjects] = useState<TrainingProject[]>([])
  const [datasets, setDatasets] = useState<TrainingDataset[]>([])

  // Detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<TrainingJob | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getTrainingStats().then(d => setStats(d))
    listTrainingJobs().then(d => setJobs(d))
    listTrainingProjects().then(d => setProjects(d))
    listDatasets().then(d => setDatasets(d.filter(ds => ds.status === 'Ready')))
  }, [])

  // auto-scroll log viewer
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedJob])

  const refreshData = () => {
    getTrainingStats().then(d => setStats(d))
    listTrainingJobs().then(d => setJobs([...d]))
    listTrainingProjects().then(d => setProjects([...d]))
  }

  const openDetail = (job: TrainingJob) => {
    setSelectedJob(job)
    setDrawerOpen(true)
  }

  const handleStop = async (jobKey: string) => {
    await stopTraining(jobKey)
    message.success('训练已停止')
    refreshData()
    if (selectedJob?.key === jobKey) {
      setSelectedJob({ ...selectedJob, status: 'Stopped' })
    }
  }

  const handleRestart = async (job: TrainingJob) => {
    const project = projects.find(p => p.name === job.projectName)
    if (project) {
      await startTraining(project.key)
      message.success('已创建新的训练任务')
      refreshData()
    }
  }

  const handleDelete = (jobKey: string) => {
    // Mock delete: just filter
    const updated = jobs.filter(j => j.key !== jobKey)
    setJobs(updated)
    message.success('训练任务已删除')
    if (selectedJob?.key === jobKey) {
      setDrawerOpen(false)
      setSelectedJob(null)
    }
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await createTrainingProject({
        name: values.name,
        description: values.description,
        dataSource: values.dataSource ?? '',
        framework: values.framework ?? 'PyTorch',
        gpu: values.gpu ?? 'V100 - 16GB',
        baseModel: values.baseModel,
        trainMethod: values.trainMethod,
        datasetName: values.datasetName,
        hyperParams: {
          learningRate: values.learningRate ?? 2e-5,
          batchSize: values.batchSize ?? 16,
          epochs: values.epochs ?? 3,
          warmupSteps: values.warmupSteps ?? 100,
          maxSeqLen: values.maxSeqLen ?? 2048,
        },
      })
      message.success('训练项目创建成功')
      setCreateOpen(false)
      form.resetFields()
      refreshData()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
    }
  }

  const statItems = [
    { title: '训练项目', value: stats.projects, icon: <ProjectOutlined />, color: '#4f46e5', bg: '#eef2ff' },
    { title: '训练任务', value: stats.totalJobs, icon: <ExperimentOutlined />, color: '#0891b2', bg: '#ecfeff' },
    { title: '运行中', value: stats.running, icon: <PlayCircleOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: '已完成', value: stats.completed, icon: <CheckCircleOutlined />, color: '#7c3aed', bg: '#f5f3ff' },
    { title: 'GPU 使用率', value: stats.gpuUtilization, icon: <DashboardOutlined />, color: '#d97706', bg: '#fffbeb' },
    { title: '平均训练时长', value: stats.avgTrainTime, icon: <ClockCircleOutlined />, color: '#4f46e5', bg: '#eef2ff' },
  ]

  /* 训练任务列 */
  const jobColumns = [
    { title: '运行 ID', dataIndex: 'name', key: 'name', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: '项目', dataIndex: 'projectName', key: 'projectName', render: (v: string) => <Text strong>{v}</Text> },
    {
      title: '框架', dataIndex: 'framework', key: 'framework', width: 110,
      render: (v: Framework) => <Tag color={FRAMEWORK_COLORS[v]}>{v}</Tag>,
    },
    { title: 'GPU', dataIndex: 'gpu', key: 'gpu', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: (['Running', 'Completed', 'Failed', 'Queued', 'Stopped'] as TrainingStatus[]).map(s => ({ text: s, value: s })),
      onFilter: (value: unknown, record: TrainingJob) => record.status === value,
      render: (v: TrainingStatus) => (
        <Tag icon={STATUS_ICONS[v]} color={TRAINING_STATUS_COLORS[v]}>{v}</Tag>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 140,
      render: (v: number, r: TrainingJob) => (
        <Space size={8}>
          <Progress
            percent={v}
            size="small"
            style={{ width: 80 }}
            status={r.status === 'Failed' ? 'exception' : r.status === 'Running' ? 'active' : undefined}
            showInfo={false}
          />
          <Text style={{ fontSize: 11 }}>{r.epoch}</Text>
        </Space>
      ),
    },
    {
      title: '最佳指标',
      key: 'metric',
      width: 120,
      render: (_: unknown, r: TrainingJob) => r.bestMetric !== '—' ? (
        <Tooltip title={r.metricName}>
          <Tag color="green">{r.metricName}: {r.bestMetric}</Tag>
        </Tooltip>
      ) : <Text type="secondary">—</Text>,
    },
    { title: '耗时', dataIndex: 'duration', key: 'duration', width: 80 },
    { title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 70 },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      render: (_: unknown, record: TrainingJob) => (
        <Space size={4}>
          <Tooltip title="查看">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} />
          </Tooltip>
          {record.status === 'Running' && (
            <Tooltip title="停止">
              <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => handleStop(record.key)} />
            </Tooltip>
          )}
          <Popconfirm title="确认删除此训练任务？" onConfirm={() => handleDelete(record.key)} okText="删除" cancelText="取消">
            <Tooltip title="删除">
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  /* 项目列 */
  const projectColumns = [
    { title: '项目名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: '说明', dataIndex: 'description', key: 'description' },
    { title: '基座模型', dataIndex: 'baseModel', key: 'baseModel', width: 130, render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '训练方式', dataIndex: 'trainMethod', key: 'trainMethod', width: 120, render: (v: string) => <Tag>{TRAIN_METHOD_LABELS[v] ?? v}</Tag> },
    { title: '数据集', dataIndex: 'datasetName', key: 'datasetName', width: 160, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: '框架', dataIndex: 'framework', key: 'framework', width: 100, render: (v: Framework) => <Tag color={FRAMEWORK_COLORS[v]}>{v}</Tag> },
    { title: '训练次数', dataIndex: 'jobs', key: 'jobs', width: 80 },
    { title: '最佳指标', dataIndex: 'bestMetric', key: 'bestMetric', width: 90, render: (v: string) => v !== '—' ? <Tag color="green">{v}</Tag> : '—' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 100 },
  ]

  const tabItems = [
    {
      key: 'jobs',
      label: <span><ThunderboltOutlined /> 训练任务 ({jobs.length})</span>,
      children: <Table dataSource={jobs} columns={jobColumns} rowKey="key" pagination={false} size="small" />,
    },
    {
      key: 'projects',
      label: <span><ProjectOutlined /> 训练项目 ({projects.length})</span>,
      children: <Table dataSource={projects} columns={projectColumns} rowKey="key" pagination={false} size="small" />,
    },
  ]

  /* ---------- Drawer: 训练详情 ---------- */
  const renderMetricsTab = (job: TrainingJob) => {
    const lastTrainLoss = job.trainLoss.length > 0 ? job.trainLoss[job.trainLoss.length - 1] : null
    const lastValLoss = job.valLoss.length > 0 ? job.valLoss[job.valLoss.length - 1] : null
    const minTrainLoss = job.trainLoss.length > 0 ? Math.min(...job.trainLoss) : null

    return (
      <div>
        <Text strong style={{ fontSize: 14 }}>Loss 曲线</Text>
        <div style={{ margin: '12px 0', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, background: '#fafafa' }}>
          <LossMiniChart trainLoss={job.trainLoss} valLoss={job.valLoss} />
        </div>

        <Text strong style={{ fontSize: 14 }}>当前指标</Text>
        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic title="当前 Train Loss" value={lastTrainLoss ?? '—'} precision={4} valueStyle={{ fontSize: 18, color: '#1677ff' }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic title="当前 Val Loss" value={lastValLoss ?? '—'} precision={4} valueStyle={{ fontSize: 18, color: '#ff7a45' }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic title="最佳 Train Loss" value={minTrainLoss ?? '—'} precision={4} valueStyle={{ fontSize: 18, color: '#52c41a' }} />
            </Card>
          </Col>
        </Row>
        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic title="Learning Rate" value={job.learningRate.toExponential(1)} valueStyle={{ fontSize: 16 }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic title="GPU 显存" value={job.gpuMemUsage} valueStyle={{ fontSize: 16 }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic title="GPU 利用率" value={job.gpuUtil} valueStyle={{ fontSize: 16 }} />
            </Card>
          </Col>
        </Row>
      </div>
    )
  }

  const renderLogsTab = (job: TrainingJob) => (
    <div
      style={{
        background: '#1a1a2e',
        color: '#4ade80',
        fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
        fontSize: 12,
        padding: 16,
        borderRadius: 8,
        maxHeight: 400,
        overflow: 'auto',
        lineHeight: 1.8,
      }}
    >
      {job.logs.map((line, i) => (
        <div key={i} style={{ whiteSpace: 'pre-wrap', color: line.includes('ERROR') ? '#f87171' : line.includes('WARN') ? '#fbbf24' : '#4ade80' }}>
          {line}
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  )

  const renderParamsTab = (job: TrainingJob) => {
    // Find project for additional info
    const project = projects.find(p => p.name === job.projectName)
    return (
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="基座模型">{project?.baseModel ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="训练方式">{project?.trainMethod ? TRAIN_METHOD_LABELS[project.trainMethod] : '—'}</Descriptions.Item>
        <Descriptions.Item label="Learning Rate">{job.learningRate.toExponential(1)}</Descriptions.Item>
        <Descriptions.Item label="Batch Size">{job.batchSize}</Descriptions.Item>
        <Descriptions.Item label="Warmup Steps">{job.warmupSteps}</Descriptions.Item>
        <Descriptions.Item label="Total Steps">{job.totalSteps}</Descriptions.Item>
        <Descriptions.Item label="Current Step">{job.currentStep}</Descriptions.Item>
        <Descriptions.Item label="Max Seq Length">{project?.hyperParams.maxSeqLen ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="训练框架">{job.framework}</Descriptions.Item>
        <Descriptions.Item label="GPU 资源">{job.gpu}</Descriptions.Item>
        <Descriptions.Item label="数据集">{project?.datasetName ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="数据源">{job.dataSource}</Descriptions.Item>
      </Descriptions>
    )
  }

  const drawerTabItems = selectedJob
    ? [
        { key: 'metrics', label: '训练指标', children: renderMetricsTab(selectedJob) },
        { key: 'logs', label: '训练日志', children: renderLogsTab(selectedJob) },
        { key: 'params', label: '超参数', children: renderParamsTab(selectedJob) },
      ]
    : []

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>模型训练</Title>
          <Text type="secondary">L5 训练平台 — 端到端模型训练、评估与注册，加速 AI 能力落地</Text>
        </div>

        <Row gutter={[14, 14]} style={{ margin: '16px 0 20px' }}>
          {statItems.map(s => (
            <Col span={4} key={s.title}>
              <Card size="small" className="stat-card card-hover" styles={{ body: { padding: '16px 18px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="stat-icon-wrap" style={{ background: s.bg, color: s.color }}>
                    {s.icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>{s.title}</Text>
                    <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateOpen(true); form.resetFields() }}>
            新建训练项目
          </Button>
        </div>

        <Tabs items={tabItems} />
      </Card>

      {/* 训练详情 Drawer */}
      <Drawer
        title={
          selectedJob ? (
            <Space>
              <Text strong>{selectedJob.name}</Text>
              <Tag icon={STATUS_ICONS[selectedJob.status]} color={TRAINING_STATUS_COLORS[selectedJob.status]}>
                {selectedJob.status}
              </Tag>
            </Space>
          ) : '训练详情'
        }
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedJob(null) }}
        width={720}
        footer={
          selectedJob ? (
            <div style={{ textAlign: 'right' }}>
              <Space>
                {selectedJob.status === 'Running' && (
                  <Button danger icon={<StopOutlined />} onClick={() => handleStop(selectedJob.key)}>
                    停止训练
                  </Button>
                )}
                {(selectedJob.status === 'Failed' || selectedJob.status === 'Completed' || selectedJob.status === 'Stopped') && (
                  <Button type="primary" icon={<ReloadOutlined />} onClick={() => handleRestart(selectedJob)}>
                    重新训练
                  </Button>
                )}
                {selectedJob.status === 'Completed' && (
                  <Button type="primary" icon={<LineChartOutlined />} onClick={() => {
                    setDrawerOpen(false)
                    navigate('/model-lab/evaluation')
                  }}>
                    去评估
                  </Button>
                )}
              </Space>
            </div>
          ) : null
        }
      >
        {selectedJob && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary">项目: {selectedJob.projectName}</Text>
                <Progress
                  percent={selectedJob.progress}
                  status={
                    selectedJob.status === 'Failed' ? 'exception'
                      : selectedJob.status === 'Running' ? 'active'
                        : undefined
                  }
                  format={pct => `${pct}% (${selectedJob.epoch})`}
                />
              </Space>
            </div>
            <Tabs items={drawerTabItems} />
          </>
        )}
      </Drawer>

      {/* 创建弹窗 */}
      <Modal
        title={<ModalHeader icon={<ExperimentOutlined />} title="新建训练项目" />}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        width={640}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={{
            trainMethod: 'lora',
            baseModel: 'DeepSeek-V3',
            learningRate: 2e-5,
            batchSize: 16,
            epochs: 3,
            warmupSteps: 100,
            maxSeqLen: 2048,
          }}
        >
          <Divider titlePlacement="left" plain>基本配置</Divider>
          <Form.Item label="项目名称" name="name" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="例如: training_churn_predictor" />
          </Form.Item>
          <Form.Item label="项目描述" name="description" rules={[{ required: true, message: '请输入项目描述' }]}>
            <Input placeholder="例如: 客户流失预测模型" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="基座模型" name="baseModel" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="DeepSeek-V3">DeepSeek-V3</Select.Option>
                  <Select.Option value="DeepSeek-R1">DeepSeek-R1</Select.Option>
                  <Select.Option value="Qwen-72B">Qwen-72B</Select.Option>
                  <Select.Option value="GLM-4">GLM-4</Select.Option>
                  <Select.Option value="Llama-3.1-70B">Llama-3.1-70B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="训练方式" name="trainMethod" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio.Button value="full">Full Fine-tuning</Radio.Button>
                  <Radio.Button value="lora">LoRA</Radio.Button>
                  <Radio.Button value="qlora">QLoRA</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left" plain>数据与资源</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="训练数据集" name="datasetName" rules={[{ required: true, message: '请选择数据集' }]}>
                <Select placeholder="选择数据集">
                  {datasets.map(d => (
                    <Select.Option key={d.key} value={d.name}>{d.name} ({d.records.toLocaleString()} 条)</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="GPU 资源" name="gpu" rules={[{ required: true, message: '请选择 GPU 资源' }]}>
                <Select placeholder="选择资源">
                  <Select.Option value="V100 - 16GB">V100 - 16GB</Select.Option>
                  <Select.Option value="A100 - 40GB">A100 - 40GB</Select.Option>
                  <Select.Option value="A100 - 80GB">A100 - 80GB</Select.Option>
                  <Select.Option value="CPU Only">CPU Only</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left" plain>超参数配置</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Learning Rate" name="learningRate" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1e-7} max={1e-2} step={1e-6} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Batch Size" name="batchSize" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value={8}>8</Select.Option>
                  <Select.Option value={16}>16</Select.Option>
                  <Select.Option value={32}>32</Select.Option>
                  <Select.Option value={64}>64</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Epochs" name="epochs" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={200} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Warmup Steps" name="warmupSteps" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={10000} step={10} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Max Sequence Length" name="maxSeqLen" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value={512}>512</Select.Option>
                  <Select.Option value={1024}>1024</Select.Option>
                  <Select.Option value={2048}>2048</Select.Option>
                  <Select.Option value={4096}>4096</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="框架" name="framework" rules={[{ required: true }]}>
                <Select placeholder="选择框架">
                  <Select.Option value="PyTorch">PyTorch</Select.Option>
                  <Select.Option value="TensorFlow">TensorFlow</Select.Option>
                  <Select.Option value="scikit-learn">scikit-learn</Select.Option>
                  <Select.Option value="Transformers">Transformers</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
