import { ToolOutlined } from '@ant-design/icons'
import PlaceholderPage from './PlaceholderPage'

export default function DICWorkerPage() {
  return (
    <PlaceholderPage
      icon={<ToolOutlined />}
      title="DIC 数字员工空间"
      subtitle="DIC Worker Space — 内部工具型数字员工"
      pipelineLevel="L7 数字员工应用"
      description="面向数据工程和平台运维的内部数字员工。包括本体建模助手、数据质量巡检员、知识图谱维护员等，帮助平台团队提升工作效率。"
      features={[
        { title: '本体建模助手', desc: 'AI 辅助本体设计，自动推荐实体类型、关系和属性', priority: 'P0' },
        { title: '数据质量巡检', desc: '自动巡检数据源质量，生成异常报告和修复建议', priority: 'P1' },
        { title: '知识图谱维护', desc: '自动发现实体冲突、关系缺失，辅助图谱优化', priority: 'P1' },
        { title: 'Schema 迁移助手', desc: '本体版本升级时自动生成迁移脚本和影响分析', priority: 'P2' },
        { title: '文档生成', desc: '从本体定义自动生成技术文档和 API 说明', priority: 'P2' },
        { title: '运维监控', desc: '平台健康度巡检、资源使用告警、性能优化建议', priority: 'P2' },
      ]}
    />
  )
}
