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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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
      job.domainLabel,
      job.dataSourceType,
      job.ingestionModeLabel,
      job.targetLabel,
      job.outputLabel,
    ].some(value => value.toLowerCase().includes(normalizedKeyword))
  }), [jobs, keyword, sourceTypeFilter, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [keyword, sourceTypeFilter, statusFilter])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredJobs.length / pageSize))
    if (currentPage > maxPage) {
      setCurrentPage(maxPage)
    }
  }, [currentPage, filteredJobs.length, pageSize])

  const pagination = useMemo<NonNullable<TableProps<IngestionJobView>['pagination']>>(() => ({
    current: currentPage,
    pageSize,
    hideOnSinglePage: true,
    showSizeChanger: filteredJobs.length > 10,
    pageSizeOptions: ['10', '20', '50'],
    showTotal: total => `共 ${total} 条`,
    onChange: (page, nextPageSize) => {
      setCurrentPage(page)
      setPageSize(nextPageSize)
    },
  }), [currentPage, filteredJobs.length, pageSize])

  const stats = [
    { title: '任务总数', value: jobs.length, icon: <SyncOutlined />, cls: 'stat-primary' },
    { title: '在线采集', value: jobs.filter(job => job.status === 'Active' || job.status === 'Syncing').length, icon: <CheckCircleOutlined />, cls: 'stat-success' },
    { title: '实时/分钟级', value: jobs.filter(job => ['实时', '每 5 分钟', '每 15 分钟'].includes(job.scheduleLabel)).length, icon: <ClockCircleOutlined />, cls: 'stat-info' },
    { title: '异常/停用', value: jobs.filter(job => job.status === 'Error' || job.status === 'Inactive').length, icon: <WarningOutlined />, cls: 'stat-warning' },
  ]

  const columns: TableProps<IngestionJobView>['columns'] = [
    {
      title: '任务名称',
      dataIndex: 'taskName',
      key: 'taskName',
      render: (_value, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.taskName}</Text>
          <Space size={6} wrap>
            <Text type="secondary">{record.sourceName}</Text>
            <Tag color="blue">{record.domainLabel}</Tag>
          </Space>
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
      title: '接入方式',
      dataIndex: 'ingestionModeLabel',
      key: 'ingestionModeLabel',
      width: 120,
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
      title: '源端位置',
      dataIndex: 'targetLabel',
      key: 'targetLabel',
      width: 240,
      render: (value: string) => <Text type="secondary">{value}</Text>,
    },
    {
      title: '落地区域',
      dataIndex: 'outputLabel',
      key: 'outputLabel',
      width: 260,
      render: (value: string) => <Text type="secondary">{value}</Text>,
    },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <PageHeader title="数据接入任务" subtitle="面向故障诊断查看源数据采集任务，明确采什么、怎么采、落到哪里" />

        <StatCards items={stats} />

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} xl={24}>
            <Card
              title="源数据采集任务"
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
                  placeholder="搜索任务 / 业务域 / 数据源类型 / 落地区域"
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
                pagination={pagination}
                locale={{ emptyText: '暂无匹配的采集任务，先到数据源管理中配置故障诊断源数据' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
