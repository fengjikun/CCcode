import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { TableProps } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { listDataSources } from '../../api/dataSource'
import PageHeader from '../../components/shared/PageHeader'
import StatCards from '../../components/shared/StatCards'
import type { DataSource, DataSourceStatus } from '../../types/dataSource'
import {
  DATA_SOURCE_STATUS_LABELS,
  type IngestionJobView,
  toIngestionJobView,
} from './dataIngestion.helpers'

const { Text } = Typography

const STATUS_COLORS: Record<DataSourceStatus, string> = {
  Active: 'success',
  Inactive: 'default',
  Error: 'error',
  Syncing: 'processing',
}

export default function DataIngestionPage() {
  const navigate = useNavigate()
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [statusFilter, setStatusFilter] = useState<DataSourceStatus | 'all'>('all')
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'structured' | 'unstructured' | 'all'>('all')
  const [keyword, setKeyword] = useState('')

  const reload = useCallback(() => {
    listDataSources().then(setDataSources)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const jobs = useMemo(() => dataSources.map(toIngestionJobView), [dataSources])

  const filteredJobs = useMemo(() => jobs.filter(job => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false
    if (sourceTypeFilter !== 'all' && job.category !== sourceTypeFilter) return false
    if (!keyword) return true

    const normalizedKeyword = keyword.toLowerCase()
    return [
      job.taskName,
      job.sourceName,
      job.dataSourceType,
      job.targetLabel,
    ].some(value => value.toLowerCase().includes(normalizedKeyword))
  }), [jobs, keyword, sourceTypeFilter, statusFilter])

  const stats = [
    { title: '任务总数', value: jobs.length, icon: <SyncOutlined />, cls: 'stat-primary' },
    { title: '启用中', value: jobs.filter(job => job.status === 'Active' || job.status === 'Syncing').length, icon: <CheckCircleOutlined />, cls: 'stat-success' },
    { title: '同步中', value: jobs.filter(job => job.status === 'Syncing').length, icon: <ClockCircleOutlined />, cls: 'stat-info' },
    { title: '异常任务', value: jobs.filter(job => job.status === 'Error').length, icon: <WarningOutlined />, cls: 'stat-warning' },
  ]

  const columns: TableProps<IngestionJobView>['columns'] = [
    {
      title: '任务名称',
      dataIndex: 'taskName',
      key: 'taskName',
      render: (_value, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.taskName}</Text>
          <Text type="secondary">{record.sourceName}</Text>
        </Space>
      ),
    },
    {
      title: '来源类型',
      dataIndex: 'categoryLabel',
      key: 'categoryLabel',
      width: 120,
      render: (_value, record) => <Tag icon={<DatabaseOutlined />}>{record.categoryLabel}</Tag>,
    },
    {
      title: '数据源类型',
      dataIndex: 'dataSourceType',
      key: 'dataSourceType',
      width: 120,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: '调度策略',
      dataIndex: 'scheduleLabel',
      key: 'scheduleLabel',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (value: DataSourceStatus) => <Tag color={STATUS_COLORS[value]}>{DATA_SOURCE_STATUS_LABELS[value]}</Tag>,
    },
    {
      title: '最近同步',
      dataIndex: 'lastRunLabel',
      key: 'lastRunLabel',
      width: 160,
    },
    {
      title: '处理量',
      dataIndex: 'recordCountLabel',
      key: 'recordCountLabel',
      width: 100,
    },
    {
      title: '接入目标',
      dataIndex: 'targetLabel',
      key: 'targetLabel',
      width: 260,
      render: (value: string) => <Text type="secondary">{value}</Text>,
    },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <PageHeader title="数据接入任务" subtitle="统一查看静态采集任务、同步状态样本与最近结果" />

        <StatCards items={stats} />

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} xl={24}>
            <Card
              title="接入任务列表"
              extra={(
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={reload}>刷新状态</Button>
                  <Button type="primary" icon={<DatabaseOutlined />} onClick={() => navigate('/datasource')}>前往数据源管理</Button>
                </Space>
              )}
            >
              <Space style={{ marginBottom: 16 }} wrap>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 140 }}
                  options={[
                    { value: 'all', label: '全部状态' },
                    { value: 'Active', label: '正常' },
                    { value: 'Syncing', label: '同步中' },
                    { value: 'Error', label: '异常' },
                    { value: 'Inactive', label: '未启用' },
                  ]}
                />
                <Select
                  value={sourceTypeFilter}
                  onChange={setSourceTypeFilter}
                  style={{ width: 140 }}
                  options={[
                    { value: 'all', label: '全部来源' },
                    { value: 'structured', label: '数据库' },
                    { value: 'unstructured', label: '对象存储' },
                  ]}
                />
                <Input.Search
                  allowClear
                  placeholder="搜索任务名称 / 数据源 / 类型 / 接入目标"
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                  style={{ width: 320 }}
                />
              </Space>

              <Table
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={filteredJobs}
                pagination={false}
                locale={{ emptyText: '暂无匹配的接入任务，先到数据源管理中配置数据源' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
