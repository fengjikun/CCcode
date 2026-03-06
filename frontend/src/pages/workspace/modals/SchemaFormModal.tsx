import { useState } from 'react'
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Switch, Typography, message } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { createEntityType, createRelationType, updateEntityType, updateRelationType } from '../../../api/projectManagement'
import type { PropertyDataType, ProjectDetail } from '../../../types/projectMvp'
import type { SchemaCreateType } from '../types'
import { PROPERTY_DATA_TYPES } from '../constants'
import { getErrorMessage } from '../helpers'

const { Text } = Typography

interface PropertyFormItem {
  id?: string
  name?: string
  displayName?: string
  dataType?: PropertyDataType
  required?: boolean
  defaultValue?: string
}

interface SchemaCreateFormData {
  type: SchemaCreateType
  entityName?: string
  entityDescription?: string
  entityProperties?: PropertyFormItem[]
  relationName?: string
  relationDomain?: string
  relationRange?: string
  relationDescription?: string
  relationProperties?: PropertyFormItem[]
}

interface SchemaFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  editingId: string | null
  schemaType: SchemaCreateType
  onSchemaTypeChange: (type: SchemaCreateType) => void
  onClose: () => void
  onSuccess: () => void
  projectId: string
  schemaConfig: ProjectDetail['schemaConfig']
  entityOptions: Array<{ label: string; value: string }>
}

function PropertyFormList({ fieldName }: { fieldName: string }) {
  return (
    <Form.List name={fieldName}>
      {(fields, { add, remove }) => (
        <Card
          size="small"
          title="高级属性"
          extra={
            <Button size="small" icon={<PlusOutlined />} onClick={() => add({ dataType: 'STRING', required: false })}>
              添加属性
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {fields.length === 0 && <Text type="secondary">暂无属性，可按需添加。</Text>}
            {fields.map(field => (
              <Card
                key={field.key}
                size="small"
                type="inner"
                title={`属性 #${field.name + 1}`}
                extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />}
              >
                <Form.Item name={[field.name, 'id']} style={{ display: 'none' }}>
                  <Input />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      name={[field.name, 'name']}
                      label="代码名"
                      rules={[{ required: true, message: '请输入代码名' }]}
                    >
                      <Input placeholder="例如 serial_no" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={[field.name, 'displayName']} label="显示名">
                      <Input placeholder="例如 序列号" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name={[field.name, 'dataType']} label="数据类型" initialValue="STRING">
                      <Select options={PROPERTY_DATA_TYPES.map(item => ({ label: item, value: item }))} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={[field.name, 'required']} label="必填" valuePropName="checked" initialValue={false}>
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name={[field.name, 'defaultValue']} label="默认值">
                  <Input />
                </Form.Item>
              </Card>
            ))}
          </Space>
        </Card>
      )}
    </Form.List>
  )
}

export default function SchemaFormModal({
  open,
  mode,
  editingId,
  schemaType,
  onSchemaTypeChange,
  onClose,
  onSuccess,
  projectId,
  schemaConfig,
  entityOptions,
}: SchemaFormModalProps) {
  const [form] = Form.useForm<SchemaCreateFormData>()
  const [saving, setSaving] = useState(false)

  const normalizeProperties = (list?: PropertyFormItem[]) =>
    (Array.isArray(list) ? list : [])
      .map((item, index) => ({
        id: item?.id,
        name: (item?.name || '').trim(),
        displayName: (item?.displayName || '').trim(),
        dataType: item?.dataType || 'STRING',
        required: Boolean(item?.required),
        defaultValue: (item?.defaultValue || '').trim(),
        sortOrder: index,
      }))
      .filter(item => item.name)

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      if (values.type === 'ENTITY') {
        if (mode === 'edit' && editingId) {
          await updateEntityType(projectId, editingId, {
            name: values.entityName || '',
            description: values.entityDescription || '',
            properties: normalizeProperties(values.entityProperties),
          })
          message.success('实体类型已更新')
        } else {
          await createEntityType(
            projectId,
            values.entityName || '',
            values.entityDescription,
            normalizeProperties(values.entityProperties),
          )
          message.success('实体类型已新增')
        }
      } else {
        if (mode === 'edit' && editingId) {
          await updateRelationType(projectId, editingId, {
            name: values.relationName || '',
            domain: values.relationDomain || '',
            range: values.relationRange || '',
            description: values.relationDescription,
            properties: normalizeProperties(values.relationProperties),
          })
          message.success('关系类型已更新')
        } else {
          await createRelationType(projectId, {
            name: values.relationName || '',
            domain: values.relationDomain || '',
            range: values.relationRange || '',
            description: values.relationDescription,
            properties: normalizeProperties(values.relationProperties),
          })
          message.success('关系类型已新增')
        }
      }

      onClose()
      onSuccess()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error(getErrorMessage(error, '保存失败'))
    } finally {
      setSaving(false)
    }
  }

  const handleAfterOpenChange = (visible: boolean) => {
    if (!visible) {
      form.resetFields()
      return
    }
    if (mode === 'create') {
      form.setFieldsValue({ type: 'ENTITY' })
      return
    }
    // Populate form for edit mode
    if (schemaType === 'ENTITY' && editingId) {
      const entity = schemaConfig.entityTypes.find(item => item.id === editingId)
      if (!entity) return
      form.setFieldsValue({
        type: 'ENTITY',
        entityName: entity.name,
        entityDescription: entity.description || '',
        entityProperties: entity.properties.map(item => ({
          id: item.id,
          name: item.name,
          displayName: item.displayName,
          dataType: item.dataType,
          required: item.required,
          defaultValue: item.defaultValue || '',
        })),
      })
    } else if (schemaType === 'RELATION' && editingId) {
      const relation = schemaConfig.relationTypes.find(item => item.id === editingId)
      if (!relation) return
      form.setFieldsValue({
        type: 'RELATION',
        relationName: relation.name,
        relationDomain: relation.domain,
        relationRange: relation.range,
        relationDescription: relation.description || '',
        relationProperties: relation.properties.map(item => ({
          id: item.id,
          name: item.name,
          displayName: item.displayName,
          dataType: item.dataType,
          required: item.required,
          defaultValue: item.defaultValue || '',
        })),
      })
    }
  }

  return (
    <Modal
      title={mode === 'edit' ? '编辑实体/关系' : '新增实体/关系'}
      open={open}
      onCancel={onClose}
      onOk={() => void handleOk()}
      okText={mode === 'edit' ? '保存修改' : '确认新增'}
      cancelText="取消"
      confirmLoading={saving}
      destroyOnClose
      width={760}
      afterOpenChange={handleAfterOpenChange}
    >
      <Form<SchemaCreateFormData>
        form={form}
        layout="vertical"
        initialValues={{ type: 'ENTITY' }}
      >
        <Form.Item
          name="type"
          label="新增类型"
          rules={[{ required: true, message: '请选择新增类型' }]}
        >
          <Select<SchemaCreateType>
            options={[
              { label: '实体类型', value: 'ENTITY' },
              { label: '关系类型', value: 'RELATION' },
            ]}
            disabled={mode === 'edit'}
            onChange={onSchemaTypeChange}
          />
        </Form.Item>

        {schemaType === 'ENTITY' ? (
          <>
            <Form.Item
              name="entityName"
              label="实体类型名称"
              rules={[{ required: true, message: '请输入实体类型名称' }]}
            >
              <Input placeholder="例如 Device" />
            </Form.Item>
            <Form.Item name="entityDescription" label="描述（可选）">
              <Input.TextArea rows={3} />
            </Form.Item>
            <PropertyFormList fieldName="entityProperties" />
          </>
        ) : (
          <>
            <Form.Item
              name="relationName"
              label="关系名称"
              rules={[{ required: true, message: '请输入关系名称' }]}
            >
              <Input placeholder="例如 located_in" />
            </Form.Item>
            <Form.Item
              name="relationDomain"
              label="domain"
              rules={[{ required: true, message: '请选择 domain' }]}
            >
              <Select options={entityOptions} placeholder="选择源实体类型" />
            </Form.Item>
            <Form.Item
              name="relationRange"
              label="range"
              rules={[{ required: true, message: '请选择 range' }]}
            >
              <Select options={entityOptions} placeholder="选择目标实体类型" />
            </Form.Item>
            <Form.Item name="relationDescription" label="描述（可选）">
              <Input.TextArea rows={3} />
            </Form.Item>
            <PropertyFormList fieldName="relationProperties" />
          </>
        )}
      </Form>
    </Modal>
  )
}
