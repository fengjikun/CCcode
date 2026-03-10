import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
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
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  BarChartOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  HddOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import {
  buildDataset,
  createDataset,
  deleteDataset,
  finishBuild,
  getDatasetDetail,
  getDatasetStats,
  listDatasets,
  updateBuildProgress,
} from '../../api/trainingDataset'
import ModalHeader from '../../components/shared/ModalHeader'
import {
  DATASET_TYPE_LABELS,
  MODEL_CENTER_PAGE_LABELS,
  MODEL_MODALITY_LABELS,
} from '../../types/modelCenter'
import type { DatasetFormat, DatasetStatus, TrainingDataset } from '../../types/trainingDataset'
import {
  DATASET_STATUS_COLORS,
  SCHEMA_FIELD_OPTIONS,
} from '../../types/trainingDataset'
import { formatDatasetScale, summarizeDatasetSample } from './trainingDatasets.helpers'

const { Title, Text } = Typography

function renderSamplePreview(sample: Record<string, unknown>) {
  if (Array.isArray(sample.messages)) {
    return (
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {(sample.messages as Array<Record<string, unknown>>).map((message, index) => (
          <Card key={index} size="small" styles={{ body: { padding: 12 } }}>
            <Text strong>{String(message.role ?? 'unknown')}</Text>
            <div style={{ marginTop: 6 }}>{String(message.content ?? '')}</div>
          </Card>
        ))}
      </Space>
    )
  }

  return (
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
      {JSON.stringify(sample, null, 2)}
    </pre>
  )
}

export default function TrainingDatasetsPage() {
  const [datasets, setDatasets] = useState<TrainingDataset[]>([])
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailDataset, setDetailDataset] = useState<TrainingDataset | null>(null)
  const buildTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const [stats, setStats] = useState({ total: 0, totalRecords: '0', readyCount: 0, buildingCount: 0, totalSize: '0 GB' })

  const reload = useCallback(async () => {
    const [datasetList, datasetStats] = await Promise.all([listDatasets(), getDatasetStats()])
    setDatasets(datasetList)
    setStats(datasetStats)
  }, [])

  useEffect(() => {
    void reload()
    return () => {
      buildTimersRef.current.forEach(timer => clearInterval(timer))
    }
  }, [reload])

  const filtered = datasets.filter(dataset => {
    const query = search.toLowerCase()
    return !query
      || dataset.name.toLowerCase().includes(query)
      || dataset.source.toLowerCase().includes(query)
      || DATASET_TYPE_LABELS[dataset.datasetType].toLowerCase().includes(query)
  })

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await createDataset(values)
      message.success('训练语料已创建')
      setCreateOpen(false)
      form.resetFields()
      await reload()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error('创建失败')
    }
  }

  const handleDelete = async (key: string) => {
    await deleteDataset(key)
    message.success('训练语料已删除')
    await reload()
  }

  const handleBuild = async (key: string) => {
    const existing = buildTimersRef.current.get(key)
    if (existing) clearInterval(existing)

    await buildDataset(key)
    message.success('语料构建任务已启动')
    await reload()

    let progress = 0
    const timer = setInterval(async () => {
      progress += Math.floor(Math.random() * 15) + 10
      if (progress >= 100) {
        progress = 100
        clearInterval(timer)
        buildTimersRef.current.delete(key)
        await finishBuild(key)
        message.success('语料构建完成')
      } else {
        await updateBuildProgress(key, progress)
      }
      await reload()
    }, 1500)

    buildTimersRef.current.set(key, timer)
  }

  const handleRowClick = async (record: TrainingDataset) => {
    const detail = await getDatasetDetail(record.key)
    if (!detail) return
    setDetailDataset(detail)
    setDrawerOpen(true)
  }

  const multimodalCount = datasets.filter(dataset => dataset.modality === 'image-text').length
  const avgQuality = datasets.length > 0
    ? Math.round(datasets.reduce((sum, dataset) => sum + dataset.qualityScore, 0) / datasets.length)
    : 0

  const statItems = [
    { title: '语料包总数', value: stats.total, icon: <DatabaseOutlined />, color: '#4f46e5', bg: '#eef2ff' },
    { title: '已就绪', value: stats.readyCount, icon: <CheckCircleOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: '多模态语料', value: multimodalCount, icon: <BarChartOutlined />, color: '#0891b2', bg: '#ecfeff' },
    { title: '平均质量分', value: avgQuality || '—', icon: <SyncOutlined spin={stats.buildingCount > 0} />, color: '#d97706', bg: '#fffbeb' },
    { title: '总存储', value: stats.totalSize, icon: <HddOutlined />, color: '#7c3aed', bg: '#f5f3ff' },
  ]

  const columns = [
    {
      title: '语料包',
      key: 'name',
      render: (_: unknown, dataset: TrainingDataset) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ cursor: 'pointer', color: '#1677ff' }}>{dataset.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{dataset.source}</Text>
        </Space>
      ),
    },
    {
      title: '类型 / 模态',
      key: 'type',
      render: (_: unknown, dataset: TrainingDataset) => (
        <Space direction="vertical" size={2}>
          <Space size={4} wrap>
            <Tag color="blue">{DATASET_TYPE_LABELS[dataset.datasetType]}</Tag>
            <Tag color={dataset.modality === 'image-text' ? 'gold' : 'cyan'}>{MODEL_MODALITY_LABELS[dataset.modality]}</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>{dataset.format}</Text>
        </Space>
      ),
    },
    {
      title: '规模',
      key: 'scale',
      render: (_: unknown, dataset: TrainingDataset) => (
        <Space direction="vertical" size={2}>
          <Text>{formatDatasetScale(dataset)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{dataset.records.toLocaleString()} samples</Text>
        </Space>
      ),
    },
    {
      title: '质量与标注',
      key: 'quality',
      render: (_: unknown, dataset: TrainingDataset) => (
        <Space direction="vertical" size={2}>
          <Tag color={dataset.qualityScore >= 90 ? 'green' : dataset.qualityScore >= 85 ? 'blue' : 'default'}>
            Quality {dataset.qualityScore}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>{dataset.annotationSchema.join(' / ')}</Text>
        </Space>
      ),
    },
    {
      title: '关联训练',
      key: 'linked',
      render: (_: unknown, dataset: TrainingDataset) => (
        <Space direction="vertical" size={2}>
          <Text>{dataset.linkedModels.join(', ') || '—'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{dataset.linkedRuns.join(', ') || '暂无运行'}</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: ['Ready', 'Building', 'Failed', 'Archived'].map(status => ({ text: status, value: status })),
      onFilter: (value: unknown, dataset: TrainingDataset) => dataset.status === value,
      render: (value: DatasetStatus) => <Tag color={DATASET_STATUS_COLORS[value]}>{value}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 110 },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, dataset: TrainingDataset) => (
        <Space size={4}>
          {dataset.status !== 'Ready' && (
            <Popconfirm title="确认启动构建？" onConfirm={() => handleBuild(dataset.key)}>
              <Button type="text" size="small" icon={<BuildOutlined />} />
            </Popconfirm>
          )}
          <Popconfirm title="确认删除该语料包？" onConfirm={() => handleDelete(dataset.key)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>{MODEL_CENTER_PAGE_LABELS.datasets}</Title>
          <Text type="secondary">统一管理指令数据、多轮对话、偏好对和图文问答语料，支撑 LLM / VL 训练与对齐</Text>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Input
            placeholder="搜索语料包 / 来源 / 类型"
            value={search}
            onChange={event => setSearch(event.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 320 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建语料包
          </Button>
        </div>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="key"
          size="small"
          pagination={false}
          onRow={record => ({
            onClick: () => void handleRowClick(record),
          })}
        />
      </Card>

      <Drawer
        title={detailDataset ? detailDataset.name : '语料详情'}
        open={drawerOpen}
        width={760}
        onClose={() => {
          setDrawerOpen(false)
          setDetailDataset(null)
        }}
      >
        {detailDataset && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="语料类型">{DATASET_TYPE_LABELS[detailDataset.datasetType]}</Descriptions.Item>
              <Descriptions.Item label="模态">{MODEL_MODALITY_LABELS[detailDataset.modality]}</Descriptions.Item>
              <Descriptions.Item label="规模">{formatDatasetScale(detailDataset)}</Descriptions.Item>
              <Descriptions.Item label="样本数">{detailDataset.records.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="质量评分">{detailDataset.qualityScore}</Descriptions.Item>
              <Descriptions.Item label="格式">{detailDataset.format}</Descriptions.Item>
              <Descriptions.Item label="Train / Val / Test">{detailDataset.trainSplit}/{detailDataset.valSplit}/{detailDataset.testSplit}</Descriptions.Item>
              <Descriptions.Item label="来源">{detailDataset.source}</Descriptions.Item>
              <Descriptions.Item label="标注 Schema" span={2}>{detailDataset.annotationSchema.join(' / ')}</Descriptions.Item>
            </Descriptions>

            <Card size="small" title="构建进度">
              <Progress percent={detailDataset.buildProgress} status={detailDataset.status === 'Building' ? 'active' : undefined} />
              <div style={{ marginTop: 12 }}>
                {detailDataset.buildLog.map((line, index) => (
                  <div key={index}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{line}</Text>
                  </div>
                ))}
              </div>
            </Card>

            <Card size="small" title="样本预览">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {detailDataset.sampleData.map((sample, index) => (
                  <Card
                    key={index}
                    size="small"
                    title={<Text strong>{summarizeDatasetSample(sample)}</Text>}
                    styles={{ body: { background: '#fafafa' } }}
                  >
                    {renderSamplePreview(sample)}
                  </Card>
                ))}
              </Space>
            </Card>
          </Space>
        )}
      </Drawer>

      <Modal
        title={<ModalHeader icon={<DatabaseOutlined />} title="新建语料包" />}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false)
          form.resetFields()
        }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        width={720}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={{
            datasetType: 'conversation',
            modality: 'text',
            format: 'JSONL',
            qualityScore: 85,
            trainSplit: 80,
            valSplit: 10,
            testSplit: 10,
            annotationSchema: ['system', 'user', 'assistant'],
          }}
        >
          <Form.Item label="语料包名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如: factory_instruction_corpus_v3" />
          </Form.Item>
          <Form.Item label="语料来源" name="source" rules={[{ required: true, message: '请输入来源' }]}>
            <Input placeholder="例如: corpus://factory-copilot-dialog-sft-v3" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="语料类型" name="datasetType" rules={[{ required: true }]}>
                <Select options={Object.entries(DATASET_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="模态" name="modality" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'text', label: MODEL_MODALITY_LABELS.text },
                    { value: 'image-text', label: MODEL_MODALITY_LABELS['image-text'] },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="格式" name="format" rules={[{ required: true }]}>
                <Select options={(['JSONL', 'Parquet', 'CSV'] as DatasetFormat[]).map(value => ({ value, label: value }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Token 数" name="tokenCount">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="图像数" name="imageCount">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="质量评分" name="qualityScore">
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="annotationSchema" label="标注 Schema">
            <Checkbox.Group options={SCHEMA_FIELD_OPTIONS} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="Train %" name="trainSplit"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item label="Val %" name="valSplit"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item label="Test %" name="testSplit"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
