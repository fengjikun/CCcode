import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Col,
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
  BuildOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { listDatasets, createDataset, deleteDataset, getDatasetStats, getDatasetDetail, buildDataset, updateBuildProgress, finishBuild } from '../../api/trainingDataset'
import type { TrainingDataset, DatasetStatus, DatasetFormat } from '../../types/trainingDataset'
import { DATASET_STATUS_COLORS, DATASET_FORMAT_COLORS, SCHEMA_FIELD_OPTIONS } from '../../types/trainingDataset'
import ModalHeader from '../../components/shared/ModalHeader'

const { Title, Text } = Typography

export default function TrainingDatasetsPage() {
  const [datasets, setDatasets] = useState<TrainingDataset[]>([])
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()
  const [selectedFormat, setSelectedFormat] = useState<DatasetFormat>('JSONL')

  // Detail drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailDataset, setDetailDataset] = useState<TrainingDataset | null>(null)

  const buildTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  const reload = useCallback(() => { setDatasets(listDatasets()) }, [])
  useEffect(() => { reload() }, [reload])

  // Clean up build timers on unmount
  useEffect(() => {
    return () => {
      buildTimersRef.current.forEach(timer => clearInterval(timer))
    }
  }, [])

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
      setSelectedFormat('JSONL')
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

  const handleBuild = (key: string) => {
    // Clear any existing timer for this key
    const existing = buildTimersRef.current.get(key)
    if (existing) clearInterval(existing)

    buildDataset(key)
    message.success('构建任务已启动')
    reload()

    // Simulate build progress
    let progress = 0
    const timer = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 10
      if (progress >= 100) {
        progress = 100
        clearInterval(timer)
        buildTimersRef.current.delete(key)
        finishBuild(key)
        message.success('数据集构建完成')
      } else {
        updateBuildProgress(key, progress)
      }
      reload()
    }, 1500)

    buildTimersRef.current.set(key, timer)
  }

  const handleRowClick = (record: TrainingDataset) => {
    const detail = getDatasetDetail(record.key)
    if (detail) {
      setDetailDataset(detail)
      setDrawerOpen(true)
    }
  }

  // Build sample data columns dynamically from the first row
  const getSampleColumns = (data: Array<Record<string, unknown>>) => {
    if (data.length === 0) return []
    return Object.keys(data[0]).map(key => ({
      title: key,
      dataIndex: key,
      key,
      render: (v: unknown) => {
        if (v === null || v === undefined || v === '—') return <Text type="secondary">—</Text>
        if (typeof v === 'number') return <Text>{v}</Text>
        return <Text>{String(v)}</Text>
      },
    }))
  }

  const columns = [
    {
      title: '数据集名称',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => (
        <Text strong style={{ cursor: 'pointer', color: '#1677ff' }}>{v}</Text>
      ),
    },
    { title: '来源', dataIndex: 'source', key: 'source', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      render: (v: DatasetFormat) => <Tag color={DATASET_FORMAT_COLORS[v]}>{v}</Tag>,
    },
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
      width: 100,
      render: (_: unknown, record: TrainingDataset) => (
        <Space size={4}>
          {record.status !== 'Ready' && (
            <Popconfirm title="确认启动构建？" onConfirm={() => handleBuild(record.key)}>
              <Button type="text" size="small" icon={<BuildOutlined />} title="构建" />
            </Popconfirm>
          )}
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.key)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const statItems = [
    { title: '数据集总数', value: stats.total, icon: <DatabaseOutlined />, cls: 'stat-primary' },
    { title: '总记录数', value: stats.totalRecords, icon: <BarChartOutlined />, cls: 'stat-info' },
    { title: '已就绪', value: stats.readyCount, icon: <CheckCircleOutlined />, cls: 'stat-success' },
    { title: '构建中', value: stats.buildingCount, icon: <SyncOutlined spin={stats.buildingCount > 0} />, cls: 'stat-warning' },
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
            <Col span={Math.floor(24 / statItems.length)} key={s.title}>
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateOpen(true); form.resetFields(); setSelectedFormat('JSONL') }}>
            新建数据集
          </Button>
        </div>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="key"
          pagination={filtered.length > 10 ? { pageSize: 10 } : false}
          size="small"
          onRow={(record) => ({
            onClick: (e) => {
              // Don't open drawer when clicking action buttons
              const target = e.target as HTMLElement
              if (target.closest('.ant-btn') || target.closest('.ant-popover') || target.closest('.ant-popconfirm')) return
              handleRowClick(record)
            },
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        title={<ModalHeader icon={<DatabaseOutlined />} title="新建数据集" />}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); setSelectedFormat('JSONL') }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        width={620}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="数据集名称" rules={[{ required: true, message: '请输入数据集名称' }]}>
            <Input placeholder="例如: equipment_sensors_v1" />
          </Form.Item>
          <Form.Item name="source" label="数据来源" rules={[{ required: true, message: '请选择数据来源' }]}>
            <Select placeholder="选择本体对象">
              <Select.Option value="ontology://PurchaseOrder/output">ontology://PurchaseOrder/output</Select.Option>
              <Select.Option value="ontology://Equipment/output">ontology://Equipment/output</Select.Option>
              <Select.Option value="ontology://Customer/output">ontology://Customer/output</Select.Option>
              <Select.Option value="ontology://Inventory/output">ontology://Inventory/output</Select.Option>
              <Select.Option value="ontology://WorkOrder/output">ontology://WorkOrder/output</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="format" label="导出格式" initialValue="JSONL">
            <Radio.Group onChange={e => setSelectedFormat(e.target.value as DatasetFormat)}>
              <Radio.Button value="JSONL">JSONL</Radio.Button>
              <Radio.Button value="CSV">CSV</Radio.Button>
              <Radio.Button value="Parquet">Parquet</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {selectedFormat === 'JSONL' && (
            <Form.Item name="promptTemplate" label="Prompt 模板" extra="使用 {{字段名}} 引用 Schema 字段">
              <Input.TextArea
                rows={3}
                placeholder='{"instruction": "分类设备状态", "input": "{{设备名称}} {{故障类型}}", "output": "{{运行状态}}"}'
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </Form.Item>
          )}
          <Form.Item name="schemaFields" label="Schema 字段选择">
            <Checkbox.Group>
              <Row>
                {SCHEMA_FIELD_OPTIONS.map(field => (
                  <Col span={8} key={field}>
                    <Checkbox value={field} style={{ marginBottom: 8 }}>{field}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="trainSplit" label="Train %" initialValue={70}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="valSplit" label="Val %" initialValue={15}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="testSplit" label="Test %" initialValue={15}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title={
          detailDataset ? (
            <Space>
              <DatabaseOutlined style={{ color: '#1677ff' }} />
              <span>{detailDataset.name}</span>
              <Tag color={DATASET_FORMAT_COLORS[detailDataset.format]}>{detailDataset.format}</Tag>
              <Tag color={DATASET_STATUS_COLORS[detailDataset.status]}>{detailDataset.status}</Tag>
            </Space>
          ) : '数据集详情'
        }
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDetailDataset(null) }}
        width={720}
        destroyOnClose
      >
        {detailDataset && (
          <div>
            {/* Basic info */}
            <Row gutter={[16, 12]} style={{ marginBottom: 20 }}>
              <Col span={8}>
                <Text type="secondary">来源</Text>
                <br />
                <Text code style={{ fontSize: 11 }}>{detailDataset.source}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">版本</Text>
                <br />
                <Text strong>{detailDataset.version}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">记录数</Text>
                <br />
                <Text strong>{detailDataset.records > 0 ? detailDataset.records.toLocaleString() : '—'}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">大小</Text>
                <br />
                <Text>{detailDataset.size}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">切分比例</Text>
                <br />
                <Text>{detailDataset.trainSplit}/{detailDataset.valSplit}/{detailDataset.testSplit}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">更新时间</Text>
                <br />
                <Text>{detailDataset.updatedAt}</Text>
              </Col>
            </Row>

            {/* Build progress bar */}
            {detailDataset.status === 'Building' && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">构建进度</Text>
                <Progress percent={detailDataset.buildProgress} status="active" />
              </div>
            )}

            <Tabs
              defaultActiveKey="preview"
              items={[
                {
                  key: 'preview',
                  label: '数据预览',
                  children: detailDataset.sampleData.length > 0 ? (
                    <Table
                      dataSource={detailDataset.sampleData.map((row, i) => ({ ...row, _key: i }))}
                      columns={getSampleColumns(detailDataset.sampleData)}
                      rowKey="_key"
                      pagination={false}
                      size="small"
                      bordered
                      scroll={{ x: 'max-content' }}
                    />
                  ) : (
                    <Text type="secondary">暂无预览数据</Text>
                  ),
                },
                {
                  key: 'schema',
                  label: 'Schema 字段',
                  children: (
                    <div>
                      {detailDataset.schemaFields.length > 0 ? (
                        <Space size={[8, 8]} wrap>
                          {detailDataset.schemaFields.map(field => (
                            <Tag key={field} color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>{field}</Tag>
                          ))}
                        </Space>
                      ) : (
                        <Text type="secondary">未选择 Schema 字段</Text>
                      )}
                      {detailDataset.promptTemplate && (
                        <div style={{ marginTop: 16 }}>
                          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Prompt 模板</Text>
                          <div style={{
                            background: '#f5f5f5',
                            borderRadius: 6,
                            padding: '12px 16px',
                            fontFamily: 'monospace',
                            fontSize: 12,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                          }}>
                            {detailDataset.promptTemplate}
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'log',
                  label: '构建日志',
                  children: (
                    <div style={{
                      background: '#1e1e1e',
                      borderRadius: 6,
                      padding: '16px',
                      maxHeight: 400,
                      overflowY: 'auto',
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: 12,
                      lineHeight: 1.8,
                    }}>
                      {detailDataset.buildLog.length > 0 ? (
                        detailDataset.buildLog.map((line, i) => (
                          <div key={i} style={{
                            color: line.includes('✓') ? '#52c41a'
                              : line.includes('✗') || line.includes('错误') ? '#ff4d4f'
                              : line.includes('...') ? '#faad14'
                              : '#d4d4d4',
                          }}>
                            {line}
                          </div>
                        ))
                      ) : (
                        <div style={{ color: '#666' }}>暂无构建日志</div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}
