import { useEffect, useState } from 'react'
import {
  Badge, Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, message,
} from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlayCircleOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  createProjectAction, deleteProjectAction, setActionStatus, updateProjectAction,
} from '../../../api/projectManagement'
import type { ActionDefinition, ActionStatus, EntityTypeConfig, FunctionDefinition } from '../../../types/projectMvp'
import { getErrorMessage } from '../helpers'
import { buildTargetEntityOptions, normalizeTargetEntityValues } from './ActionsTab.helpers'

interface ActionsTabProps {
  projectId: string
  actions: ActionDefinition[]
  functions: FunctionDefinition[]
  entityTypes: EntityTypeConfig[]
  loadProject: () => void
}

// ── 左侧列表 ──
const STATUS_DOT: Record<string, string> = {
  ACTIVE: '#52c41a',
  DRAFT: '#999',
}

interface ActionsPanelProps {
  actions: ActionDefinition[]
  selected: ActionDefinition | null
  onSelect: (a: ActionDefinition | null) => void
  onRefresh: () => void
  projectId: string
}

function ActionsPanel({ actions, selected, onSelect, onRefresh, projectId }: ActionsPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const handleCreate = async () => {
    try {
      const vals = await form.validateFields()
      setSubmitting(true)
      await createProjectAction(projectId, vals)
      message.success('动作已创建')
      form.resetFields()
      setModalOpen(false)
      onRefresh()
    } catch {
      /* validation */
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await deleteProjectAction(projectId, id)
      message.success('已删除')
      if (selected?.id === id) onSelect(null)
      onRefresh()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '删除失败'))
    }
  }

  return (
    <div style={panelStyles.panel}>
      <div style={panelStyles.header}>
        <span style={panelStyles.title}>动作列表 ({actions.length})</span>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建
        </Button>
      </div>
      <div style={panelStyles.list}>
        {actions.map(a => (
          <div
            key={a.id}
            style={{
              ...panelStyles.item,
              background: selected?.id === a.id ? '#e6f4ff' : '#fafafa',
              borderLeft: selected?.id === a.id ? '3px solid #1677ff' : '3px solid transparent',
            }}
            onClick={() => onSelect(a)}
          >
            <span style={{ ...panelStyles.dot, background: STATUS_DOT[a.status] || '#999' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={panelStyles.itemName}>{a.displayName || a.name}</div>
              <div style={panelStyles.itemCode}>{a.name}</div>
            </div>
            <Popconfirm title="确认删除？" onConfirm={(e) => void handleDelete(a.id, e as unknown as React.MouseEvent)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
            </Popconfirm>
          </div>
        ))}
      </div>

      <Modal
        title="新建动作"
        open={modalOpen}
        onOk={() => void handleCreate()}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ status: 'DRAFT' }}>
          <Form.Item name="name" label="代码名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="e.g. sendAlert" />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称">
            <Input placeholder="e.g. 发送告警" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[{ label: 'DRAFT', value: 'DRAFT' }, { label: 'ACTIVE', value: 'ACTIVE' }]} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Tab 1: 基本信息 ──
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }

function BasicInfoTab({ action, projectId, entityTypes, onRefresh }: { action: ActionDefinition; projectId: string; entityTypes: EntityTypeConfig[]; onRefresh: () => void }) {
  const [displayName, setDisplayName] = useState(action.displayName || '')
  const [description, setDescription] = useState(action.description || '')
  const [targetObjectTypeIds, setTargetObjectTypeIds] = useState<string[]>(
    normalizeTargetEntityValues(action.targetObjectTypeId, entityTypes),
  )
  const [saving, setSaving] = useState(false)
  const targetEntityOptions = buildTargetEntityOptions(entityTypes)

  useEffect(() => {
    setDisplayName(action.displayName || '')
    setDescription(action.description || '')
    setTargetObjectTypeIds(normalizeTargetEntityValues(action.targetObjectTypeId, entityTypes))
  }, [action, entityTypes])

  const save = async () => {
    setSaving(true)
    try {
      await updateProjectAction(projectId, action.id, {
        displayName,
        description,
        targetObjectTypeId: targetObjectTypeIds.length > 0 ? targetObjectTypeIds : null,
      })
      message.success('已保存')
      onRefresh()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '保存失败'))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async () => {
    const next: ActionStatus = action.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'
    try {
      await setActionStatus(projectId, action.id, next)
      message.success(`状态已切换为 ${next}`)
      onRefresh()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '切换失败'))
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Name (readonly)</label>
        <Input value={action.name} disabled />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>状态</label>
        <div><Badge status={action.status === 'ACTIVE' ? 'success' : 'default'} text={action.status} /></div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>关联目标实体</label>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="请选择一个或多个目标实体类型"
          allowClear
          maxTagCount="responsive"
          value={targetObjectTypeIds}
          options={targetEntityOptions}
          onChange={(vals: string[]) => setTargetObjectTypeIds(vals)}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>显示名称</label>
        <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>描述</label>
        <Input.TextArea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <Space>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void save()}>保存</Button>
        <Button onClick={() => void toggleStatus()}>
          {action.status === 'ACTIVE' ? '停用' : '启用'}
        </Button>
      </Space>
    </div>
  )
}

// ── Tab 2: 参数配置 ──
interface ParamItem { name: string; displayName: string; dataType: string; required: boolean; defaultValue?: string }

function ParametersTab({ action, projectId, onRefresh }: { action: ActionDefinition; projectId: string; onRefresh: () => void }) {
  const [params, setParams] = useState<ParamItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    try {
      const parsed = action.parametersJson ? JSON.parse(action.parametersJson) : []
      setParams(Array.isArray(parsed) ? parsed : [])
    } catch {
      setParams([])
    }
  }, [action.parametersJson])

  const save = async (newParams: ParamItem[]) => {
    try {
      await updateProjectAction(projectId, action.id, { parametersJson: JSON.stringify(newParams) })
      message.success('已保存')
      onRefresh()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '保存失败'))
    }
  }

  const openAdd = () => {
    setEditingIdx(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (idx: number) => {
    setEditingIdx(idx)
    form.setFieldsValue(params[idx])
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const vals = await form.validateFields()
      const item: ParamItem = { ...vals, required: !!vals.required }
      let updated: ParamItem[]
      if (editingIdx !== null) {
        updated = params.map((p, i) => i === editingIdx ? item : p)
      } else {
        updated = [...params, item]
      }
      setParams(updated)
      form.resetFields()
      setModalOpen(false)
      await save(updated)
    } catch { /* validation */ }
  }

  const handleDelete = async (idx: number) => {
    const updated = params.filter((_, i) => i !== idx)
    setParams(updated)
    await save(updated)
  }

  const columns: ColumnsType<ParamItem & { _key: number }> = [
    { title: 'Name', dataIndex: 'name' },
    { title: '显示名称', dataIndex: 'displayName' },
    { title: '类型', dataIndex: 'dataType' },
    { title: '必填', dataIndex: 'required', render: (v: boolean) => v ? <Tag color="red">是</Tag> : <Tag>否</Tag> },
    { title: '默认值', dataIndex: 'defaultValue', render: (v: string) => v || '-' },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, __: unknown, idx: number) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(idx)} />
          <Popconfirm title="确认删除？" onConfirm={() => void handleDelete(idx)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAdd} style={{ marginBottom: 12 }}>
        添加参数
      </Button>
      <Table dataSource={params.map((p, i) => ({ ...p, _key: i }))} columns={columns} rowKey="_key" size="small" pagination={false} />
      <Modal
        title={editingIdx !== null ? '编辑参数' : '添加参数'}
        open={modalOpen}
        onOk={() => void handleSubmit()}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="代码名称" rules={[{ required: true }, { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '须为合法标识符' }]}>
            <Input disabled={editingIdx !== null} />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="dataType" label="数据类型" rules={[{ required: true }]}>
            <Select>
              {['STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'JSON'].map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="required" label="是否必填" initialValue={false}>
            <Select>
              <Select.Option value={true}>是</Select.Option>
              <Select.Option value={false}>否</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="defaultValue" label="默认值"><Input /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── Tab 3: 动作逻辑（规则） ──
interface RuleItem { ruleType: string; target?: string; conditionJson?: string; propertyMappingsJson?: string; sortOrder?: number }

function RulesTab({ action, projectId, onRefresh }: { action: ActionDefinition; projectId: string; onRefresh: () => void }) {
  const [rules, setRules] = useState<RuleItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [execModalOpen, setExecModalOpen] = useState(false)
  const [execParams, setExecParams] = useState('{}')
  const [executing, setExecuting] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    try {
      const parsed = action.rulesJson ? JSON.parse(action.rulesJson) : []
      setRules(Array.isArray(parsed) ? parsed : [])
    } catch {
      setRules([])
    }
  }, [action.rulesJson])

  const save = async (newRules: RuleItem[]) => {
    try {
      await updateProjectAction(projectId, action.id, { rulesJson: JSON.stringify(newRules) })
      message.success('已保存')
      onRefresh()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '保存失败'))
    }
  }

  const handleAdd = async () => {
    try {
      const vals = await form.validateFields()
      const updated = [...rules, vals as RuleItem]
      setRules(updated)
      form.resetFields()
      setModalOpen(false)
      await save(updated)
    } catch { /* validation */ }
  }

  const handleDelete = async (idx: number) => {
    const updated = rules.filter((_, i) => i !== idx)
    setRules(updated)
    await save(updated)
  }

  const handleExecute = () => {
    setExecuting(true)
    try {
      JSON.parse(execParams)
      message.success('执行成功（模拟）')
      setExecModalOpen(false)
    } catch {
      message.error('参数 JSON 格式错误')
    }
    setExecuting(false)
  }

  const columns: ColumnsType<RuleItem & { _key: number }> = [
    { title: '规则类型', dataIndex: 'ruleType' },
    { title: '目标', dataIndex: 'target', render: (v: string) => v || '-' },
    { title: '排序', dataIndex: 'sortOrder', render: (v: number) => v ?? '-' },
    {
      title: '操作',
      render: (_: unknown, __: unknown, idx: number) => (
        <Popconfirm title="确认删除？" onConfirm={() => void handleDelete(idx)}>
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 8 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加规则</Button>
        <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => setExecModalOpen(true)}>执行动作</Button>
      </div>
      <Table dataSource={rules.map((r, i) => ({ ...r, _key: i }))} columns={columns} rowKey="_key" size="small" pagination={false} />

      <Modal title="添加规则" open={modalOpen} onOk={() => void handleAdd()} onCancel={() => { setModalOpen(false); form.resetFields() }} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="ruleType" label="规则类型" rules={[{ required: true }]}>
            <Select>
              {['CREATE_OBJECT', 'UPDATE_OBJECT', 'DELETE_OBJECT', 'CREATE_LINK', 'DELETE_LINK', 'UPDATE_LINK'].map(t => (
                <Select.Option key={t} value={t}>{t}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="target" label="目标类型名"><Input /></Form.Item>
          <Form.Item name="propertyMappingsJson" label="属性映射 (JSON)"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="conditionJson" label="条件 (JSON)"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}><Input type="number" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="执行动作" open={execModalOpen} onOk={handleExecute} onCancel={() => setExecModalOpen(false)} confirmLoading={executing}>
        <p>输入执行参数 (JSON)：</p>
        <Input.TextArea rows={6} value={execParams} onChange={e => setExecParams(e.target.value)} style={{ fontFamily: 'monospace' }} />
      </Modal>
    </>
  )
}

// ── Tab 4: 业务校验 ──
interface ValidationRule { name: string; condition: string; message: string }

function ValidationTab({ action, projectId, onRefresh }: { action: ActionDefinition; projectId: string; onRefresh: () => void }) {
  const [rules, setRules] = useState<ValidationRule[]>([])
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    try {
      const parsed = action.validationRulesJson ? JSON.parse(action.validationRulesJson) : []
      setRules(Array.isArray(parsed) ? parsed : [])
    } catch {
      setRules([])
    }
  }, [action.validationRulesJson])

  const save = async (newRules?: ValidationRule[]) => {
    setSaving(true)
    try {
      await updateProjectAction(projectId, action.id, { validationRulesJson: JSON.stringify(newRules ?? rules) })
      message.success('校验规则已保存')
      onRefresh()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '保存失败'))
    }
    setSaving(false)
  }

  const openAdd = () => {
    setEditingIdx(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (idx: number) => {
    setEditingIdx(idx)
    form.setFieldsValue(rules[idx])
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const vals = await form.validateFields()
      let updated: ValidationRule[]
      if (editingIdx !== null) {
        updated = rules.map((r, i) => i === editingIdx ? (vals as ValidationRule) : r)
      } else {
        updated = [...rules, vals as ValidationRule]
      }
      setRules(updated)
      form.resetFields()
      setModalOpen(false)
      await save(updated)
    } catch { /* validation */ }
  }

  const handleDelete = async (idx: number) => {
    const updated = rules.filter((_, i) => i !== idx)
    setRules(updated)
    await save(updated)
  }

  const columns: ColumnsType<ValidationRule & { _key: number }> = [
    { title: '名称', dataIndex: 'name' },
    { title: '条件', dataIndex: 'condition', ellipsis: true },
    { title: '提示信息', dataIndex: 'message', ellipsis: true },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, __: unknown, idx: number) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(idx)} />
          <Popconfirm title="确认删除？" onConfirm={() => void handleDelete(idx)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={openAdd}>添加校验规则</Button>
        <Button type="primary" size="small" icon={<SaveOutlined />} loading={saving} onClick={() => void save()}>保存</Button>
      </Space>
      <Table dataSource={rules.map((r, i) => ({ ...r, _key: i }))} columns={columns} rowKey="_key" size="small" pagination={false} />
      <Modal
        title={editingIdx !== null ? '编辑校验规则' : '添加校验规则'}
        open={modalOpen}
        onOk={() => void handleSubmit()}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="condition" label="条件表达式" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="message" label="错误提示" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── Tab 5: 触发&异常 ──
interface TriggerFunctionItem {
  functionId: string
  order: number
  triggerType: string
  triggerConfig?: string
}

const TRIGGER_TYPE_OPTIONS = [
  { value: 'MANUAL', label: '手动触发 (Manual)' },
  { value: 'EVENT', label: '事件触发 (Event)' },
  { value: 'SCHEDULE', label: '定时触发 (Schedule)' },
]

function TriggerTab({ action, projectId, functions, onRefresh }: { action: ActionDefinition; projectId: string; functions: FunctionDefinition[]; onRefresh: () => void }) {
  const [exceptionPolicy, setExceptionPolicy] = useState(action.exceptionPolicy || 'IGNORE')
  const [exceptionConfig, setExceptionConfig] = useState(action.exceptionConfigJson || '')
  const [saving, setSaving] = useState(false)
  const [triggerFunctions, setTriggerFunctions] = useState<TriggerFunctionItem[]>([])
  const [addFuncModalOpen, setAddFuncModalOpen] = useState(false)
  const [selectedFuncId, setSelectedFuncId] = useState<string | undefined>()
  // 内联编辑触发配置
  const [editingConfigIdx, setEditingConfigIdx] = useState<number | null>(null)
  const [editingConfigVal, setEditingConfigVal] = useState('')

  const parseTriggerFunctions = (json: string): TriggerFunctionItem[] => {
    try {
      const parsed = JSON.parse(json)
      if (Array.isArray(parsed)) return parsed
    } catch {}
    return []
  }

  useEffect(() => {
    setExceptionPolicy(action.exceptionPolicy || 'IGNORE')
    setExceptionConfig(action.exceptionConfigJson || '')
    setTriggerFunctions(parseTriggerFunctions(action.triggerConfigJson || ''))
  }, [action])

  const persist = async (fns: TriggerFunctionItem[], ep?: string, ec?: string) => {
    setSaving(true)
    try {
      await updateProjectAction(projectId, action.id, {
        triggerConfigJson: JSON.stringify(fns),
        exceptionPolicy: ep ?? exceptionPolicy,
        exceptionConfigJson: ec ?? exceptionConfig,
      })
      message.success('已保存')
      onRefresh()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '保存失败'))
    }
    setSaving(false)
  }

  const handleAddFunction = () => {
    if (!selectedFuncId) return
    if (triggerFunctions.some(f => f.functionId === selectedFuncId)) {
      message.warning('该函数已添加')
      return
    }
    const newFns: TriggerFunctionItem[] = [
      ...triggerFunctions,
      { functionId: selectedFuncId, order: triggerFunctions.length + 1, triggerType: 'MANUAL' },
    ]
    setTriggerFunctions(newFns)
    setAddFuncModalOpen(false)
    setSelectedFuncId(undefined)
    void persist(newFns)
  }

  const handleRemove = (funcId: string) => {
    const newFns = triggerFunctions
      .filter(f => f.functionId !== funcId)
      .map((f, i) => ({ ...f, order: i + 1 }))
    setTriggerFunctions(newFns)
    void persist(newFns)
  }

  const handleMove = (idx: number, dir: 'up' | 'down') => {
    const newFns = [...triggerFunctions]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    ;[newFns[idx], newFns[swapIdx]] = [newFns[swapIdx], newFns[idx]]
    const reordered = newFns.map((f, i) => ({ ...f, order: i + 1 }))
    setTriggerFunctions(reordered)
    void persist(reordered)
  }

  const handleTriggerTypeChange = (idx: number, val: string) => {
    const newFns = triggerFunctions.map((f, i) => i === idx ? { ...f, triggerType: val } : f)
    setTriggerFunctions(newFns)
    void persist(newFns)
  }

  const openConfigEdit = (idx: number) => {
    setEditingConfigIdx(idx)
    setEditingConfigVal(triggerFunctions[idx].triggerConfig || '')
  }

  const saveConfigEdit = () => {
    if (editingConfigIdx === null) return
    const newFns = triggerFunctions.map((f, i) =>
      i === editingConfigIdx ? { ...f, triggerConfig: editingConfigVal } : f
    )
    setTriggerFunctions(newFns)
    setEditingConfigIdx(null)
    void persist(newFns)
  }

  const funcColumns = [
    { title: '顺序', dataIndex: 'order', key: 'order', width: 56 },
    {
      title: '函数',
      key: 'func',
      render: (_: unknown, row: TriggerFunctionItem) => {
        const fn = functions.find(f => f.id === row.functionId)
        return fn ? fn.name : `#${row.functionId}`
      },
    },
    {
      title: '触发类型',
      key: 'triggerType',
      width: 180,
      render: (_: unknown, row: TriggerFunctionItem, idx: number) => (
        <Select
          size="small"
          style={{ width: '100%' }}
          value={row.triggerType}
          onChange={(val: string) => handleTriggerTypeChange(idx, val)}
        >
          {TRIGGER_TYPE_OPTIONS.map(o => (
            <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: '触发配置',
      key: 'triggerConfig',
      width: 90,
      render: (_: unknown, row: TriggerFunctionItem, idx: number) => (
        <Button size="small" type="link" onClick={() => openConfigEdit(idx)}>
          {row.triggerConfig ? '编辑' : '配置'}
        </Button>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 110,
      render: (_: unknown, row: TriggerFunctionItem, idx: number) => (
        <Space>
          <Button size="small" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => handleMove(idx, 'up')} />
          <Button size="small" icon={<ArrowDownOutlined />} disabled={idx === triggerFunctions.length - 1} onClick={() => handleMove(idx, 'down')} />
          <Popconfirm title="确认移除？" onConfirm={() => handleRemove(row.functionId)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, color: '#e6521e' }}>触发方式</div>
        <div style={{ marginBottom: 8 }}>
          <Button size="small" icon={<PlusOutlined />} onClick={() => setAddFuncModalOpen(true)}>添加触发函数</Button>
        </div>
        <Table
          dataSource={triggerFunctions.map((f, i) => ({ ...f, _key: i }))}
          columns={funcColumns}
          rowKey="_key"
          size="small"
          pagination={false}
          locale={{ emptyText: '暂无触发函数，点击上方按钮添加' }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, color: '#cf1322' }}>异常处理</div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>异常策略</label>
          <Select style={{ width: '100%' }} value={exceptionPolicy} onChange={setExceptionPolicy}>
            <Select.Option value="IGNORE">忽略 (Ignore)</Select.Option>
            <Select.Option value="RETRY">重试 (Retry)</Select.Option>
            <Select.Option value="SKIP">跳过 (Skip)</Select.Option>
            <Select.Option value="ABORT">终止 (Abort)</Select.Option>
            <Select.Option value="ROLLBACK">回滚 (Rollback)</Select.Option>
          </Select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>异常配置 (JSON)</label>
          <Input.TextArea rows={4} value={exceptionConfig} onChange={e => setExceptionConfig(e.target.value)} style={{ fontFamily: 'monospace' }} />
        </div>
      </div>

      <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void persist(triggerFunctions)}>
        保存异常配置
      </Button>

      {/* 添加触发函数 Modal */}
      <Modal
        title="添加触发函数"
        open={addFuncModalOpen}
        onOk={handleAddFunction}
        onCancel={() => { setAddFuncModalOpen(false); setSelectedFuncId(undefined) }}
        okText="添加"
        cancelText="取消"
        destroyOnClose
      >
        <div>
          <label style={labelStyle}>选择函数</label>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择函数"
            value={selectedFuncId}
            onChange={setSelectedFuncId}
            showSearch
            optionFilterProp="children"
          >
            {functions.map(fn => (
              <Select.Option key={fn.id} value={fn.id}>
                {fn.name}
                {triggerFunctions.some(f => f.functionId === fn.id) && <Tag color="blue" style={{ marginLeft: 8 }}>已添加</Tag>}
              </Select.Option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* 触发配置编辑 Modal */}
      <Modal
        title="触发配置 (JSON / Cron)"
        open={editingConfigIdx !== null}
        onOk={saveConfigEdit}
        onCancel={() => setEditingConfigIdx(null)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Input.TextArea
          rows={6}
          value={editingConfigVal}
          onChange={e => setEditingConfigVal(e.target.value)}
          style={{ fontFamily: 'monospace' }}
          placeholder='例: {"cron": "0 8 * * 1"}'
        />
      </Modal>
    </div>
  )
}

// ── 详情面板 ──
function ActionDetail({ action, projectId, functions, entityTypes, onRefresh }: { action: ActionDefinition | null; projectId: string; functions: FunctionDefinition[]; entityTypes: EntityTypeConfig[]; onRefresh: () => void }) {
  if (!action) {
    return (
      <div style={detailStyles.empty}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
        <div>选择一个动作以查看详情</div>
      </div>
    )
  }

  const items = [
    { key: 'basic', label: '基本信息', children: <BasicInfoTab action={action} projectId={projectId} entityTypes={entityTypes} onRefresh={onRefresh} /> },
    { key: 'params', label: '参数配置', children: <ParametersTab action={action} projectId={projectId} onRefresh={onRefresh} /> },
    { key: 'rules', label: '动作逻辑', children: <RulesTab action={action} projectId={projectId} onRefresh={onRefresh} /> },
    { key: 'validation', label: '业务审计', children: <ValidationTab action={action} projectId={projectId} onRefresh={onRefresh} /> },
    { key: 'trigger', label: '触发&异常', children: <TriggerTab action={action} projectId={projectId} functions={functions} onRefresh={onRefresh} /> },
  ]

  return (
    <div style={detailStyles.panel}>
      <div style={detailStyles.header}>
        <span style={detailStyles.title}>{action.displayName || action.name}</span>
        <Tag color={action.status === 'ACTIVE' ? 'green' : 'default'}>{action.status}</Tag>
      </div>
      <Tabs items={items} />
    </div>
  )
}

// ── 主组件 ──
export default function ActionsTab({ projectId, actions, functions, entityTypes, loadProject }: ActionsTabProps) {
  const [selected, setSelected] = useState<ActionDefinition | null>(null)

  // 当 actions 刷新后，同步更新选中项的数据
  useEffect(() => {
    if (selected) {
      const updated = actions.find(a => a.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [actions, selected])

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', minHeight: 500 }}>
      <ActionsPanel
        actions={actions}
        selected={selected}
        onSelect={setSelected}
        onRefresh={loadProject}
        projectId={projectId}
      />
      <ActionDetail action={selected} projectId={projectId} functions={functions} entityTypes={entityTypes} onRefresh={loadProject} />
    </div>
  )
}

// ── 样式 ──
const panelStyles: Record<string, React.CSSProperties> = {
  panel: { width: 260, minWidth: 260, background: '#fff', borderRadius: 8, padding: 16, overflowY: 'auto', height: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontWeight: 600, fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  item: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', transition: 'background .15s' },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  itemName: { fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  itemCode: { fontSize: 11, color: '#999' },
}

const detailStyles: Record<string, React.CSSProperties> = {
  panel: { flex: 1, background: '#fff', borderRadius: 8, padding: 20, overflowY: 'auto' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 8, color: '#999', fontSize: 14 },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { fontWeight: 600, fontSize: 16 },
}
