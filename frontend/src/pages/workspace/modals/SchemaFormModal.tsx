import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  CheckCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { createEntityType, createRelationType, updateEntityType, updateRelationType } from '../../../api/projectManagement'
import type { PropertyDataType, ProjectDetail, StructuredDataSource } from '../../../types/projectMvp'
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
  mappedColumn?: string
  searchable?: boolean
  sortable?: boolean
}

interface SchemaCreateFormData {
  type: SchemaCreateType
  entityName?: string
  entityDescription?: string
  entityDataSourceId?: string
  entityMappedTable?: string
  entityIsBigTable?: boolean
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
  dataSources: StructuredDataSource[]
}

function EntityPropertyFormList({ fieldName, dataSources: _dataSources, form }: {
  fieldName: string
  dataSources: StructuredDataSource[]
  form: ReturnType<typeof Form.useForm<SchemaCreateFormData>>[0]
}) {
  const selectedDataSourceId = Form.useWatch('entityDataSourceId', form)
  const selectedTable = Form.useWatch('entityMappedTable', form)

  // Build mock column options from the mapped table
  const columnOptions = useMemo(() => {
    if (!selectedDataSourceId || !selectedTable) return []
    // In real implementation, columns would come from backend API
    // For now show the table name as hint
    return []
  }, [selectedDataSourceId, selectedTable])

  const hasMapping = Boolean(selectedDataSourceId && selectedTable)

  return (
    <Form.List name={fieldName}>
      {(fields, { add, remove }) => (
        <Card
          size="small"
          title={
            <Space>
              <span>属性定义</span>
              {hasMapping && <Tag color="blue">已启用字段映射</Tag>}
            </Space>
          }
          extra={
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => add({ dataType: 'STRING', required: false, searchable: false, sortable: false })}
            >
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
                  <Col span={8}>
                    <Form.Item
                      name={[field.name, 'name']}
                      label="代码名"
                      rules={[{ required: true, message: '请输入代码名' }]}
                    >
                      <Input placeholder="例如 serial_no" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={[field.name, 'displayName']} label="显示名">
                      <Input placeholder="例如 序列号" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={[field.name, 'dataType']} label="数据类型" initialValue="STRING">
                      <Select options={PROPERTY_DATA_TYPES.map(item => ({ label: item, value: item }))} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item
                      name={[field.name, 'mappedColumn']}
                      label={
                        <Space size={4}>
                          映射字段
                          <Tooltip title="对应数据库表中的列名，用于实体属性与物理表字段的映射">
                            <QuestionCircleOutlined style={{ color: '#999' }} />
                          </Tooltip>
                        </Space>
                      }
                    >
                      {columnOptions.length > 0 ? (
                        <Select
                          options={columnOptions}
                          placeholder="选择映射字段"
                          allowClear
                          showSearch
                        />
                      ) : (
                        <Input placeholder="例如 bill_no" />
                      )}
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={[field.name, 'defaultValue']} label="默认值">
                      <Input placeholder="可选" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Row gutter={12}>
                      <Col span={8}>
                        <Form.Item name={[field.name, 'required']} label="必填" valuePropName="checked" initialValue={false}>
                          <Switch size="small" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name={[field.name, 'searchable']} label="检索" valuePropName="checked" initialValue={false}>
                          <Switch size="small" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name={[field.name, 'sortable']} label="排序" valuePropName="checked" initialValue={false}>
                          <Switch size="small" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>
        </Card>
      )}
    </Form.List>
  )
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
  dataSources,
}: SchemaFormModalProps) {
  const [form] = Form.useForm<SchemaCreateFormData>()
  const [saving, setSaving] = useState(false)

  const selectedDataSourceId = Form.useWatch('entityDataSourceId', form)

  // Get available tables from the selected data source
  const tableOptions = useMemo(() => {
    if (!selectedDataSourceId) return []
    const ds = dataSources.find(item => item.id === selectedDataSourceId)
    if (!ds) return []
    return ds.tables.map(table => ({ label: table, value: table }))
  }, [selectedDataSourceId, dataSources])

  const selectedDataSource = useMemo(
    () => dataSources.find(item => item.id === selectedDataSourceId),
    [selectedDataSourceId, dataSources],
  )

  const dataSourceOptions = useMemo(
    () => dataSources
      .filter(item => item.enabled)
      .map(item => ({
        label: `${item.name} (${item.type} - ${item.database})`,
        value: item.id,
      })),
    [dataSources],
  )

  const normalizeProperties = (list?: PropertyFormItem[]) =>
    (Array.isArray(list) ? list : [])
      .map((item, index) => ({
        id: item?.id,
        name: (item?.name || '').trim(),
        displayName: (item?.displayName || '').trim(),
        dataType: item?.dataType || 'STRING',
        required: Boolean(item?.required),
        defaultValue: (item?.defaultValue || '').trim(),
        mappedColumn: (item?.mappedColumn || '').trim(),
        searchable: Boolean(item?.searchable),
        sortable: Boolean(item?.sortable),
        sortOrder: index,
      }))
      .filter(item => item.name)

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      if (values.type === 'ENTITY') {
        const payload = {
          name: values.entityName || '',
          description: values.entityDescription || '',
          dataSourceId: values.entityDataSourceId,
          mappedTable: values.entityMappedTable,
          isBigTable: values.entityIsBigTable,
          properties: normalizeProperties(values.entityProperties),
        }
        if (mode === 'edit' && editingId) {
          await updateEntityType(projectId, editingId, payload)
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
        entityDataSourceId: entity.dataSourceId,
        entityMappedTable: entity.mappedTable,
        entityIsBigTable: entity.isBigTable ?? false,
        entityProperties: entity.properties.map(item => ({
          id: item.id,
          name: item.name,
          displayName: item.displayName,
          dataType: item.dataType,
          required: item.required,
          defaultValue: item.defaultValue || '',
          mappedColumn: item.mappedColumn || '',
          searchable: item.searchable ?? false,
          sortable: item.sortable ?? false,
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
      width={960}
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
            {/* ---- 基础定义 + 数据映射 并排 ---- */}
            <Row gutter={16}>
              <Col span={14}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <InfoCircleOutlined />
                      <span>基础定义</span>
                    </Space>
                  }
                  style={{ marginBottom: 16 }}
                >
                  <Form.Item
                    name="entityName"
                    label={
                      <Space size={4}>
                        实体标识
                        <Tooltip title="实体类型的唯一代码标识，建议使用 snake_case">
                          <QuestionCircleOutlined style={{ color: '#999' }} />
                        </Tooltip>
                      </Space>
                    }
                    rules={[{ required: true, message: '请输入实体类型名称' }]}
                  >
                    <Input placeholder="例如 transit_order" />
                  </Form.Item>
                  <Form.Item
                    name="entityDescription"
                    label={
                      <Space size={4}>
                        业务描述
                        <Tooltip title="描述该实体类型的业务含义与用途">
                          <QuestionCircleOutlined style={{ color: '#999' }} />
                        </Tooltip>
                      </Space>
                    }
                  >
                    <Input.TextArea rows={2} placeholder="描述实体的业务含义" />
                  </Form.Item>
                  <Form.Item
                    name="entityIsBigTable"
                    valuePropName="checked"
                    initialValue={false}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f6f8fa',
                      borderRadius: 8,
                      padding: '10px 14px',
                    }}>
                      <Space>
                        <InfoCircleOutlined style={{ color: '#1677ff' }} />
                        <span>
                          数据大表
                          <Tooltip title="启用性能守卫，强制执行查询约束，适用于数据量较大的实体表">
                            <QuestionCircleOutlined style={{ color: '#999', marginLeft: 4 }} />
                          </Tooltip>
                        </span>
                      </Space>
                      <Form.Item name="entityIsBigTable" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                    </div>
                  </Form.Item>
                </Card>
              </Col>

              <Col span={10}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <DatabaseOutlined />
                      <span>数据映射</span>
                    </Space>
                  }
                  style={{ marginBottom: 16 }}
                >
                  <Form.Item label="存储引擎">
                    {selectedDataSourceId ? (
                      <div style={{
                        background: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: 6,
                        padding: '6px 12px',
                      }}>
                        <Space>
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          <Text>已绑定数据源</Text>
                        </Space>
                        {selectedDataSource && (
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {selectedDataSource.type} · {selectedDataSource.host}:{selectedDataSource.port} · {selectedDataSource.database}
                            </Text>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        background: '#fffbe6',
                        border: '1px solid #ffe58f',
                        borderRadius: 6,
                        padding: '6px 12px',
                      }}>
                        <Text type="warning">未绑定数据源，请选择下方数据源</Text>
                      </div>
                    )}
                  </Form.Item>

                  <Form.Item
                    name="entityDataSourceId"
                    label="数据源"
                  >
                    <Select
                      options={dataSourceOptions}
                      placeholder="选择数据源"
                      allowClear
                      onChange={() => {
                        // Clear mapped table when data source changes
                        form.setFieldValue('entityMappedTable', undefined)
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="entityMappedTable"
                    label={
                      <Space size={4}>
                        映射表名
                        <Tooltip title="实体对应的物理数据库表名">
                          <QuestionCircleOutlined style={{ color: '#999' }} />
                        </Tooltip>
                      </Space>
                    }
                  >
                    {tableOptions.length > 0 ? (
                      <Select
                        options={tableOptions}
                        placeholder="选择映射表"
                        allowClear
                        showSearch
                      />
                    ) : (
                      <Input placeholder="输入表名，例如 transit_orders" />
                    )}
                  </Form.Item>
                </Card>
              </Col>
            </Row>

            <Divider style={{ margin: '4px 0 16px' }} />

            {/* ---- 属性定义（含映射字段） ---- */}
            <EntityPropertyFormList
              fieldName="entityProperties"
              dataSources={dataSources}
              form={form}
            />
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
