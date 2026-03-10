import {
  CheckCircleOutlined,
  RadarChartOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import DataPlatformSectionPage from './DataPlatformSectionPage'

export default function DataQualityPage() {
  return (
    <DataPlatformSectionPage
      title="数据质量"
      subtitle="围绕完整性、准确性、一致性和时效性建立规则中心与质量看板"
      statusText="规划中"
      stats={[
        { title: '质量规则', value: 36, icon: <RadarChartOutlined />, cls: 'stat-primary' },
        { title: '覆盖数据集', value: 12, icon: <CheckCircleOutlined />, cls: 'stat-success' },
        { title: '待处理异常', value: 5, icon: <WarningOutlined />, cls: 'stat-warning' },
      ]}
      features={[
        {
          title: '规则中心',
          description: '按数据集、字段和主题域定义完整性、唯一性、枚举范围、主外键一致性等校验规则。',
          tags: ['完整性', '唯一性', '字段约束'],
        },
        {
          title: '质量监控',
          description: '任务执行后自动产出质量得分、异常分布与变化趋势，支持按任务和数据域下钻。',
          tags: ['评分', '趋势', '异常分析'],
        },
        {
          title: '异常闭环',
          description: '将失败规则和异常样本回流到接入任务或数据集准备链路，形成可追责的修复闭环。',
          tags: ['工单', '回流', '责任分派'],
        },
      ]}
      milestones={[
        '先打通接入任务执行结果与质量规则触发结果的关联。',
        '补充字段级质量画像和近 7 天波动趋势。',
        '把异常项分发到责任人和通知通道。',
      ]}
    />
  )
}
