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
    render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v}</Tag>,
  },
]

const treeStyle: React.CSSProperties = { padding: '4px 0 4px 20px', fontSize: 13 }

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
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 4 }}>数据源管理</Title>
        <Text type="secondary">连接并同步外部系统数据</Text>

        <div style={{ margin: '16px 0' }}>
          <Button type="primary" icon={<PlusOutlined />}>添加数据源</Button>
        </div>

        <Table dataSource={mockSources} columns={columns} pagination={false} size="middle" />
      </Card>

      <Card title="数据源项目结构 — ds_sap_orders">
        <Paragraph type="secondary">项目目录</Paragraph>
        <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 12, marginBottom: 16, fontFamily: 'monospace', fontSize: 13 }}>
          <div style={treeStyle}>📁 ds_sap_orders/</div>
          <div style={{ ...treeStyle, paddingLeft: 40 }}>📁 raw/</div>
          <div style={{ ...treeStyle, paddingLeft: 60 }}>📄 orders_2025_03_08.parquet</div>
          <div style={{ ...treeStyle, paddingLeft: 40 }}>📁 clean/</div>
          <div style={{ ...treeStyle, paddingLeft: 60 }}>📄 cleaned_orders</div>
          <div style={{ ...treeStyle, paddingLeft: 40 }}>📁 output/</div>
          <div style={{ ...treeStyle, paddingLeft: 60 }}>📄 standardized_orders</div>
          <div style={{ ...treeStyle, paddingLeft: 40 }}>📁 analysis/</div>
          <div style={{ ...treeStyle, paddingLeft: 40 }}>📁 documentation/</div>
        </div>

        <Paragraph type="secondary">连接配置示例</Paragraph>
        <pre style={{
          background: '#2d2d2d',
          color: '#f8f8f2',
          padding: 16,
          borderRadius: 6,
          overflow: 'auto',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          {configJson}
        </pre>
      </Card>
    </div>
  )
}
