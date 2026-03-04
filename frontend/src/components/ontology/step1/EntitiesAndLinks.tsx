import React, { useState } from 'react'
import { Button, Modal, Form, Input, Select, Popconfirm, message, Spin } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ObjectType, LinkType } from '../../../types/ontology'
import { createObjectType, deleteObjectType, createLinkType, deleteLinkType } from '../../../api/ontology'

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']

interface Props {
  objectTypes: ObjectType[]
  linkTypes: LinkType[]
  selectedOT: ObjectType | null
  onSelectOT: (ot: ObjectType | null) => void
  onRefresh: () => void
  loading?: boolean
}

const EntitiesAndLinks: React.FC<Props> = ({
  objectTypes,
  linkTypes,
  selectedOT,
  onSelectOT,
  onRefresh,
  loading,
}) => {
  const [otModalOpen, setOtModalOpen] = useState(false)
  const [ltModalOpen, setLtModalOpen] = useState(false)
  const [otForm] = Form.useForm()
  const [ltForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const handleCreateOT = async () => {
    try {
      const vals = await otForm.validateFields()
      setSubmitting(true)
      await createObjectType(vals)
      message.success('实体类型已创建')
      otForm.resetFields()
      setOtModalOpen(false)
      onRefresh()
    } catch {
      /* validation */
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteOT = async (id: number) => {
    try {
      await deleteObjectType(id)
      message.success('已删除')
      if (selectedOT?.id === id) onSelectOT(null)
      onRefresh()
    } catch {}
  }

  const handleCreateLT = async () => {
    try {
      const vals = await ltForm.validateFields()
      setSubmitting(true)
      await createLinkType(vals)
      message.success('关系类型已创建')
      ltForm.resetFields()
      setLtModalOpen(false)
      onRefresh()
    } catch {
      /* validation */
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteLT = async (id: number) => {
    try {
      await deleteLinkType(id)
      message.success('已删除')
      onRefresh()
    } catch {}
  }

  const otNameMap = Object.fromEntries(objectTypes.map(o => [o.id, o.displayName || o.name]))

  return (
    <div style={styles.panel}>
      <Spin spinning={!!loading}>
        {/* Object Types */}
        <div style={styles.section}>
          <div style={styles.header}>
            <span style={styles.title}>Object Types ({objectTypes.length})</span>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setOtModalOpen(true)}
            >
              新建实体
            </Button>
          </div>
          <div style={styles.list}>
            {objectTypes.map(ot => (
              <div
                key={ot.id}
                style={{
                  ...styles.item,
                  background: selectedOT?.id === ot.id ? '#e6f4ff' : '#fafafa',
                  borderLeft: selectedOT?.id === ot.id ? '3px solid #1677ff' : '3px solid transparent',
                }}
                onClick={() => onSelectOT(ot)}
              >
                <span
                  style={{
                    ...styles.dot,
                    background: ot.color || COLORS[ot.id % COLORS.length],
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.itemName}>{ot.displayName || ot.name}</div>
                  <div style={styles.itemCode}>{ot.name}</div>
                </div>
                <Popconfirm title="确认删除？" onConfirm={(e) => { e?.stopPropagation(); handleDeleteOT(ot.id) }}>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={e => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            ))}
          </div>
        </div>

        {/* Link Types */}
        <div style={styles.section}>
          <div style={styles.header}>
            <span style={styles.title}>Link Types ({linkTypes.length})</span>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setLtModalOpen(true)}
            >
              新建关系
            </Button>
          </div>
          <div style={styles.list}>
            {linkTypes.map(lt => (
              <div key={lt.id} style={{ ...styles.item, background: '#fafafa' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.itemName}>{lt.displayName || lt.name}</div>
                  <div style={styles.itemCode}>
                    {otNameMap[lt.sourceObjectTypeId] || lt.sourceObjectTypeId}
                    {' → '}
                    {otNameMap[lt.targetObjectTypeId] || lt.targetObjectTypeId}
                    {lt.cardinality ? ` (${lt.cardinality})` : ''}
                  </div>
                </div>
                <Popconfirm title="确认删除？" onConfirm={() => handleDeleteLT(lt.id)}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            ))}
          </div>
        </div>
      </Spin>

      {/* Create Object Type Modal */}
      <Modal
        title="新建实体类型"
        open={otModalOpen}
        onOk={handleCreateOT}
        onCancel={() => { setOtModalOpen(false); otForm.resetFields() }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={otForm} layout="vertical">
          <Form.Item name="name" label="代码名称" rules={[{ required: true, message: '请输入代码名称' }]}>
            <Input placeholder="e.g. Robot" />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="e.g. 机器人" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="color" label="颜色">
            <Select placeholder="选择颜色" allowClear>
              {COLORS.map(c => (
                <Select.Option key={c} value={c}>
                  <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: c, marginRight: 8, verticalAlign: 'middle' }} />
                  {c}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Link Type Modal */}
      <Modal
        title="新建关系类型"
        open={ltModalOpen}
        onOk={handleCreateLT}
        onCancel={() => { setLtModalOpen(false); ltForm.resetFields() }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={ltForm} layout="vertical">
          <Form.Item name="name" label="代码名称" rules={[{ required: true, message: '请输入代码名称' }]}>
            <Input placeholder="e.g. controls" />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="e.g. 控制" />
          </Form.Item>
          <Form.Item
            name="sourceObjectTypeId"
            label="源实体类型"
            rules={[{ required: true, message: '请选择' }]}
          >
            <Select placeholder="选择源实体类型">
              {objectTypes.map(ot => (
                <Select.Option key={ot.id} value={ot.id}>
                  {ot.displayName || ot.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="targetObjectTypeId"
            label="目标实体类型"
            rules={[{ required: true, message: '请选择' }]}
          >
            <Select placeholder="选择目标实体类型">
              {objectTypes.map(ot => (
                <Select.Option key={ot.id} value={ot.id}>
                  {ot.displayName || ot.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="cardinality" label="基数" initialValue="MANY_TO_MANY">
            <Select>
              <Select.Option value="ONE_TO_ONE">ONE_TO_ONE</Select.Option>
              <Select.Option value="ONE_TO_MANY">ONE_TO_MANY</Select.Option>
              <Select.Option value="MANY_TO_ONE">MANY_TO_ONE</Select.Option>
              <Select.Option value="MANY_TO_MANY">MANY_TO_MANY</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 300,
    minWidth: 300,
    background: '#fff',
    borderRadius: 8,
    padding: 16,
    overflowY: 'auto',
    height: '100%',
  },
  section: { marginBottom: 20 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontWeight: 600, fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background .15s',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  itemName: { fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  itemCode: { fontSize: 11, color: '#999' },
}

export default EntitiesAndLinks
