import { useEffect, useState } from 'react'
import { Card, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
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
import { getAgentLogs, getAgentNames, getAgentColor, getLogStats, type LogStats } from '../../api/agentLog'
import type { AgentLog, LogLevel } from '../../types/agentLog'
import { LOG_LEVEL_COLORS, LOG_LEVEL_LABELS } from '../../types/agentLog'
import PageHeader from '../../components/shared/PageHeader'
import StatCards from '../../components/shared/StatCards'

const { Text } = Typography

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

  const [agentNames, setAgentNames] = useState<string[]>([])
  const [stats, setStats] = useState<LogStats>({ total: 0, success: 0, warning: 0, error: 0, avgDuration: '', agentCount: 0 })
  const [logs, setLogs] = useState<AgentLog[]>([])

  useEffect(() => {
    getAgentNames().then(setAgentNames)
    getLogStats().then(setStats)
  }, [])

  useEffect(() => {
    getAgentLogs({ agentName: agentFilter, level: levelFilter, keyword }).then(setLogs)
  }, [agentFilter, levelFilter, keyword])

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
        <Tooltip title={v.length > 80 ? v : undefined}>
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
        <PageHeader title="智能体执行日志" subtitle="查看 Agent 推理链路、工具调用与决策过程的静态日志样本" />

        <StatCards items={statItems} />

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
          expandable={{
            expandedRowRender: (record: AgentLog) => (
              <div style={{ padding: '8px 0', fontSize: 13 }}>
                {record.detail && (
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 12 }}>完整详情：</Text>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#595959', marginTop: 4 }}>{record.detail}</div>
                  </div>
                )}
                {record.toolsUsed && record.toolsUsed.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 12 }}>工具调用链：</Text>
                    <Space size={4} style={{ marginTop: 4 }} wrap>
                      {record.toolsUsed.map(t => <Tag key={t}>{t}</Tag>)}
                    </Space>
                  </div>
                )}
                {record.duration !== undefined && (
                  <div style={{ marginTop: 4 }}>
                    <Text strong style={{ fontSize: 12 }}>耗时：</Text>
                    <Text>{record.duration >= 1000 ? `${(record.duration / 1000).toFixed(1)}s` : `${record.duration}ms`}</Text>
                  </div>
                )}
              </div>
            ),
            rowExpandable: (record: AgentLog) => !!(record.detail || (record.toolsUsed && record.toolsUsed.length > 0)),
          }}
        />
      </Card>
    </div>
  )
}
