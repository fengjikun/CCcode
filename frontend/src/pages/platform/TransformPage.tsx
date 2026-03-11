import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRightOutlined,
  CaretRightOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
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
import type { ColumnsType } from 'antd/es/table'
import {
  createTransform,
  deleteTransform,
  listTransforms,
  runTransform,
  stopTransform,
  updateTransform,
} from '../../api/transform'
import { listDataSources } from '../../api/dataSource'
import PageHeader from '../../components/shared/PageHeader'
import StatCards from '../../components/shared/StatCards'
import ModalHeader from '../../components/shared/ModalHeader'
import type { DataSource } from '../../types/dataSource'
import type { TransformProject, TransformType } from '../../types/transform'
import { TRANSFORM_STATUS_LABELS, TRANSFORM_TYPE_LABELS } from '../../types/transform'

const { Text } = Typography
const { TextArea } = Input

const PREP_TYPE_DESCRIPTIONS: Record<TransformType, string> = {
  DocumentParsing: '解析手册、周报、说明文档和扫描件，输出可阅读的文本与结构块。',
  LayoutRecovery: '恢复报告、表单和复杂版面结构，补齐标题层级、表格关系和段落语义。',
  MultimodalExtraction: '联合日志、图片、波形和附件样本抽取跨模态特征与证据片段。',
  ChunkAnnotation: '对规则文件、知识文档和复盘材料切片、标签化并构建问答样本。',
  DatasetPackaging: '将解析结果封装成知识库、训练集和智能体可直接消费的数据集。',
}

function formatRecordCount(value: number): string {
  return value > 10000 ? `${(value / 10000).toFixed(1)}万` : value.toLocaleString()
}

function PipelineFlow() {
  const stages = [
    { icon: <FileTextOutlined />, label: '文档接入', sub: 'Ingest', color: '#4f46e5' },
    { icon: <NodeIndexOutlined />, label: '版面解析', sub: 'Layout', color: '#0891b2' },
    { icon: <SearchOutlined />, label: '文本识别', sub: 'OCR', color: '#7c3aed' },
    { icon: <TableOutlined />, label: '要素抽取', sub: 'Extract', color: '#d97706' },
    { icon: <MergeCellsOutlined />, label: '切片标注', sub: 'Chunk', color: '#16a34a' },
    { icon: <CloudServerOutlined />, label: '数据集发布', sub: 'Publish', color: '#e11d48' },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '20px 0', overflowX: 'auto' }}>
      {stages.map((stage, index) => (
        <div key={stage.label} style={{ display: 'flex', alignItems: 'center' }}>
          <div
            className="pipeline-stage"
            style={{
              background: `linear-gradient(135deg, ${stage.color}22, ${stage.color}08)`,
              border: `1px solid ${stage.color}40`,
              minWidth: 108,
              padding: '14px 12px',
            }}
          >
            <div style={{ fontSize: 22, color: stage.color, marginBottom: 6 }}>{stage.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{stage.label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{stage.sub}</div>
          </div>
          {index < stages.length - 1 && <ArrowRightOutlined style={{ fontSize: 16, color: '#94a3b8', margin: '0 6px', flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  )
}

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
      {value.map((item, index) => (
        <Space key={index} style={{ display: 'flex', marginBottom: 8 }}>
          <Input
            value={item}
            placeholder="输出数据集名称，如 maintenance_manual_chunks / review_markdown"
            onChange={event => update(index, event.target.value)}
            style={{ width: 280 }}
          />
          <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(index)} />
        </Space>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={add} style={{ width: 280 }}>
        添加输出数据集
      </Button>
    </div>
  )
}

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
    listTransforms().then(setProjects)
    listDataSources().then(setDataSources)
  }, [])

  useEffect(() => { reload() }, [reload])

  const totalRecords = projects.reduce((sum, project) => sum + project.records, 0)
  const successCount = projects.filter(project => project.status === 'Success').length
  const runningCount = projects.filter(project => project.status === 'Running').length

  const filtered = useMemo(() => {
    if (!search) return projects
    const keyword = search.toLowerCase()
    return projects.filter(project => [
      project.name,
      project.description,
      ...project.inputSourceNames,
      ...project.outputDatasets,
    ].some(value => value.toLowerCase().includes(keyword)))
  }, [projects, search])

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      const outputs = (values.outputDatasets || []).filter((item: string) => item.trim())
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
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error('创建失败')
    }
  }

  const openEdit = (project: TransformProject) => {
    setCurrent(project)
    editForm.setFieldsValue({
      name: project.name,
      description: project.description,
      type: project.type,
      inputSources: project.inputSources,
      outputDatasets: project.outputDatasets,
      schedule: project.schedule,
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
        outputDatasets: (values.outputDatasets || []).filter((item: string) => item.trim()),
        schedule: values.schedule,
      })
      message.success('已更新')
      setEditOpen(false)
      reload()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error('更新失败')
    }
  }

  const handleDelete = async (id: string) => {
    await deleteTransform(id)
    message.success('已删除')
    reload()
  }

  const handleRun = async (id: string) => {
    setRunningIds(prev => new Set(prev).add(id))
    message.loading({ content: '数据集准备任务运行中...', key: id, duration: 0 })
    await runTransform(id)
    message.success({ content: '数据集准备完成', key: id })
    setRunningIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    reload()
  }

  const handleStop = async (id: string) => {
    await stopTransform(id)
    setRunningIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    message.info('任务已停止')
    reload()
  }

  const openDetail = (project: TransformProject) => {
    setCurrent(project)
    setDetailOpen(true)
  }

  const unstructuredSources = dataSources.filter(source => source.category === 'unstructured')
  const availableSources = unstructuredSources.length > 0 ? unstructuredSources : dataSources
  const dsOptions = availableSources.map(source => ({
    label: `${source.name} · ${source.type}`,
    value: source.id,
  }))

  const columns: ColumnsType<TransformProject> = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (value: string, record: TransformProject) => (
        <div>
          <Text strong style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => openDetail(record)}>{value}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
        </div>
      ),
    },
    {
      title: '准备类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (value: TransformType) => <Tag color="purple">{TRANSFORM_TYPE_LABELS[value]}</Tag>,
    },
    {
      title: '输入文档源',
      key: 'inputSourceNames',
      width: 220,
      render: (_value: unknown, record: TransformProject) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {record.inputSourceNames.map(name => <Tag key={name} color="blue" style={{ fontSize: 11 }}>{name}</Tag>)}
        </div>
      ),
    },
    {
      title: '输出结果',
      key: 'outputDatasets',
      width: 220,
      render: (_value: unknown, record: TransformProject) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {record.outputDatasets.map(name => <Tag key={name} color="orange" style={{ fontSize: 11 }}>{name}</Tag>)}
        </div>
      ),
    },
    {
      title: '产出样本',
      dataIndex: 'records',
      key: 'records',
      width: 100,
      render: (value: number) => formatRecordCount(value ?? 0),
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
      render: (value: TransformProject['status']) => {
        const color = value === 'Success' ? 'green' : value === 'Running' ? 'orange' : value === 'Failed' ? 'red' : 'default'
        return (
          <span>
            <span className={`status-dot ${value === 'Success' ? 'active' : value === 'Running' ? 'warning' : value === 'Failed' ? 'error' : ''}`} />
            <Tag color={color}>{TRANSFORM_STATUS_LABELS[value]}</Tag>
          </span>
        )
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_value: unknown, record: TransformProject) => {
        const isRunning = record.status === 'Running' || runningIds.has(record.id)
        return (
          <Space size={4}>
            <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => openDetail(record)} />
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} disabled={isRunning} />
            {isRunning ? (
              <Button size="small" type="text" danger icon={<PauseCircleOutlined />} onClick={() => handleStop(record.id)} />
            ) : (
              <Button size="small" type="text" style={{ color: '#16a34a' }} icon={<CaretRightOutlined />} onClick={() => handleRun(record.id)} />
            )}
            <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} disabled={isRunning}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={isRunning} />
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  const formFields = (
    <>
      <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
        <Input placeholder="如 prep_maintenance_manuals / prep_replenishment_rules" />
      </Form.Item>
      <Form.Item name="type" label="准备类型" rules={[{ required: true, message: '请选择准备类型' }]}>
        <Select
          placeholder="选择类型"
          options={(Object.keys(TRANSFORM_TYPE_LABELS) as TransformType[]).map(type => ({
            label: TRANSFORM_TYPE_LABELS[type],
            value: type,
          }))}
        />
      </Form.Item>
      <Form.Item name="inputSources" label="输入文档源" rules={[{ required: true, message: '请选择文档源' }]}>
        <Select mode="multiple" placeholder="从非结构化数据源选择" options={dsOptions} />
      </Form.Item>
      <Form.Item name="outputDatasets" label="输出数据集">
        <OutputEditor />
      </Form.Item>
      <Form.Item name="schedule" label="调度策略">
        <Select
          placeholder="运行频率"
          options={[
            { label: '每小时', value: '每小时' },
            { label: '每日', value: '每日' },
            { label: '事件触发', value: '事件触发' },
            { label: '手动触发', value: '手动触发' },
          ]}
        />
      </Form.Item>
      <Form.Item name="description" label="描述">
        <TextArea rows={3} placeholder="描述文档解析策略、版面恢复规则和目标数据集形态" />
      </Form.Item>
    </>
  )

  return (
    <div className="page-container">
      <Card className="section-card">
        <PageHeader title="数据集准备" subtitle="基于对象存储中的文档、日志、图片和样本文件，完成解析、抽取、切片与封装，为知识库、训练集和智能体提供可消费数据" />

        <StatCards items={[
          { title: '准备任务', value: projects.length, icon: <ForkOutlined />, cls: 'stat-primary' },
          { title: '已完成', value: successCount, icon: <CheckCircleOutlined />, cls: 'stat-success' },
          { title: '运行中', value: runningCount, icon: <SyncOutlined />, cls: 'stat-warning' },
          { title: '产出样本', value: formatRecordCount(totalRecords), icon: <DatabaseOutlined />, cls: 'stat-info' },
        ]} />

        <Row gutter={12} style={{ marginBottom: 20 }}>
          {(Object.keys(TRANSFORM_TYPE_LABELS) as TransformType[]).map(type => (
            <Col xs={24} md={12} xl={8} key={type}>
              <Card size="small" style={{ background: '#fafafa', height: '100%' }} styles={{ body: { padding: '12px 16px' } }}>
                <Tag color="purple" style={{ marginBottom: 6 }}>{TRANSFORM_TYPE_LABELS[type]}</Tag>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>{PREP_TYPE_DESCRIPTIONS[type]}</div>
              </Card>
            </Col>
          ))}
        </Row>

        <Space wrap size={[8, 8]} style={{ marginBottom: 8 }}>
          <Tag color="blue">维修手册</Tag>
          <Tag color="cyan">RCA 报告</Tag>
          <Tag color="geekblue">机台日志</Tag>
          <Tag color="purple">振动波形</Tag>
          <Tag color="magenta">红外热像</Tag>
          <Tag color="volcano">业务说明</Tag>
          <Tag color="lime">规则文件</Tag>
          <Tag color="gold">调拨样本</Tag>
          <Tag color="green">运营周报 / Markdown / JSON / Chunk</Tag>
        </Space>

        <PipelineFlow />
      </Card>

      <Card
        className="section-card"
        title={<Text><ThunderboltOutlined style={{ color: '#1677ff', marginRight: 8 }} />数据集准备任务</Text>}
        extra={(
          <Space>
            <Input.Search
              placeholder="搜索任务 / 文档源 / 输出数据集"
              allowClear
              style={{ width: 240 }}
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建准备任务
            </Button>
          </Space>
        )}
      >
        <div style={{ marginBottom: 12, color: '#64748b', fontSize: 12 }}>
          累计产出样本 {formatRecordCount(totalRecords)}，面向非结构化文档、图片、日志和规则文件构建训练与知识数据集。
        </div>
        <Table dataSource={filtered} columns={columns} pagination={false} size="middle" rowKey="id" />
      </Card>

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
              <Col span={12}>
                <Text type="secondary">任务名称：</Text>
                <Text strong>{current.name}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">准备类型：</Text>
                <Tag color="purple">{TRANSFORM_TYPE_LABELS[current.type]}</Tag>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">状态：</Text>
                <Tag color={current.status === 'Success' ? 'green' : current.status === 'Running' ? 'orange' : current.status === 'Failed' ? 'red' : 'default'}>
                  {TRANSFORM_STATUS_LABELS[current.status]}
                </Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">调度策略：</Text>
                <Text>{current.schedule}</Text>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">产出样本：</Text>
                <Text>{current.records.toLocaleString()}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">耗时：</Text>
                <Text>{current.duration}</Text>
              </Col>
            </Row>
            <div style={{ margin: '8px 0' }}>
              <Text type="secondary">描述：</Text>
              <Text>{current.description}</Text>
            </div>
            <div style={{ margin: '8px 0' }}>
              <Text type="secondary">输入文档源：</Text>
              {current.inputSourceNames.map(name => <Tag key={name} color="blue" style={{ marginBottom: 4 }}>{name}</Tag>)}
            </div>
            <div style={{ margin: '8px 0' }}>
              <Text type="secondary">输出数据集：</Text>
              {current.outputDatasets.map(name => <Tag key={name} color="orange" style={{ marginBottom: 4 }}>{name}</Tag>)}
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
