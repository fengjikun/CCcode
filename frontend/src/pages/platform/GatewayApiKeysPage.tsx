import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
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
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
} from '@ant-design/icons'

import {
  createApiKey,
  listApiKeys,
  listModels,
  rotateApiKey,
  toggleApiKeyStatus,
} from '../../api/modelGateway'
import ModalHeader from '../../components/shared/ModalHeader'
import PageHeader from '../../components/shared/PageHeader'
import { MODEL_CENTER_PAGE_LABELS, MODEL_GATEWAY_PAGE_LABELS } from '../../types/modelCenter'
import { getModelDisplayName } from '../../types/modelCatalog'
import type { CreateGatewayApiKeyInput, GatewayApiKey, GatewayIssuedSecret, RegisteredModel } from '../../types/modelGateway'

const { Text } = Typography

const SCOPE_OPTIONS = [
  { label: 'Chat Completions', value: 'chat:completions' },
  { label: 'Responses', value: 'responses:create' },
  { label: 'Vision Understand', value: 'vision:understand' },
  { label: 'Document Parse', value: 'documents:parse' },
  { label: 'Metrics Read', value: 'metrics:read' },
] as const

const STATUS_COLORS: Record<GatewayApiKey['status'], string> = {
  Active: 'green',
  Disabled: 'default',
  ExpiringSoon: 'orange',
}

export default function GatewayApiKeysPage() {
  const [form] = Form.useForm<CreateGatewayApiKeyInput>()
  const [apiKeys, setApiKeys] = useState<GatewayApiKey[]>([])
  const [models, setModels] = useState<RegisteredModel[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [issuedSecret, setIssuedSecret] = useState<GatewayIssuedSecret | null>(null)

  const loadData = () => {
    void listApiKeys().then(setApiKeys)
    void listModels().then(setModels)
  }

  useEffect(() => {
    loadData()
  }, [])

  const stats = useMemo(() => ({
    total: apiKeys.length,
    active: apiKeys.filter(item => item.status === 'Active').length,
    expiringSoon: apiKeys.filter(item => item.status === 'ExpiringSoon').length,
    disabled: apiKeys.filter(item => item.status === 'Disabled').length,
  }), [apiKeys])

  const handleCreate = async () => {
    const values = await form.validateFields()
    const result = await createApiKey(values)
    if (!result.success) return
    message.success(result.message)
    setIssuedSecret(result.issued)
    setCreateOpen(false)
    form.resetFields()
    loadData()
  }

  const handleToggle = async (record: GatewayApiKey) => {
    const nextStatus = record.status === 'Disabled' ? 'Active' : 'Disabled'
    const result = await toggleApiKeyStatus(record.key, nextStatus)
    if (!result.success) return
    message.success(result.message)
    loadData()
  }

  const handleRotate = async (record: GatewayApiKey) => {
    const result = await rotateApiKey(record.key)
    if (!result.success || !result.issued) return
    message.success(result.message)
    setIssuedSecret(result.issued)
    loadData()
  }

  const columns = [
    {
      title: 'Key 名称',
      key: 'name',
      render: (_: unknown, record: GatewayApiKey) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.owner}</Text>
          <Text code style={{ fontSize: 11 }}>{record.prefix}</Text>
        </Space>
      ),
    },
    {
      title: '权限范围',
      dataIndex: 'scopes',
      key: 'scopes',
      render: (value: GatewayApiKey['scopes']) => (
        <Space size={[4, 4]} wrap>
          {value.map(scope => <Tag key={scope}>{scope}</Tag>)}
        </Space>
      ),
    },
    {
      title: '绑定模型',
      dataIndex: 'linkedModels',
      key: 'linkedModels',
      render: (value: string[]) => (
        <Space size={[4, 4]} wrap>
          {value.map(model => <Tag color="blue" key={model}>{getModelDisplayName(model)}</Tag>)}
        </Space>
      ),
    },
    {
      title: '配额策略',
      key: 'quota',
      render: (_: unknown, record: GatewayApiKey) => (
        <Space direction="vertical" size={2}>
          <Text>{record.rateLimitRpm.toLocaleString()} RPM</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.monthlyQuota.toLocaleString()} tokens / 月</Text>
        </Space>
      ),
    },
    {
      title: '白名单',
      dataIndex: 'ipWhitelist',
      key: 'ipWhitelist',
      render: (value: string[]) => (
        <Space direction="vertical" size={2}>
          {value.map(item => <Text key={item} code style={{ fontSize: 11 }}>{item}</Text>)}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: GatewayApiKey['status']) => <Tag color={STATUS_COLORS[value]}>{value}</Tag>,
    },
    {
      title: '最近使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: GatewayApiKey) => (
        <Space size={4} wrap>
          <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => void handleRotate(record)}>
            轮换
          </Button>
          <Popconfirm
            title={record.status === 'Disabled' ? '确认启用该 API Key？' : '确认禁用该 API Key？'}
            onConfirm={() => void handleToggle(record)}
          >
            <Button
              type="link"
              size="small"
              icon={record.status === 'Disabled' ? <SafetyCertificateOutlined /> : <StopOutlined />}
              danger={record.status !== 'Disabled'}
            >
              {record.status === 'Disabled' ? '启用' : '禁用'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title={MODEL_GATEWAY_PAGE_LABELS.apiKeys}
        subtitle={`${MODEL_CENTER_PAGE_LABELS.gateway}的访问凭证、权限范围、配额与轮换管理。`}
      />

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {issuedSecret && (
          <Alert
            type="success"
            showIcon
            closable
            onClose={() => setIssuedSecret(null)}
            message={`请立即保存 ${issuedSecret.name} 的明文密钥`}
            description={
              <Space direction="vertical" size={4}>
                <Text code>{issuedSecret.secret}</Text>
                <Text type="secondary">该值仅在创建或轮换后显示一次。</Text>
              </Space>
            }
          />
        )}

        <Row gutter={[14, 14]}>
          <Col span={6}>
            <Card size="small">
              <Text type="secondary">Key 总数</Text>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total}</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Text type="secondary">生效中</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a' }}>{stats.active}</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Text type="secondary">即将过期</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706' }}>{stats.expiringSoon}</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Text type="secondary">已禁用</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#64748b' }}>{stats.disabled}</div>
            </Card>
          </Col>
        </Row>

        <Card
          size="small"
          title="API Key 管理"
          extra={(
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建 API Key
            </Button>
          )}
        >
          <Table dataSource={apiKeys} columns={columns} rowKey="key" pagination={false} size="small" />
        </Card>
      </Space>

      <Modal
        title={<ModalHeader icon={<KeyOutlined />} title="新建 API Key" />}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            owner: 'platform.gateway',
            linkedModels: models.slice(0, 1).map(item => item.name),
            scopes: ['chat:completions', 'metrics:read'],
            rateLimitRpm: 600,
            monthlyQuota: 1_000_000,
            ipWhitelist: ['10.10.0.0/16'],
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：车间助手生产环境" />
          </Form.Item>
          <Form.Item name="owner" label="Owner" rules={[{ required: true, message: '请输入 owner' }]}>
            <Input placeholder="例如：factory.ops" />
          </Form.Item>
          <Form.Item name="linkedModels" label="绑定模型" rules={[{ required: true, message: '请选择至少一个模型' }]}>
            <Select
              mode="multiple"
              options={models.map(model => ({ label: model.displayName, value: model.name }))}
              placeholder="选择可访问模型"
            />
          </Form.Item>
          <Form.Item name="scopes" label="权限范围" rules={[{ required: true, message: '请选择权限范围' }]}>
            <Select mode="multiple" options={SCOPE_OPTIONS.map(item => ({ ...item }))} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="rateLimitRpm" label="RPM 限额" rules={[{ required: true, message: '请输入 RPM' }]}>
                <InputNumber min={60} step={60} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="monthlyQuota" label="月 Token 配额" rules={[{ required: true, message: '请输入月配额' }]}>
                <InputNumber min={10000} step={10000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="expiresAt" label="过期时间">
            <Input placeholder="例如：2026-06-30" />
          </Form.Item>
          <Form.Item
            name="ipWhitelist"
            label="IP 白名单"
            getValueFromEvent={(value: string[]) => value}
            rules={[{ required: true, message: '请至少保留一个 IP 规则' }]}
          >
            <Select
              mode="tags"
              tokenSeparators={[',', ' ']}
              open={false}
              placeholder="输入 CIDR 或 IP，回车确认"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
