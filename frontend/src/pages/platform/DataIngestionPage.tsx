import { useMemo, useState } from 'react'
import {
  Alert,
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
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import PageHeader from '../../components/shared/PageHeader'
import StatCards from '../../components/shared/StatCards'

const { Text } = Typography

type JobStatus = '运行中' | '成功' | '失败' | '待执行'
type JobMode = 'FULL' | 'INCREMENTAL' | 'CDC' | 'API'

interface IngestionJob {
  id: string
  name: string
  source: string
  sourceType: '数据库' | '对象存储' | 'API'
  mode: JobMode
  schedule: string
  status: JobStatus
  lastRun: string
  rows: string
  latency: string
  owner: string
}

const STATUS_COLORS: Record<JobStatus, string> = {
  运行中: 'processing',
  成功: 'success',
  失败: 'error',
  待执行: 'default',
}

const JOBS: IngestionJob[] = [
  {
    id: 'job_erp_sales',
    name: 'ERP 销售订单增量同步',
    source: 'SAP ERP Production',
    sourceType: '数据库',
    mode: 'INCREMENTAL',
    schedule: '每 10 分钟',
    status: '运行中',
    lastRun: '2026-03-10 19:45',
    rows: '84.2k',
    latency: '38s',
    owner: '数据平台组',
  },
  {
    id: 'job_crm_customer',
    name: 'CRM 客户主数据全量校准',
    source: 'Salesforce CN',
    sourceType: 'API',
    mode: 'FULL',
    schedule: '每日 02:00',
    status: '成功',
    lastRun: '2026-03-10 02:03',
    rows: '12.6k',
    latency: '4m 12s',
    owner: '主数据团队',
  },
  {
    id: 'job_iot_device',
    name: '设备遥测 CDC 同步',
    source: 'IoT Telemetry Hub',
    sourceType: '数据库',
    mode: 'CDC',
    schedule: '实时',
    status: '运行中',
    lastRun: '2026-03-10 20:05',
    rows: '1.2M',
    latency: '8s',
    owner: '工业数智组',
  },
  {
    id: 'job_contract_docs',
    name: '合同文档落库任务',
    source: 'OSS Archive Bucket',
    sourceType: '对象存储',
    mode: 'FULL',
    schedule: '每小时',
    status: '失败',
    lastRun: '2026-03-10 18:00',
    rows: '3.4k',
    latency: '1m 08s',
    owner: '法务数据组',
  },
  {
    id: 'job_service_ticket',
    name: '客服工单接口采集',
    source: 'Service Desk OpenAPI',
    sourceType: 'API',
    mode: 'API',
    schedule: '每 30 分钟',
    status: '待执行',
    lastRun: '2026-03-10 19:30',
    rows: '9.8k',
    latency: '26s',
    owner: '客户运营组',
  },
]

export default function DataIngestionPage() {
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [sourceTypeFilter, setSourceTypeFilter] = useState<IngestionJob['sourceType'] | 'all'>('all')
  const [keyword, setKeyword] = useState('')

  const filteredJobs = useMemo(() => JOBS.filter(job => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false
    if (sourceTypeFilter !== 'all' && job.sourceType !== sourceTypeFilter) return false
    if (!keyword) return true

    const normalizedKeyword = keyword.toLowerCase()
    return [
      job.name,
      job.source,
      job.owner,
      job.mode,
    ].some(value => value.toLowerCase().includes(normalizedKeyword))
  }), [keyword, sourceTypeFilter, statusFilter])

  const stats = [
    { title: '任务总数', value: JOBS.length, icon: <SyncOutlined />, cls: 'stat-primary' },
    { title: '运行中', value: JOBS.filter(job => job.status === '运行中').length, icon: <ClockCircleOutlined />, cls: 'stat-info' },
    { title: '今日成功', value: JOBS.filter(job => job.status === '成功').length, icon: <CheckCircleOutlined />, cls: 'stat-success' },
    { title: '失败告警', value: JOBS.filter(job => job.status === '失败').length, icon: <WarningOutlined />, cls: 'stat-warning' },
  ]

  const columns: TableProps<IngestionJob>['columns'] = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (_value, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.name}</Text>
          <Text type="secondary">{record.source}</Text>
        </Space>
      ),
    },
    {
      title: '来源类型',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 120,
      render: (value: IngestionJob['sourceType']) => (
        <Tag icon={value === '数据库' ? <DatabaseOutlined /> : <ApiOutlined />}>{value}</Tag>
      ),
    },
    {
      title: '同步模式',
      dataIndex: 'mode',
      key: 'mode',
      width: 120,
      render: (value: JobMode) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: '调度周期',
      dataIndex: 'schedule',
      key: 'schedule',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (value: JobStatus) => <Tag color={STATUS_COLORS[value]}>{value}</Tag>,
    },
    {
      title: '最近执行',
      dataIndex: 'lastRun',
      key: 'lastRun',
      width: 160,
    },
    {
      title: '处理量',
      dataIndex: 'rows',
      key: 'rows',
      width: 100,
    },
    {
      title: '耗时',
      dataIndex: 'latency',
      key: 'latency',
      width: 100,
    },
    {
      title: '责任人',
      dataIndex: 'owner',
      key: 'owner',
      width: 120,
    },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <PageHeader title="数据接入任务" subtitle="统一查看采集调度、同步状态、失败重试与增量水位，作为数据平台的运行看板入口" />

        <StatCards items={stats} />

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} xl={24}>
            <Card
              title="接入任务列表"
              extra={(
                <Space>
                  <Button icon={<ReloadOutlined />}>刷新状态</Button>
                  <Button type="primary" icon={<SyncOutlined />}>新建接入任务</Button>
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
                    { value: '运行中', label: '运行中' },
                    { value: '成功', label: '成功' },
                    { value: '失败', label: '失败' },
                    { value: '待执行', label: '待执行' },
                  ]}
                />
                <Select
                  value={sourceTypeFilter}
                  onChange={setSourceTypeFilter}
                  style={{ width: 140 }}
                  options={[
                    { value: 'all', label: '全部来源' },
                    { value: '数据库', label: '数据库' },
                    { value: '对象存储', label: '对象存储' },
                    { value: 'API', label: 'API' },
                  ]}
                />
                <Input.Search
                  allowClear
                  placeholder="搜索任务名称 / 数据源 / 责任人"
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                  style={{ width: 280 }}
                />
              </Space>

              <Table
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={filteredJobs}
                pagination={false}
                locale={{ emptyText: '暂无匹配的接入任务' }}
              />
            </Card>
          </Col>

        </Row>
      </Card>
    </div>
  )
}
