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
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>智能体执行日志</Title>
          <Text type="secondary">实时追踪 Agent 工具调用与推理过程</Text>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.map((log, i) => (
            <div key={i} className="log-entry">
              <Text type="secondary" style={{ fontFamily: '"Cascadia Code", Consolas, monospace', flexShrink: 0, fontSize: 12 }}>
                {log.time}
              </Text>
              <Tag color={agentColor[log.agent] || 'default'} style={{ flexShrink: 0 }}>{log.agent}</Tag>
              <span>{log.action}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
