import { Card, Col, Row, Statistic, Tag, Typography, Timeline } from 'antd'
import {
  DatabaseOutlined,
  SwapOutlined,
  ApartmentOutlined,
  RobotOutlined,
  ExperimentOutlined,
  ApiOutlined,
  TeamOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

const pipelineLevels = [
  { key: 'L1', label: '数据源接入', icon: <DatabaseOutlined />, color: '#52c41a', count: 3, status: '运行中' },
  { key: 'L2', label: '数据转换', icon: <SwapOutlined />, color: '#faad14', count: 0, status: '待建设' },
  { key: 'L3', label: '本体语义层', icon: <ApartmentOutlined />, color: '#1677ff', count: 5, status: '运行中' },
  { key: 'L4', label: 'Co-worker平台', icon: <RobotOutlined />, color: '#722ed1', count: 2, status: '运行中' },
  { key: 'L5', label: '模型训练', icon: <ExperimentOutlined />, color: '#faad14', count: 0, status: '待建设' },
  { key: 'L6', label: '模型网关', icon: <ApiOutlined />, color: '#faad14', count: 0, status: '待建设' },
  { key: 'L7', label: '数字员工应用', icon: <TeamOutlined />, color: '#13c2c2', count: 4, status: '运行中' },
]

const recentActivities = [
  { color: 'green' as const, children: '本体项目「电梯故障诊断」发布版本 v2.1' },
  { color: 'blue' as const, children: '数字员工「设备故障诊断助手」完成 12 次对话' },
  { color: 'blue' as const, children: '数据源「MySQL-生产库」同步成功，新增 1,234 条记录' },
  { color: 'gray' as const, children: '智能体「BOM分析专家」更新 Skill 配置' },
  { color: 'green' as const, children: '本体项目「供应链管理」Schema 洞察完成' },
]

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 20 }}>流水线全景</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {pipelineLevels.map((p) => (
          <Col xs={12} sm={8} md={6} lg={3} key={p.key}>
            <Card size="small" hoverable style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, color: p.color, marginBottom: 4 }}>{p.icon}</div>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{p.key} {p.label}</span>}
                value={p.count}
                suffix="项"
                valueStyle={{ fontSize: 20 }}
              />
              <Tag
                color={p.status === '运行中' ? 'green' : 'default'}
                style={{ marginTop: 4 }}
              >
                {p.status}
              </Tag>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card title="平台健康度" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="活跃项目" value={5} suffix="个" />
              </Col>
              <Col span={8}>
                <Statistic title="今日 Agent 调用" value={47} suffix="次" />
              </Col>
              <Col span={8}>
                <Statistic title="本体实体总量" value={1283} />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}>
                <Statistic title="已注册 Skills" value={8} suffix="个" />
              </Col>
              <Col span={8}>
                <Statistic title="数字员工" value={4} suffix="个" />
              </Col>
              <Col span={8}>
                <Statistic title="模型服务" value={1} suffix="个" />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="最近活动" size="small">
            <Timeline items={recentActivities} style={{ marginTop: 12 }} />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginTop: 16, textAlign: 'center' }}>
        <Text type="secondary">
          DeepexiOS v2.0 — Intelligent Business Operating Platform
        </Text>
      </Card>
    </div>
  )
}
