import { DatabaseOutlined } from '@ant-design/icons'
import PlaceholderPage from './PlaceholderPage'

export default function DataSourcePage() {
  return (
    <PlaceholderPage
      icon={<DatabaseOutlined />}
      title="数据源管理"
      subtitle="Datasource Project — 原始数据同步、清洗与标准化"
      pipelineLevel="L1 数据源接入"
      description="每个逻辑数据源对应一个 Project，完成原始数据落地、类型解析、基础清洗和 Schema 标准化。支持结构化数据库（MySQL/PostgreSQL/Oracle/ClickHouse）和非结构化文档（DOCX/XLSX/Markdown）。"
      features={[
        { title: '数据源连接', desc: '配置数据库连接、API 接入、文件上传，支持连接测试', priority: 'P0' },
        { title: '自动 Schema 推断', desc: '连接数据源后自动发现表结构、列类型和数据分布', priority: 'P0' },
        { title: '同步调度', desc: '支持全量/增量模式，定时自动同步（Cron），断点续传', priority: 'P0' },
        { title: '数据清洗规则', desc: '空值处理、类型解析、格式统一、去重规则配置', priority: 'P1' },
        { title: '数据质量报告', desc: '空值率、类型一致性、异常值检测、数据量级统计', priority: 'P1' },
        { title: '数据血缘追踪', desc: '记录数据从源系统到清洗后数据集的完整链路', priority: 'P2' },
      ]}
    />
  )
}
