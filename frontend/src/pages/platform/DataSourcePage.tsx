import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
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
  ApiOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import {
  createDataSource,
  deleteDataSource,
  listDataSources,
  testConnection,
  updateDataSource,
} from '../../api/dataSource'
import type { DataSource, DataSourceCategory, DataSourceConnection } from '../../types/dataSource'
import {
  CATEGORY_LABELS,
  STRUCTURED_TYPES,
  UNSTRUCTURED_TYPES,
  SYNC_FREQUENCY_LABELS,
  STATUS_COLORS,
  TYPE_ICONS,
} from '../../types/dataSource'
import type { SyncFrequency, DataSourceType } from '../../types/dataSource'

const { Text } = Typography

/* ──────────── 表单类型 ──────────── */
interface CreateForm {
  name: string
  category: DataSourceCategory
  type: DataSourceType
  syncFrequency: SyncFrequency
  description?: string
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  fileName?: string
}

interface EditForm {
  name: string
  description?: string
  syncFrequency: SyncFrequency
}

import StatCards from '../../components/shared/StatCards'
import PageHeader from '../../components/shared/PageHeader'
import StatusCell from '../../components/shared/StatusCell'
import ModalHeader from '../../components/shared/ModalHeader'
import ActionColumn from '../../components/shared/ActionColumn'

const DS_STATUS_DOT: Record<string, 'active' | 'warning' | 'error'> = {
  Active: 'active', Syncing: 'active', Inactive: 'warning', Error: 'error',
}

/* ──────────── 主页面 ──────────── */
export default function DataSourcePage() {
  const [list, setList] = useState<DataSource[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<DataSourceCategory | 'all'>('all')

  // 创建弹窗
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<CreateForm>()
  const [selectedCategory, setSelectedCategory] = useState<DataSourceCategory>('structured')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // 编辑弹窗
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DataSource | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm] = Form.useForm<EditForm>()

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<DataSource | null>(null)

  const reload = useCallback(() => {
    setList(listDataSources())
  }, [])

  useEffect(() => { reload() }, [reload])

  /* 过滤 */
  const filtered = list.filter(d => {
    if (filterCategory !== 'all' && d.category !== filterCategory) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.type.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  /* 创建 */
  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setCreating(true)
      const connection: DataSourceConnection = values.category === 'structured'
        ? { host: values.host, port: values.port, database: values.database, username: values.username, password: values.password }
        : { fileName: values.fileName }
      createDataSource({
        name: values.name,
        category: values.category,
        type: values.type,
        connection,
        syncFrequency: values.syncFrequency,
        description: values.description,
      })
      message.success('数据源创建成功')
      setCreateOpen(false)
      form.resetFields()
      setTestResult(null)
      reload()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  /* 测试连接 */
  const handleTest = async () => {
    try {
      await form.validateFields(['host', 'port', 'database'])
    } catch {
      return // 表单校验失败
    }
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection(form.getFieldsValue())
      setTestResult(result)
    } catch {
      setTestResult({ success: false, message: '网络异常，请检查连接' })
    } finally {
      setTesting(false)
    }
  }

  /* 编辑 */
  const openEdit = (ds: DataSource) => {
    setEditTarget(ds)
    editForm.setFieldsValue({ name: ds.name, description: ds.description, syncFrequency: ds.syncFrequency })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields()
      setEditing(true)
      updateDataSource(editTarget!.id, values)
      message.success('修改成功')
      setEditOpen(false)
      reload()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('修改失败')
    } finally {
      setEditing(false)
    }
  }

  /* 删除 */
  const handleDelete = (id: string) => {
    deleteDataSource(id)
    message.success('数据源已删除')
    reload()
  }

  /* 查看详情 */
  const openDetail = (ds: DataSource) => {
    setDetailTarget(ds)
    setDetailOpen(true)
  }

  /* 列定义 */
  const columns = [
    {
      title: '数据源名称',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, r: DataSource) => (
        <Space>
          <span style={{ fontSize: 18 }}>{TYPE_ICONS[r.type] || '📦'}</span>
          <div>
            <Text strong>{v}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{r.description?.slice(0, 40) || '-'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 110,
      render: (v: DataSourceCategory) => (
        <Tag color={v === 'structured' ? 'blue' : 'geekblue'}>{CATEGORY_LABELS[v]}</Tag>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '同步频率',
      dataIndex: 'syncFrequency',
      key: 'syncFrequency',
      width: 110,
      render: (v: SyncFrequency) => SYNC_FREQUENCY_LABELS[v] || v,
    },
    {
      title: '记录数',
      dataIndex: 'recordCount',
      key: 'recordCount',
      width: 100,
      render: (v: number) => v > 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString(),
    },
    {
      title: '最近同步',
      dataIndex: 'lastSync',
      key: 'lastSync',
      width: 110,
      render: (v: string | null) => v || <Text type="secondary">未同步</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => (
        <span>
          {v === 'Syncing' && <SyncOutlined spin style={{ color: '#1677ff', marginRight: 4 }} />}
          <StatusCell value={v} colors={STATUS_COLORS} dotMap={DS_STATUS_DOT} />
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: DataSource) => (
        <ActionColumn actions={[
          { key: 'view', icon: <EyeOutlined />, tooltip: '查看详情', onClick: () => openDetail(record) },
          { key: 'edit', icon: <EditOutlined />, tooltip: '编辑', onClick: () => openEdit(record) },
          { key: 'delete', icon: <DeleteOutlined />, tooltip: '删除', danger: true, confirm: '确认删除该数据源？', onClick: () => handleDelete(record.id) },
        ]} />
      ),
    },
  ]

  return (
    <div className="page-container">
      {/* ===== Header ===== */}
      <Card className="section-card">
        <PageHeader title="数据源管理" subtitle="L1 数据接入 — 连接并同步企业结构化与非结构化数据，统一数据接入层" />

        <StatCards items={[
          { title: '数据源总数', value: list.length, icon: <DatabaseOutlined />, cls: 'stat-primary' },
          { title: '结构化', value: list.filter(d => d.category === 'structured').length, icon: <ApiOutlined />, cls: 'stat-success' },
          { title: '非结构化', value: list.filter(d => d.category === 'unstructured').length, icon: <FileTextOutlined />, cls: 'stat-purple' },
          { title: '活跃连接', value: list.filter(d => d.status === 'Active' || d.status === 'Syncing').length, icon: <LinkOutlined />, cls: 'stat-warning' },
          { title: '总记录数', value: list.reduce((s, d) => s + d.recordCount, 0) > 10000 ? `${(list.reduce((s, d) => s + d.recordCount, 0) / 10000).toFixed(1)}万` : list.reduce((s, d) => s + d.recordCount, 0), icon: <SyncOutlined />, cls: 'stat-info' },
        ]} />

        {/* 工具栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>
            <Radio.Group
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="all">全部</Radio.Button>
              <Radio.Button value="structured">结构化</Radio.Button>
              <Radio.Button value="unstructured">非结构化</Radio.Button>
            </Radio.Group>
            <Input
              placeholder="搜索数据源名称 / 类型"
              prefix={<SearchOutlined />}
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 240 }}
              size="small"
            />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={reload} size="small">刷新</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setCreateOpen(true); setSelectedCategory('structured'); form.resetFields(); setTestResult(null) }}
            >
              添加数据源
            </Button>
          </Space>
        </div>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          pagination={filtered.length > 10 ? { pageSize: 10, showSizeChanger: true, showTotal: t => `共 ${t} 条` } : false}
          size="middle"
        />
      </Card>

      {/* ===== 创建弹窗 ===== */}
      <Modal
        title={<ModalHeader icon={<DatabaseOutlined />} title="添加数据源" />}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); setTestResult(null) }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
        width={640}
        destroyOnClose
      >
        <Form<CreateForm>
          form={form}
          layout="vertical"
          initialValues={{ category: 'structured', syncFrequency: '15min' }}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="category" label="数据分类">
            <Radio.Group
              onChange={e => {
                setSelectedCategory(e.target.value)
                form.setFieldValue('type', undefined)
                setTestResult(null)
              }}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="structured">
                <DatabaseOutlined style={{ marginRight: 4 }} />结构化数据
              </Radio.Button>
              <Radio.Button value="unstructured">
                <CloudUploadOutlined style={{ marginRight: 4 }} />非结构化数据
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="数据源名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="例如：ds_sap_orders" maxLength={64} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="数据源类型" rules={[{ required: true, message: '请选择类型' }]}>
                <Select
                  placeholder="选择类型"
                  options={(selectedCategory === 'structured' ? STRUCTURED_TYPES : UNSTRUCTURED_TYPES).map(t => ({
                    value: t,
                    label: `${TYPE_ICONS[t] || ''} ${t}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 结构化连接配置 */}
          {selectedCategory === 'structured' && (
            <>
              <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>连接配置</Divider>
              <Row gutter={16}>
                <Col span={14}>
                  <Form.Item name="host" label="主机地址" rules={[{ required: true, message: '请输入主机' }]}>
                    <Input placeholder="例如：192.168.1.100" />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item name="port" label="端口" rules={[{ required: true, message: '请输入端口' }]}>
                    <InputNumber placeholder="3306" style={{ width: '100%' }} min={1} max={65535} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="database" label="数据库名" rules={[{ required: true, message: '请输入数据库名' }]}>
                    <Input placeholder="例如：production_db" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="username" label="用户名">
                    <Input placeholder="数据库用户名" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="password" label="密码">
                <Input.Password placeholder="数据库密码" />
              </Form.Item>
              <div style={{ marginBottom: 16 }}>
                <Button
                  icon={<LinkOutlined />}
                  onClick={() => void handleTest()}
                  loading={testing}
                >
                  测试连接
                </Button>
                {testResult && (
                  <Tag
                    icon={testResult.success ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                    color={testResult.success ? 'success' : 'error'}
                    style={{ marginLeft: 12 }}
                  >
                    {testResult.message}
                  </Tag>
                )}
              </div>
            </>
          )}

          {/* 非结构化文件配置 */}
          {selectedCategory === 'unstructured' && (
            <>
              <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>文件信息</Divider>
              <Form.Item name="fileName" label="文件名称" rules={[{ required: true, message: '请输入文件名' }]}>
                <Input placeholder="例如：设备维修手册_v3.2.pdf" />
              </Form.Item>
            </>
          )}

          <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>同步设置</Divider>
          <Form.Item name="syncFrequency" label="同步频率" rules={[{ required: true }]}>
            <Select
              options={Object.entries(SYNC_FREQUENCY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="可选，数据源用途说明" maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 编辑弹窗 ===== */}
      <Modal
        title={<ModalHeader icon={<EditOutlined />} title="编辑数据源" />}
        open={editOpen}
        onCancel={() => { setEditOpen(false); editForm.resetFields() }}
        onOk={() => void handleEdit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={editing}
        destroyOnClose
      >
        <Form<EditForm> form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="数据源名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="syncFrequency" label="同步频率" rules={[{ required: true }]}>
            <Select options={Object.entries(SYNC_FREQUENCY_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 详情弹窗 ===== */}
      <Modal
        title={<ModalHeader icon={<EyeOutlined />} title="数据源详情" />}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
        width={640}
        destroyOnClose
      >
        {detailTarget && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="名称" span={2}>
                <Space>
                  <span style={{ fontSize: 18 }}>{TYPE_ICONS[detailTarget.type]}</span>
                  <Text strong>{detailTarget.name}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag color={detailTarget.category === 'structured' ? 'blue' : 'geekblue'}>
                  {CATEGORY_LABELS[detailTarget.category]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="类型">{detailTarget.type}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <span className={`status-dot ${detailTarget.status === 'Active' ? 'active' : 'warning'}`} />
                <Tag color={STATUS_COLORS[detailTarget.status]}>{detailTarget.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="同步频率">{SYNC_FREQUENCY_LABELS[detailTarget.syncFrequency]}</Descriptions.Item>
              <Descriptions.Item label="记录数">{detailTarget.recordCount.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="最近同步">{detailTarget.lastSync || '未同步'}</Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>{detailTarget.description || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>连接配置</Divider>
            <pre className="code-block">
              {JSON.stringify(detailTarget.connection, null, 2)}
            </pre>

            {detailTarget.category === 'structured' && (
              <>
                <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>数据目录结构</Divider>
                <div className="dir-tree">
                  <div className="dir-item">{detailTarget.name}/</div>
                  <div className="dir-item" style={{ paddingLeft: 20 }}>raw/</div>
                  <div className="dir-item" style={{ paddingLeft: 40 }}>data_{new Date().toISOString().slice(0, 10).replace(/-/g, '_')}.parquet</div>
                  <div className="dir-item" style={{ paddingLeft: 20 }}>clean/</div>
                  <div className="dir-item" style={{ paddingLeft: 40 }}>cleaned_data</div>
                  <div className="dir-item" style={{ paddingLeft: 20 }}>output/</div>
                  <div className="dir-item" style={{ paddingLeft: 40 }}>standardized_data</div>
                  <div className="dir-item" style={{ paddingLeft: 20 }}>analysis/</div>
                  <div className="dir-item" style={{ paddingLeft: 20 }}>documentation/</div>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
