import { useState } from 'react'
import { Form, Input, Modal, message } from 'antd'
import { publishRunVersion } from '../../../api/projectManagement'
import type { ExtractionRun, ProjectDetail } from '../../../types/projectMvp'
import { getErrorMessage } from '../helpers'

interface PublishFormData {
  label: string
  notes?: string
}

interface PublishVersionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: string
  selectedRun: ExtractionRun
  projectVersions: ProjectDetail['versions']
}

export default function PublishVersionModal({
  open,
  onClose,
  onSuccess,
  projectId,
  selectedRun,
  projectVersions,
}: PublishVersionModalProps) {
  const [form] = Form.useForm<PublishFormData>()
  const [publishing, setPublishing] = useState(false)

  const handleOpen = () => {
    form.setFieldsValue({
      label: `本体版本 v${projectVersions.length + 1}`,
      notes: '',
    })
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setPublishing(true)
      await publishRunVersion(projectId, selectedRun.id, values.label)
      message.success('本体版本已发布')
      onClose()
      form.resetFields()
      onSuccess()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error(getErrorMessage(error, '发布失败'))
    } finally {
      setPublishing(false)
    }
  }

  const handleCancel = () => {
    onClose()
    form.resetFields()
  }

  return (
    <Modal
      title="发布本体版本"
      open={open}
      onCancel={handleCancel}
      onOk={() => void handleOk()}
      okText="确认发布"
      cancelText="取消"
      confirmLoading={publishing}
      afterOpenChange={(visible) => { if (visible) handleOpen() }}
    >
      <Form<PublishFormData> form={form} layout="vertical">
        <Form.Item
          name="label"
          label="版本标签"
          rules={[{ required: true, message: '请输入版本标签' }]}
        >
          <Input placeholder="例如：v3-新增回零失败场景" maxLength={80} />
        </Form.Item>
        <Form.Item name="notes" label="发布说明（可选）">
          <Input.TextArea rows={4} placeholder="例如：本次新增 C 型设备场景，补充3条关系定义。" maxLength={300} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
