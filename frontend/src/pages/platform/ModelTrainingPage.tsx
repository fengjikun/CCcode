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
  CheckCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  EyeOutlined,
  LineChartOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ProjectOutlined,
  ReloadOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  createTrainingProject,
  getTrainingStats,
  listTrainingJobs,
  listTrainingProjects,
  startTraining,
  stopTraining,
} from '../../api/modelTraining'
import { listDatasets } from '../../api/trainingDataset'
import ModalHeader from '../../components/shared/ModalHeader'
import {
  DATASET_TYPE_LABELS,
  MODEL_CENTER_PAGE_LABELS,
  MODEL_FAMILY_LABELS,
  MODEL_MODALITY_LABELS,
  TRAIN_STAGE_LABELS,
} from '../../types/modelCenter'
import type { TrainingJob, TrainingProject, TrainingStatus, Framework } from '../../types/modelTraining'
import { FRAMEWORK_COLORS, TRAINING_STATUS_COLORS } from '../../types/modelTraining'
import type { TrainingDataset } from '../../types/trainingDataset'
import type { TrainingStats } from '../../api/modelTraining'
import { formatTrainingScale, getTrainingFacetSummary } from './modelTraining.helpers'

const { Title, Text } = Typography

const STATUS_ICONS: Record<TrainingStatus, React.ReactNode> = {
  Running: <PlayCircleOutlined />,
  Completed: <CheckCircleOutlined />,
  Failed: <StopOutlined />,
  Queued: <ClockCircleOutlined />,
  Stopped: <StopOutlined />,
}

const FAMILY_COLORS = {
  LLM: 'blue',
  VL: 'magenta',
} as const

const MODALITY_COLORS = {
  text: 'cyan',
  'image-text': 'gold',
} as const

const BASE_MODEL_OPTIONS = [
  'Deepexi-R1-Industry-32B',
  'Deepexi-Industry-60B-Instruct',
  'Deepexi-VL-Industry-32B',
  'Deepexi-VL-Document-7B',
]

const GPU_OPTIONS = ['2 x A100 80GB', '4 x H100 80GB', '8 x H100 80GB', '8 x A100 80GB']

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

  const polyline = (data: number[]) => data.map((v, i) => `${toX(i, data.length).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  const yTicks = 5
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const v = minV + ((maxV - minV) / (yTicks - 1)) * i
    return { v, y: toY(v) }
  })

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {yLabels.map((tick, index) => (
        <g key={index}>
          <line x1={pad.left} y1={tick.y} x2={width - pad.right} y2={tick.y} stroke="#f0f0f0" />
          <text x={pad.left - 6} y={tick.y + 4} textAnchor="end" fontSize={10} fill="#999">{tick.v.toFixed(2)}</text>
        </g>
      ))}
      <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={10} fill="#999">Checkpoint</text>
      <polyline points={polyline(trainLoss)} fill="none" stroke="#1677ff" strokeWidth={1.5} />
      <polyline points={polyline(valLoss)} fill="none" stroke="#ff7a45" strokeWidth={1.5} strokeDasharray="4,3" />
      <line x1={pad.left} y1={8} x2={pad.left + 20} y2={8} stroke="#1677ff" strokeWidth={2} />
      <text x={pad.left + 24} y={12} fontSize={10} fill="#666">Train Loss</text>
      <line x1={pad.left + 90} y1={8} x2={pad.left + 110} y2={8} stroke="#ff7a45" strokeWidth={2} strokeDasharray="4,3" />
      <text x={pad.left + 114} y={12} fontSize={10} fill="#666">Eval Loss</text>
    </svg>
  )
}

export default function ModelTrainingPage() {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  const [stats, setStats] = useState<TrainingStats>({
    projects: 0,
    totalJobs: 0,
    running: 0,
    completed: 0,
    gpuUtilization: '—',
    avgTrainTime: '—',
  })
  const [jobs, setJobs] = useState<TrainingJob[]>([])
  const [projects, setProjects] = useState<TrainingProject[]>([])
  const [datasets, setDatasets] = useState<TrainingDataset[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<TrainingJob | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getTrainingStats().then(setStats)
    listTrainingJobs().then(setJobs)
    listTrainingProjects().then(setProjects)
    listDatasets().then(list => setDatasets(list.filter(dataset => dataset.status === 'Ready')))
  }, [])

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [selectedJob])

  const refreshData = () => {
    getTrainingStats().then(setStats)
    listTrainingJobs().then(setJobs)
    listTrainingProjects().then(setProjects)
  }

  const openDetail = (job: TrainingJob) => {
    setSelectedJob(job)
    setDrawerOpen(true)
  }

  const handleStop = async (jobKey: string) => {
    await stopTraining(jobKey)
    message.success('训练运行已停止')
    refreshData()
    if (selectedJob?.key === jobKey) setSelectedJob({ ...selectedJob, status: 'Stopped' })
  }

  const handleRestart = async (job: TrainingJob) => {
    const project = projects.find(item => item.name === job.projectName)
    if (!project) return
    await startTraining(project.key)
    message.success('已创建新的微调运行')
    refreshData()
  }

  const handleDelete = (jobKey: string) => {
    setJobs(current => current.filter(job => job.key !== jobKey))
    message.success('训练运行已删除')
    if (selectedJob?.key === jobKey) {
      setDrawerOpen(false)
      setSelectedJob(null)
    }
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const dataset = datasets.find(item => item.name === values.datasetName)
      await createTrainingProject({
        name: values.name,
        description: values.description,
        dataSource: dataset?.source ?? values.datasetName,
        framework: values.framework ?? 'Transformers',
        gpu: values.gpu ?? '4 x H100 80GB',
        baseModel: values.baseModel,
        trainMethod: values.trainMethod,
        datasetName: values.datasetName,
        hyperParams: {
          learningRate: values.learningRate ?? 2e-5,
          batchSize: values.batchSize ?? 16,
          epochs: values.epochs ?? 2,
          warmupSteps: values.warmupSteps ?? 100,
          maxSeqLen: values.maxSeqLen ?? 8192,
        },
      })
      message.success('训练项目创建成功')
      setCreateOpen(false)
      form.resetFields()
      refreshData()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
    }
  }

  const llmProjects = projects.filter(project => project.modelFamily === 'LLM').length
  const vlProjects = projects.filter(project => project.modelFamily === 'VL').length

  const statItems = [
    { title: '训练项目', value: stats.projects, icon: <ProjectOutlined />, color: '#4f46e5', bg: '#eef2ff' },
    { title: '运行中', value: stats.running, icon: <PlayCircleOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: 'LLM 项目', value: llmProjects, icon: <ExperimentOutlined />, color: '#0891b2', bg: '#ecfeff' },
    { title: 'VL 项目', value: vlProjects, icon: <LineChartOutlined />, color: '#d97706', bg: '#fffbeb' },
    { title: 'GPU 使用率', value: stats.gpuUtilization, icon: <DashboardOutlined />, color: '#9333ea', bg: '#f5f3ff' },
    { title: '平均训练时长', value: stats.avgTrainTime, icon: <ClockCircleOutlined />, color: '#7c3aed', bg: '#eef2ff' },
  ]

  const jobColumns = [
    {
      title: '运行 ID',
      dataIndex: 'name',
      key: 'name',
      render: (value: string) => <Text code style={{ fontSize: 11 }}>{value}</Text>,
    },
    {
      title: '模型与阶段',
      key: 'summary',
      render: (_: unknown, record: TrainingJob) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.projectName}</Text>
          <Space size={4} wrap>
            <Tag color={FAMILY_COLORS[record.modelFamily]}>{MODEL_FAMILY_LABELS[record.modelFamily]}</Tag>
            <Tag color={MODALITY_COLORS[record.modality]}>{MODEL_MODALITY_LABELS[record.modality]}</Tag>
            <Tag>{TRAIN_STAGE_LABELS[record.trainStage]}</Tag>
          </Space>
        </Space>
      ),
    },
    {
      title: '基座模型',
      key: 'baseModel',
      render: (_: unknown, record: TrainingJob) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">{record.baseModel}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.capability}</Text>
        </Space>
      ),
    },
    {
      title: '语料规模',
      key: 'dataset',
      render: (_: unknown, record: TrainingJob) => (
        <Space direction="vertical" size={2}>
          <Text code style={{ fontSize: 11 }}>{record.datasetName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatTrainingScale(record)}
          </Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      filters: (['Running', 'Completed', 'Failed', 'Queued', 'Stopped'] as TrainingStatus[]).map(status => ({ text: status, value: status })),
      onFilter: (value: unknown, record: TrainingJob) => record.status === value,
      render: (value: TrainingStatus) => <Tag icon={STATUS_ICONS[value]} color={TRAINING_STATUS_COLORS[value]}>{value}</Tag>,
    },
    {
      title: '进度',
      key: 'progress',
      width: 150,
      render: (_: unknown, record: TrainingJob) => (
        <Space size={8}>
          <Progress percent={record.progress} size="small" style={{ width: 86 }} showInfo={false} />
          <Text style={{ fontSize: 11 }}>{record.epoch}</Text>
        </Space>
      ),
    },
    {
      title: 'Checkpoint',
      key: 'checkpoint',
      render: (_: unknown, record: TrainingJob) => (
        <Text code style={{ fontSize: 11 }}>{record.checkpoint.split('/').slice(-2).join('/')}</Text>
      ),
    },
    {
      title: '最佳指标',
      key: 'metric',
      width: 160,
      render: (_: unknown, record: TrainingJob) => record.bestMetric !== '—'
        ? <Tag color="green">{record.metricName}: {record.bestMetric}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      render: (_: unknown, record: TrainingJob) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} />
          </Tooltip>
          {record.status === 'Running' && (
            <Tooltip title="停止运行">
              <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => handleStop(record.key)} />
            </Tooltip>
          )}
          <Popconfirm title="确认删除此训练运行？" onConfirm={() => handleDelete(record.key)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const projectColumns = [
    {
      title: '项目',
      key: 'name',
      render: (_: unknown, record: TrainingProject) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.displayName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.name}</Text>
        </Space>
      ),
    },
    {
      title: '能力摘要',
      key: 'facets',
      render: (_: unknown, record: TrainingProject) => (
        <Space direction="vertical" size={2}>
          <Text>{getTrainingFacetSummary(record)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.alignmentTags.join(' / ')}</Text>
        </Space>
      ),
    },
    {
      title: '基座模型',
      key: 'base',
      render: (_: unknown, record: TrainingProject) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">{record.baseModel}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>Context {record.contextWindow.toLocaleString()}</Text>
        </Space>
      ),
    },
    {
      title: '训练语料',
      key: 'dataset',
      render: (_: unknown, record: TrainingProject) => (
        <Space direction="vertical" size={2}>
          <Text code style={{ fontSize: 11 }}>{record.datasetName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {DATASET_TYPE_LABELS[record.datasetType]} / {formatTrainingScale(record)}
          </Text>
        </Space>
      ),
    },
    {
      title: '资源',
      key: 'infra',
      render: (_: unknown, record: TrainingProject) => (
        <Space direction="vertical" size={2}>
          <Tag color={FRAMEWORK_COLORS[record.framework]}>{record.framework}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.gpu}</Text>
        </Space>
      ),
    },
    { title: '运行次数', dataIndex: 'jobs', key: 'jobs', width: 90 },
    { title: '最佳指标', dataIndex: 'bestMetric', key: 'bestMetric', width: 120, render: (value: string) => <Tag color="green">{value}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 100 },
  ]

  const tabItems = [
    {
      key: 'jobs',
      label: <span><ThunderboltOutlined /> 训练运行 ({jobs.length})</span>,
      children: <Table dataSource={jobs} columns={jobColumns} rowKey="key" pagination={false} size="small" />,
    },
    {
      key: 'projects',
      label: <span><ProjectOutlined /> 微调项目 ({projects.length})</span>,
      children: <Table dataSource={projects} columns={projectColumns} rowKey="key" pagination={false} size="small" />,
    },
  ]

  const renderMetricsTab = (job: TrainingJob) => {
    const lastTrainLoss = job.trainLoss.at(-1)
    const lastValLoss = job.valLoss.at(-1)
    const minTrainLoss = job.trainLoss.length > 0 ? Math.min(...job.trainLoss) : undefined
    return (
      <div>
        <Text strong style={{ fontSize: 14 }}>Checkpoint 曲线</Text>
        <div style={{ margin: '12px 0', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, background: '#fafafa' }}>
          <LossMiniChart trainLoss={job.trainLoss} valLoss={job.valLoss} />
        </div>
        <Row gutter={[12, 12]}>
          <Col span={6}><Card size="small"><Statistic title="Train Loss" value={lastTrainLoss ?? '—'} precision={4} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Eval Loss" value={lastValLoss ?? '—'} precision={4} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Best Loss" value={minTrainLoss ?? '—'} precision={4} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title={job.metricName} value={job.bestMetric} /></Card></Col>
        </Row>
        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
          <Col span={6}><Card size="small"><Statistic title="Learning Rate" value={job.learningRate.toExponential(1)} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="GPU 显存" value={job.gpuMemUsage} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="GPU 利用率" value={job.gpuUtil} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Context Window" value={job.contextWindow.toLocaleString()} /></Card></Col>
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
      {job.logs.map((line, index) => (
        <div key={index} style={{ whiteSpace: 'pre-wrap', color: line.includes('ERROR') ? '#f87171' : line.includes('WARN') ? '#fbbf24' : '#4ade80' }}>
          {line}
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  )

  const renderParamsTab = (job: TrainingJob) => {
    const project = projects.find(item => item.name === job.projectName)
    return (
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="模型家族">{MODEL_FAMILY_LABELS[job.modelFamily]}</Descriptions.Item>
        <Descriptions.Item label="模态">{MODEL_MODALITY_LABELS[job.modality]}</Descriptions.Item>
        <Descriptions.Item label="训练阶段">{TRAIN_STAGE_LABELS[job.trainStage]}</Descriptions.Item>
        <Descriptions.Item label="能力">{job.capability}</Descriptions.Item>
        <Descriptions.Item label="基座模型">{job.baseModel}</Descriptions.Item>
        <Descriptions.Item label="Checkpoint">{job.checkpoint}</Descriptions.Item>
        <Descriptions.Item label="训练语料">{job.datasetName}</Descriptions.Item>
        <Descriptions.Item label="语料类型">{DATASET_TYPE_LABELS[job.datasetType]}</Descriptions.Item>
        <Descriptions.Item label="语料规模">{formatTrainingScale(job)}</Descriptions.Item>
        <Descriptions.Item label="Context Window">{job.contextWindow.toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="LoRA Rank">{job.loraRank ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Warmup Steps">{job.warmupSteps}</Descriptions.Item>
        <Descriptions.Item label="Batch Size">{job.batchSize}</Descriptions.Item>
        <Descriptions.Item label="Total Steps">{job.totalSteps}</Descriptions.Item>
        <Descriptions.Item label="框架">{job.framework}</Descriptions.Item>
        <Descriptions.Item label="GPU 资源">{job.gpu}</Descriptions.Item>
        <Descriptions.Item label="对齐标签" span={2}>{project?.alignmentTags.join(' / ') ?? '—'}</Descriptions.Item>
      </Descriptions>
    )
  }

  const drawerTabItems = selectedJob
    ? [
        { key: 'metrics', label: '训练指标', children: renderMetricsTab(selectedJob) },
        { key: 'logs', label: '训练日志', children: renderLogsTab(selectedJob) },
        { key: 'params', label: '运行参数', children: renderParamsTab(selectedJob) },
      ]
    : []

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>{MODEL_CENTER_PAGE_LABELS.training}</Title>
          <Text type="secondary">面向 LLM 与 VL 的 SFT、LoRA、QLoRA、DPO 与继续预训练工作台</Text>
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

        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateOpen(true); form.resetFields() }}>
            新建微调项目
          </Button>
        </div>

        <Tabs items={tabItems} />
      </Card>

      <Drawer
        title={selectedJob ? (
          <Space>
            <Text strong>{selectedJob.name}</Text>
            <Tag icon={STATUS_ICONS[selectedJob.status]} color={TRAINING_STATUS_COLORS[selectedJob.status]}>{selectedJob.status}</Tag>
          </Space>
        ) : '训练详情'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedJob(null) }}
        width={760}
        footer={selectedJob ? (
          <div style={{ textAlign: 'right' }}>
            <Space>
              {selectedJob.status === 'Running' && (
                <Button danger icon={<StopOutlined />} onClick={() => handleStop(selectedJob.key)}>停止运行</Button>
              )}
              {['Failed', 'Completed', 'Stopped'].includes(selectedJob.status) && (
                <Button type="primary" icon={<ReloadOutlined />} onClick={() => handleRestart(selectedJob)}>重新训练</Button>
              )}
              {selectedJob.status === 'Completed' && (
                <Button type="primary" icon={<LineChartOutlined />} onClick={() => navigate('/model-lab/evaluation')}>去评测与对齐</Button>
              )}
            </Space>
          </div>
        ) : null}
      >
        {selectedJob && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary">{getTrainingFacetSummary(selectedJob)}</Text>
                <Progress percent={selectedJob.progress} format={percent => `${percent}% (${selectedJob.epoch})`} />
              </Space>
            </div>
            <Tabs items={drawerTabItems} />
          </>
        )}
      </Drawer>

      <Modal
        title={<ModalHeader icon={<ExperimentOutlined />} title="新建微调项目" />}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={{
            baseModel: 'Deepexi-R1-Industry-32B',
            trainMethod: 'sft',
            framework: 'Transformers',
            gpu: '4 x H100 80GB',
            learningRate: 2e-5,
            batchSize: 16,
            epochs: 2,
            warmupSteps: 100,
            maxSeqLen: 8192,
            loraRank: 16,
          }}
        >
          <Divider titlePlacement="left" plain>模型配置</Divider>
          <Form.Item label="项目名称" name="name" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="例如: factory-copilot-sft-v3" />
          </Form.Item>
          <Form.Item label="项目描述" name="description" rules={[{ required: true, message: '请输入项目描述' }]}>
            <Input placeholder="例如: 工厂知识助手监督微调版本 3" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="模型家族" name="modelFamily" initialValue="LLM">
                <Radio.Group>
                  <Radio.Button value="LLM">LLM</Radio.Button>
                  <Radio.Button value="VL">VL</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="基座模型" name="baseModel" rules={[{ required: true }]}>
                <Select options={BASE_MODEL_OPTIONS.map(value => ({ label: value, value }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="训练阶段" name="trainMethod" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio.Button value="sft">SFT</Radio.Button>
                  <Radio.Button value="lora">LoRA</Radio.Button>
                  <Radio.Button value="qlora">QLoRA</Radio.Button>
                  <Radio.Button value="dpo">DPO</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left" plain>语料与资源</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="训练语料" name="datasetName" rules={[{ required: true, message: '请选择训练语料' }]}>
                <Select
                  placeholder="选择训练语料"
                  options={datasets.map(dataset => ({
                    label: `${dataset.name} (${DATASET_TYPE_LABELS[dataset.datasetType]})`,
                    value: dataset.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="运行框架" name="framework" rules={[{ required: true }]}>
                <Select options={(['Transformers', 'PyTorch'] as Framework[]).map(value => ({ label: value, value }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="GPU 资源" name="gpu" rules={[{ required: true }]}>
                <Select options={GPU_OPTIONS.map(value => ({ label: value, value }))} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left" plain>超参数</Divider>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Learning Rate" name="learningRate" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1e-7} max={1e-2} step={1e-6} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Batch Size" name="batchSize" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={128} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Epochs" name="epochs" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={10} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Warmup Steps" name="warmupSteps" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={5000} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Context Length" name="maxSeqLen" rules={[{ required: true }]}>
                <Select options={[4096, 8192, 16384, 32768].map(value => ({ label: value.toLocaleString(), value }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="LoRA Rank" name="loraRank">
                <InputNumber style={{ width: '100%' }} min={4} max={128} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="说明" tooltip="DPO 或全量 SFT 时可忽略 LoRA Rank">
                <Input value="支持 LLM / VL 微调配置" disabled />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
