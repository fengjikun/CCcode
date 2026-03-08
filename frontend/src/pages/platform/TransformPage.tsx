import { SwapOutlined } from '@ant-design/icons'
import PlaceholderPage from './PlaceholderPage'

export default function TransformPage() {
  return (
    <PlaceholderPage
      icon={<SwapOutlined />}
      title="数据转换"
      subtitle="Transform Project — 跨源关联、聚合与规范化"
      pipelineLevel="L2 数据转换"
      description="从多个数据源导入清洗后数据，进行跨源关联、查找表扩展、规范化和聚合，产出可复用的规范数据集供本体层使用。"
      features={[
        { title: '可视化管道编辑', desc: '拖拽式 Pipeline 设计器，节点化定义转换步骤（DAG）', priority: 'P0' },
        { title: '跨源 JOIN', desc: '支持多数据源关联查询，字段映射和类型转换', priority: 'P0' },
        { title: '聚合与窗口', desc: '分组聚合、滚动窗口计算、去重与过滤', priority: 'P0' },
        { title: '代码仓库', desc: 'Python/SQL 转换逻辑版本管理，支持 Git 集成', priority: 'P1' },
        { title: '中间数据集', desc: '转换中间结果持久化，支持预览和回溯', priority: 'P1' },
        { title: '管道测试', desc: '数据质量断言、管道健康检查、异常告警', priority: 'P1' },
      ]}
    />
  )
}
