import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd'

const { Title, Text } = Typography

const mockSkills = [
  { key: '1', name: 'ApprovePurchaseOrder',  type: 'Action',   objectType: 'PurchaseOrder', calls: 1245, status: 'Active' },
  { key: '2', name: 'CreateMaintenanceTicket', type: 'Action', objectType: 'Equipment',     calls: 876,  status: 'Active' },
  { key: '3', name: 'checkMotorHealth',       type: 'Function', objectType: 'Equipment',     calls: 2341, status: 'Active' },
  { key: '4', name: 'notifySupplier',         type: 'Function', objectType: 'PurchaseOrder', calls: 534,  status: 'Active' },
  { key: '5', name: 'sendOrderToSAP',         type: 'Function', objectType: 'PurchaseOrder', calls: 421,  status: 'Active' },
  { key: '6', name: 'QueryEquipmentStatus',   type: 'Query',    objectType: 'Equipment',     calls: 3102, status: 'Active' },
  { key: '7', name: 'forecastDemand',         type: 'Function', objectType: 'Inventory',     calls: 189,  status: 'Testing' },
  { key: '8', name: 'detectAnomaly',          type: 'Function', objectType: 'Equipment',     calls: 756,  status: 'Active' },
]

const typeColor: Record<string, string> = { Action: 'blue', Function: 'green', Query: 'purple' }

const columns = [
  { title: 'Skill 名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    render: (v: string) => <Tag color={typeColor[v] || 'default'}>{v}</Tag>,
  },
  { title: '关联 Object Type', dataIndex: 'objectType', key: 'objectType' },
  { title: '调用次数', dataIndex: 'calls', key: 'calls', sorter: (a: any, b: any) => a.calls - b.calls },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (v: string) => <Tag color={v === 'Active' ? 'green' : 'orange'}>{v}</Tag>,
  },
]

export default function SkillsMarketPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 4 }}>Skills 广场</Title>
        <Text type="secondary">Action / Function / Query 统一注册与管理</Text>

        <Row gutter={16} style={{ margin: '20px 0' }}>
          <Col span={6}><Card size="small"><Statistic title="Actions" value={34} valueStyle={{ color: '#1677ff' }} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Functions" value={28} valueStyle={{ color: '#52c41a' }} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Queries" value={15} valueStyle={{ color: '#722ed1' }} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="总调用量" value={'9.5K'} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        </Row>

        <Table dataSource={mockSkills} columns={columns} pagination={false} size="middle" />
      </Card>
    </div>
  )
}
