import React, { useState } from 'react'
import { Button, Modal, Form, Input, Select, Tag, Popconfirm, message, Spin } from 'antd'
import {
  PlusOutlined, PlayCircleOutlined, SaveOutlined, DeleteOutlined,
} from '@ant-design/icons'
import type { OntologyFunction } from '../../../types/ontology'
import { createFunction, updateFunction, deleteFunction, executeFunction } from '../../../api/ontology'

interface Props {
  functions: OntologyFunction[]
  onRefresh: () => void
  loading?: boolean
}

interface CellState {
  scriptContent: string
  output: string
  running: boolean
  saving: boolean
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'green',
  DRAFT: 'default',
  ERROR: 'red',
}

const NotebookPanel: React.FC<Props> = ({ functions, onRefresh, loading }) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [cellStates, setCellStates] = useState<Record<number, CellState>>({})

  const getCellState = (fn: OntologyFunction): CellState => {
    return cellStates[fn.id] || {
      scriptContent: fn.scriptContent || '',
      output: '',
      running: false,
      saving: false,
    }
  }

  const updateCellState = (id: number, patch: Partial<CellState>) => {
    setCellStates(prev => {
      const existing = prev[id] || {
        scriptContent: functions.find(f => f.id === id)?.scriptContent || '',
        output: '',
        running: false,
        saving: false,
      }
      return { ...prev, [id]: { ...existing, ...patch } }
    })
  }

  const handleCreate = async () => {
    try {
      const vals = await form.validateFields()
      setSubmitting(true)
      await createFunction(vals)
      message.success('函数已创建')
      form.resetFields()
      setModalOpen(false)
      onRefresh()
    } catch {
      /* validation */
    } finally {
      setSubmitting(false)
    }
  }

  const handleSave = async (fn: OntologyFunction) => {
    const state = getCellState(fn)
    updateCellState(fn.id, { saving: true })
    try {
      await updateFunction(fn.id, { scriptContent: state.scriptContent })
      message.success('已保存')
      onRefresh()
    } catch {}
    updateCellState(fn.id, { saving: false })
  }

  const handleRun = async (fn: OntologyFunction) => {
    const state = getCellState(fn)
    // Save first, then execute
    updateCellState(fn.id, { running: true, output: '' })
    try {
      await updateFunction(fn.id, { scriptContent: state.scriptContent })
      const result = await executeFunction(fn.id)
      const output = result.status === 'SUCCESS'
        ? result.outputDataJson || '执行成功 (无输出)'
        : `错误: ${result.errorMessage || '未知错误'}`
      updateCellState(fn.id, { running: false, output })
      if (result.status === 'SUCCESS') message.success(`执行完成 (${result.durationMs ?? 0}ms)`)
      else message.error('执行失败')
      onRefresh()
    } catch {
      updateCellState(fn.id, { running: false, output: '请求失败' })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteFunction(id)
      message.success('已删除')
      onRefresh()
    } catch {}
  }

  if (!loading && functions.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#128221;</div>
          <h3>Groovy Notebook</h3>
          <p style={{ color: '#999', maxWidth: 400, textAlign: 'center', lineHeight: 1.8 }}>
            在此创建和运行 Groovy 脚本函数。每个 Cell 是一个独立的函数，
            可以保存、执行并查看输出结果。点击下方按钮创建第一个 Cell。
          </p>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新建 Skill
          </Button>
        </div>
        {renderModal()}
      </div>
    )
  }

  function renderModal() {
    return (
      <Modal
        title="新建函数 Cell"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="函数名称"
            rules={[
              { required: true, message: '请输入' },
              { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '函数名须为合法标识符（字母/下划线开头）' },
              {
                validator: (_, value) => {
                  if (value && functions.some(f => f.name === value)) {
                    return Promise.reject('函数名称已存在，请使用其他名称')
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input placeholder="e.g. calculateHealth" />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="e.g. 计算健康度" />
          </Form.Item>
          <Form.Item name="scriptType" label="脚本类型" initialValue="GROOVY">
            <Select>
              <Select.Option value="GROOVY">GROOVY</Select.Option>
              <Select.Option value="PYTHON">PYTHON</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="DRAFT">
            <Select>
              <Select.Option value="DRAFT">DRAFT</Select.Option>
              <Select.Option value="ACTIVE">ACTIVE</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    )
  }

  return (
    <div style={styles.container}>
      <Spin spinning={!!loading}>
        <div style={styles.toolbar}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Groovy Notebook ({functions.length} cells)</span>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新建 Skill
          </Button>
        </div>

        <div style={styles.cells}>
          {functions.map((fn, idx) => {
            const state = getCellState(fn)
            return (
              <div key={fn.id} style={styles.cell}>
                {/* Cell Header */}
                <div style={styles.cellHeader}>
                  <div style={styles.cellTitle}>
                    <span style={styles.cellIndex}>[{idx + 1}]</span>
                    <span style={{ fontWeight: 500 }}>{fn.displayName || fn.name}</span>
                    <span style={{ color: '#888', fontSize: 12 }}>{fn.name}</span>
                    <Tag color={STATUS_COLOR[fn.status] || 'default'}>{fn.status}</Tag>
                  </div>
                  <div style={styles.cellActions}>
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      loading={state.running}
                      onClick={() => handleRun(fn)}
                    >
                      Run
                    </Button>
                    <Button
                      size="small"
                      icon={<SaveOutlined />}
                      loading={state.saving}
                      onClick={() => handleSave(fn)}
                    >
                      Save
                    </Button>
                    <Popconfirm title="确认删除此函数？" onConfirm={() => handleDelete(fn.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                </div>

                {/* Code Area */}
                <textarea
                  style={styles.codeArea}
                  value={state.scriptContent}
                  onChange={e => updateCellState(fn.id, { scriptContent: e.target.value })}
                  placeholder="// 在此输入脚本代码..."
                  spellCheck={false}
                />

                {/* Output Area */}
                {state.output && (
                  <div style={{
                    ...styles.outputArea,
                    borderLeft: state.output.startsWith('错误') ? '3px solid #ff4d4f' : '3px solid #52c41a',
                  }}>
                    <pre style={styles.outputPre}>{state.output}</pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Spin>
      {renderModal()}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    padding: 0,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    background: '#fff',
    borderRadius: 8,
    padding: 40,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    borderRadius: 8,
    padding: '12px 20px',
    marginBottom: 16,
  },
  cells: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  cell: {
    background: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e8e8e8',
  },
  cellHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    background: '#fafafa',
    borderBottom: '1px solid #e8e8e8',
  },
  cellTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
  },
  cellIndex: {
    color: '#1677ff',
    fontWeight: 700,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  cellActions: {
    display: 'flex',
    gap: 6,
  },
  codeArea: {
    width: '100%',
    minHeight: 160,
    padding: '14px 16px',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    fontSize: 13,
    lineHeight: '1.6',
    background: '#1e1e2e',
    color: '#cdd6f4',
    border: 'none',
    outline: 'none',
    resize: 'vertical',
    tabSize: 2,
  },
  outputArea: {
    padding: '10px 16px',
    background: '#f6f8fa',
    borderTop: '1px solid #e8e8e8',
  },
  outputPre: {
    margin: 0,
    fontFamily: 'monospace',
    fontSize: 12,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: '#333',
    maxHeight: 200,
    overflow: 'auto',
  },
}

export default NotebookPanel
