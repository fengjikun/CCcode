import { Card, Tag, Typography } from 'antd'

const { Title, Text } = Typography

const logs = [
  { time: '2025-03-08 14:32:22', agent: 'Equipment Agent',  action: 'Executed action: CreateMaintenanceTicket', level: 'info' },
  { time: '2025-03-08 14:32:18', agent: 'Equipment Agent',  action: 'Invoked diagnostic function checkMotorHealth()', level: 'info' },
  { time: '2025-03-08 14:32:15', agent: 'Equipment Agent',  action: 'Analyzed sensor data for device #DV-8921', level: 'info' },
  { time: '2025-03-08 14:28:45', agent: 'Inventory Agent',  action: 'Executed action: CreatePurchaseOrder', level: 'success' },
  { time: '2025-03-08 14:28:43', agent: 'Inventory Agent',  action: 'Detected low stock for SKU #12345', level: 'warning' },
  { time: '2025-03-08 14:15:22', agent: 'Ontology Assistant', action: 'Validated 12 new object types', level: 'info' },
  { time: '2025-03-08 13:58:10', agent: 'Customer Agent',   action: 'Resolved ticket #TK-3342 via auto-reply', level: 'success' },
  { time: '2025-03-08 13:45:33', agent: 'Equipment Agent',  action: 'Scheduled preventive maintenance for motor #DV-7712', level: 'info' },
]

const agentColor: Record<string, string> = {
  'Equipment Agent': 'blue',
  'Inventory Agent': 'green',
  'Ontology Assistant': 'purple',
  'Customer Agent': 'cyan',
}

export default function AgentLogsPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card>
        <Title level={4} style={{ marginBottom: 4 }}>智能体执行日志</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
          实时追踪 Agent 工具调用与推理过程
        </Text>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.map((log, i) => (
            <div
              key={i}
              style={{
                padding: '10px 14px',
                borderLeft: '3px solid #667eea',
                background: '#f8f9fa',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Text type="secondary" style={{ fontFamily: 'monospace', flexShrink: 0 }}>{log.time}</Text>
              <Tag color={agentColor[log.agent] || 'default'} style={{ flexShrink: 0 }}>{log.agent}</Tag>
              <span>{log.action}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
