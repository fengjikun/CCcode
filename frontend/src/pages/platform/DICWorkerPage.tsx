import { useEffect, useState } from 'react'
import {
  Badge,
  Card,
  Col,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import {
  TeamOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  PercentageOutlined,
} from '@ant-design/icons'
import { listDICWorkers, getDICStats, type DICStats } from '../../api/dicWorker'
import type { DICWorker } from '../../types/dicWorker'
import { DIC_STATUS_COLORS, DIC_CATEGORY_LABELS, DIC_CATEGORY_COLORS } from '../../types/dicWorker'

const { Title, Text, Paragraph } = Typography

export default function DICWorkerPage() {
  const [workers, setWorkers] = useState<DICWorker[]>([])
  const [stats, setStats] = useState<DICStats>({ total: 0, online: 0, busy: 0, totalTasksToday: 0, totalTasksCompleted: '' })
  const [filterCategory, setFilterCategory] = useState<string | undefined>()

  useEffect(() => {
    listDICWorkers().then(setWorkers)
    getDICStats().then(setStats)
  }, [])
  const [detailWorker, setDetailWorker] = useState<DICWorker | null>(null)

  const filtered = workers.filter(w =>
    !filterCategory || w.category === filterCategory
  )

  const statItems = [
    { title: '数字员工总数', value: stats.total, icon: <TeamOutlined />, color: '#4f46e5', bg: '#eef2ff' },
    { title: '在线', value: stats.online, icon: <CheckCircleOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: '忙碌中', value: stats.busy, icon: <SyncOutlined />, color: '#0891b2', bg: '#ecfeff' },
    { title: '今日任务', value: stats.totalTasksToday, icon: <ThunderboltOutlined />, color: '#d97706', bg: '#fffbeb' },
    { title: '累计完成', value: stats.totalTasksCompleted, icon: <DashboardOutlined />, color: '#7c3aed', bg: '#f5f3ff' },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>DIC 数字员工空间</Title>
          <Text type="secondary">L7 内部 AI 数字员工 — 面向数据工程与平台运维的智能化工作助手</Text>
        </div>

        {/* 统计 */}
        <Row gutter={[14, 14]} style={{ margin: '16px 0 20px' }}>
          {statItems.map(s => (
            <Col flex={1} key={s.title}>
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

        {/* 分类筛选 */}
        <div style={{ marginBottom: 16 }}>
          <Select
            value={filterCategory}
            onChange={setFilterCategory}
            allowClear
            placeholder="筛选类别"
            style={{ width: 160 }}
            size="small"
            options={Object.entries(DIC_CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          />
        </div>

        {/* Worker 卡片网格 */}
        <Row gutter={[16, 16]}>
          {filtered.map(w => (
            <Col span={8} key={w.key}>
              <Badge.Ribbon
                text={w.status}
                color={DIC_STATUS_COLORS[w.status]}
              >
                <Card
                  hoverable
                  size="small"
                  style={{ height: '100%' }}
                  onClick={() => setDetailWorker(w)}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 32 }}>{w.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 14 }}>{w.name}</Text>
                      <br />
                      <Tag color={DIC_CATEGORY_COLORS[w.category]} style={{ fontSize: 10, marginTop: 4 }}>
                        {DIC_CATEGORY_LABELS[w.category]}
                      </Tag>
                      <Paragraph
                        type="secondary"
                        style={{ fontSize: 12, margin: '8px 0 0', lineHeight: 1.6 }}
                        ellipsis={{ rows: 2 }}
                      >
                        {w.description}
                      </Paragraph>
                      <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 11, color: '#8c8c8c' }}>
                        <span><ThunderboltOutlined /> 今日 {w.tasksToday}</span>
                        <span><ClockCircleOutlined /> {w.avgResponseTime}</span>
                        <span><PercentageOutlined /> {w.successRate}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Badge.Ribbon>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={detailWorker ? <span>{detailWorker.icon} {detailWorker.name}</span> : ''}
        open={!!detailWorker}
        onCancel={() => setDetailWorker(null)}
        footer={null}
        width={560}
        destroyOnClose
      >
        {detailWorker && (
          <>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <span style={{ fontSize: 48 }}>{detailWorker.icon}</span>
              <Title level={4} style={{ margin: '8px 0 4px' }}>{detailWorker.name}</Title>
              <Space>
                <Tag color={DIC_CATEGORY_COLORS[detailWorker.category]}>{DIC_CATEGORY_LABELS[detailWorker.category]}</Tag>
                <Tag color={DIC_STATUS_COLORS[detailWorker.status]}>{detailWorker.status}</Tag>
              </Space>
              <Paragraph type="secondary" style={{ margin: '12px auto 0', maxWidth: 400 }}>
                {detailWorker.description}
              </Paragraph>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic title="累计任务" value={detailWorker.tasksCompleted.toLocaleString()} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic title="今日任务" value={detailWorker.tasksToday} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic title="成功率" value={detailWorker.successRate} />
                </Card>
              </Col>
            </Row>

            <Card size="small" title={<span><ToolOutlined /> 技能列表</span>} style={{ marginBottom: 16 }}>
              <Space wrap>
                {detailWorker.skills.map(s => <Tag key={s} color="blue">{s}</Tag>)}
              </Space>
            </Card>

            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              <Space split={<span>·</span>}>
                <span>平均响应 {detailWorker.avgResponseTime}</span>
                <span>最近活跃 {detailWorker.lastActive}</span>
                <span>ID: {detailWorker.id}</span>
              </Space>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
