import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
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
  DeleteOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FileTextOutlined,
  LineChartOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import {
  createEvalTask,
  getEvalComparisons,
  getEvalSamples,
  getEvalStats,
  listEvalTasks,
} from '../../api/modelEvaluation'
import { listTrainingProjects } from '../../api/modelTraining'
import { listDatasets } from '../../api/trainingDataset'
import ModalHeader from '../../components/shared/ModalHeader'
import {
  DATASET_TYPE_LABELS,
  MODEL_CENTER_PAGE_LABELS,
  MODEL_FAMILY_LABELS,
  MODEL_MODALITY_LABELS,
} from '../../types/modelCenter'
import { getModelDisplayName } from '../../types/modelCatalog'
import type { EvalComparison, EvalSample, EvalStatus, EvalTask, EvalTaskType } from '../../types/modelEvaluation'
import { EVAL_STATUS_COLORS, EVAL_TASK_TYPE_LABELS } from '../../types/modelEvaluation'
import type { TrainingProject } from '../../types/modelTraining'
import type { TrainingDataset } from '../../types/trainingDataset'
import type { EvalStats } from '../../api/modelEvaluation'
import { getPrimaryEvalMetric, summarizeEvalSample } from './modelEvaluation.helpers'

const { Title, Text } = Typography

const STATUS_ICONS: Record<EvalStatus, React.ReactNode> = {
  Running: <PlayCircleOutlined />,
  Completed: <CheckCircleOutlined />,
  Failed: <DeleteOutlined />,
  Pending: <ExperimentOutlined />,
}

const TASK_TYPE_COLORS: Record<EvalTaskType, string> = {
  classification: 'blue',
  generation: 'purple',
  extraction: 'cyan',
  qa: 'orange',
  'instruction-following': 'geekblue',
  hallucination: 'volcano',
  'grounded-vqa': 'green',
  'document-understanding': 'gold',
}

export default function ModelEvaluationPage() {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<EvalTask | null>(null)
  const [form] = Form.useForm()

  const [stats, setStats] = useState<EvalStats>({ totalTasks: 0, completed: 0, running: 0, avgAccuracy: '—', avgF1: '—' })
  const [tasks, setTasks] = useState<EvalTask[]>([])
  const [samples, setSamples] = useState<EvalSample[]>([])
  const [comparisons, setComparisons] = useState<EvalComparison[]>([])
  const [trainingProjects, setTrainingProjects] = useState<TrainingProject[]>([])
  const [availableDatasets, setAvailableDatasets] = useState<TrainingDataset[]>([])

  useEffect(() => {
    getEvalStats().then(setStats)
    listEvalTasks().then(setTasks)
    listTrainingProjects().then(setTrainingProjects)
    listDatasets().then(list => setAvailableDatasets(list.filter(dataset => dataset.status === 'Ready')))
  }, [])

  const openDetail = (task: EvalTask) => {
    setSelectedTask(task)
    getEvalSamples(task.key).then(setSamples)
    getEvalComparisons(task.modelName).then(setComparisons)
    setDrawerOpen(true)
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await createEvalTask(values)
      message.success('评测任务创建成功')
      setCreateOpen(false)
      form.resetFields()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
    }
  }

  const handleDelete = (key: string) => {
    setTasks(current => current.filter(task => task.key !== key))
    message.success('评测任务已删除')
  }

  const statItems = [
    { title: '评测任务', value: stats.totalTasks, icon: <ExperimentOutlined />, color: '#4f46e5', bg: '#eef2ff' },
    { title: '已完成', value: stats.completed, icon: <CheckCircleOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: '运行中', value: stats.running, icon: <PlayCircleOutlined />, color: '#0891b2', bg: '#ecfeff' },
    { title: '平均通过率', value: stats.avgAccuracy, icon: <SafetyCertificateOutlined />, color: '#7c3aed', bg: '#f5f3ff' },
    { title: '平均 Grounded', value: stats.avgF1, icon: <TrophyOutlined />, color: '#d97706', bg: '#fffbeb' },
  ]

  const taskColumns = [
    {
      title: '任务',
      key: 'name',
      render: (_: unknown, task: EvalTask) => (
        <Space direction="vertical" size={2}>
          <Text strong>{task.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{task.createdAt}</Text>
        </Space>
      ),
    },
    {
      title: '模型',
      key: 'model',
      render: (_: unknown, task: EvalTask) => (
        <Space direction="vertical" size={2}>
          <Space size={4} wrap>
            <Tag color={task.modelFamily === 'VL' ? 'magenta' : 'blue'}>{MODEL_FAMILY_LABELS[task.modelFamily]}</Tag>
            <Tag color={task.modality === 'image-text' ? 'gold' : 'cyan'}>{MODEL_MODALITY_LABELS[task.modality]}</Tag>
          </Space>
          <Text>{getModelDisplayName(task.modelName)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{task.modelName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{task.modelVersion}</Text>
        </Space>
      ),
    },
    {
      title: '任务类型',
      key: 'taskType',
      render: (_: unknown, task: EvalTask) => (
        <Space direction="vertical" size={2}>
          <Tag color={TASK_TYPE_COLORS[task.taskType]}>{EVAL_TASK_TYPE_LABELS[task.taskType]}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>{DATASET_TYPE_LABELS[task.datasetType]}</Text>
        </Space>
      ),
    },
    {
      title: '主指标',
      key: 'metric',
      render: (_: unknown, task: EvalTask) => {
        const metric = getPrimaryEvalMetric(task)
        return (
          <Space direction="vertical" size={2}>
            <Tag color="green">{metric.label}: {metric.value}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {task.winRate !== undefined ? `Win ${task.winRate.toFixed(1)}%` : 'Judge based'}
            </Text>
          </Space>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      filters: (['Running', 'Completed', 'Failed', 'Pending'] as EvalStatus[]).map(status => ({ text: status, value: status })),
      onFilter: (value: unknown, task: EvalTask) => task.status === value,
      render: (value: EvalStatus) => <Tag icon={STATUS_ICONS[value]} color={EVAL_STATUS_COLORS[value]}>{value}</Tag>,
    },
    {
      title: '进度',
      key: 'progress',
      width: 120,
      render: (_: unknown, task: EvalTask) => <Progress percent={task.progress} size="small" style={{ width: 90 }} showInfo={false} />,
    },
    { title: '耗时', dataIndex: 'duration', key: 'duration', width: 90 },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: unknown, task: EvalTask) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(task)} />
          </Tooltip>
          <Popconfirm title="确定删除此评测任务？" onConfirm={() => handleDelete(task.key)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const renderMetricsTab = () => {
    if (!selectedTask) return null
    const metricCards = [
      { title: 'Pass Rate', value: selectedTask.passRate },
      { title: 'Win Rate', value: selectedTask.winRate },
      { title: 'Hallucination', value: selectedTask.hallucinationRate },
      { title: 'Grounded', value: selectedTask.groundedScore },
      { title: 'OCR', value: selectedTask.ocrScore },
      { title: 'Doc Parse', value: selectedTask.docParseScore },
    ]
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Row gutter={[12, 12]}>
          {metricCards.map(card => (
            <Col span={8} key={card.title}>
              <Card size="small" className="stat-card card-hover">
                <Statistic title={card.title} value={card.value ?? '—'} suffix={card.value !== undefined ? '%' : undefined} />
              </Card>
            </Col>
          ))}
        </Row>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="模型家族">{MODEL_FAMILY_LABELS[selectedTask.modelFamily]}</Descriptions.Item>
          <Descriptions.Item label="模态">{MODEL_MODALITY_LABELS[selectedTask.modality]}</Descriptions.Item>
          <Descriptions.Item label="任务类型">{EVAL_TASK_TYPE_LABELS[selectedTask.taskType]}</Descriptions.Item>
          <Descriptions.Item label="语料类型">{DATASET_TYPE_LABELS[selectedTask.datasetType]}</Descriptions.Item>
          <Descriptions.Item label="样本数">{selectedTask.totalSamples}</Descriptions.Item>
          <Descriptions.Item label="已评样本">{selectedTask.evalSamples}</Descriptions.Item>
        </Descriptions>
      </Space>
    )
  }

  const renderSamplesTab = () => (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {samples.map(sample => (
        <Card key={sample.key} size="small" title={<Text strong>{summarizeEvalSample(sample)}</Text>}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>
              <Text type="secondary">Prompt / Input</Text>
              <div>{sample.prompt ?? sample.input}</div>
            </div>
            <div>
              <Text type="secondary">Expected</Text>
              <div>{sample.expectedOutput}</div>
            </div>
            <div>
              <Text type="secondary">Response</Text>
              <div>{sample.response ?? sample.actualOutput}</div>
            </div>
            <Space size={8} wrap>
              <Tag color={sample.isCorrect ? 'green' : 'red'}>{sample.isCorrect ? 'Pass' : 'Fail'}</Tag>
              <Tag>Confidence {Math.round(sample.confidence * 100)}%</Tag>
            </Space>
          </Space>
        </Card>
      ))}
    </Space>
  )

  const comparisonColumns = [
    { title: '版本', dataIndex: 'version', key: 'version', width: 110 },
    { title: 'Pass Rate', key: 'passRate', render: (_: unknown, row: EvalComparison) => row.passRate !== undefined ? `${row.passRate}%` : '—' },
    { title: 'Win Rate', key: 'winRate', render: (_: unknown, row: EvalComparison) => row.winRate !== undefined ? `${row.winRate}%` : '—' },
    { title: 'Grounded', key: 'groundedScore', render: (_: unknown, row: EvalComparison) => row.groundedScore !== undefined ? `${row.groundedScore}%` : '—' },
    { title: 'Hallucination', key: 'hallucinationRate', render: (_: unknown, row: EvalComparison) => row.hallucinationRate !== undefined ? `${row.hallucinationRate}%` : '—' },
    { title: '延迟', dataIndex: 'latency', key: 'latency' },
    { title: '参数量', dataIndex: 'params', key: 'params' },
  ]

  const drawerTabItems = [
    { key: 'metrics', label: '评测概览', children: renderMetricsTab() },
    { key: 'samples', label: '样本对比', children: renderSamplesTab() },
    {
      key: 'compare',
      label: '版本比较',
      children: <Table dataSource={comparisons} columns={comparisonColumns} rowKey="version" pagination={false} size="small" />,
    },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>{MODEL_CENTER_PAGE_LABELS.evaluation}</Title>
          <Text type="secondary">统一管理指令遵循、幻觉控制、Grounded VQA 与文档理解评测，支持 Judge + 人审双视角</Text>
        </div>

        <Row gutter={[14, 14]} style={{ margin: '16px 0 20px' }}>
          {statItems.map(item => (
            <Col span={Math.floor(24 / statItems.length)} key={item.title}>
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建评测任务
          </Button>
        </div>

        <Table dataSource={tasks} columns={taskColumns} rowKey="key" pagination={false} size="small" />
      </Card>

      <Drawer
        title={selectedTask ? selectedTask.name : '评测详情'}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedTask(null)
        }}
        width={760}
        footer={selectedTask ? (
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<LineChartOutlined />} onClick={() => navigate('/model-lab/gateway')}>
              去推理网关
            </Button>
          </div>
        ) : null}
      >
        {selectedTask && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary">{getModelDisplayName(selectedTask.modelName)} / {EVAL_TASK_TYPE_LABELS[selectedTask.taskType]}</Text>
                <Progress percent={selectedTask.progress} />
              </Space>
            </div>
            <Tabs items={drawerTabItems} />
          </>
        )}
      </Drawer>

      <Modal
        title={<ModalHeader icon={<FileTextOutlined />} title="新建评测任务" />}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false)
          form.resetFields()
        }}
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
            taskType: 'instruction-following',
            evalSamples: 500,
          }}
        >
          <Form.Item label="任务名称" name="name" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder="例如: eval-factory-copilot-instruction-v3" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="模型" name="modelName" rules={[{ required: true }]}>
                <Select
                  options={trainingProjects.map(project => ({
                    label: `${project.displayName} (${project.baseModel})`,
                    value: project.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="版本" name="modelVersion" rules={[{ required: true }]}>
                <Input placeholder="例如: v2026.03.10" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="评测语料" name="datasetName" rules={[{ required: true }]}>
                <Select
                  options={availableDatasets.map(dataset => ({
                    label: `${dataset.name} (${DATASET_TYPE_LABELS[dataset.datasetType]})`,
                    value: dataset.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="任务类型" name="taskType" rules={[{ required: true }]}>
                <Select
                  options={[
                    'instruction-following',
                    'hallucination',
                    'grounded-vqa',
                    'document-understanding',
                  ].map(value => ({ label: EVAL_TASK_TYPE_LABELS[value as EvalTaskType], value }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="评测样本数" name="evalSamples" rules={[{ required: true }]}>
            <InputNumber min={100} max={5000} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
