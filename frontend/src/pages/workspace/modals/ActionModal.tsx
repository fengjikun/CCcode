import { useState } from 'react'
import { Form, Input, Modal, Select, message } from 'antd'
import { createProjectAction } from '../../../api/projectManagement'
import type { ActionStatus } from '../../../types/projectMvp'
import { getErrorMessage } from '../helpers'

interface ActionFormData {
  name: string
  description?: string
  status: ActionStatus
}

interface ActionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: string
}

export default function ActionModal({ open, onClose, onSuccess, projectId }: ActionModalProps) {
  const [form] = Form.useForm<ActionFormData>()
  const [saving, setSaving] = useState(false)

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await createProjectAction(projectId, values)
      message.success('动作已新增')
      onClose()
      form.resetFields()
      onSuccess()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error(getErrorMessage(error, '新增动作失败'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    onClose()
    form.resetFields()
  }

  return (
    <Modal
      title="新增动作"
      open={open}
      onCancel={handleCancel}
      onOk={() => void handleOk()}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnClose
    >
      <Form<ActionFormData>
        form={form}
        layout="vertical"
        initialValues={{ status: 'DRAFT' }}
      >
        <Form.Item name="name" label="动作名称" rules={[{ required: true, message: '请输入动作名称' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="status" label="初始状态" rules={[{ required: true }]}>
          <Select
            options={[
              { label: 'DRAFT', value: 'DRAFT' },
              { label: 'ACTIVE', value: 'ACTIVE' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
