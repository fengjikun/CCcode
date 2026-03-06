import { useState } from 'react'
import { Alert, Modal, Space, Typography, message } from 'antd'
import { runAiSchemaInsight } from '../../../api/projectManagement'
import type { AiInsightRun, ProjectDocument } from '../../../types/projectMvp'
import { getErrorMessage } from '../helpers'

const { Text } = Typography

interface AiInsightModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: string
  enabledDocuments: ProjectDocument[]
  aiInsightRun: AiInsightRun | null | undefined
  aiInsightBusy: boolean
}

export default function AiInsightModal({
  open,
  onClose,
  onSuccess,
  projectId,
  enabledDocuments,
  aiInsightRun,
  aiInsightBusy,
}: AiInsightModalProps) {
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    if (aiInsightBusy) return
    setRunning(true)
    try {
      const result = await runAiSchemaInsight(projectId)
      onSuccess()
      if (result.status === 'RUNNING') {
        message.success('AI洞察任务已启动')
      }
      onClose()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'AI洞察执行失败'))
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal
      title="AI洞察"
      open={open}
      onCancel={onClose}
      onOk={() => void handleRun()}
      okText="开始扫描"
      cancelText="取消"
      confirmLoading={running || aiInsightBusy}
      okButtonProps={{ disabled: enabledDocuments.length === 0 || aiInsightBusy }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Alert
          type="info"
          showIcon
          message="AI 扫描已启用文档"
          description="系统会根据文档主题自动补全建议实体类型与关系类型；同名类型不会重复创建。"
        />
        {enabledDocuments.length > 0 ? (
          <>
            <Text>当前将扫描 {enabledDocuments.length} 个启用文档：</Text>
            {aiInsightBusy && (
              <Alert
                type="info"
                showIcon
                message="AI洞察任务正在执行中"
                description={aiInsightRun?.logs?.slice(-1)?.[0] || '请稍候，系统会自动刷新任务状态。'}
              />
            )}
            <div style={{ maxHeight: 180, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
              {enabledDocuments.map(doc => (
                <div key={doc.id}>
                  <Text type="secondary">{doc.name}</Text>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Alert type="warning" showIcon message="没有启用中的文档，请先到文档管理启用文档后再执行 AI 洞察。" />
        )}
      </Space>
    </Modal>
  )
}
