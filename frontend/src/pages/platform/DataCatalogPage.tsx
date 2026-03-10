import {
  DatabaseOutlined,
  SearchOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import DataPlatformSectionPage from './DataPlatformSectionPage'

export default function DataCatalogPage() {
  return (
    <DataPlatformSectionPage
      title="数据目录"
      subtitle="沉淀数据集、表、字段和标签的统一目录，支撑找数、懂数和协同复用"
      statusText="规划中"
      stats={[
        { title: '登记资产', value: 128, icon: <DatabaseOutlined />, cls: 'stat-primary' },
        { title: '主题域', value: 9, icon: <TagsOutlined />, cls: 'stat-info' },
        { title: '搜索热词', value: 24, icon: <SearchOutlined />, cls: 'stat-success' },
      ]}
      features={[
        {
          title: '统一检索',
          description: '支持按数据集、表、字段、业务标签和负责人检索，降低跨团队找数成本。',
          tags: ['数据集', '字段', '负责人'],
        },
        {
          title: '元数据画像',
          description: '展示来源系统、刷新频率、样例值、血缘摘要和使用热度，帮助快速判断可用性。',
          tags: ['样例', '刷新频率', '热度'],
        },
        {
          title: '协作入口',
          description: '为申请权限、共享说明、问题反馈和变更通知提供统一入口，减少口头沟通依赖。',
          tags: ['申请', '反馈', '订阅'],
        },
      ]}
      milestones={[
        '优先把数据源与数据集准备的产物纳入统一目录。',
        '补充字段级标签和搜索排序策略。',
        '接入权限申请和变更订阅能力。',
      ]}
    />
  )
}
