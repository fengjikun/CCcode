import {
  AuditOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import DataPlatformSectionPage from './DataPlatformSectionPage'

export default function DataGovernancePage() {
  return (
    <DataPlatformSectionPage
      title="数据治理"
      subtitle="管理分级分类、脱敏策略、访问审计和共享流程，支撑平台化数据安全运营"
      statusText="规划中"
      stats={[
        { title: '治理策略', value: 18, icon: <SafetyCertificateOutlined />, cls: 'stat-primary' },
        { title: '审计事件', value: 243, icon: <AuditOutlined />, cls: 'stat-info' },
        { title: '敏感字段', value: 57, icon: <LockOutlined />, cls: 'stat-warning' },
      ]}
      features={[
        {
          title: '分级分类',
          description: '对数据集和字段进行敏感级别与业务分类管理，为权限和脱敏策略提供统一基线。',
          tags: ['分类分级', '敏感级别', '主题域'],
        },
        {
          title: '脱敏与共享',
          description: '按角色、场景和用途配置脱敏策略，并纳入共享申请、审批和到期回收流程。',
          tags: ['脱敏', '审批', '到期回收'],
        },
        {
          title: '访问审计',
          description: '记录关键访问、导出和变更行为，为异常访问识别和合规追踪提供依据。',
          tags: ['访问日志', '导出审计', '合规'],
        },
      ]}
      milestones={[
        '优先建立敏感字段清单和默认脱敏策略。',
        '补充权限申请、审批、回收的标准流程。',
        '将关键访问事件接入统一审计看板。',
      ]}
    />
  )
}
