import { useState, useCallback } from 'react'
import { Form, Select, Input, Radio, Button, Space } from 'antd'
import { SearchOutlined, ClearOutlined } from '@ant-design/icons'
import type { Device } from '../../types/device'
import type { Phenomenon, Severity, DiagnosisPayload } from '../../types/diagnosis'
import PhenomenonSelector from './PhenomenonSelector'

const { TextArea } = Input

interface DiagnosisFormProps {
  devices: Device[]
  phenomena: Phenomenon[]
  phenomenaLoading?: boolean
  onSubmit: (payload: DiagnosisPayload) => void
  loading?: boolean
}

const severityOptions: { label: string; value: Severity }[] = [
  { label: '低', value: 'LOW' },
  { label: '中', value: 'MEDIUM' },
  { label: '高', value: 'HIGH' },
  { label: '紧急', value: 'CRITICAL' },
]

export default function DiagnosisForm({
  devices,
  phenomena,
  phenomenaLoading,
  onSubmit,
  loading,
}: DiagnosisFormProps) {
  const [form] = Form.useForm()
  const [phenomenonValue, setPhenomenonValue] = useState<{
    phenomenonId: string
    symptoms: string[]
  }>({ phenomenonId: '', symptoms: [] })

  // When a device is selected, auto-fill name and type
  const handleDeviceChange = useCallback(
    (deviceId: number) => {
      const device = devices.find((d) => d.id === deviceId)
      if (device) {
        form.setFieldsValue({
          deviceName: device.name,
          deviceType: device.type ?? '',
        })
      }
    },
    [devices, form],
  )

  const handleReset = useCallback(() => {
    form.resetFields()
    setPhenomenonValue({ phenomenonId: '', symptoms: [] })
  }, [form])

  const handleFinish = useCallback(
    (values: any) => {
      const payload: DiagnosisPayload = {
        deviceId: values.deviceId ?? null,
        deviceName: values.deviceName || '',
        deviceType: values.deviceType || '',
        phenomenonId: phenomenonValue.phenomenonId,
        symptoms: phenomenonValue.symptoms,
        description: values.description || '',
        severity: values.severity || 'MEDIUM',
      }
      onSubmit(payload)
    },
    [phenomenonValue, onSubmit],
  )

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ severity: 'MEDIUM' }}
      size="middle"
    >
      <Form.Item label="选择设备" name="deviceId">
        <Select
          placeholder="选择已有设备（可选）"
          allowClear
          showSearch
          optionFilterProp="label"
          onChange={handleDeviceChange}
          options={devices.map((d) => ({
            label: `${d.name}${d.type ? ' (' + d.type + ')' : ''}`,
            value: d.id,
          }))}
        />
      </Form.Item>

      <Form.Item
        label="设备名称"
        name="deviceName"
        rules={[{ required: true, message: '请输入设备名称' }]}
      >
        <Input placeholder="输入设备名称" />
      </Form.Item>

      <Form.Item label="设备类型" name="deviceType">
        <Input placeholder="输入设备类型" />
      </Form.Item>

      <Form.Item
        label="故障现象"
        required
        validateStatus={!phenomenonValue.phenomenonId ? undefined : 'success'}
      >
        <PhenomenonSelector
          phenomena={phenomena}
          phenomenaLoading={phenomenaLoading}
          value={phenomenonValue}
          onChange={setPhenomenonValue}
        />
      </Form.Item>

      <Form.Item label="严重程度" name="severity">
        <Radio.Group options={severityOptions} optionType="button" buttonStyle="solid" />
      </Form.Item>

      <Form.Item label="问题描述" name="description">
        <TextArea rows={4} placeholder="详细描述故障表现..." />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SearchOutlined />}
            loading={loading}
            disabled={!phenomenonValue.phenomenonId}
          >
            开始诊断
          </Button>
          <Button icon={<ClearOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
