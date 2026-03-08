import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
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
  ExperimentOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  ProjectOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { listTrainingJobs, listTrainingProjects, createTrainingProject, getTrainingStats } from '../../api/modelTraining'
import type { TrainingJob, TrainingStatus, Framework } from '../../types/modelTraining'
import { TRAINING_STATUS_COLORS, FRAMEWORK_COLORS } from '../../types/modelTraining'

const { Title, Text } = Typography

const STATUS_ICONS: Record<TrainingStatus, React.ReactNode> = {
  Running: <PlayCircleOutlined />,
  Completed: <CheckCircleOutlined />,
  Failed: <CloseCircleOutlined />,
  Queued: <ClockCircleOutlined />,
  Stopped: <CloseCircleOutlined />,
}

export default function ModelTrainingPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  const [stats, setStats] = useState(() => getTrainingStats())
  const [jobs, setJobs] = useState(() => listTrainingJobs())
  const [projects, setProjects] = useState(() => listTrainingProjects())

  useEffect(() => {
    setStats(getTrainingStats())
    setJobs(listTrainingJobs())
    setProjects(listTrainingProjects())
  }, [])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      createTrainingProject(values)
      message.success('训练项目创建成功')
      setCreateOpen(false)
      form.resetFields()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
    }
  }

  const statItems = [
    { title: '训练项目', value: stats.projects, icon: <ProjectOutlined />, cls: 'stat-primary' },
    { title: '训练任务', value: stats.totalJobs, icon: <ExperimentOutlined />, cls: 'stat-info' },
    { title: '运行中', value: stats.running, icon: <PlayCircleOutlined />, cls: 'stat-success' },
    { title: '已完成', value: stats.completed, icon: <CheckCircleOutlined />, cls: 'stat-purple' },
    { title: 'GPU 使用率', value: stats.gpuUtilization, icon: <DashboardOutlined />, cls: 'stat-warning' },
    { title: '平均训练时长', value: stats.avgTrainTime, icon: <ClockCircleOutlined />, cls: 'stat-primary' },
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
      filters: ['Running', 'Completed', 'Failed', 'Queued'].map(s => ({ text: s, value: s })),
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
  ]

  /* 项目列 */
  const projectColumns = [
    { title: '项目名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: '说明', dataIndex: 'description', key: 'description' },
    { title: '数据源', dataIndex: 'dataSource', key: 'dataSource', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
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

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>模型训练</Title>
          <Text type="secondary">L5 训练平台 — 端到端模型训练、评估与注册，加速 AI 能力落地</Text>
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

        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateOpen(true); form.resetFields() }}>
            新建训练项目
          </Button>
        </div>

        <Tabs items={tabItems} />
      </Card>

      {/* 目录结构 */}
      <Card className="section-card" title="训练项目标准目录结构">
        <div className="dir-tree" style={{ fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace', fontSize: 13 }}>
          <div className="dir-item" style={{ fontWeight: 600 }}>📂 training_{'{project_name}'}/ </div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>📂 data/ <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— 训练数据（从本体导出）</Text></div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>📂 notebooks/ <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— 探索性分析 Notebook</Text></div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>📂 pipelines/ <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— 数据预处理管道</Text></div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>📂 experiments/ <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— 实验配置与超参</Text></div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>📂 models/ <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— 模型权重与 checkpoint</Text></div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>📂 evaluation/ <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— 评估报告与指标</Text></div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>📄 training_config.yaml <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— 训练管道配置</Text></div>
        </div>
      </Card>

      {/* 创建弹窗 */}
      <Modal
        title="新建训练项目"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="项目名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="例如: training_churn_predictor" />
          </Form.Item>
          <Form.Item label="项目描述" name="description" rules={[{ required: true }]}>
            <Input placeholder="例如: 客户流失预测模型" />
          </Form.Item>
          <Form.Item label="数据源" name="dataSource" rules={[{ required: true }]}>
            <Select placeholder="选择本体对象">
              <Select.Option value="ontology://Customer/output">ontology://Customer/output</Select.Option>
              <Select.Option value="ontology://PurchaseOrder/output">ontology://PurchaseOrder/output</Select.Option>
              <Select.Option value="ontology://Equipment/output">ontology://Equipment/output</Select.Option>
              <Select.Option value="ontology://Inventory/output">ontology://Inventory/output</Select.Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="框架" name="framework" rules={[{ required: true }]}>
                <Select placeholder="选择框架">
                  <Select.Option value="PyTorch">PyTorch</Select.Option>
                  <Select.Option value="TensorFlow">TensorFlow</Select.Option>
                  <Select.Option value="scikit-learn">scikit-learn</Select.Option>
                  <Select.Option value="Transformers">Transformers (HuggingFace)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="GPU 资源" name="gpu" rules={[{ required: true }]}>
                <Select placeholder="选择资源">
                  <Select.Option value="V100 - 16GB">V100 - 16GB</Select.Option>
                  <Select.Option value="A100 - 40GB">A100 - 40GB</Select.Option>
                  <Select.Option value="CPU Only">CPU Only</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
