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
  CloseCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FileTextOutlined,
  LineChartOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  TableOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import {
  listEvalTasks,
  getEvalSamples,
  getEvalComparisons,
  getConfusionMatrix,
  createEvalTask,
  getEvalStats,
} from '../../api/modelEvaluation'
import type { ConfusionMatrixData } from '../../api/modelEvaluation'
import { listTrainingProjects } from '../../api/modelTraining'
import { listDatasets } from '../../api/trainingDataset'
import type { EvalTask, EvalStatus, EvalTaskType, EvalSample, EvalComparison } from '../../types/modelEvaluation'
import { EVAL_STATUS_COLORS, EVAL_TASK_TYPE_LABELS } from '../../types/modelEvaluation'
import ModalHeader from '../../components/shared/ModalHeader'

const { Title, Text } = Typography

const STATUS_ICONS: Record<EvalStatus, React.ReactNode> = {
  Running: <PlayCircleOutlined />,
  Completed: <CheckCircleOutlined />,
  Failed: <CloseCircleOutlined />,
  Pending: <ClockCircleOutlined />,
}

const TASK_TYPE_COLORS: Record<EvalTaskType, string> = {
  classification: 'blue',
  generation: 'purple',
  extraction: 'cyan',
  qa: 'orange',
}

export default function ModelEvaluationPage() {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<EvalTask | null>(null)
  const [form] = Form.useForm()

  const [stats, setStats] = useState(() => getEvalStats())
  const [tasks, setTasks] = useState(() => listEvalTasks())
  const [samples, setSamples] = useState<EvalSample[]>([])
  const [comparisons, setComparisons] = useState<EvalComparison[]>([])
  const [confusionMatrix, setConfusionMatrix] = useState<ConfusionMatrixData>({ labels: [], data: [] })
  const [trainingProjects] = useState(() => listTrainingProjects())
  const [availableDatasets] = useState(() => listDatasets().filter(d => d.status === 'Ready'))

  useEffect(() => {
    setStats(getEvalStats())
    setTasks(listEvalTasks())
  }, [])

  const openDetail = (task: EvalTask) => {
    setSelectedTask(task)
    setSamples(getEvalSamples(task.key))
    setComparisons(getEvalComparisons(task.modelName))
    setConfusionMatrix(getConfusionMatrix(task.key))
    setDrawerOpen(true)
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      createEvalTask(values)
      message.success('评估任务创建成功')
      setCreateOpen(false)
      form.resetFields()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
    }
  }

  const handleDelete = (key: string) => {
    setTasks(prev => prev.filter(t => t.key !== key))
    message.success('评估任务已删除')
  }

  /* ---------- 统计卡片 ---------- */
  const statItems = [
    { title: '评估任务数', value: stats.totalTasks, icon: <ExperimentOutlined />, cls: 'stat-primary' },
    { title: '已完成', value: stats.completed, icon: <CheckCircleOutlined />, cls: 'stat-success' },
    { title: '运行中', value: stats.running, icon: <PlayCircleOutlined />, cls: 'stat-info' },
    { title: '平均准确率', value: stats.avgAccuracy, icon: <DashboardOutlined />, cls: 'stat-purple' },
    { title: '平均 F1', value: stats.avgF1, icon: <SafetyCertificateOutlined />, cls: 'stat-warning' },
  ]

  /* ---------- 评估任务表列 ---------- */
  const taskColumns = [
    {
      title: '任务名称', dataIndex: 'name', key: 'name',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '模型', key: 'model', width: 200,
      render: (_: unknown, r: EvalTask) => (
        <Space size={4}>
          <Text>{r.modelName}</Text>
          <Tag color="blue">{r.modelVersion}</Tag>
        </Space>
      ),
    },
    { title: '数据集', dataIndex: 'datasetName', key: 'datasetName', ellipsis: true },
    {
      title: '任务类型', dataIndex: 'taskType', key: 'taskType', width: 80,
      render: (v: EvalTaskType) => <Tag color={TASK_TYPE_COLORS[v]}>{EVAL_TASK_TYPE_LABELS[v]}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 110,
      filters: (['Running', 'Completed', 'Failed', 'Pending'] as EvalStatus[]).map(s => ({ text: s, value: s })),
      onFilter: (value: unknown, record: EvalTask) => record.status === value,
      render: (v: EvalStatus) => <Tag icon={STATUS_ICONS[v]} color={EVAL_STATUS_COLORS[v]}>{v}</Tag>,
    },
    {
      title: '进度', dataIndex: 'progress', key: 'progress', width: 120,
      render: (v: number, r: EvalTask) => (
        <Progress
          percent={v}
          size="small"
          style={{ width: 90 }}
          status={r.status === 'Failed' ? 'exception' : r.status === 'Running' ? 'active' : undefined}
          showInfo={false}
        />
      ),
    },
    {
      title: '准确率', dataIndex: 'accuracy', key: 'accuracy', width: 80,
      render: (v: number | undefined) => v !== undefined
        ? <Tag color={v >= 90 ? 'green' : v >= 80 ? 'blue' : 'default'}>{v}%</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'F1 值', dataIndex: 'f1', key: 'f1', width: 80,
      render: (v: number | undefined) => v !== undefined
        ? <Tag color={v >= 90 ? 'green' : 'blue'}>{v}%</Tag>
        : <Text type="secondary">—</Text>,
    },
    { title: '耗时', dataIndex: 'duration', key: 'duration', width: 90 },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: unknown, r: EvalTask) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)} />
          </Tooltip>
          <Popconfirm title="确定删除此评估任务？" onConfirm={() => handleDelete(r.key)} okText="删除" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  /* ---------- 详情 Drawer 内容 ---------- */
  const renderMetricsTab = () => {
    if (!selectedTask) return null
    const metricCards = [
      { title: 'Accuracy', value: selectedTask.accuracy, suffix: '%' },
      { title: 'Precision', value: selectedTask.precision, suffix: '%' },
      { title: 'Recall', value: selectedTask.recall, suffix: '%' },
      { title: 'F1 Score', value: selectedTask.f1, suffix: '%' },
      { title: '样本总数', value: selectedTask.totalSamples, suffix: '' },
      { title: '评估耗时', value: selectedTask.duration, suffix: '' },
    ]
    const maxVal = confusionMatrix.data.length > 0 ? Math.max(...confusionMatrix.data.flat()) : 1
    return (
      <div>
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          {metricCards.map(m => (
            <Col span={4} key={m.title}>
              <Card size="small" className="stat-card card-hover stat-primary">
                <Statistic
                  title={m.title}
                  value={m.value ?? '—'}
                  suffix={m.value !== undefined && m.suffix ? m.suffix : undefined}
                />
              </Card>
            </Col>
          ))}
        </Row>
        <Card size="small" title="混淆矩阵" style={{ marginBottom: 16 }}>
          {confusionMatrix.data.length === 0 ? (
            <Text type="secondary">暂无混淆矩阵数据</Text>
          ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, textAlign: 'center' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 12px', background: '#fafafa', border: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>预测 \ 实际</Text>
                  </th>
                  {confusionMatrix.labels.map(l => (
                    <th key={l} style={{ padding: '8px 12px', background: '#fafafa', border: '1px solid #f0f0f0', fontWeight: 600 }}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {confusionMatrix.data.map((row, i) => (
                  <tr key={confusionMatrix.labels[i]}>
                    <td style={{ padding: '8px 12px', background: '#fafafa', border: '1px solid #f0f0f0', fontWeight: 600 }}>
                      {confusionMatrix.labels[i]}
                    </td>
                    {row.map((val, j) => {
                      const isDiag = i === j
                      const intensity = Math.round((val / maxVal) * 100)
                      const bg = isDiag
                        ? `rgba(82, 196, 26, ${0.1 + (intensity / 100) * 0.4})`
                        : val > 5
                          ? `rgba(255, 77, 79, ${0.08 + (val / maxVal) * 0.3})`
                          : val > 0
                            ? 'rgba(255, 77, 79, 0.04)'
                            : '#fff'
                      return (
                        <td key={j} style={{
                          padding: '8px 12px',
                          border: '1px solid #f0f0f0',
                          background: bg,
                          fontWeight: isDiag ? 700 : 400,
                          color: isDiag ? '#389e0d' : val > 5 ? '#cf1322' : undefined,
                        }}>
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </Card>
      </div>
    )
  }

  const sampleColumns = [
    {
      title: '输入', dataIndex: 'input', key: 'input', ellipsis: true, width: 240,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '预期输出', dataIndex: 'expectedOutput', key: 'expectedOutput', width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '实际输出', dataIndex: 'actualOutput', key: 'actualOutput', width: 100,
      render: (v: string, r: EvalSample) => <Tag color={r.isCorrect ? 'green' : 'red'}>{v}</Tag>,
    },
    {
      title: '是否正确', dataIndex: 'isCorrect', key: 'isCorrect', width: 80,
      render: (v: boolean) => v
        ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        : <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />,
    },
    {
      title: '置信度', dataIndex: 'confidence', key: 'confidence', width: 130,
      render: (v: number) => (
        <Progress
          percent={Math.round(v * 100)}
          size="small"
          style={{ width: 100 }}
          strokeColor={v >= 0.8 ? '#52c41a' : v >= 0.6 ? '#faad14' : '#ff4d4f'}
        />
      ),
    },
  ]

  const renderSamplesTab = () => (
    <Table
      dataSource={samples}
      columns={sampleColumns}
      rowKey="key"
      pagination={false}
      size="small"
      rowClassName={(r: EvalSample) => r.isCorrect ? '' : 'row-error-light'}
      expandable={{
        expandedRowRender: (r: EvalSample) => (
          <div style={{ padding: '8px 0' }}>
            <Text strong>完整输入：</Text>
            <Text style={{ display: 'block', marginTop: 4 }}>{r.input}</Text>
            <div style={{ marginTop: 8 }}>
              <Text strong>预期：</Text> <Tag>{r.expectedOutput}</Tag>
              <Text strong style={{ marginLeft: 16 }}>实际：</Text> <Tag color={r.isCorrect ? 'green' : 'red'}>{r.actualOutput}</Tag>
              <Text strong style={{ marginLeft: 16 }}>置信度：</Text> <Text>{(r.confidence * 100).toFixed(1)}%</Text>
            </div>
          </div>
        ),
      }}
    />
  )

  const renderComparisonTab = () => {
    const metrics: { key: keyof EvalComparison; label: string }[] = [
      { key: 'accuracy', label: '准确率' },
      { key: 'f1', label: 'F1' },
      { key: 'precision', label: 'Precision' },
      { key: 'recall', label: 'Recall' },
    ]

    const compColumns = [
      { title: '版本', dataIndex: 'version', key: 'version', width: 80, render: (v: string) => <Tag color="blue">{v}</Tag> },
      ...metrics.map(m => ({
        title: m.label,
        dataIndex: m.key,
        key: m.key,
        width: 90,
        render: (v: number) => {
          const best = Math.max(...comparisons.map(c => c[m.key] as number))
          return <Text strong={v === best} style={{ color: v === best ? '#52c41a' : undefined }}>{v}%</Text>
        },
      })),
      { title: '延迟', dataIndex: 'latency', key: 'latency', width: 80 },
      { title: '参数量', dataIndex: 'params', key: 'params', width: 80 },
    ]

    const COLORS = ['#1677ff', '#52c41a', '#faad14', '#722ed1']

    return (
      <div>
        <Table dataSource={comparisons} columns={compColumns} rowKey="version" pagination={false} size="small" style={{ marginBottom: 24 }} />
        <Card size="small" title="指标对比可视化">
          {metrics.map(m => (
            <div key={m.key} style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>{m.label}</Text>
              {comparisons.map((c, idx) => {
                const val = c[m.key] as number
                return (
                  <div key={c.version} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ width: 40, fontSize: 12, textAlign: 'right', marginRight: 8 }}>{c.version}</Text>
                    <div style={{ flex: 1, background: '#f5f5f5', borderRadius: 4, height: 20, position: 'relative' }}>
                      <div style={{
                        width: `${val}%`,
                        height: '100%',
                        background: COLORS[idx % COLORS.length],
                        borderRadius: 4,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <Text style={{ width: 50, fontSize: 12, textAlign: 'right', marginLeft: 8 }}>{val}%</Text>
                  </div>
                )
              })}
            </div>
          ))}
        </Card>
      </div>
    )
  }

  const renderReportTab = () => {
    if (!selectedTask) return null
    const passed = (selectedTask.accuracy ?? 0) > 85
    return (
      <div>
        <Card
          size="small"
          style={{
            marginBottom: 16,
            background: passed ? '#f6ffed' : '#fff2f0',
            borderColor: passed ? '#b7eb8f' : '#ffccc7',
          }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Space>
            {passed
              ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
              : <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
            }
            <div>
              <Text strong style={{ fontSize: 15 }}>
                {passed ? '评估通过 — 模型质量达标' : '评估未通过 — 建议继续调优'}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {passed
                  ? `模型 ${selectedTask.modelName} ${selectedTask.modelVersion} 在 ${selectedTask.datasetName} 上表现优异，准确率 ${selectedTask.accuracy}%，F1 ${selectedTask.f1}%。`
                  : `模型 ${selectedTask.modelName} ${selectedTask.modelVersion} 评估未完成或指标未达标，请检查数据集与训练配置。`
                }
              </Text>
            </div>
          </Space>
        </Card>

        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="任务名称">{selectedTask.name}</Descriptions.Item>
          <Descriptions.Item label="模型">{selectedTask.modelName} <Tag color="blue">{selectedTask.modelVersion}</Tag></Descriptions.Item>
          <Descriptions.Item label="数据集">{selectedTask.datasetName}</Descriptions.Item>
          <Descriptions.Item label="任务类型"><Tag color={TASK_TYPE_COLORS[selectedTask.taskType]}>{EVAL_TASK_TYPE_LABELS[selectedTask.taskType]}</Tag></Descriptions.Item>
          <Descriptions.Item label="评估样本数">{selectedTask.evalSamples} / {selectedTask.totalSamples}</Descriptions.Item>
          <Descriptions.Item label="评估耗时">{selectedTask.duration}</Descriptions.Item>
          <Descriptions.Item label="准确率">{selectedTask.accuracy !== undefined ? `${selectedTask.accuracy}%` : '—'}</Descriptions.Item>
          <Descriptions.Item label="F1 Score">{selectedTask.f1 !== undefined ? `${selectedTask.f1}%` : '—'}</Descriptions.Item>
          <Descriptions.Item label="Precision">{selectedTask.precision !== undefined ? `${selectedTask.precision}%` : '—'}</Descriptions.Item>
          <Descriptions.Item label="Recall">{selectedTask.recall !== undefined ? `${selectedTask.recall}%` : '—'}</Descriptions.Item>
          <Descriptions.Item label="创建人">{selectedTask.createdBy}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{selectedTask.createdAt}</Descriptions.Item>
        </Descriptions>

        <Card size="small" title="评估建议" style={{ marginBottom: 16 }}>
          {passed ? (
            <div>
              <Text>
                综合评估结果，模型 <Text strong>{selectedTask.modelName}</Text> <Tag color="blue">{selectedTask.modelVersion}</Tag> 在各项核心指标上均达到生产部署标准：
              </Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>准确率 {selectedTask.accuracy}% 超过阈值（85%），分类效果稳定</li>
                <li>F1 Score {selectedTask.f1}% 表明精确率与召回率均衡</li>
                <li>混淆矩阵显示主对角线集中度高，误分类率低</li>
                <li>样本级置信度分布合理，低置信度样本可用于后续主动学习</li>
              </ul>
              <Text strong style={{ color: '#52c41a' }}>建议发布到 Staging 环境进行灰度验证，验证通过后可提升至 Production。</Text>
            </div>
          ) : (
            <div>
              <Text>
                模型 <Text strong>{selectedTask.modelName}</Text> <Tag color="blue">{selectedTask.modelVersion}</Tag> 当前评估结果未达到生产部署标准：
              </Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>建议检查训练数据质量与标注一致性</li>
                <li>尝试调整学习率、增大训练轮数或使用数据增强</li>
                <li>对误分类集中的类别进行定向补充样本</li>
                <li>可尝试更大规模的预训练模型作为 Base Model</li>
              </ul>
              <Text strong style={{ color: '#cf1322' }}>建议继续调优后重新评估，暂不发布。</Text>
            </div>
          )}
        </Card>

        {passed && (
          <div style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<RocketOutlined />}
              size="large"
              onClick={() => {
                message.success(`模型 ${selectedTask.modelName} ${selectedTask.modelVersion} 已提交发布流程，即将跳转到模型网关`)
                setDrawerOpen(false)
                setTimeout(() => navigate('/model-lab/gateway'), 500)
              }}
            >
              发布模型
            </Button>
          </div>
        )}
      </div>
    )
  }

  const drawerTabs = [
    { key: 'metrics', label: <span><LineChartOutlined /> 评估指标</span>, children: renderMetricsTab() },
    { key: 'samples', label: <span><TableOutlined /> 样本对比</span>, children: renderSamplesTab() },
    { key: 'comparison', label: <span><TrophyOutlined /> 版本对比</span>, children: renderComparisonTab() },
    { key: 'report', label: <span><FileTextOutlined /> 评估报告</span>, children: renderReportTab() },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>模型评估</Title>
          <Text type="secondary">L5 评估中心 — 多维度模型质量评估、样本级对比与版本追踪</Text>
        </div>

        <Row gutter={[12, 12]} style={{ margin: '16px 0 20px' }}>
          {statItems.map(s => (
            <Col flex="1" key={s.title}>
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
            新建评估任务
          </Button>
        </div>

        <Table dataSource={tasks} columns={taskColumns} rowKey="key" pagination={false} size="small" />
      </Card>

      {/* 创建弹窗 */}
      <Modal
        title={<ModalHeader icon={<ExperimentOutlined />} title="新建评估任务" />}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="任务名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="例如: eval-equipment-fault-v3" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="选择模型" name="modelName" rules={[{ required: true }]}>
                <Select placeholder="选择已注册模型">
                  {trainingProjects.map(p => (
                    <Select.Option key={p.key} value={p.name}>{p.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="模型版本" name="modelVersion" rules={[{ required: true }]}>
                <Select placeholder="选择版本">
                  <Select.Option value="v1.0">v1.0</Select.Option>
                  <Select.Option value="v2.0">v2.0</Select.Option>
                  <Select.Option value="v3.0">v3.0</Select.Option>
                  <Select.Option value="latest">latest</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="评估数据集" name="datasetName" rules={[{ required: true }]}>
            <Select placeholder="选择数据集">
              {availableDatasets.map(d => (
                <Select.Option key={d.key} value={d.name}>{d.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="任务类型" name="taskType" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="classification">分类</Radio>
                  <Radio value="generation">生成</Radio>
                  <Radio value="extraction">抽取</Radio>
                  <Radio value="qa">问答</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="评估样本数" name="evalSamples" rules={[{ required: true }]}>
                <InputNumber min={100} max={10000} step={100} placeholder="1000" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 详情 Drawer */}
      <Drawer
        title={
          selectedTask ? (
            <Space>
              <ExperimentOutlined style={{ color: '#1677ff' }} />
              <span>{selectedTask.name}</span>
              <Tag color="blue">{selectedTask.modelName} {selectedTask.modelVersion}</Tag>
              <Tag icon={STATUS_ICONS[selectedTask.status]} color={EVAL_STATUS_COLORS[selectedTask.status]}>
                {selectedTask.status}
              </Tag>
              {selectedTask.status === 'Running' && (
                <Progress percent={selectedTask.progress} size="small" style={{ width: 80 }} status="active" showInfo={false} />
              )}
            </Space>
          ) : null
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={800}
        destroyOnClose
      >
        <Tabs items={drawerTabs} />
      </Drawer>

      <style>{`
        .row-error-light td {
          background: rgba(255, 77, 79, 0.04) !important;
        }
      `}</style>
    </div>
  )
}
