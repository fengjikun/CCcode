import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Col,
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
  DeleteOutlined,
  LoginOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import {
  createDigitalHuman,
  deleteDigitalHuman,
  listDigitalHumans,
} from '../api/digitalHuman'
import type { DigitalHuman, DigitalHumanType } from '../types/digitalHuman'
import {
  DIGITAL_HUMAN_TYPES,
  DIGITAL_HUMAN_TYPE_LABELS,
  DIGITAL_HUMAN_TYPE_COLORS,
  DIGITAL_HUMAN_TYPE_ICONS,
} from '../types/digitalHuman'

const { Title, Text } = Typography

const TYPE_OPTIONS = DIGITAL_HUMAN_TYPES.map(value => ({
  value,
  label: `${DIGITAL_HUMAN_TYPE_ICONS[value]} ${DIGITAL_HUMAN_TYPE_LABELS[value]}`,
}))

interface CreateForm {
  name: string
  type: DigitalHumanType
  description?: string
}

export default function DigitalHumanListPage() {
  const [list, setList] = useState<DigitalHuman[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<CreateForm>()
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
      message.success('数字人创建成功')
      setCreateOpen(false)
      form.resetFields()
      reload()
      navigate(`/digital-human/${dh.id}`)
    } catch (err: any) {
      if (err?.errorFields) return
      message.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (id: string) => {
    deleteDigitalHuman(id)
    message.success('数字人已删除')
    reload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>数字人管理</Title>
            <Text type="secondary">创建领域专属数字人，关联本体知识，实现专业化 AI 问答与决策支持。</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={reload}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建数字人
            </Button>
          </Space>
        </div>
      </Card>

      <Card>
        {list.length === 0 ? (
          <Empty
            image={<RobotOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
            description="暂无数字人，点击「新建数字人」开始创建"
          />
        ) : (
          <Row gutter={[16, 16]}>
            {list.map(dh => (
              <Col key={dh.id} xs={24} md={12} xl={8}>
                <Card
                  hoverable
                  style={{ height: '100%' }}
                  actions={[
                    <Space
                      key="open"
                      onClick={() => navigate(`/digital-human/${dh.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <LoginOutlined />
                      进入
                    </Space>,
                    <Popconfirm
                      key="delete"
                      title="确认删除该数字人？"
                      description="此操作不可恢复。"
                      onConfirm={() => handleDelete(dh.id)}
                    >
                      <Space style={{ color: '#ff4d4f', cursor: 'pointer' }}>
                        <DeleteOutlined />
                        删除
                      </Space>
                    </Popconfirm>,
                  ]}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <span style={{ fontSize: 20 }}>{DIGITAL_HUMAN_TYPE_ICONS[dh.type]}</span>
                        <Title level={5} style={{ margin: 0 }}>{dh.name}</Title>
                      </Space>
                      <Tag color={DIGITAL_HUMAN_TYPE_COLORS[dh.type]}>
                        {DIGITAL_HUMAN_TYPE_LABELS[dh.type]}
                      </Tag>
                    </div>
                    <Text type="secondary" style={{ minHeight: 40 }}>
                      {dh.description || '未填写描述'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      创建时间：{new Date(dh.createdAt).toLocaleString('zh-CN')}
                    </Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Modal
        title="新建数字人"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
      >
        <Form<CreateForm> form={form} layout="vertical" initialValues={{ type: 'fault-repair' }}>
          <Form.Item name="name" label="数字人名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：产线A故障诊断助手" maxLength={64} />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="可选，描述该数字人的职责与能力" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
