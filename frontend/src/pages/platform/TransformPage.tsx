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
    render: (v: string) => (
      <span>
        <span className={`status-dot ${v === 'Success' ? 'active' : 'warning'}`} />
        <Tag color={v === 'Success' ? 'green' : 'orange'}>{v}</Tag>
      </span>
    ),
  },
]

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
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>数据转换项目</Title>
          <Text type="secondary">跨源关联、聚合与规范化，构建高质量企业数据资产</Text>
        </div>

        <div style={{ margin: '16px 0' }}>
          <Button type="primary" icon={<PlusOutlined />}>新建转换项目</Button>
        </div>

        <Table dataSource={mockProjects} columns={columns} pagination={false} size="middle" />
      </Card>

      <Card className="section-card" title="转换管道示例 — transform_orders">
        <Paragraph type="secondary">项目目录结构</Paragraph>
        <div className="dir-tree" style={{ marginBottom: 16 }}>
          <div className="dir-item">transform_orders/</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>logic/</div>
          <div className="dir-item" style={{ paddingLeft: 40 }}>normalize_orders.py</div>
          <div className="dir-item" style={{ paddingLeft: 40 }}>join_customer_data.py</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>datasets/</div>
          <div className="dir-item" style={{ paddingLeft: 40 }}>transformed/</div>
          <div className="dir-item" style={{ paddingLeft: 40 }}>output/</div>
          <div className="dir-item" style={{ paddingLeft: 60 }}>normalized_orders</div>
          <div className="dir-item" style={{ paddingLeft: 20 }}>documentation/</div>
        </div>

        <Paragraph type="secondary">代码示例：normalize_orders.py</Paragraph>
        <pre className="code-block">{codeExample}</pre>
      </Card>
    </div>
  )
}
