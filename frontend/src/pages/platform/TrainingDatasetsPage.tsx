import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd'
import { DatabaseOutlined, BarChartOutlined, HistoryOutlined, DeploymentUnitOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const mockDatasets = [
  { key: '1', name: 'purchase_orders_v3',  source: 'ontology://PurchaseOrder/output', split: '70/15/15', records: '12,450', version: 'v3.0', status: 'Ready' },
  { key: '2', name: 'equipment_sensors_v2', source: 'ontology://Equipment/output',     split: '80/10/10', records: '45,230', version: 'v2.1', status: 'Ready' },
  { key: '3', name: 'customer_churn_v1',    source: 'ontology://Customer/output',      split: '70/15/15', records: '8,920',  version: 'v1.0', status: 'Ready' },
  { key: '4', name: 'inventory_demand_v1',  source: 'ontology://Inventory/output',     split: '75/15/10', records: '23,100', version: 'v1.2', status: 'Building' },
]

const columns = [
  { title: '数据集名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
  { title: '来源', dataIndex: 'source', key: 'source', render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
  { title: 'Train/Val/Test', dataIndex: 'split', key: 'split' },
  { title: '记录数', dataIndex: 'records', key: 'records' },
  { title: '版本', dataIndex: 'version', key: 'version' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (v: string) => (
      <span>
        <span className={`status-dot ${v === 'Ready' ? 'active' : 'warning'}`} />
        <Tag color={v === 'Ready' ? 'green' : 'orange'}>{v}</Tag>
      </span>
    ),
  },
]

const statItems = [
  { title: '数据集总数', value: 4, icon: <DatabaseOutlined />, cls: 'stat-primary' },
  { title: '总记录数', value: '89.7K', icon: <BarChartOutlined />, cls: 'stat-info' },
  { title: '快照版本', value: 8, icon: <HistoryOutlined />, cls: 'stat-success' },
  { title: '关联模型', value: 4, icon: <DeploymentUnitOutlined />, cls: 'stat-purple' },
]

export default function TrainingDatasetsPage() {
  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>训练数据集</Title>
          <Text type="secondary">从本体语义层导出、切分和版本管理训练数据</Text>
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

        <Table dataSource={mockDatasets} columns={columns} pagination={false} size="middle" />
      </Card>
    </div>
  )
}
