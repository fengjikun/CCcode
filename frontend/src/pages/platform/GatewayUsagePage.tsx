import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  Col,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  BarChartOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  WarningOutlined,
} from '@ant-design/icons'

import {
  getGatewayUsageSummary,
  getHourlyTraffic,
  getRecentErrors,
  listApiKeys,
  listModels,
  listUsageLogs,
} from '../../api/modelGateway'
import PageHeader from '../../components/shared/PageHeader'
import { MODEL_CENTER_PAGE_LABELS, MODEL_GATEWAY_PAGE_LABELS } from '../../types/modelCenter'
import type { HourlyTraffic, RecentError } from '../../api/modelGateway'
import type { GatewayApiKey, GatewayUsageLog, GatewayUsageSummary, RegisteredModel } from '../../types/modelGateway'

const { Text } = Typography

const STATUS_COLORS: Record<GatewayUsageLog['status'], string> = {
  Success: 'green',
  ClientError: 'orange',
  RateLimited: 'gold',
  ServerError: 'red',
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return `${value}`
}

export default function GatewayUsagePage() {
  const [summary, setSummary] = useState<GatewayUsageSummary>({
    totalRequests: 0,
    successRate: '—',
    avgLatency: '—',
    p95Latency: '—',
    totalTokens: 0,
    activeApiKeys: 0,
  })
  const [hourlyTraffic, setHourlyTraffic] = useState<HourlyTraffic[]>([])
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([])
  const [usageLogs, setUsageLogs] = useState<GatewayUsageLog[]>([])
  const [apiKeys, setApiKeys] = useState<GatewayApiKey[]>([])
  const [models, setModels] = useState<RegisteredModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string | undefined>()
  const [selectedKey, setSelectedKey] = useState<string | undefined>()
  const [selectedStatus, setSelectedStatus] = useState<GatewayUsageLog['status'] | undefined>()

  useEffect(() => {
    void getGatewayUsageSummary().then(setSummary)
    void getHourlyTraffic().then(setHourlyTraffic)
    void getRecentErrors().then(setRecentErrors)
    void listUsageLogs().then(setUsageLogs)
    void listApiKeys().then(setApiKeys)
    void listModels().then(setModels)
  }, [])

  const filteredLogs = useMemo(
    () => usageLogs.filter(log => {
      if (selectedModel && log.model !== selectedModel) return false
      if (selectedKey && log.apiKeyName !== selectedKey) return false
      if (selectedStatus && log.status !== selectedStatus) return false
      return true
    }),
    [selectedKey, selectedModel, selectedStatus, usageLogs],
  )

  const topConsumers = useMemo(() => {
    const bucket = new Map<string, { requests: number; tokens: number; errors: number }>()
    for (const log of usageLogs) {
      const current = bucket.get(log.apiKeyName) ?? { requests: 0, tokens: 0, errors: 0 }
      current.requests += 1
      current.tokens += log.inputTokens + log.outputTokens
      if (log.status !== 'Success') current.errors += 1
      bucket.set(log.apiKeyName, current)
    }

    return [...bucket.entries()]
      .map(([name, value]) => ({
        name,
        requests: value.requests,
        tokens: value.tokens,
        errorRate: `${((value.errors / Math.max(value.requests, 1)) * 100).toFixed(1)}%`,
      }))
      .sort((left, right) => right.requests - left.requests)
      .slice(0, 5)
  }, [usageLogs])

  const maxTraffic = Math.max(1, ...hourlyTraffic.map(item => item.requests))

  const logColumns = [
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 170 },
    { title: 'Request ID', dataIndex: 'requestId', key: 'requestId', render: (value: string) => <Text code>{value}</Text> },
    { title: '入口', dataIndex: 'routePath', key: 'routePath', render: (value: string) => <Text code>{value}</Text> },
    { title: '模型', dataIndex: 'model', key: 'model', width: 220 },
    { title: 'API Key', dataIndex: 'apiKeyName', key: 'apiKeyName', width: 180 },
    { title: '调用方', dataIndex: 'requester', key: 'requester', width: 160 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: GatewayUsageLog['status'], record: GatewayUsageLog) => (
        <Tag color={STATUS_COLORS[value]}>{`${value} / ${record.httpStatus}`}</Tag>
      ),
    },
    { title: '延迟', dataIndex: 'latencyMs', key: 'latencyMs', width: 100, render: (value: number) => `${value} ms` },
    {
      title: 'Tokens',
      key: 'tokens',
      width: 120,
      render: (_: unknown, record: GatewayUsageLog) => `${record.inputTokens + record.outputTokens}`,
    },
    {
      title: '日志',
      key: 'errorMessage',
      render: (_: unknown, record: GatewayUsageLog) => (
        <Text type={record.errorMessage ? 'danger' : 'secondary'}>
          {record.errorMessage ?? '请求完成'}
        </Text>
      ),
    },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title={MODEL_GATEWAY_PAGE_LABELS.usage}
        subtitle={`${MODEL_CENTER_PAGE_LABELS.gateway}的调用指标、错误分布与请求日志分析。`}
      />

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Row gutter={[14, 14]}>
          <Col span={4}>
            <Card size="small">
              <Text type="secondary">总请求数</Text>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.totalRequests}</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Text type="secondary">成功率</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a' }}>{summary.successRate}</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Text type="secondary">平均延迟</Text>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.avgLatency}</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Text type="secondary">P95 延迟</Text>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.p95Latency}</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Text type="secondary">总 Tokens</Text>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{formatTokenCount(summary.totalTokens)}</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Text type="secondary">活跃 Key</Text>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.activeApiKeys}</div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={10}>
            <Card size="small" title="小时流量" extra={<BarChartOutlined />}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {hourlyTraffic.map(item => (
                  <div key={item.hour}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text>{item.hour}</Text>
                      <Text type="secondary">{item.requests} requests</Text>
                    </Space>
                    <div style={{ height: 8, borderRadius: 999, background: '#f3f4f6', overflow: 'hidden' }}>
                      <div style={{ width: `${(item.requests / maxTraffic) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #1677ff 0%, #36cfc9 100%)' }} />
                    </div>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
          <Col span={7}>
            <Card size="small" title="高频调用方" extra={<ClockCircleOutlined />}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {topConsumers.map(item => (
                  <div key={item.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <Text strong>{item.name}</Text>
                      <Text type="secondary">{item.requests} 次</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <Text type="secondary">{formatTokenCount(item.tokens)} tokens</Text>
                      <Text type="secondary">错误率 {item.errorRate}</Text>
                    </div>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
          <Col span={7}>
            <Card size="small" title="最近错误" extra={<WarningOutlined />}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {recentErrors.map(error => (
                  <Card key={error.key} size="small" styles={{ body: { padding: 12 } }}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space size={8}>
                        <WarningOutlined style={{ color: '#f59e0b' }} />
                        <Text strong>{error.model}</Text>
                        <Tag>{error.errorCode}</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>{error.time}</Text>
                      <Text style={{ fontSize: 12 }}>{error.errorMessage}</Text>
                    </Space>
                  </Card>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>

        <Card
          size="small"
          title="调用日志"
          extra={(
            <Space wrap size={8}>
              <Select
                allowClear
                placeholder="筛选模型"
                style={{ width: 180 }}
                value={selectedModel}
                onChange={value => setSelectedModel(value)}
                options={models.map(model => ({ label: model.name, value: model.name }))}
              />
              <Select
                allowClear
                placeholder="筛选 API Key"
                style={{ width: 180 }}
                value={selectedKey}
                onChange={value => setSelectedKey(value)}
                options={apiKeys.map(key => ({ label: key.name, value: key.name }))}
              />
              <Select
                allowClear
                placeholder="筛选状态"
                style={{ width: 150 }}
                value={selectedStatus}
                onChange={value => setSelectedStatus(value)}
                options={[
                  { label: 'Success', value: 'Success' },
                  { label: 'ClientError', value: 'ClientError' },
                  { label: 'RateLimited', value: 'RateLimited' },
                  { label: 'ServerError', value: 'ServerError' },
                ]}
              />
            </Space>
          )}
        >
          <Table
            dataSource={filteredLogs}
            columns={logColumns}
            rowKey="key"
            size="small"
            pagination={{ pageSize: 8 }}
            scroll={{ x: 1400 }}
          />
          <Space style={{ marginTop: 12 }}>
            <FileSearchOutlined />
            <Text type="secondary">已展示 {filteredLogs.length} 条请求日志，支持按模型、API Key、状态筛选。</Text>
          </Space>
        </Card>
      </Space>
    </div>
  )
}
