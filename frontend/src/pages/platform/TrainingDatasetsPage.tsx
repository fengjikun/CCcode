import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  DatabaseOutlined,
  BarChartOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  HddOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { listDatasets, createDataset, deleteDataset, getDatasetStats } from '../../api/trainingDataset'
import type { TrainingDataset, DatasetStatus } from '../../types/trainingDataset'
import { DATASET_STATUS_COLORS } from '../../types/trainingDataset'

const { Title, Text } = Typography

export default function TrainingDatasetsPage() {
  const [datasets, setDatasets] = useState<TrainingDataset[]>([])
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  const reload = useCallback(() => { setDatasets(listDatasets()) }, [])
  useEffect(() => { reload() }, [reload])

  const stats = getDatasetStats()

  const filtered = datasets.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.source.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      createDataset(values)
      message.success('数据集创建成功')
      setCreateOpen(false)
      form.resetFields()
      reload()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('创建失败')
    }
  }

  const handleDelete = (key: string) => {
    deleteDataset(key)
    message.success('数据集已删除')
    reload()
  }

  const columns = [
    { title: '数据集名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: '来源', dataIndex: 'source', key: 'source', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    {
      title: 'Train/Val/Test',
      key: 'split',
      width: 120,
      render: (_: unknown, r: TrainingDataset) => `${r.trainSplit}/${r.valSplit}/${r.testSplit}`,
    },
    {
      title: '记录数',
      dataIndex: 'records',
      key: 'records',
      width: 90,
      sorter: (a: TrainingDataset, b: TrainingDataset) => a.records - b.records,
      render: (v: number) => v > 0 ? v.toLocaleString() : '—',
    },
    { title: '大小', dataIndex: 'size', key: 'size', width: 80 },
    { title: '版本', dataIndex: 'version', key: 'version', width: 60 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: ['Ready', 'Building', 'Failed', 'Archived'].map(s => ({ text: s, value: s })),
      onFilter: (value: unknown, record: TrainingDataset) => record.status === value,
      render: (v: DatasetStatus) => (
        <span>
          <span className={`status-dot ${v === 'Ready' ? 'active' : v === 'Building' ? 'warning' : v === 'Failed' ? 'error' : ''}`} />
          <Tag color={DATASET_STATUS_COLORS[v]}>{v}</Tag>
        </span>
      ),
    },
    {
      title: '关联模型',
      dataIndex: 'linkedModels',
      key: 'linkedModels',
      width: 160,
      render: (v: string[]) => v.length > 0 ? (
        <Space size={4} wrap>
          {v.map(m => <Tag key={m} color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{m}</Tag>)}
        </Space>
      ) : <Text type="secondary">—</Text>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 60,
      render: (_: unknown, record: TrainingDataset) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.key)}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  const statItems = [
    { title: '数据集总数', value: stats.total, icon: <DatabaseOutlined />, cls: 'stat-primary' },
    { title: '总记录数', value: stats.totalRecords, icon: <BarChartOutlined />, cls: 'stat-info' },
    { title: '已就绪', value: stats.readyCount, icon: <CheckCircleOutlined />, cls: 'stat-success' },
    { title: '总存储', value: stats.totalSize, icon: <HddOutlined />, cls: 'stat-purple' },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>训练数据集</Title>
          <Text type="secondary">L5 数据准备 — 基于本体语义层，自动导出、切分与版本管理训练数据</Text>
        </div>

        <Row gutter={16} style={{ margin: '16px 0 20px' }}>
          {statItems.map(s => (
            <Col span={6} key={s.title}>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Input
            placeholder="搜索数据集名称 / 来源"
            prefix={<SearchOutlined />}
            allowClear
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
            size="small"
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateOpen(true); form.resetFields() }}>
            新建数据集
          </Button>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="key" pagination={filtered.length > 10 ? { pageSize: 10 } : false} size="small" />
      </Card>

      <Modal
        title="新建数据集"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="数据集名称" rules={[{ required: true }]}>
            <Input placeholder="例如: equipment_sensors_v1" />
          </Form.Item>
          <Form.Item name="source" label="数据来源" rules={[{ required: true }]}>
            <Select placeholder="选择本体对象">
              <Select.Option value="ontology://PurchaseOrder/output">ontology://PurchaseOrder/output</Select.Option>
              <Select.Option value="ontology://Equipment/output">ontology://Equipment/output</Select.Option>
              <Select.Option value="ontology://Customer/output">ontology://Customer/output</Select.Option>
              <Select.Option value="ontology://Inventory/output">ontology://Inventory/output</Select.Option>
              <Select.Option value="ontology://WorkOrder/output">ontology://WorkOrder/output</Select.Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="trainSplit" label="Train %" initialValue={70}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="valSplit" label="Val %" initialValue={15}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="testSplit" label="Test %" initialValue={15}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
