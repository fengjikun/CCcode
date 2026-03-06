import { useState } from 'react'
import { Form, Input, Modal, Select, message } from 'antd'
import { createProjectFunction } from '../../../api/projectManagement'
import type { FunctionStatus } from '../../../types/projectMvp'
import { getErrorMessage } from '../helpers'

interface FunctionFormData {
  name: string
  description?: string
  scriptContent: string
  status: FunctionStatus
}

interface FunctionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: string
}

export default function FunctionModal({ open, onClose, onSuccess, projectId }: FunctionModalProps) {
  const [form] = Form.useForm<FunctionFormData>()
  const [saving, setSaving] = useState(false)

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await createProjectFunction(projectId, values)
      message.success('函数已新增')
      onClose()
      form.resetFields()
      onSuccess()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error(getErrorMessage(error, '新增函数失败'))
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
      title="新增函数"
      open={open}
      onCancel={handleCancel}
      onOk={() => void handleOk()}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnClose
      width={760}
    >
      <Form<FunctionFormData>
        form={form}
        layout="vertical"
        initialValues={{ status: 'DRAFT', scriptContent: 'def run(input_data):\n    return input_data' }}
      >
        <Form.Item name="name" label="函数名称" rules={[{ required: true, message: '请输入函数名称' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="scriptContent" label="脚本内容" rules={[{ required: true, message: '请输入函数脚本' }]}>
          <Input.TextArea rows={8} />
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
