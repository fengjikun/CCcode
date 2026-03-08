import { FileSearchOutlined } from '@ant-design/icons'
import PlaceholderPage from './PlaceholderPage'

export default function AgentLogsPage() {
  return (
    <PlaceholderPage
      icon={<FileSearchOutlined />}
      title="智能体日志"
      subtitle="Agent Logs — 运行追踪与质量评估"
      pipelineLevel="L4 Co-worker平台"
      description="Agent 运行全链路追踪。记录每次对话的工具调用链、推理过程、响应质量，支持回放分析和性能优化。"
      features={[
        { title: '对话追踪', desc: '完整记录 Agent 对话流程，含工具调用、推理步骤、最终回复', priority: 'P0' },
        { title: '工具调用分析', desc: '统计工具调用频次、成功率、延迟分布', priority: 'P0' },
        { title: '质量评估', desc: 'Agent 响应质量评分、工具调用准确率、安全性测试', priority: 'P0' },
        { title: '异常告警', desc: '工具调用失败、超时、循环调用等异常自动告警', priority: 'P1' },
        { title: '对话回放', desc: '逐步回放 Agent 推理过程，支持标注和评审', priority: 'P1' },
        { title: '性能报表', desc: '按时间/Agent/工具维度的性能统计与趋势图', priority: 'P2' },
      ]}
    />
  )
}
