import { useMemo, useState } from 'react'
import { Card, Col, Input, Row, Select, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd'
import {
  SearchOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons'
import { getAgentLogs, getAgentNames, getAgentColor, getLogStats } from '../../api/agentLog'
import type { AgentLog, LogLevel } from '../../types/agentLog'
import { LOG_LEVEL_COLORS, LOG_LEVEL_LABELS } from '../../types/agentLog'

const { Title, Text } = Typography

const LEVEL_ICONS: Record<LogLevel, React.ReactNode> = {
  info: <InfoCircleOutlined />,
  success: <CheckCircleOutlined />,
  warning: <WarningOutlined />,
  error: <CloseCircleOutlined />,
}

export default function AgentLogsPage() {
  const [agentFilter, setAgentFilter] = useState<string | undefined>()
  const [levelFilter, setLevelFilter] = useState<LogLevel | undefined>()
  const [keyword, setKeyword] = useState('')

  const agentNames = useMemo(() => getAgentNames(), [])
  const stats = useMemo(() => getLogStats(), [])
  const logs = useMemo(
    () => getAgentLogs({ agentName: agentFilter, level: levelFilter, keyword }),
    [agentFilter, levelFilter, keyword],
  )

  const columns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 160,
      render: (v: string) => (
        <Text type="secondary" style={{ fontFamily: '"Cascadia Code", Consolas, monospace', fontSize: 12 }}>
          {v}
        </Text>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (v: LogLevel) => (
        <Tag icon={LEVEL_ICONS[v]} color={LOG_LEVEL_COLORS[v]}>{LOG_LEVEL_LABELS[v]}</Tag>
      ),
    },
    {
      title: 'Agent',
      dataIndex: 'agentName',
      key: 'agentName',
      width: 140,
      render: (v: string) => <Tag color={getAgentColor(v)}>{v}</Tag>,
    },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      width: 300,
      render: (v: string) => v ? (
        <Tooltip title={v}>
          <Text type="secondary" style={{ fontSize: 12 }}>{v.length > 50 ? v.slice(0, 50) + '...' : v}</Text>
        </Tooltip>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (v: number | undefined) => v ? (
        <Text style={{ fontSize: 12 }}>{v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`}</Text>
      ) : '—',
    },
    {
      title: '工具 / Skill',
      key: 'tools',
      width: 180,
      render: (_: unknown, r: AgentLog) => (
        <Space size={4} wrap>
          {r.toolsUsed?.map(t => <Tag key={t} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{t}</Tag>)}
          {r.skillUsed && <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{r.skillUsed}</Tag>}
        </Space>
      ),
    },
  ]

  const statItems = [
    { title: '日志总数', value: stats.total, icon: <ClockCircleOutlined />, cls: 'stat-primary' },
    { title: '成功', value: stats.success, icon: <CheckCircleOutlined />, cls: 'stat-success' },
    { title: '警告', value: stats.warning, icon: <WarningOutlined />, cls: 'stat-warning' },
    { title: '错误', value: stats.error, icon: <CloseCircleOutlined />, color: '#ff4d4f', cls: 'stat-primary' },
    { title: '平均耗时', value: stats.avgDuration, icon: <FieldTimeOutlined />, cls: 'stat-info' },
    { title: '活跃 Agent', value: stats.agentCount, icon: <RobotOutlined />, cls: 'stat-purple' },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>智能体执行日志</Title>
          <Text type="secondary">实时追踪 Agent 推理链路、工具调用与决策过程</Text>
        </div>

        {/* 统计 */}
        <Row gutter={[12, 12]} style={{ margin: '16px 0 20px' }}>
          {statItems.map(s => (
            <Col span={4} key={s.title}>
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

        {/* 过滤 */}
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={agentFilter}
            onChange={setAgentFilter}
            allowClear
            placeholder="筛选 Agent"
            style={{ width: 160 }}
            size="small"
            options={agentNames.map(n => ({ value: n, label: n }))}
          />
          <Select
            value={levelFilter}
            onChange={setLevelFilter}
            allowClear
            placeholder="日志级别"
            style={{ width: 120 }}
            size="small"
            options={Object.entries(LOG_LEVEL_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Input
            placeholder="搜索动作 / 详情"
            prefix={<SearchOutlined />}
            allowClear
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            style={{ width: 240 }}
            size="small"
          />
        </Space>

        <Table
          dataSource={logs}
          columns={columns}
          rowKey="key"
          pagination={logs.length > 10 ? { pageSize: 10, showTotal: t => `共 ${t} 条` } : false}
          size="small"
        />
      </Card>
    </div>
  )
}
