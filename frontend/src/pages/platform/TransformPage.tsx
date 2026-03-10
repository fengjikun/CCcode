import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  CaretRightOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  ForkOutlined,
  MergeCellsOutlined,
  MinusCircleOutlined,
  NodeIndexOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
  TableOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  listTransforms,
  createTransform,
  updateTransform,
  deleteTransform,
  runTransform,
  stopTransform,
} from '../../api/transform'
import { listDataSources } from '../../api/dataSource'
import type { TransformProject, TransformType } from '../../types/transform'
import { TRANSFORM_STATUS_LABELS, TRANSFORM_TYPE_LABELS } from '../../types/transform'
import type { DataSource } from '../../types/dataSource'

import PageHeader from '../../components/shared/PageHeader'
import StatCards from '../../components/shared/StatCards'
import ModalHeader from '../../components/shared/ModalHeader'

const { Text } = Typography
const { TextArea } = Input

/* ──────────── 文档准备流程可视化 ──────────── */
function PipelineFlow() {
  const stages = [
    { icon: <FileTextOutlined />, label: '文档接入', sub: 'Ingest', color: '#4f46e5' },
    { icon: <NodeIndexOutlined />, label: '版面解析', sub: 'Layout', color: '#0891b2' },
    { icon: <SearchOutlined />, label: 'OCR 与阅读顺序', sub: 'OCR', color: '#7c3aed' },
    { icon: <TableOutlined />, label: '表格/图片/公式抽取', sub: 'Extract', color: '#d97706' },
    { icon: <MergeCellsOutlined />, label: '切片与标注准备', sub: 'Chunk', color: '#16a34a' },
    { icon: <CloudServerOutlined />, label: '数据集发布', sub: 'Publish', color: '#e11d48' },
  ]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 0, padding: '20px 0', overflowX: 'auto',
    }}>
      {stages.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
          <div
            className="pipeline-stage"
            style={{
              background: `linear-gradient(135deg, ${s.color}22, ${s.color}08)`,
              border: `1px solid ${s.color}40`,
              minWidth: 100, padding: '14px 12px',
            }}
          >
            <div style={{ fontSize: 22, color: s.color, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub}</div>
          </div>
          {i < stages.length - 1 && (
            <ArrowRightOutlined style={{ fontSize: 16, color: '#94a3b8', margin: '0 6px', flexShrink: 0 }} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ──────────── 输出数据集编辑列表 ──────────── */
function OutputEditor({ value = [], onChange }: { value?: string[]; onChange?: (v: string[]) => void }) {
  const update = (idx: number, val: string) => {
    const next = [...value]
    next[idx] = val
    onChange?.(next)
  }
  const remove = (idx: number) => onChange?.(value.filter((_, i) => i !== idx))
  const add = () => onChange?.([...value, ''])

  return (
    <div>
      {value.map((v, i) => (
        <Space key={i} style={{ display: 'flex', marginBottom: 8 }}>
          <Input
            value={v}
            placeholder="输出数据集名称"
            onChange={e => update(i, e.target.value)}
            style={{ width: 280 }}
          />
          <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(i)} />
        </Space>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={add} style={{ width: 280 }}>
        添加输出数据集
      </Button>
    </div>
  )
}

/* ──────────── 主页面 ──────────── */
export default function TransformPage() {
  const [projects, setProjects] = useState<TransformProject[]>([])
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [current, setCurrent] = useState<TransformProject | null>(null)
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const reload = useCallback(() => {
    listTransforms().then(d => setProjects(d))
    listDataSources().then(d => setDataSources(d))
  }, [])

  useEffect(() => { reload() }, [reload])

  /* ── 统计 ── */
  const totalRecords = projects.reduce((s, p) => s + p.records, 0)
  const successCount = projects.filter(p => p.status === 'Success').length
  const outputCount = projects.reduce((sum, project) => sum + project.outputDatasets.length, 0)

  /* ── 过滤 ── */
  const filtered = projects.filter(p =>
    !search || p.name.includes(search) || p.description.includes(search),
  )

  /* ── 创建 ── */
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      const outputs = (values.outputDatasets || []).filter((s: string) => s.trim())
      if (outputs.length === 0) {
        message.warning('请至少填写一个输出数据集')
        return
      }
      await createTransform({
        name: values.name,
        description: values.description || '',
        type: values.type,
        inputSources: values.inputSources,
        outputDatasets: outputs,
        schedule: values.schedule || '手动触发',
      })
      message.success('数据集准备任务创建成功')
      setCreateOpen(false)
      createForm.resetFields()
      reload()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('创建失败')
    }
  }

  /* ── 编辑 ── */
  const openEdit = (r: TransformProject) => {
    setCurrent(r)
    editForm.setFieldsValue({
      name: r.name,
      description: r.description,
      type: r.type,
      inputSources: r.inputSources,
      outputDatasets: r.outputDatasets,
      schedule: r.schedule,
    })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!current) return
    try {
      const values = await editForm.validateFields()
      await updateTransform(current.id, {
        name: values.name,
        description: values.description,
        type: values.type,
        inputSources: values.inputSources,
        outputDatasets: (values.outputDatasets || []).filter((s: string) => s.trim()),
        schedule: values.schedule,
      })
      message.success('已更新')
      setEditOpen(false)
      reload()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('更新失败')
    }
  }

  /* ── 删除 ── */
  const handleDelete = async (id: string) => {
    await deleteTransform(id)
    message.success('已删除')
    reload()
  }

  /* ── 运行 / 停止 ── */
  const handleRun = async (id: string) => {
    setRunningIds(prev => new Set(prev).add(id))
    message.loading({ content: '文档准备任务运行中...', key: id, duration: 0 })
    await runTransform(id)
    message.success({ content: '数据集准备完成', key: id })
    setRunningIds(prev => { const n = new Set(prev); n.delete(id); return n })
    reload()
  }

  const handleStop = async (id: string) => {
    await stopTransform(id)
    setRunningIds(prev => { const n = new Set(prev); n.delete(id); return n })
    message.info('任务已停止')
    reload()
  }

  /* ── 详情 ── */
  const openDetail = (r: TransformProject) => {
    setCurrent(r)
    setDetailOpen(true)
  }

  /* ── 数据源选项 ── */
  const unstructuredSources = dataSources.filter(source => source.category === 'unstructured')
  const availableSources = unstructuredSources.length > 0 ? unstructuredSources : dataSources
  const dsOptions = availableSources.map(d => ({ label: `${d.name} (${d.type})`, value: d.id }))

  /* ── 表格列 ── */
  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, r: TransformProject) => (
        <div>
          <Text strong style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => openDetail(r)}>{v}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>
        </div>
      ),
    },
    {
      title: '准备类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (v: TransformType) => <Tag color="purple">{TRANSFORM_TYPE_LABELS[v]}</Tag>,
    },
    {
      title: '输入文档源',
      key: 'inputSourceNames',
      width: 200,
      render: (_: unknown, r: TransformProject) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {r.inputSourceNames.map(s => <Tag key={s} color="blue" style={{ fontSize: 11 }}>{s}</Tag>)}
        </div>
      ),
    },
    {
      title: '输出结果',
      key: 'outputDatasets',
      width: 200,
      render: (_: unknown, r: TransformProject) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {r.outputDatasets.map(s => <Tag key={s} color="orange" style={{ fontSize: 11 }}>{s}</Tag>)}
        </div>
      ),
    },
    {
      title: '产出样本',
      dataIndex: 'records',
      key: 'records',
      width: 100,
      render: (v: number) => v > 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString(),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => {
        const color = v === 'Success' ? 'green' : v === 'Running' ? 'orange' : v === 'Failed' ? 'red' : 'default'
        return (
          <span>
            <span className={`status-dot ${v === 'Success' ? 'active' : v === 'Running' ? 'warning' : v === 'Failed' ? 'error' : ''}`} />
            <Tag color={color}>{TRANSFORM_STATUS_LABELS[v as keyof typeof TRANSFORM_STATUS_LABELS]}</Tag>
          </span>
        )
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: unknown, r: TransformProject) => {
        const isRunning = r.status === 'Running' || runningIds.has(r.id)
        return (
          <Space size={4}>
            <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => openDetail(r)} />
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} disabled={isRunning} />
            {isRunning ? (
              <Button size="small" type="text" danger icon={<PauseCircleOutlined />} onClick={() => handleStop(r.id)} />
            ) : (
              <Button size="small" type="text" style={{ color: '#16a34a' }} icon={<CaretRightOutlined />} onClick={() => handleRun(r.id)} />
            )}
            <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)} disabled={isRunning}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={isRunning} />
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  /* ── 表单内容（创建/编辑共用） ── */
  const formFields = (
    <>
      <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
        <Input placeholder="如 prep_equipment_manuals" />
      </Form.Item>
      <Form.Item name="type" label="准备类型" rules={[{ required: true, message: '请选择准备类型' }]}>
        <Select placeholder="选择类型" options={
          (Object.keys(TRANSFORM_TYPE_LABELS) as TransformType[]).map(k => ({ label: TRANSFORM_TYPE_LABELS[k], value: k }))
        } />
      </Form.Item>
      <Form.Item name="inputSources" label="输入文档源" rules={[{ required: true, message: '请选择文档源' }]}>
        <Select mode="multiple" placeholder="从 L1 非结构化数据源选择" options={dsOptions} />
      </Form.Item>
      <Form.Item name="outputDatasets" label="输出数据集">
        <OutputEditor />
      </Form.Item>
      <Form.Item name="schedule" label="调度策略">
        <Select placeholder="运行频率" options={[
          { label: '每小时', value: '每小时' },
          { label: '每日', value: '每日' },
          { label: '事件触发', value: '事件触发' },
          { label: '手动触发', value: '手动触发' },
        ]} />
      </Form.Item>
      <Form.Item name="description" label="描述">
        <TextArea rows={3} placeholder="描述文档解析策略、版面恢复要求和目标数据集形态" />
      </Form.Item>
    </>
  )

  return (
    <div className="page-container">
      {/* Pipeline 流程概览 */}
      <Card className="section-card">
        <PageHeader title="数据集准备" subtitle="L2 数据集准备 — 聚焦 PDF、Word、PPT、Excel、扫描件与图片，完成通用文档解析、版面恢复与训练数据构建" />

        <StatCards items={[
          { title: '准备任务', value: projects.length, icon: <ForkOutlined />, cls: 'stat-primary' },
          { title: '完成任务', value: successCount, icon: <CheckCircleOutlined />, cls: 'stat-success' },
          { title: '产出样本', value: `${(totalRecords / 10000).toFixed(1)}万`, icon: <SyncOutlined />, cls: 'stat-warning' },
          { title: '输出数据集', value: outputCount, icon: <DatabaseOutlined />, cls: 'stat-info' },
        ]} />

        <Space wrap size={[8, 8]} style={{ marginBottom: 8 }}>
          <Tag color="blue">PDF</Tag>
          <Tag color="cyan">Word</Tag>
          <Tag color="geekblue">PPT</Tag>
          <Tag color="purple">Excel</Tag>
          <Tag color="orange">扫描件</Tag>
          <Tag color="gold">图片</Tag>
          <Tag color="green">Markdown / JSON / VQA / Chunk</Tag>
        </Space>

        <PipelineFlow />
      </Card>

      {/* 项目列表 */}
      <Card
        className="section-card"
        title={<Text><ThunderboltOutlined style={{ color: '#1677ff', marginRight: 8 }} />数据集准备任务</Text>}
        extra={
          <Space>
            <Input.Search
              placeholder="搜索任务"
              allowClear
              style={{ width: 220 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建准备任务
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={filtered}
          columns={columns}
          pagination={false}
          size="middle"
          rowKey="id"
        />
      </Card>

      {/* 创建弹窗 */}
      <Modal
        title={<ModalHeader icon={<PlusOutlined />} title="新建数据集准备任务" />}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields() }}
        onOk={handleCreate}
        okText="创建"
        width={640}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          {formFields}
        </Form>
      </Modal>

      {/* 编辑弹窗 */}
      <Modal
        title={<ModalHeader icon={<EditOutlined />} title="编辑数据集准备任务" />}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleEdit}
        okText="保存"
        width={640}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          {formFields}
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title={<ModalHeader icon={<EyeOutlined />} title="数据集准备详情" />}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        {current && (
          <div style={{ lineHeight: 2.2 }}>
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">任务名称：</Text><Text strong>{current.name}</Text></Col>
              <Col span={12}><Text type="secondary">准备类型：</Text><Tag color="purple">{TRANSFORM_TYPE_LABELS[current.type]}</Tag></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">状态：</Text>
                <Tag color={current.status === 'Success' ? 'green' : current.status === 'Running' ? 'orange' : current.status === 'Failed' ? 'red' : 'default'}>{TRANSFORM_STATUS_LABELS[current.status]}</Tag>
              </Col>
              <Col span={12}><Text type="secondary">调度策略：</Text><Text>{current.schedule}</Text></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">产出样本：</Text><Text>{current.records.toLocaleString()}</Text></Col>
              <Col span={12}><Text type="secondary">耗时：</Text><Text>{current.duration}</Text></Col>
            </Row>
            <div style={{ margin: '8px 0' }}>
              <Text type="secondary">描述：</Text><Text>{current.description}</Text>
            </div>
            <div style={{ margin: '8px 0' }}>
              <Text type="secondary">输入文档源：</Text>
              {current.inputSourceNames.map(s => <Tag key={s} color="blue" style={{ marginBottom: 4 }}>{s}</Tag>)}
            </div>
            <div style={{ margin: '8px 0' }}>
              <Text type="secondary">输出数据集：</Text>
              {current.outputDatasets.map(s => <Tag key={s} color="orange" style={{ marginBottom: 4 }}>{s}</Tag>)}
            </div>
            <Row gutter={16} style={{ marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
              <Col span={12}>创建时间：{new Date(current.createdAt).toLocaleString()}</Col>
              <Col span={12}>最近运行：{current.lastRun || '-'}</Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  )
}
