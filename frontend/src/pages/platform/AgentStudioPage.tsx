import { useState } from 'react'
import { Button, Card, Checkbox, Col, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

/* ───── Mock agents ───── */
const mockAgents = [
  { key: '1', name: 'Equipment Diagnostics Agent', type: 'Operational', status: 'Active',  version: 'v2.3.1' },
  { key: '2', name: 'Inventory Manager Agent',     type: 'Operational', status: 'Active',  version: 'v1.8.2' },
  { key: '3', name: 'Customer Service Agent',       type: 'Support',    status: 'Testing', version: 'v0.9.5' },
]

const statusColor: Record<string, string> = { Active: 'green', Testing: 'orange', Offline: 'default' }
const typeColor: Record<string, string> = { Operational: 'blue', Support: 'cyan', Analytical: 'purple' }

const toolOptions = [
  'Query Purchase Orders',
  'Create Maintenance Ticket',
  'Send Notification',
  'Check Sensor History',
  'Query Equipment Object',
]

export default function AgentStudioPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<typeof mockAgents[0] | null>(null)
  const [form] = Form.useForm()

  const columns = [
    { title: '智能体名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => <Tag color={typeColor[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v}</Tag>,
    },
    { title: '版本', dataIndex: 'version', key: 'version' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: typeof mockAgents[0]) => (
        <Button
          size="small"
          icon={<SettingOutlined />}
          onClick={() => { setSelectedAgent(record); setDetailOpen(true) }}
        >
          配置
        </Button>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 4 }}>Co-worker 平台</Title>
        <Text type="secondary">开发、编排和管理 AI 智能体</Text>

        <div style={{ margin: '16px 0' }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              创建智能体
            </Button>
            <Button>导入智能体</Button>
          </Space>
        </div>

        <Title level={5}>Agent Space</Title>
        <Table dataSource={mockAgents} columns={columns} pagination={false} size="middle" />

        <Title level={5} style={{ marginTop: 24 }}>Skills Space</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Card size="small">
              <Statistic title="已注册 Actions" value={34} valueStyle={{ color: '#667eea' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>可供 Agent 调用的本体 Action</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Statistic title="已注册 Functions" value={28} valueStyle={{ color: '#667eea' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>用于复杂逻辑的 TypeScript 函数</Text>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* ── Create Agent Modal ── */}
      <Modal
        title="创建智能体"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => { setCreateOpen(false); form.resetFields() }}
        okText="创建"
        cancelText="取消"
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="智能体名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Customer Support Agent" />
          </Form.Item>
          <Form.Item label="类型" name="type" rules={[{ required: true }]}>
            <Select placeholder="选择类型">
              <Select.Option value="Operational">Operational</Select.Option>
              <Select.Option value="Support">Support</Select.Option>
              <Select.Option value="Analytical">Analytical</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="System Prompt" name="prompt" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="You are a helpful assistant that..." />
          </Form.Item>
          <Form.Item label="绑定工具" name="tools">
            <Checkbox.Group options={toolOptions} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Agent Detail Modal ── */}
      <Modal
        title={selectedAgent?.name || 'Agent 详情'}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
        width={560}
      >
        {selectedAgent && (
          <>
            <Card size="small" style={{ marginBottom: 12, background: '#f8f9fa' }}>
              <Title level={5} style={{ marginBottom: 8 }}>Configuration</Title>
              <Paragraph style={{ marginBottom: 4 }}><Text strong>Version：</Text>{selectedAgent.version}</Paragraph>
              <Paragraph style={{ marginBottom: 4 }}><Text strong>Status：</Text>{selectedAgent.status} (Production)</Paragraph>
              <Paragraph style={{ marginBottom: 0 }}><Text strong>Model：</Text>gpt-4-turbo via Model Gateway</Paragraph>
            </Card>
            <Card size="small" style={{ marginBottom: 12, background: '#f8f9fa' }}>
              <Title level={5} style={{ marginBottom: 8 }}>System Prompt</Title>
              <Paragraph style={{ marginBottom: 0 }}>
                You are an expert equipment diagnostics assistant. Analyze sensor data, identify potential failures, and recommend maintenance actions. Always prioritize safety and equipment longevity.
              </Paragraph>
            </Card>
            <Card size="small" style={{ background: '#f8f9fa' }}>
              <Title level={5} style={{ marginBottom: 8 }}>Registered Tools</Title>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Query Equipment Object (Ontology)</li>
                <li>Check Sensor History (Function)</li>
                <li>Create Maintenance Ticket (Action)</li>
                <li>Notify Maintenance Team (Function)</li>
              </ul>
            </Card>
          </>
        )}
      </Modal>
    </div>
  )
}
