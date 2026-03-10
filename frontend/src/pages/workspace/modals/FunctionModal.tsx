import { useState } from 'react'
import { Form, Input, Modal, message } from 'antd'
import { createProjectFunction } from '../../../api/projectManagement'
import { getErrorMessage } from '../helpers'

interface FunctionFormData {
  name: string
  description?: string
  scriptContent: string
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
      await createProjectFunction(projectId, { ...values, status: 'DRAFT' })
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
      title="新建 Skill"
      open={open}
      onCancel={handleCancel}
      onOk={() => void handleOk()}
      okText="创建"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnClose
      width={760}
    >
      <Form<FunctionFormData>
        form={form}
        layout="vertical"
        initialValues={{ scriptContent: 'def run(input_data):\n    return input_data' }}
      >
        <Form.Item name="name" label="函数名称" rules={[{ required: true, message: '请输入函数名称' }]}>
          <Input placeholder="如：sendOrderToSAP" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="（可选）简述函数用途" />
        </Form.Item>
        <Form.Item name="scriptContent" label="初始脚本" rules={[{ required: true, message: '请输入脚本内容' }]}>
          <Input.TextArea rows={8} style={{ fontFamily: 'monospace', fontSize: 13 }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

