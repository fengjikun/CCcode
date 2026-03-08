import { AppstoreOutlined } from '@ant-design/icons'
import PlaceholderPage from './PlaceholderPage'

export default function SkillsMarketPage() {
  return (
    <PlaceholderPage
      icon={<AppstoreOutlined />}
      title="Skills 广场"
      subtitle="Skills Market — Action/Function/Skill 注册与管理"
      pipelineLevel="L4 Co-worker平台"
      description="统一管理平台所有可复用能力。将 Ontology Action、Function 和自定义 Skill 注册为标准化工具，供 Agent 和工作流调用。支持发布、搜索、评分和版本管理。"
      features={[
        { title: 'Action 注册', desc: '将本体 Action 注册为标准工具，配置参数映射和权限', priority: 'P0' },
        { title: 'Function 注册', desc: '将 Python/Groovy 函数注册为可调用工具', priority: 'P0' },
        { title: 'Skill 包管理', desc: '上传、审核、版本管理自定义 Skill 包（ZIP）', priority: 'P0' },
        { title: 'Skills 广场', desc: '统一搜索、浏览、评分所有已注册 Skill', priority: 'P1' },
        { title: '分类与标签', desc: '按业务域、能力类型、适用场景分类管理', priority: 'P1' },
        { title: '调用统计', desc: '每个 Skill 的调用频次、成功率和用户反馈', priority: 'P2' },
      ]}
    />
  )
}
