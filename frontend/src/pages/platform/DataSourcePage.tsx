import { Button, Card, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

const mockSources = [
  { key: '1', name: 'ds_sap_orders',     type: 'SAP ERP',      freq: '每 15 分钟', lastSync: '3 分钟前',  status: 'Active' },
  { key: '2', name: 'ds_salesforce_crm',  type: 'Salesforce',   freq: '每小时',     lastSync: '45 分钟前', status: 'Active' },
  { key: '3', name: 'ds_iot_sensors',     type: 'IoT Platform', freq: '实时',       lastSync: 'Live',      status: 'Streaming' },
  { key: '4', name: 'ds_warehouse_db',    type: 'PostgreSQL',   freq: '每日',       lastSync: '6 小时前',  status: 'Active' },
]

const statusColor: Record<string, string> = { Active: 'green', Streaming: 'cyan', Error: 'red' }

const columns = [
  { title: '数据源名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '同步频率', dataIndex: 'freq', key: 'freq' },
  { title: '最近同步', dataIndex: 'lastSync', key: 'lastSync' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (v: string) => (
      <span>
        <span className={`status-dot ${v === 'Error' ? 'error' : 'active'}`} />
        <Tag color={statusColor[v] || 'default'}>{v}</Tag>
      </span>
    ),
  },
]

const configJson = `{
  "name": "ds_sap_orders",
  "type": "SAP_ERP",
  "connection": {
    "host": "sap.company.com",
    "port": 3300,
    "database": "PRD",
    "auth_method": "oauth2"
  },
  "sync": {
    "frequency": "*/15 * * * *",
    "incremental_key": "modified_date",
    "batch_size": 1000
  },
  "schema": {
    "order_id": "string",
    "customer_id": "string",
    "order_date": "timestamp",
    "total_amount": "decimal",
    "status": "string"
  }
}`

export default function DataSourcePage() {
  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>数据源管理</Title>
          <Text type="secondary">连接并同步外部系统数据</Text>
        </div>

        <div style={{ margin: '16px 0' }}>
          <Button type="primary" icon={<PlusOutlined />}>添加数据源</Button>
        </div>

        <Table dataSource={mockSources} columns={columns} pagination={false} size="middle" />
      </Card>

      <Card className="section-card" title="数据源项目结构 — ds_sap_orders">
        <Paragraph type="secondary">项目目录</Paragraph>
        <div className="dir-tree" style={{ marginBottom: 16 }}>
          <div className="dir-item">ds_sap_orders/</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>raw/</div>
          <div className="dir-item" style={{ paddingLeft: 40 }}>orders_2025_03_08.parquet</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>clean/</div>
          <div className="dir-item" style={{ paddingLeft: 40 }}>cleaned_orders</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>output/</div>
          <div className="dir-item" style={{ paddingLeft: 40 }}>standardized_orders</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>analysis/</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>documentation/</div>
        </div>

        <Paragraph type="secondary">连接配置示例</Paragraph>
        <pre className="code-block">{configJson}</pre>
      </Card>
    </div>
  )
}
