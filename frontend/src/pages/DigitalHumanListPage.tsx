import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ApartmentOutlined,
  BulbOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import {
  createDigitalHuman,
  deleteDigitalHuman,
  listDigitalHumans,
  updateDigitalHuman,
} from '../api/digitalHuman'
import type { DigitalHuman, DigitalHumanType } from '../types/digitalHuman'
import {
  DIGITAL_HUMAN_TYPES,
  DIGITAL_HUMAN_TYPE_LABELS,
  DIGITAL_HUMAN_TYPE_COLORS,
  DIGITAL_HUMAN_TYPE_ICONS,
  DIGITAL_HUMAN_TYPE_DESCRIPTIONS,
} from '../types/digitalHuman'

const { Title, Text, Paragraph } = Typography

const TYPE_OPTIONS = DIGITAL_HUMAN_TYPES.map(value => ({
  value,
  label: `${DIGITAL_HUMAN_TYPE_ICONS[value]} ${DIGITAL_HUMAN_TYPE_LABELS[value]}`,
}))

interface CreateForm {
  name: string
  type: DigitalHumanType
  description?: string
}

interface EditForm {
  name: string
  description?: string
}

export default function DigitalHumanListPage() {
  const [list, setList] = useState<DigitalHuman[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<CreateForm>()
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DigitalHuman | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm] = Form.useForm<EditForm>()
  const navigate = useNavigate()

  const reload = useCallback(() => {
    setList(listDigitalHumans())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setCreating(true)
      const dh = createDigitalHuman(values.name, values.type, values.description)
      message.success('数字员工创建成功')
      setCreateOpen(false)
      form.resetFields()
      reload()
      navigate(`/digital-worker/business/${dh.id}`)
    } catch (err: any) {
      if (err?.errorFields) return
      message.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (id: string) => {
    deleteDigitalHuman(id)
    message.success('数字员工已删除')
    reload()
  }

  const openEdit = (dh: DigitalHuman, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTarget(dh)
    editForm.setFieldsValue({ name: dh.name, description: dh.description })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields()
      setEditing(true)
      updateDigitalHuman(editTarget!.id, { name: values.name, description: values.description })
      message.success('修改成功')
      setEditOpen(false)
      reload()
    } catch (err: any) {
      if (err?.errorFields) return
      message.error('修改失败')
    } finally {
      setEditing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ===== 能力沉淀 Banner ===== */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #0f1e45 0%, #1a3a6b 60%, #0d2f5e 100%)',
          border: 'none',
          borderRadius: 12,
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: '28px 32px' }}
      >
        <Row gutter={32} align="middle">
          <Col flex="1">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <TeamOutlined style={{ color: '#4096ff', fontSize: 22 }} />
              <Text style={{ color: '#4096ff', fontSize: 13, letterSpacing: 2 }}>DeepexiOS 企业数字员工能力中心</Text>
            </div>
            <Title level={3} style={{ color: '#fff', margin: '0 0 10px' }}>
              已沉淀 <span style={{ color: '#faad14' }}>8 大领域</span> 数字员工能力
            </Title>
            <Paragraph style={{ color: '#adc6e8', marginBottom: 16, lineHeight: 1.8 }}>
              基于企业专有<span style={{ color: '#69b1ff' }}>本体知识图谱</span>与行业<span style={{ color: '#95de64' }}>Skill 技能包</span>，
              将各领域资深经验系统化沉淀为可复用的 AI 数字员工能力，驱动智能决策与专业问答。
            </Paragraph>
            <Space size={12}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(64,150,255,0.15)', border: '1px solid rgba(64,150,255,0.4)',
                borderRadius: 6, padding: '5px 14px',
              }}>
                <ApartmentOutlined style={{ color: '#69b1ff', fontSize: 14 }} />
                <Text style={{ color: '#69b1ff', fontSize: 13 }}>本体构建</Text>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(149,222,100,0.12)', border: '1px solid rgba(149,222,100,0.4)',
                borderRadius: 6, padding: '5px 14px',
              }}>
                <BulbOutlined style={{ color: '#95de64', fontSize: 14 }} />
                <Text style={{ color: '#95de64', fontSize: 13 }}>Skill 技能包</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, width: 340,
            }}>
              {DIGITAL_HUMAN_TYPES.map(type => (
                <div
                  key={type}
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8, padding: '10px 6px',
                    textAlign: 'center', cursor: 'default',
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{DIGITAL_HUMAN_TYPE_ICONS[type]}</div>
                  <Text style={{ color: '#d0e4ff', fontSize: 11, lineHeight: 1.3, display: 'block' }}>
                    {DIGITAL_HUMAN_TYPE_LABELS[type]}
                  </Text>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Card>

      {/* ===== 8大领域能力说明 ===== */}
      <Card
        title={
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            <span>领域能力矩阵</span>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>—— 每个领域均具备完整的本体模型与专属 Skill 技能包</Text>
          </Space>
        }
        size="small"
      >
        <Row gutter={[12, 12]}>
          {DIGITAL_HUMAN_TYPES.map(type => (
            <Col key={type} xs={12} md={6}>
              <div style={{
                border: '1px solid #f0f0f0', borderRadius: 8,
                padding: '12px 14px', background: '#fafafa', height: '100%',
              }}>
                <Space align="start">
                  <span style={{ fontSize: 18 }}>{DIGITAL_HUMAN_TYPE_ICONS[type]}</span>
                  <div>
                    <Tag color={DIGITAL_HUMAN_TYPE_COLORS[type]} style={{ marginBottom: 4 }}>
                      {DIGITAL_HUMAN_TYPE_LABELS[type]}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.6 }}>
                      {DIGITAL_HUMAN_TYPE_DESCRIPTIONS[type]}
                    </Text>
                  </div>
                </Space>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* ===== 我的数字员工列表 ===== */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>我的数字员工</span>
            <Tag color="blue">{list.length} 位</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={reload} size="small">刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建数字员工
            </Button>
          </Space>
        }
      >
        {list.length === 0 ? (
          <Empty
            image={<TeamOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
            description={
              <span>
                暂无数字员工，点击「新建数字员工」<br />从8大领域能力中选择并创建
              </span>
            }
          />
        ) : (
          <Row gutter={[16, 16]}>
            {list.map(dh => (
              <Col key={dh.id} xs={24} md={12} xl={8}>
                <Card
                  hoverable
                  style={{ height: '100%', cursor: 'pointer' }}
                  onClick={() => navigate(`/digital-worker/business/${dh.id}`)}
                  actions={[
                    <Space
                      key="edit"
                      onClick={(e) => openEdit(dh, e)}
                      style={{ cursor: 'pointer' }}
                    >
                      <EditOutlined />
                      编辑
                    </Space>,
                    <Popconfirm
                      key="delete"
                      title="确认删除该数字员工？"
                      description="此操作不可恢复。"
                      onConfirm={() => handleDelete(dh.id)}
                      onPopupClick={(e) => e.stopPropagation()}
                    >
                      <Space
                        style={{ color: '#ff4d4f', cursor: 'pointer' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DeleteOutlined />
                        删除
                      </Space>
                    </Popconfirm>,
                  ]}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <span style={{ fontSize: 22 }}>{DIGITAL_HUMAN_TYPE_ICONS[dh.type]}</span>
                        <Title level={5} style={{ margin: 0 }}>{dh.name}</Title>
                      </Space>
                      <Tag color={DIGITAL_HUMAN_TYPE_COLORS[dh.type]}>
                        {DIGITAL_HUMAN_TYPE_LABELS[dh.type]}
                      </Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 13, minHeight: 38, lineHeight: 1.6 }}>
                      {dh.description || DIGITAL_HUMAN_TYPE_DESCRIPTIONS[dh.type]}
                    </Text>
                    <Divider style={{ margin: '6px 0' }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      创建：{new Date(dh.createdAt).toLocaleString('zh-CN')}
                    </Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* ===== 新建弹窗 ===== */}
      <Modal
        title={
          <Space>
            <TeamOutlined style={{ color: '#1677ff' }} />
            新建数字员工
          </Space>
        }
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
      >
        <Form<CreateForm> form={form} layout="vertical" initialValues={{ type: 'fault-repair' }}>
          <Form.Item name="name" label="员工名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：供应链运营专员" maxLength={64} />
          </Form.Item>
          <Form.Item name="type" label="领域类型" rules={[{ required: true }]}
            extra="选择后将自动加载对应领域的本体模型与 Skill 技能包"
          >
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="description" label="职责描述">
            <Input.TextArea rows={3} placeholder="可选，描述该数字员工的工作职责与专长" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 编辑弹窗 ===== */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#1677ff' }} />
            编辑数字员工
          </Space>
        }
        open={editOpen}
        onCancel={() => { setEditOpen(false); editForm.resetFields() }}
        onOk={() => void handleEdit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={editing}
      >
        <Form<EditForm> form={editForm} layout="vertical">
          <Form.Item name="name" label="员工名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：供应链运营专员" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="职责描述">
            <Input.TextArea rows={3} placeholder="可选，描述该数字员工的工作职责与专长" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
