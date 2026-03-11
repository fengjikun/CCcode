import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  Col,
  Pagination,
  Row,
  Select,
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
  EditOutlined,
  PercentageOutlined,
} from '@ant-design/icons'
import { listDICWorkers, getDICStats, type DICStats } from '../../api/dicWorker'
import type { DICWorker } from '../../types/dicWorker'
import { DIC_STATUS_COLORS, DIC_CATEGORY_LABELS, DIC_CATEGORY_COLORS } from '../../types/dicWorker'

const { Title, Text, Paragraph } = Typography
const PAGE_SIZE = 6

export default function DICWorkerPage() {
  const [workers, setWorkers] = useState<DICWorker[]>([])
  const [stats, setStats] = useState<DICStats>({ total: 0, online: 0, busy: 0, totalTasksToday: 0, totalTasksCompleted: '' })
  const [filterCategory, setFilterCategory] = useState<string | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    listDICWorkers().then(setWorkers)
    getDICStats().then(setStats)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterCategory])

  const filtered = workers.filter(w =>
    !filterCategory || w.category === filterCategory
  )
  const paginatedWorkers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const statItems = [
    { title: 'AI员工总数', value: stats.total, icon: <TeamOutlined />, color: '#4f46e5', bg: '#eef2ff' },
    { title: '在线', value: stats.online, icon: <CheckCircleOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: '忙碌中', value: stats.busy, icon: <SyncOutlined />, color: '#0891b2', bg: '#ecfeff' },
    { title: '今日任务', value: stats.totalTasksToday, icon: <ThunderboltOutlined />, color: '#d97706', bg: '#fffbeb' },
    { title: '累计完成', value: stats.totalTasksCompleted, icon: <DashboardOutlined />, color: '#7c3aed', bg: '#f5f3ff' },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>技术AI员工空间</Title>
          <Text type="secondary">面向数据工程与平台运维的智能化工作助手，统一查看运行状态、任务表现与专长分布</Text>
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
          {paginatedWorkers.map(w => (
            <Col span={8} key={w.key}>
              <Badge.Ribbon
                text={w.status}
                color={DIC_STATUS_COLORS[w.status]}
              >
                <Card
                  hoverable
                  size="small"
                  style={{ height: '100%' }}
                  onClick={() => navigate(`/digital-worker/dic/${w.id}`)}
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
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        style={{ paddingInline: 0, marginTop: 10 }}
                        onClick={(event) => {
                          event.stopPropagation()
                          navigate(`/digital-worker/dic/${w.id}`)
                        }}
                      >
                        进入编辑页
                      </Button>
                    </div>
                  </div>
                </Card>
              </Badge.Ribbon>
            </Col>
          ))}
        </Row>

        {filtered.length > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              showSizeChanger={false}
              showTotal={(total) => `共 ${total} 个技术AI员工`}
              onChange={setCurrentPage}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
