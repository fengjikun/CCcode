import { useEffect, useState } from 'react'
import { Card, Col, Row, Table, Tag, Typography, Tabs, Space, Input } from 'antd'
import {
  AppstoreOutlined,
  TagsOutlined,
  BranchesOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  SearchOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { getOntologyStats, getObjectTypes, getLinkTypes, getActions } from '../../api/ontologyOverview'
import type { ObjectTypeSummary, ActionDefinition } from '../../types/ontologyOverview'

const { Title, Text } = Typography

const STATUS_COLORS: Record<string, string> = { Active: 'green', Draft: 'orange', Deprecated: 'default' }

export default function OntologyOverviewPage() {
  const [stats, setStats] = useState(() => getOntologyStats())
  const [objectTypes, setObjectTypes] = useState(() => getObjectTypes())
  const [linkTypes, setLinkTypes] = useState(() => getLinkTypes())
  const [actions, setActions] = useState(() => getActions())
  const [search, setSearch] = useState('')

  useEffect(() => {
    setStats(getOntologyStats())
    setObjectTypes(getObjectTypes())
    setLinkTypes(getLinkTypes())
    setActions(getActions())
  }, [])

  const searchLower = search.toLowerCase()

  const filteredObjects = objectTypes.filter(o =>
    !search || o.name.toLowerCase().includes(searchLower) || o.displayName.includes(search)
  )

  const filteredLinks = linkTypes.filter(l =>
    !search || l.name.toLowerCase().includes(searchLower)
    || l.sourceType.toLowerCase().includes(searchLower)
    || l.targetType.toLowerCase().includes(searchLower)
  )

  const filteredActions = actions.filter(a =>
    !search || a.name.toLowerCase().includes(searchLower)
    || a.objectType.toLowerCase().includes(searchLower)
  )

  const statItems = [
    { title: 'Object Types', value: stats.objectTypes, icon: <AppstoreOutlined />, color: '#4f46e5', bg: '#eef2ff' },
    { title: 'Properties', value: stats.totalProperties, icon: <TagsOutlined />, color: '#0891b2', bg: '#ecfeff' },
    { title: 'Link Types', value: stats.linkTypes, icon: <BranchesOutlined />, color: '#7c3aed', bg: '#f5f3ff' },
    { title: 'Actions', value: stats.actions, icon: <ThunderboltOutlined />, color: '#d97706', bg: '#fffbeb' },
    { title: '总记录数', value: stats.totalRecords, icon: <DatabaseOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: '已启用 Actions', value: stats.activeActions, icon: <CheckCircleOutlined />, color: '#4f46e5', bg: '#eef2ff' },
  ]

  /* Object Type 列 */
  const objectColumns = [
    {
      title: 'Object Type',
      key: 'name',
      render: (_: unknown, r: ObjectTypeSummary) => (
        <div>
          <Text strong>{r.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{r.displayName}</Text>
        </div>
      ),
    },
    { title: 'Properties', dataIndex: 'properties', key: 'properties', width: 90 },
    { title: 'Actions', dataIndex: 'actions', key: 'actions', width: 80 },
    { title: 'Links', dataIndex: 'links', key: 'links', width: 70 },
    {
      title: '记录数',
      dataIndex: 'recordCount',
      key: 'recordCount',
      width: 100,
      sorter: (a: ObjectTypeSummary, b: ObjectTypeSummary) => a.recordCount - b.recordCount,
      render: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Draft', value: 'Draft' },
      ],
      onFilter: (value: unknown, record: ObjectTypeSummary) => record.status === value,
      render: (v: string) => (
        <span>
          <span className={`status-dot ${v === 'Active' ? 'active' : 'warning'}`} />
          <Tag color={STATUS_COLORS[v]}>{v}</Tag>
        </span>
      ),
    },
    {
      title: 'Backing Dataset',
      dataIndex: 'backingDataset',
      key: 'backingDataset',
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 100 },
  ]

  /* Link Type 列 */
  const linkColumns = [
    { title: 'Link Name', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Source', dataIndex: 'sourceType', key: 'sourceType', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Target', dataIndex: 'targetType', key: 'targetType', render: (v: string) => <Tag>{v}</Tag> },
    { title: '基数', dataIndex: 'cardinality', key: 'cardinality', width: 80, render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '说明', dataIndex: 'description', key: 'description' },
  ]

  /* Action 列 */
  const actionColumns = [
    { title: 'Action Name', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Object Type', dataIndex: 'objectType', key: 'objectType', render: (v: string) => <Tag>{v}</Tag> },
    { title: '参数数', dataIndex: 'parameters', key: 'parameters', width: 80 },
    { title: '前置条件', dataIndex: 'preconditions', key: 'preconditions', width: 80 },
    { title: '效果数', dataIndex: 'effects', key: 'effects', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v}</Tag>,
    },
    {
      title: '调用次数',
      dataIndex: 'callCount',
      key: 'callCount',
      width: 90,
      sorter: (a: ActionDefinition, b: ActionDefinition) => a.callCount - b.callCount,
      render: (v: number) => v > 0 ? v.toLocaleString() : <Text type="secondary">—</Text>,
    },
  ]

  const tabItems = [
    {
      key: 'objects',
      label: <span><AppstoreOutlined /> Object Types ({filteredObjects.length})</span>,
      children: (
        <Table dataSource={filteredObjects} columns={objectColumns} pagination={false} size="small" rowKey="key" />
      ),
    },
    {
      key: 'links',
      label: <span><BranchesOutlined /> Link Types ({filteredLinks.length})</span>,
      children: <Table dataSource={filteredLinks} columns={linkColumns} pagination={false} size="small" rowKey="key" />,
    },
    {
      key: 'actions',
      label: <span><ThunderboltOutlined /> Actions ({filteredActions.length})</span>,
      children: <Table dataSource={filteredActions} columns={actionColumns} pagination={false} size="small" rowKey="key" />,
    },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>Deepology — 本体管理</Title>
          <Text type="secondary">L3 语义层 — 定义和管理企业业务语义层，构建领域知识图谱</Text>
        </div>

        {/* 统计 */}
        <Row gutter={[14, 14]} style={{ margin: '16px 0 20px' }}>
          {statItems.map((s) => (
            <Col span={4} key={s.title}>
              <Card size="small" className="stat-card card-hover" styles={{ body: { padding: '16px 18px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="stat-icon-wrap" style={{ background: s.bg, color: s.color }}>
                    {s.icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>{s.title}</Text>
                    <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 关系速览 */}
        <Card size="small" style={{ background: '#f6f8fa', marginBottom: 20, borderColor: '#e1e4e8' }} styles={{ body: { padding: '12px 16px' } }}>
          <Space align="start">
            <BranchesOutlined style={{ fontSize: 20, color: '#4f46e5', marginTop: 2 }} />
            <div>
              <Text strong>本体关系概览</Text>
              <div style={{ marginTop: 4 }}>
                {linkTypes.slice(0, 4).map(l => (
                  <Tag key={l.key} style={{ marginBottom: 4 }}>
                    {l.sourceType} <span style={{ color: '#8c8c8c' }}>→</span> {l.targetType}
                    <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>({l.cardinality})</Text>
                  </Tag>
                ))}
                {linkTypes.length > 4 && <Tag>+{linkTypes.length - 4} more</Tag>}
              </div>
            </div>
          </Space>
        </Card>

        {/* 搜索 + Tab 表格 */}
        <div style={{ marginBottom: 12 }}>
          <Input
            placeholder="搜索名称"
            prefix={<SearchOutlined />}
            allowClear
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
            size="small"
          />
        </div>
        <Tabs items={tabItems} />
      </Card>

      {/* 图谱可视化占位 */}
      <Card className="section-card">
        <Title level={5}>Ontology Graph Visualization</Title>
        <div className="placeholder-box">
          <Text style={{ fontSize: 16, color: '#64748b' }}>Ontology Entity-Relationship Diagram</Text>
          <br />
          <Text type="secondary">交互式图谱可视化：对象、属性与关系</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            [{objectTypes.map(o => o.name).join(', ')} 等 {objectTypes.length} 个节点及其关系连线]
          </Text>
        </div>
      </Card>
    </div>
  )
}
