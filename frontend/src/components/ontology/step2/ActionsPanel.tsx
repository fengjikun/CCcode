import React, { useState } from 'react'
import { Button, Modal, Form, Input, Select, Popconfirm, Spin, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ActionType } from '../../../types/ontology'
import { createActionType, deleteActionType } from '../../../api/ontology'

const STATUS_DOT: Record<string, string> = {
  ACTIVE: '#52c41a',
  DRAFT: '#999',
  DEPRECATED: '#ff4d4f',
}

interface Props {
  actionTypes: ActionType[]
  selectedAT: ActionType | null
  onSelectAT: (at: ActionType | null) => void
  onRefresh: () => void
  loading?: boolean
}

const ActionsPanel: React.FC<Props> = ({ actionTypes, selectedAT, onSelectAT, onRefresh, loading }) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const handleCreate = async () => {
    try {
      const vals = await form.validateFields()
      setSubmitting(true)
      await createActionType(vals)
      message.success('动作类型已创建')
      form.resetFields()
      setModalOpen(false)
      onRefresh()
    } catch {
      /* validation */
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await deleteActionType(id)
      message.success('已删除')
      if (selectedAT?.id === id) onSelectAT(null)
      onRefresh()
    } catch {}
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Action Types ({actionTypes.length})</span>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建
        </Button>
      </div>

      <Spin spinning={!!loading}>
        <div style={styles.list}>
          {actionTypes.map(at => (
            <div
              key={at.id}
              style={{
                ...styles.item,
                background: selectedAT?.id === at.id ? '#e6f4ff' : '#fafafa',
                borderLeft: selectedAT?.id === at.id ? '3px solid #1677ff' : '3px solid transparent',
              }}
              onClick={() => onSelectAT(at)}
            >
              <span
                style={{
                  ...styles.dot,
                  background: STATUS_DOT[at.status] || '#999',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.itemName}>{at.displayName || at.name}</div>
                <div style={styles.itemCode}>{at.name}</div>
              </div>
              <Popconfirm
                title="确认删除？"
                onConfirm={(e) => handleDelete(at.id, e as unknown as React.MouseEvent)}
              >
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
      </Spin>

      <Modal
        title="新建动作类型"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="代码名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="e.g. resetDevice" />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="e.g. 重置设备" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="DRAFT">
            <Select>
              <Select.Option value="DRAFT">DRAFT</Select.Option>
              <Select.Option value="ACTIVE">ACTIVE</Select.Option>
              <Select.Option value="DEPRECATED">DEPRECATED</Select.Option>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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

export default ActionsPanel
