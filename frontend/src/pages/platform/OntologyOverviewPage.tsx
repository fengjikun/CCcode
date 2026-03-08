import { Card, Col, Row, Statistic, Table, Typography } from 'antd'
import {
  AppstoreOutlined,
  TagsOutlined,
  BranchesOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

const objectTypes = [
  { key: '1', name: 'PurchaseOrder', properties: 12, actions: 5, backingDataset: 'transform_orders/output/normalized_orders' },
  { key: '2', name: 'Equipment',     properties: 18, actions: 8, backingDataset: 'transform_assets/output/equipment_master' },
  { key: '3', name: 'Customer',      properties: 15, actions: 4, backingDataset: 'transform_crm/output/customer_360' },
  { key: '4', name: 'Inventory',     properties: 10, actions: 6, backingDataset: 'transform_inventory/output/stock_levels' },
]

const columns = [
  { title: 'Object Type', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
  { title: 'Properties', dataIndex: 'properties', key: 'properties' },
  { title: 'Actions', dataIndex: 'actions', key: 'actions' },
  { title: 'Backing Dataset', dataIndex: 'backingDataset', key: 'backingDataset', render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
]

const actionJson = `// Example: ApprovePurchaseOrder Action
{
  "name": "ApprovePurchaseOrder",
  "objectType": "PurchaseOrder",
  "parameters": {
    "orderId": "string",
    "approver": "string",
    "comments": "string"
  },
  "preconditions": [
    "status == 'Pending'",
    "totalAmount < approver.approvalLimit"
  ],
  "effects": [
    "status = 'Approved'",
    "approvedBy = approver",
    "approvalDate = now()"
  ],
  "function": "notifySupplier(orderId)"
}`

const statItems = [
  { title: 'Object Types', value: 156, icon: <AppstoreOutlined />, cls: 'stat-primary' },
  { title: 'Properties', value: 423, icon: <TagsOutlined />, cls: 'stat-info' },
  { title: 'Link Types', value: 89, icon: <BranchesOutlined />, cls: 'stat-purple' },
  { title: 'Actions', value: 67, icon: <ThunderboltOutlined />, cls: 'stat-warning' },
]

export default function OntologyOverviewPage() {
  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>Deepology — 本体管理</Title>
          <Text type="secondary">定义和管理企业业务语义层，构建领域知识图谱</Text>
        </div>

        <Title level={5} style={{ marginTop: 20 }}>本体概览</Title>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {statItems.map((s) => (
            <Col span={6} key={s.title}>
              <Card size="small" className={`stat-card card-hover ${s.cls}`} style={{ textAlign: 'center' }}>
                <Statistic
                  title={s.title}
                  value={s.value}
                  prefix={<span style={{ fontSize: 18, marginRight: 4 }}>{s.icon}</span>}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Title level={5}>Object Type Definitions</Title>
        <Table dataSource={objectTypes} columns={columns} pagination={false} size="middle" />
      </Card>

      <Card className="section-card" title="Action Definitions">
        <pre className="code-block">{actionJson}</pre>
      </Card>

      <Card className="section-card">
        <Title level={5}>Ontology Graph Visualization</Title>
        <div className="placeholder-box">
          <Text style={{ fontSize: 16, color: '#64748b' }}>Ontology Entity-Relationship Diagram</Text>
          <br />
          <Text type="secondary">交互式图谱可视化：对象、属性与关系</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            [PurchaseOrder, Equipment, Customer, Inventory 等节点及其关系连线]
          </Text>
        </div>
      </Card>
    </div>
  )
}
