import { ApiOutlined } from '@ant-design/icons'
import PlaceholderPage from './PlaceholderPage'

export default function ModelGatewayPage() {
  return (
    <PlaceholderPage
      icon={<ApiOutlined />}
      title="模型网关"
      subtitle="Model Gateway — 统一推理入口、路由与监控"
      pipelineLevel="L6 模型网关"
      description="模型能力的统一发布入口。屏蔽底层模型实现差异（自训练模型、第三方 LLM、微调模型），向上层 Agent 和 Workflow 提供统一的调用接口。"
      features={[
        { title: '统一 API 接口', desc: '标准化 REST 推理接口，屏蔽底层模型实现差异', priority: 'P0' },
        { title: '智能路由', desc: '按模型名+版本路由，支持灰度发布、A/B 测试', priority: 'P0' },
        { title: '限流熔断', desc: '按租户/用户/API Key 请求速率限制，防级联失败', priority: 'P0' },
        { title: 'Token 用量追踪', desc: '每次调用记录 Token 消耗，按用户/项目统计费用', priority: 'P0' },
        { title: '语义缓存', desc: '相似请求命中缓存，减少重复 LLM 调用成本', priority: 'P1' },
        { title: '内容安全', desc: '输入/输出内容过滤：PII 脱敏、有害内容拦截', priority: 'P0' },
      ]}
    />
  )
}
