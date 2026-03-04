import { Row, Col, Card, Statistic } from 'antd'
import {
  DesktopOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import type { Device } from '../../types/device'

interface DeviceStatsProps {
  devices: Device[]
}

export default function DeviceStats({ devices }: DeviceStatsProps) {
  const total = devices.length
  const online = devices.filter((d) => d.status === 'ONLINE').length
  const fault = devices.filter((d) => d.status === 'FAULT').length
  const offline = devices.filter((d) => d.status === 'OFFLINE').length

  const items = [
    {
      title: '设备总数',
      value: total,
      icon: <DesktopOutlined />,
      color: '#1890ff',
    },
    {
      title: '在线设备',
      value: online,
      icon: <CheckCircleOutlined />,
      color: '#52c41a',
    },
    {
      title: '故障设备',
      value: fault,
      icon: <WarningOutlined />,
      color: '#f5222d',
    },
    {
      title: '离线设备',
      value: offline,
      icon: <CloseCircleOutlined />,
      color: '#d9d9d9',
    },
  ]

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      {items.map((item) => (
        <Col xs={24} sm={12} md={6} key={item.title}>
          <Card hoverable>
            <Statistic
              title={item.title}
              value={item.value}
              prefix={item.icon}
              valueStyle={{ color: item.color }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
