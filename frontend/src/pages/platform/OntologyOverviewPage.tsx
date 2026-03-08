import { Card, Col, Row, Statistic, Table, Typography } from 'antd'

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

export default function OntologyOverviewPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 4 }}>Deepology — 本体管理</Title>
        <Text type="secondary">定义和管理业务语义层</Text>

        <Title level={5} style={{ marginTop: 20 }}>本体概览</Title>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}><Card size="small" style={{ textAlign: 'center' }}><Statistic title="Object Types" value={156} valueStyle={{ color: '#667eea' }} /></Card></Col>
          <Col span={6}><Card size="small" style={{ textAlign: 'center' }}><Statistic title="Properties" value={423} valueStyle={{ color: '#667eea' }} /></Card></Col>
          <Col span={6}><Card size="small" style={{ textAlign: 'center' }}><Statistic title="Link Types" value={89} valueStyle={{ color: '#667eea' }} /></Card></Col>
          <Col span={6}><Card size="small" style={{ textAlign: 'center' }}><Statistic title="Actions" value={67} valueStyle={{ color: '#667eea' }} /></Card></Col>
        </Row>

        <Title level={5}>Object Type Definitions</Title>
        <Table dataSource={objectTypes} columns={columns} pagination={false} size="middle" />
      </Card>

      <Card title="Action Definitions">
        <pre style={{
          background: '#2d2d2d',
          color: '#f8f8f2',
          padding: 16,
          borderRadius: 6,
          overflow: 'auto',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          {actionJson}
        </pre>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Title level={5}>Ontology Graph Visualization</Title>
        <div style={{
          background: '#f8f9fa',
          padding: 40,
          borderRadius: 8,
          textAlign: 'center',
          border: '2px dashed #ddd',
        }}>
          <Text style={{ fontSize: 16, color: '#6c757d' }}>🔗 Ontology Entity-Relationship Diagram</Text>
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
