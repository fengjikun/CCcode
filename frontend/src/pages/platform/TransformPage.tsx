import { Button, Card, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

const mockProjects = [
  { key: '1', name: 'transform_orders',    inputs: 3, outputs: 2, lastRun: '5 分钟前',  status: 'Success' },
  { key: '2', name: 'transform_assets',    inputs: 2, outputs: 3, lastRun: '15 分钟前', status: 'Success' },
  { key: '3', name: 'transform_crm',       inputs: 4, outputs: 2, lastRun: '1 小时前',  status: 'Success' },
  { key: '4', name: 'transform_inventory', inputs: 2, outputs: 1, lastRun: '2 小时前',  status: 'Running' },
]

const columns = [
  { title: '项目名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
  { title: '输入源', dataIndex: 'inputs', key: 'inputs' },
  { title: '输出数据集', dataIndex: 'outputs', key: 'outputs' },
  { title: '最近运行', dataIndex: 'lastRun', key: 'lastRun' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (v: string) => <Tag color={v === 'Success' ? 'green' : 'orange'}>{v}</Tag>,
  },
]

const treeStyle: React.CSSProperties = { padding: '4px 0 4px 20px', fontSize: 13 }

const codeExample = `from transforms import Pipeline

@Pipeline.transform()
def normalize_orders(raw_orders, customer_master):
    return (
        raw_orders
        .join(customer_master, on='customer_id')
        .select([
            'order_id',
            'customer_name',
            'order_date',
            'total_amount',
            'status'
        ])
        .filter(lambda row: row['status'] != 'Cancelled')
    )`

export default function TransformPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 4 }}>数据转换项目</Title>
        <Text type="secondary">跨源关联、聚合与规范化数据</Text>

        <div style={{ margin: '16px 0' }}>
          <Button type="primary" icon={<PlusOutlined />}>新建转换项目</Button>
        </div>

        <Table dataSource={mockProjects} columns={columns} pagination={false} size="middle" />
      </Card>

      <Card title="转换管道示例 — transform_orders">
        <Paragraph type="secondary">项目目录结构</Paragraph>
        <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 12, marginBottom: 16, fontFamily: 'monospace', fontSize: 13 }}>
          <div style={treeStyle}>📁 transform_orders/</div>
          <div style={{ ...treeStyle, paddingLeft: 40 }}>📁 logic/</div>
          <div style={{ ...treeStyle, paddingLeft: 60 }}>📄 normalize_orders.py</div>
          <div style={{ ...treeStyle, paddingLeft: 60 }}>📄 join_customer_data.py</div>
          <div style={{ ...treeStyle, paddingLeft: 40 }}>📁 datasets/</div>
          <div style={{ ...treeStyle, paddingLeft: 60 }}>📁 transformed/</div>
          <div style={{ ...treeStyle, paddingLeft: 60 }}>📁 output/</div>
          <div style={{ ...treeStyle, paddingLeft: 80 }}>📄 normalized_orders</div>
          <div style={{ ...treeStyle, paddingLeft: 40 }}>📁 documentation/</div>
        </div>

        <Paragraph type="secondary">代码示例：normalize_orders.py</Paragraph>
        <pre style={{
          background: '#2d2d2d',
          color: '#f8f8f2',
          padding: 16,
          borderRadius: 6,
          overflow: 'auto',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          {codeExample}
        </pre>
      </Card>
    </div>
  )
}
