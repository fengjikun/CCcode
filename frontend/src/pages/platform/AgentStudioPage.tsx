import { RobotOutlined } from '@ant-design/icons'
import PlaceholderPage from './PlaceholderPage'

export default function AgentStudioPage() {
  return (
    <PlaceholderPage
      icon={<RobotOutlined />}
      title="智能体编排"
      subtitle="Agent Studio — 设计、编排与部署 AI Agent"
      pipelineLevel="L4 Co-worker平台"
      description="可视化 Agent 创建与编排平台。定义角色、System Prompt、行为规则，绑定 Ontology Action/Function/Query 为可调用工具，支持多 Agent 协作模式。"
      features={[
        { title: 'Agent 设计器', desc: '可视化配置角色定义、Prompt 模板、行为规则和参数映射', priority: 'P0' },
        { title: '工具绑定', desc: '将 Action、Function、Object Query 注册为 Agent 可调用工具', priority: 'P0' },
        { title: '多 Agent 编排', desc: '串行链、并行团、分层委派、路由分发四种协作模式', priority: 'P1' },
        { title: 'Memory 管理', desc: '短期记忆（会话内）+ 长期记忆（跨会话）+ 共享记忆', priority: 'P1' },
        { title: 'RAG 集成', desc: '向量数据库集成，文档分块 → 嵌入 → 语义检索增强', priority: 'P1' },
        { title: '部署管理', desc: 'Agent 版本发布、A/B 测试、回滚与监控告警', priority: 'P0' },
      ]}
    />
  )
}
