import { useState } from 'react'
import { Col, Form, Input, InputNumber, Modal, Row, Select, Switch, message } from 'antd'
import { createProjectDataSource, updateProjectDataSource } from '../../../api/projectManagement'
import type { DataSourceExtractMode, DataSourceSyncMode, DataSourceType, StructuredDataSource } from '../../../types/projectMvp'
import { DATA_SOURCE_TYPE_OPTIONS, DEFAULT_PORT_BY_DATA_SOURCE_TYPE } from '../constants'
import { getErrorMessage } from '../helpers'

interface DataSourceFormData {
  name: string
  type: DataSourceType
  host: string
  port: number
  database: string
  schema?: string
  username: string
  password: string
  sslEnabled: boolean
  enabled: boolean
  extractMode: DataSourceExtractMode
  tables?: string[]
  customSql?: string
  rowLimit: number
  syncMode: DataSourceSyncMode
  incrementalColumn?: string
}

interface DataSourceModalProps {
  open: boolean
  mode: 'create' | 'edit'
  editingDataSource: StructuredDataSource | null
  onClose: () => void
  onSuccess: () => void
  projectId: string
}

export default function DataSourceModal({
  open,
  mode,
  editingDataSource,
  onClose,
  onSuccess,
  projectId,
}: DataSourceModalProps) {
  const [form] = Form.useForm<DataSourceFormData>()
  const [saving, setSaving] = useState(false)

  const handleAfterOpenChange = (visible: boolean) => {
    if (!visible) {
      form.resetFields()
      return
    }
    if (mode === 'edit' && editingDataSource) {
      form.setFieldsValue({
        name: editingDataSource.name,
        type: editingDataSource.type,
        host: editingDataSource.host,
        port: editingDataSource.port,
        database: editingDataSource.database,
        schema: editingDataSource.schema || '',
        username: editingDataSource.username,
        password: editingDataSource.password,
        sslEnabled: editingDataSource.sslEnabled,
        enabled: editingDataSource.enabled,
        extractMode: editingDataSource.extractMode,
        tables: editingDataSource.tables,
        customSql: editingDataSource.customSql || '',
        rowLimit: editingDataSource.rowLimit,
        syncMode: editingDataSource.syncMode,
        incrementalColumn: editingDataSource.incrementalColumn || '',
      })
    } else {
      form.setFieldsValue({
        name: '',
        type: 'MYSQL',
        host: '',
        port: DEFAULT_PORT_BY_DATA_SOURCE_TYPE.MYSQL,
        database: '',
        schema: '',
        username: '',
        password: '',
        sslEnabled: false,
        enabled: true,
        extractMode: 'TABLE',
        tables: [],
        customSql: '',
        rowLimit: 10000,
        syncMode: 'FULL',
        incrementalColumn: '',
      })
    }
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const payload = {
        name: values.name,
        type: values.type,
        host: values.host,
        port: values.port,
        database: values.database,
        schema: values.schema,
        username: values.username,
        password: values.password,
        sslEnabled: values.sslEnabled,
        enabled: values.enabled,
        extractMode: values.extractMode,
        tables: values.tables,
        customSql: values.customSql,
        rowLimit: values.rowLimit,
        syncMode: values.syncMode,
        incrementalColumn: values.incrementalColumn,
      }

      if (mode === 'edit' && editingDataSource) {
        await updateProjectDataSource(projectId, editingDataSource.id, payload)
        message.success('数据源已更新')
      } else {
        await createProjectDataSource(projectId, payload)
        message.success('数据源已新增')
      }

      onClose()
      onSuccess()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error(getErrorMessage(error, '保存数据源失败'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={mode === 'edit' ? '编辑数据源' : '新增数据源'}
      open={open}
      onCancel={onClose}
      onOk={() => void handleOk()}
      okText={mode === 'edit' ? '保存修改' : '确认新增'}
      cancelText="取消"
      confirmLoading={saving}
      destroyOnClose
      width={820}
      afterOpenChange={handleAfterOpenChange}
    >
      <Form<DataSourceFormData>
        form={form}
        layout="vertical"
        initialValues={{
          type: 'MYSQL',
          port: DEFAULT_PORT_BY_DATA_SOURCE_TYPE.MYSQL,
          sslEnabled: false,
          enabled: true,
          extractMode: 'TABLE',
          rowLimit: 10000,
          syncMode: 'FULL',
        }}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="name" label="数据源名称" rules={[{ required: true, message: '请输入数据源名称' }]}>
              <Input placeholder="例如 MES主库-生产库" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="type" label="数据库类型" rules={[{ required: true, message: '请选择数据库类型' }]}>
              <Select<DataSourceType>
                options={DATA_SOURCE_TYPE_OPTIONS}
                onChange={(value) => {
                  form.setFieldValue('port', DEFAULT_PORT_BY_DATA_SOURCE_TYPE[value])
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="host" label="数据库地址" rules={[{ required: true, message: '请输入数据库地址' }]}>
              <Input placeholder="例如 10.23.8.12 或 db.company.internal" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="port" label="端口" rules={[{ required: true, message: '请输入端口' }]}>
              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="database" label="数据库名" rules={[{ required: true, message: '请输入数据库名' }]}>
              <Input placeholder="例如 mes_prod" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="schema" label="Schema（可选）">
              <Input placeholder="例如 public" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
              <Input placeholder="例如 readonly_mes" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: mode === 'create', message: '请输入密码' }]}
            >
              <Input.Password placeholder={mode === 'edit' ? '留空则沿用原密码' : '请输入数据库密码'} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="extractMode" label="抽取方式" rules={[{ required: true }]}>
              <Select<DataSourceExtractMode>
                options={[
                  { label: '按表抽取', value: 'TABLE' },
                  { label: 'SQL 抽取', value: 'SQL' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="syncMode" label="同步方式" rules={[{ required: true }]}>
              <Select<DataSourceSyncMode>
                options={[
                  { label: '全量同步', value: 'FULL' },
                  { label: '增量同步', value: 'INCREMENTAL' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item noStyle shouldUpdate={(prev, current) => prev.extractMode !== current.extractMode}>
          {({ getFieldValue }) => (
            getFieldValue('extractMode') === 'TABLE' ? (
              <Form.Item name="tables" label="目标表" rules={[{ required: true, message: '请至少输入一个表名' }]}>
                <Select
                  mode="tags"
                  tokenSeparators={[',', '\n']}
                  placeholder="输入表名后回车，例如 fault_event, work_order"
                  options={[]}
                />
              </Form.Item>
            ) : (
              <Form.Item name="customSql" label="SQL 语句" rules={[{ required: true, message: '请输入 SQL 语句' }]}>
                <Input.TextArea rows={4} placeholder="SELECT * FROM table_name LIMIT 1000" />
              </Form.Item>
            )
          )}
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="rowLimit" label="单次拉取上限" rules={[{ required: true, message: '请输入拉取上限' }]}>
              <InputNumber min={1} max={200000} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item noStyle shouldUpdate={(prev, current) => prev.syncMode !== current.syncMode}>
              {({ getFieldValue }) => (
                getFieldValue('syncMode') === 'INCREMENTAL' ? (
                  <Form.Item name="incrementalColumn" label="增量字段" rules={[{ required: true, message: '请输入增量字段' }]}>
                    <Input placeholder="例如 updated_at" />
                  </Form.Item>
                ) : (
                  <Form.Item label="增量字段">
                    <Input disabled placeholder="当前为全量同步，无需配置" />
                  </Form.Item>
                )
              )}
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="sslEnabled" label="启用 SSL" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="enabled" label="创建后启用" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}
