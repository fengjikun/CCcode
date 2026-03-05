import React, { useEffect, useState, useCallback } from 'react'
import {
  Tabs, Button, Input, Select, Tag, Table, Popconfirm, Modal, Form,
  message, Spin, Badge, Space,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, PlayCircleOutlined, SaveOutlined,
} from '@ant-design/icons'
import type {
  ActionType, ActionParameter, ActionRule, ExecutionRecord, ObjectType, ValidationRule,
} from '../../../types/ontology'
import {
  updateActionType, getActionParameters, createActionParameter, deleteActionParameter,
  getActionRules, createActionRule, deleteActionRule,
  getExecutions, executeAction,
} from '../../../api/ontology'

interface Props {
  actionType: ActionType | null
  objectTypes: ObjectType[]
  onRefresh: () => void
}

// ── Tab 1: Basic Info ──
const BasicInfoTab: React.FC<{ at: ActionType; objectTypes: ObjectType[]; onRefresh: () => void }> = ({
  at, objectTypes, onRefresh,
}) => {
  const [displayName, setDisplayName] = useState(at.displayName)
  const [description, setDescription] = useState(at.description || '')
  const [targetOT, setTargetOT] = useState<number | null>(at.targetObjectTypeId ?? null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDisplayName(at.displayName)
    setDescription(at.description || '')
    setTargetOT(at.targetObjectTypeId ?? null)
  }, [at])

  const save = async () => {
    setSaving(true)
    try {
      await updateActionType(at.id, { displayName, description, targetObjectTypeId: targetOT })
      message.success('已保存')
      onRefresh()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async () => {
    const next = at.status === 'ACTIVE' ? 'DEPRECATED' : 'ACTIVE'
    try {
      await updateActionType(at.id, { status: next })
      message.success(`状态已切换为 ${next}`)
      onRefresh()
    } catch {}
  }

  const statusColor = at.status === 'ACTIVE' ? 'green' : at.status === 'DRAFT' ? 'default' : 'red'

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Name (readonly)</label>
        <Input value={at.name} disabled />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>状态</label>
        <div><Badge status={statusColor as any} text={at.status} /></div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>显示名称</label>
        <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>描述</label>
        <Input.TextArea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>目标实体类型</label>
        <Select
          style={{ width: '100%' }}
          value={targetOT}
          onChange={v => setTargetOT(v)}
          allowClear
          placeholder="选择目标实体类型"
        >
          {objectTypes.map(ot => (
            <Select.Option key={ot.id} value={ot.id}>{ot.displayName || ot.name}</Select.Option>
          ))}
        </Select>
      </div>
      <Space>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
        <Button onClick={toggleStatus}>
          {at.status === 'ACTIVE' ? '停用' : '启用'}
        </Button>
      </Space>
    </div>
  )
}

// ── Tab 2: Parameters ──
const ParametersTab: React.FC<{ atId: number }> = ({ atId }) => {
  const [params, setParams] = useState<ActionParameter[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try { setParams(await getActionParameters(atId)) } catch {}
    finally { setLoading(false) }
  }, [atId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    try {
      const vals = await form.validateFields()
      await createActionParameter(atId, { ...vals, required: !!vals.required })
      message.success('参数已添加')
      form.resetFields()
      setModalOpen(false)
      load()
    } catch {}
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteActionParameter(id)
      message.success('已删除')
      load()
    } catch { /* error shown by fetchJSON */ }
  }

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: '显示名称', dataIndex: 'displayName', key: 'displayName' },
    { title: '类型', dataIndex: 'dataType', key: 'dataType' },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      render: (v: boolean) => v ? <Tag color="red">是</Tag> : <Tag>否</Tag>,
    },
    { title: '默认值', dataIndex: 'defaultValue', key: 'defaultValue', render: (v: string) => v || '-' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ActionParameter) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ marginBottom: 12 }}>
        添加参数
      </Button>
      <Table dataSource={params} columns={columns} rowKey="id" loading={loading} size="small" pagination={false} />
      <Modal title="添加参数" open={modalOpen} onOk={handleCreate} onCancel={() => { setModalOpen(false); form.resetFields() }} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="代码名称" rules={[
            { required: true, message: '请输入参数名称' },
            { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '参数名须为合法标识符（字母/下划线开头）' },
            {
              validator: (_, value) => {
                if (value && params.some(p => p.name === value)) {
                  return Promise.reject('参数名称已存在')
                }
                return Promise.resolve()
              },
            },
          ]}><Input /></Form.Item>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="dataType" label="数据类型" rules={[{ required: true }]}>
            <Select placeholder="选择">
              {['STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'JSON'].map(t => (
                <Select.Option key={t} value={t}>{t}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="required" label="是否必填" initialValue={false}>
            <Select>
              <Select.Option value={true}>是</Select.Option>
              <Select.Option value={false}>否</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="defaultValue" label="默认值"><Input /></Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}><Input type="number" /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── Tab 3: Rules + Execution History ──
const RulesTab: React.FC<{ atId: number }> = ({ atId }) => {
  const [rules, setRules] = useState<ActionRule[]>([])
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [execModalOpen, setExecModalOpen] = useState(false)
  const [execParams, setExecParams] = useState('{}')
  const [executing, setExecuting] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, e] = await Promise.all([getActionRules(atId), getExecutions(atId)])
      setRules(r)
      setExecutions(e)
    } catch {}
    finally { setLoading(false) }
  }, [atId])

  useEffect(() => { load() }, [load])

  const handleCreateRule = async () => {
    try {
      const vals = await form.validateFields()
      await createActionRule(atId, vals)
      message.success('规则已添加')
      form.resetFields()
      setModalOpen(false)
      load()
    } catch {}
  }

  const handleDeleteRule = async (id: number) => {
    try {
      await deleteActionRule(id)
      message.success('已删除')
      load()
    } catch { /* error shown by fetchJSON */ }
  }

  const handleExecute = async () => {
    setExecuting(true)
    try {
      const params = JSON.parse(execParams)
      await executeAction(atId, params)
      message.success('执行成功')
      setExecModalOpen(false)
      load()
    } catch (err: any) {
      if (err instanceof SyntaxError) message.error('参数 JSON 格式错误')
    }
    setExecuting(false)
  }

  const ruleColumns = [
    { title: '规则类型', dataIndex: 'ruleType', key: 'ruleType' },
    { title: '目标', key: 'target', render: (_: unknown, r: ActionRule) => r.targetObjectTypeName || r.targetLinkTypeName || '-' },
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, r: ActionRule) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDeleteRule(r.id)}>
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  const execColumns = [
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'SUCCESS' ? 'green' : 'red'}>{v}</Tag> },
    { title: '执行时间', dataIndex: 'executedAt', key: 'executedAt' },
    { title: '耗时(ms)', dataIndex: 'durationMs', key: 'durationMs', render: (v: number) => v ?? '-' },
    { title: '错误', dataIndex: 'errorMessage', key: 'errorMessage', render: (v: string) => v || '-' },
  ]

  return (
    <Spin spinning={loading}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>动作规则</strong>
          <Space>
            <Button size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加规则</Button>
            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => setExecModalOpen(true)}>执行动作</Button>
          </Space>
        </div>
        <Table dataSource={rules} columns={ruleColumns} rowKey="id" size="small" pagination={false} />
      </div>

      <div>
        <strong style={{ marginBottom: 8, display: 'block' }}>执行历史</strong>
        <Table dataSource={executions} columns={execColumns} rowKey="id" size="small" pagination={{ pageSize: 5 }} />
      </div>

      <Modal title="添加规则" open={modalOpen} onOk={handleCreateRule} onCancel={() => { setModalOpen(false); form.resetFields() }} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="ruleType" label="规则类型" rules={[{ required: true }]}>
            <Select placeholder="选择">
              {['CREATE_OBJECT', 'UPDATE_OBJECT', 'DELETE_OBJECT', 'CREATE_LINK', 'DELETE_LINK', 'CUSTOM'].map(t => (
                <Select.Option key={t} value={t}>{t}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="targetObjectTypeName" label="目标实体类型名"><Input /></Form.Item>
          <Form.Item name="targetLinkTypeName" label="目标关系类型名"><Input /></Form.Item>
          <Form.Item name="propertyMappingsJson" label="属性映射 (JSON)"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="conditionJson" label="条件 (JSON)"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}><Input type="number" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="执行动作" open={execModalOpen} onOk={handleExecute} onCancel={() => setExecModalOpen(false)} confirmLoading={executing}>
        <p>输入执行参数 (JSON)：</p>
        <Input.TextArea rows={6} value={execParams} onChange={e => setExecParams(e.target.value)} style={{ fontFamily: 'monospace' }} />
      </Modal>
    </Spin>
  )
}

// ── Tab 4: Validation Rules ──
const ValidationTab: React.FC<{ at: ActionType; onRefresh: () => void }> = ({ at, onRefresh }) => {
  const [rules, setRules] = useState<ValidationRule[]>([])
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    try {
      const parsed = at.validationRulesJson ? JSON.parse(at.validationRulesJson) : []
      setRules(Array.isArray(parsed) ? parsed : [])
    } catch {
      setRules([])
    }
  }, [at.validationRulesJson])

  const save = async (newRules?: ValidationRule[]) => {
    setSaving(true)
    const data = newRules ?? rules
    try {
      await updateActionType(at.id, { validationRulesJson: JSON.stringify(data) })
      message.success('校验规则已保存')
      onRefresh()
    } catch {}
    setSaving(false)
  }

  const handleAdd = async () => {
    try {
      const vals = await form.validateFields()
      const updated = [...rules, vals as ValidationRule]
      setRules(updated)
      form.resetFields()
      setModalOpen(false)
      save(updated)
    } catch {}
  }

  const handleDelete = (idx: number) => {
    const updated = rules.filter((_, i) => i !== idx)
    setRules(updated)
    save(updated)
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '条件', dataIndex: 'condition', key: 'condition', ellipsis: true },
    { title: '提示信息', dataIndex: 'message', key: 'message', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, __: unknown, idx: number) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(idx)}>
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加校验规则</Button>
        <Button type="primary" size="small" icon={<SaveOutlined />} loading={saving} onClick={() => save()}>保存</Button>
      </Space>
      <Table dataSource={rules.map((r, i) => ({ ...r, _key: i }))} columns={columns} rowKey="_key" size="small" pagination={false} />
      <Modal title="添加校验规则" open={modalOpen} onOk={handleAdd} onCancel={() => { setModalOpen(false); form.resetFields() }} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="condition" label="条件表达式" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="message" label="错误提示" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── Tab 5: Trigger & Exception ──
const TriggerTab: React.FC<{ at: ActionType; onRefresh: () => void }> = ({ at, onRefresh }) => {
  const [triggerType, setTriggerType] = useState(at.triggerType || 'MANUAL')
  const [triggerConfig, setTriggerConfig] = useState(at.triggerConfigJson || '')
  const [exceptionPolicy, setExceptionPolicy] = useState(at.exceptionPolicy || '')
  const [exceptionConfig, setExceptionConfig] = useState(at.exceptionConfigJson || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTriggerType(at.triggerType || 'MANUAL')
    setTriggerConfig(at.triggerConfigJson || '')
    setExceptionPolicy(at.exceptionPolicy || '')
    setExceptionConfig(at.exceptionConfigJson || '')
  }, [at])

  const save = async () => {
    setSaving(true)
    try {
      await updateActionType(at.id, {
        triggerType,
        triggerConfigJson: triggerConfig,
        exceptionPolicy,
        exceptionConfigJson: exceptionConfig,
      })
      message.success('已保存')
      onRefresh()
    } catch {}
    setSaving(false)
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>触发方式</label>
        <Select style={{ width: '100%' }} value={triggerType} onChange={setTriggerType}>
          <Select.Option value="MANUAL">MANUAL (手动)</Select.Option>
          <Select.Option value="EVENT">EVENT (事件)</Select.Option>
          <Select.Option value="SCHEDULE">SCHEDULE (定时)</Select.Option>
        </Select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>触发配置 (JSON)</label>
        <Input.TextArea rows={4} value={triggerConfig} onChange={e => setTriggerConfig(e.target.value)} style={{ fontFamily: 'monospace' }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>异常策略</label>
        <Select style={{ width: '100%' }} value={exceptionPolicy || undefined} onChange={setExceptionPolicy} allowClear placeholder="选择异常策略">
          <Select.Option value="RETRY">RETRY (重试)</Select.Option>
          <Select.Option value="SKIP">SKIP (跳过)</Select.Option>
          <Select.Option value="ABORT">ABORT (终止)</Select.Option>
          <Select.Option value="FALLBACK">FALLBACK (回退)</Select.Option>
        </Select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>异常配置 (JSON)</label>
        <Input.TextArea rows={4} value={exceptionConfig} onChange={e => setExceptionConfig(e.target.value)} style={{ fontFamily: 'monospace' }} />
      </div>
      <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }

// ── Main ActionDetail ──
const ActionDetail: React.FC<Props> = ({ actionType, objectTypes, onRefresh }) => {
  if (!actionType) {
    return (
      <div style={styles.empty}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>&#9881;</div>
        <div>选择一个动作类型以查看详情</div>
      </div>
    )
  }

  const items = [
    {
      key: 'basic',
      label: '基本信息',
      children: <BasicInfoTab at={actionType} objectTypes={objectTypes} onRefresh={onRefresh} />,
    },
    {
      key: 'params',
      label: '参数配置',
      children: <ParametersTab atId={actionType.id} />,
    },
    {
      key: 'rules',
      label: '动作逻辑',
      children: <RulesTab atId={actionType.id} />,
    },
    {
      key: 'validation',
      label: '业务校验',
      children: <ValidationTab at={actionType} onRefresh={onRefresh} />,
    },
    {
      key: 'trigger',
      label: '触发&异常',
      children: <TriggerTab at={actionType} onRefresh={onRefresh} />,
    },
  ]

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>{actionType.displayName || actionType.name}</span>
        <Tag color={actionType.status === 'ACTIVE' ? 'green' : actionType.status === 'DRAFT' ? 'default' : 'red'}>
          {actionType.status}
        </Tag>
      </div>
      <Tabs items={items} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    flex: 1,
    background: '#fff',
    borderRadius: 8,
    padding: 20,
    overflowY: 'auto',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    borderRadius: 8,
    color: '#999',
    fontSize: 14,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: { fontWeight: 600, fontSize: 16 },
}

export default ActionDetail
