import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd'
import { ThunderboltOutlined, CodeOutlined, SearchOutlined, BarChartOutlined } from '@ant-design/icons'

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
  { title: '调用次数', dataIndex: 'calls', key: 'calls', sorter: (a: { calls: number }, b: { calls: number }) => a.calls - b.calls },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (v: string) => (
      <span>
        <span className={`status-dot ${v === 'Active' ? 'active' : 'warning'}`} />
        <Tag color={v === 'Active' ? 'green' : 'orange'}>{v}</Tag>
      </span>
    ),
  },
]

const statItems = [
  { title: 'Actions', value: 34, icon: <ThunderboltOutlined />, cls: 'stat-primary' },
  { title: 'Functions', value: 28, icon: <CodeOutlined />, cls: 'stat-success' },
  { title: 'Queries', value: 15, icon: <SearchOutlined />, cls: 'stat-purple' },
  { title: '总调用量', value: '9.5K', icon: <BarChartOutlined />, cls: 'stat-warning' },
]

export default function SkillsMarketPage() {
  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>Skills 广场</Title>
          <Text type="secondary">企业能力资产统一注册与管理：Action / Function / Query</Text>
        </div>

        <Row gutter={16} style={{ margin: '20px 0' }}>
          {statItems.map((s) => (
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

        <Table dataSource={mockSkills} columns={columns} pagination={false} size="middle" />
      </Card>
    </div>
  )
}
