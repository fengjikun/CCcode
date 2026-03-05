import { useEffect } from 'react'
import { Modal, Form, Input, Select, message } from 'antd'
import type { Device, DevicePayload, DeviceStatus } from '../../types/device'
import { createDevice, updateDevice } from '../../api/devices'

const STATUS_OPTIONS: { label: string; value: DeviceStatus }[] = [
  { label: '在线', value: 'ONLINE' },
  { label: '离线', value: 'OFFLINE' },
  { label: '维修中', value: 'MAINTENANCE' },
  { label: '故障', value: 'FAULT' },
]

interface DeviceFormProps {
  open: boolean
  device: Device | null
  deviceTypes: string[]
  onClose: () => void
  onSuccess: () => void
}

export default function DeviceForm({
  open,
  device,
  deviceTypes,
  onClose,
  onSuccess,
}: DeviceFormProps) {
  const [form] = Form.useForm<DevicePayload>()
  const isEdit = device !== null

  useEffect(() => {
    if (open) {
      if (device) {
        form.setFieldsValue({
          name: device.name,
          type: device.type ?? undefined,
          location: device.location ?? undefined,
          status: device.status,
          description: device.description ?? undefined,
        })
      } else {
        form.resetFields()
      }
    }
  }, [open, device, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      if (isEdit) {
        await updateDevice(device.id, values)
        message.success('设备已更新')
      } else {
        await createDevice(values)
        message.success('设备已创建')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      // Validation errors are handled by the form; API errors by fetchJSON
      if (err?.errorFields) return
    }
  }

  return (
    <Modal
      title={isEdit ? '编辑设备' : '新建设备'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
      destroyOnClose
      forceRender
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="name"
          label="设备名称"
          rules={[
            { required: true, message: '请输入设备名称' },
            { max: 100, message: '设备名称不能超过100个字符' },
            { whitespace: true, message: '设备名称不能为空白字符' },
          ]}
        >
          <Input placeholder="请输入设备名称" maxLength={100} showCount />
        </Form.Item>

        <Form.Item name="type" label="设备类型">
          <Select
            placeholder="请选择设备类型"
            allowClear
            options={deviceTypes.map((t) => ({ label: t, value: t }))}
          />
        </Form.Item>

        <Form.Item
          name="location"
          label="设备位置"
          rules={[
            { max: 200, message: '设备位置不能超过200个字符' },
          ]}
        >
          <Input placeholder="请输入设备位置" maxLength={200} />
        </Form.Item>

        <Form.Item name="status" label="状态" initialValue="ONLINE">
          <Select options={STATUS_OPTIONS} />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} placeholder="请输入设备描述" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
