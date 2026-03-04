import React, { useEffect, useState, useCallback } from 'react'
import { Button, Modal, Form, Input, Select, Switch, Popconfirm, Tag, Spin, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Property } from '../../../types/ontology'
import { getProperties, createProperty, deleteProperty } from '../../../api/ontology'

const DATA_TYPES = ['STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'DATE', 'DATETIME', 'JSON', 'TEXT']

interface Props {
  objectTypeId: number | null
  objectTypeName: string
}

const PropertyPanel: React.FC<Props> = ({ objectTypeId, objectTypeName }) => {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    if (!objectTypeId) return
    setLoading(true)
    try {
      setProperties(await getProperties(objectTypeId))
    } catch {}
    finally { setLoading(false) }
  }, [objectTypeId])

  useEffect(() => {
    if (objectTypeId) load()
    else setProperties([])
  }, [objectTypeId, load])

  const handleCreate = async () => {
    try {
      const vals = await form.validateFields()
      setSubmitting(true)
      await createProperty(objectTypeId!, { ...vals, required: !!vals.required })
      message.success('属性已添加')
      form.resetFields()
      setModalOpen(false)
      load()
    } catch {
      /* validation */
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteProperty(id)
      message.success('已删除')
      load()
    } catch {}
  }

  if (!objectTypeId) {
    return (
      <div style={styles.panel}>
        <div style={styles.empty}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#8592;</div>
          <div>选择一个实体类型以查看属性</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>{objectTypeName} - 属性</span>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
        >
          添加属性
        </Button>
      </div>

      <Spin spinning={loading}>
        <div style={styles.list}>
          {properties.length === 0 && !loading && (
            <div style={{ color: '#999', textAlign: 'center', padding: 24 }}>暂无属性</div>
          )}
          {properties.map(p => (
            <div key={p.id} style={styles.item}>
              <div style={{ flex: 1 }}>
                <div style={styles.propName}>
                  {p.displayName || p.name}
                  {p.required && (
                    <Tag color="red" style={{ marginLeft: 8, fontSize: 10 }}>
                      必填
                    </Tag>
                  )}
                </div>
                <div style={styles.propMeta}>
                  {p.name} &middot; {p.dataType}
                  {p.defaultValue ? ` &middot; 默认: ${p.defaultValue}` : ''}
                </div>
              </div>
              <Popconfirm title="确认删除？" onConfirm={() => handleDelete(p.id)}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
          ))}
        </div>
      </Spin>

      <Modal
        title="添加属性"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="代码名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="e.g. serialNumber" />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="e.g. 序列号" />
          </Form.Item>
          <Form.Item name="dataType" label="数据类型" rules={[{ required: true, message: '请选择' }]}>
            <Select placeholder="选择数据类型">
              {DATA_TYPES.map(t => (
                <Select.Option key={t} value={t}>{t}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="required" label="是否必填" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="defaultValue" label="默认值">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 320,
    minWidth: 320,
    background: '#fff',
    borderRadius: 8,
    padding: 16,
    overflowY: 'auto',
    height: '100%',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#999',
    fontSize: 14,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { fontWeight: 600, fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 10px',
    background: '#fafafa',
    borderRadius: 6,
  },
  propName: { fontSize: 13, fontWeight: 500 },
  propMeta: { fontSize: 11, color: '#999', marginTop: 2 },
}

export default PropertyPanel
