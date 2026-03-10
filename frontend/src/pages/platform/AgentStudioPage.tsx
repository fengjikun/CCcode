import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  RocketOutlined,
  SearchOutlined,
  SendOutlined,
  TableOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  createAgent,
  deleteAgent,
  listAgents,
  updateAgent,
} from '../../api/agentStudio'
import { listSkills } from '../../api/skillsMarket'
import {
  createDigitalHuman,
  listDigitalHumans,
} from '../../api/digitalHuman'
import type { Agent } from '../../types/agent'
import {
  AGENT_TYPES,
  AGENT_TYPE_COLORS,
  AGENT_TYPE_DESCRIPTIONS,
  AGENT_TYPE_ICONS,
  AGENT_TYPE_LABELS,
  AGENT_STATUS_COLORS,
} from '../../types/agent'
import type { AgentType } from '../../types/agent'
import type { Skill } from '../../types/skill'
import { SKILL_CATEGORY_COLORS, SKILL_CATEGORY_ICONS } from '../../types/skill'
import PageHeader from '../../components/shared/PageHeader'
import StatCards from '../../components/shared/StatCards'
import ModalHeader from '../../components/shared/ModalHeader'
import ActionColumn from '../../components/shared/ActionColumn'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

/* ──────────── 模型选项 ──────────── */
const MODEL_OPTIONS = [
  { value: 'Deepexi-Platform-70B', label: 'Deepexi-Platform-70B' },
  { value: 'Deepexi-R1-Reasoner', label: 'Deepexi-R1-Reasoner' },
  { value: 'Deepexi-Industry-60B-Instruct', label: 'Deepexi-Industry-60B-Instruct' },
  { value: 'Deepexi-General-Agent', label: 'Deepexi-General-Agent' },
]

/* ──────────── 表单类型 ──────────── */
interface CreateForm {
  name: string
  type: AgentType
  description?: string
  systemPrompt: string
  model: string
}

/* ──────────── 编排可视化 ──────────── */
function OrchestrationView({ agents, skills }: { agents: Agent[]; skills: Skill[] }) {
  const canvasRef = useRef<HTMLDivElement>(null)

  const getSkill = (id: string) => skills.find(s => s.id === id)

  // 动态计算节点间距，确保不溢出
  const agentSpacing = Math.max(100, Math.min(140, 600 / Math.max(agents.length, 1)))
  const agentPositions = agents.map((_, i) => ({
    x: 160,
    y: 80 + i * agentSpacing,
  }))

  // 收集所有 skill ids (去重)
  const allSkillIds = [...new Set(agents.flatMap(a => a.skillIds))]
  const skillSpacing = Math.max(50, Math.min(80, 600 / Math.max(allSkillIds.length, 1)))
  const skillPositions = allSkillIds.map((_, i) => ({
    x: 560,
    y: 60 + i * skillSpacing,
  }))

  const svgHeight = Math.max(
    agents.length * agentSpacing,
    allSkillIds.length * skillSpacing,
  ) + 120

  return (
    <div ref={canvasRef} style={{ position: 'relative', overflow: 'auto' }}>
      {/* 协作模式说明 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: '串行编排', desc: 'Agent 按顺序执行，前一个完成后触发下一个', color: '#4f46e5' },
          { label: '并行编排', desc: '多个 Agent 同时执行，汇总结果', color: '#16a34a' },
          { label: '决策路由', desc: '根据输入条件路由到不同 Agent', color: '#d97706' },
        ].map(m => (
          <div key={m.label} style={{
            flex: 1, minWidth: 200, padding: '12px 16px', borderRadius: 8,
            background: `${m.color}08`, border: `1px solid ${m.color}30`,
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: m.color, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* 可视化画布 */}
      <div style={{
        background: '#fafbfc', border: '1px solid #e8e8e8', borderRadius: 8,
        padding: 24, position: 'relative', minHeight: svgHeight,
      }}>
        {/* 标题列 */}
        <div style={{ position: 'absolute', left: 100, top: 16, fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
          <RobotOutlined style={{ marginRight: 4 }} />Agents
        </div>
        <div style={{ position: 'absolute', left: 500, top: 16, fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
          <ThunderboltOutlined style={{ marginRight: 4 }} />Skills
        </div>

        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: svgHeight, pointerEvents: 'none' }}
        >
          {/* 连线 */}
          {agents.map((agent, ai) =>
            agent.skillIds.map(sid => {
              const si = allSkillIds.indexOf(sid)
              if (si < 0) return null
              const x1 = agentPositions[ai].x + 140
              const y1 = agentPositions[ai].y + 24
              const x2 = skillPositions[si].x - 10
              const y2 = skillPositions[si].y + 18
              const midX = (x1 + x2) / 2
              return (
                <path
                  key={`${agent.id}-${sid}`}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  stroke={AGENT_TYPE_COLORS[agent.type] === 'blue' ? '#4f46e5' : AGENT_TYPE_COLORS[agent.type] === 'cyan' ? '#0891b2' : '#7c3aed'}
                  strokeWidth={1.5}
                  strokeOpacity={0.35}
                  fill="none"
                />
              )
            })
          )}
          {/* Agent 间串行连线 */}
          {agents.length > 1 && agents.slice(0, -1).map((_, i) => {
            const y1 = agentPositions[i].y + 48
            const y2 = agentPositions[i + 1].y
            return (
              <line
                key={`serial-${i}`}
                x1={agentPositions[i].x + 70}
                y1={y1}
                x2={agentPositions[i + 1].x + 70}
                y2={y2}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            )
          })}
        </svg>

        {/* Agent 节点 */}
        {agents.map((agent, i) => (
          <div key={agent.id} style={{
            position: 'absolute',
            left: agentPositions[i].x - 10,
            top: agentPositions[i].y,
            width: 300,
            background: '#fff',
            border: `2px solid ${agent.status === 'Active' ? '#52c41a' : agent.status === 'Testing' ? '#faad14' : '#d9d9d9'}`,
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{AGENT_TYPE_ICONS[agent.type]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{agent.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  <Tag color={AGENT_TYPE_COLORS[agent.type]} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', marginRight: 4 }}>
                    {AGENT_TYPE_LABELS[agent.type]}
                  </Tag>
                  {agent.model} · {agent.skillIds.length} Skills
                </div>
              </div>
              <Tag color={AGENT_STATUS_COLORS[agent.status]} style={{ margin: 0 }}>{agent.status}</Tag>
            </div>
          </div>
        ))}

        {/* Skill 节点 */}
        {allSkillIds.map((sid, i) => {
          const sk = getSkill(sid)
          return (
            <div key={sid} style={{
              position: 'absolute',
              left: skillPositions[i].x,
              top: skillPositions[i].y,
              background: '#fff',
              border: '1px solid #d9f7be',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              whiteSpace: 'nowrap',
            }}>
              {sk ? (
                <Space size={4}>
                  <Tag color={SKILL_CATEGORY_COLORS[sk.category]} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
                    {SKILL_CATEGORY_ICONS[sk.category]}
                  </Tag>
                  <span style={{ fontWeight: 500 }}>{sk.displayName}</span>
                </Space>
              ) : (
                <Text type="secondary">{sid}</Text>
              )}
            </div>
          )
        })}

        {agents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            暂无智能体，请先创建
          </div>
        )}
      </div>
    </div>
  )
}

/* ──────────── 主页面 ──────────── */
export default function AgentStudioPage() {
  const navigate = useNavigate()
  const [list, setList] = useState<Agent[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'orchestration'>('table')

  // 创建弹窗
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<CreateForm>()
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])

  // 编辑弹窗
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Agent | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm] = Form.useForm<CreateForm>()
  const [editSkillIds, setEditSkillIds] = useState<string[]>([])

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<Agent | null>(null)

  // 发布弹窗
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishTarget, setPublishTarget] = useState<Agent | null>(null)
  const [publishing, setPublishing] = useState(false)

  // 已发布数字员工数（缓存到 state，避免 JSX 中直接调用 localStorage）
  const [digitalHumanCount, setDigitalHumanCount] = useState(0)

  const reload = useCallback(async () => {
    const [agents, sk, dh] = await Promise.all([listAgents(), listSkills(), listDigitalHumans()])
    setList(agents)
    setSkills(sk)
    setDigitalHumanCount(dh.length)
  }, [])

  useEffect(() => { reload() }, [reload])

  /* Skill Map 缓存 */
  const skillMap = useMemo(() => {
    const map = new Map<string, Skill>()
    for (const sk of skills) map.set(sk.id, sk)
    return map
  }, [skills])

  const getSkillObj = (id: string): Skill | undefined => skillMap.get(id)

  /* 过滤 */
  const filtered = list.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  /* 创建 */
  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setCreating(true)
      await createAgent({
        name: values.name,
        type: values.type,
        description: values.description,
        systemPrompt: values.systemPrompt,
        model: values.model,
        skillIds: selectedSkillIds,
      })
      message.success('智能体创建成功')
      setCreateOpen(false)
      form.resetFields()
      setSelectedSkillIds([])
      await reload()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  /* 编辑 */
  const openEdit = (agent: Agent) => {
    setEditTarget(agent)
    editForm.setFieldsValue({
      name: agent.name,
      type: agent.type,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
    })
    setEditSkillIds([...agent.skillIds])
    setEditOpen(true)
  }

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields()
      setEditing(true)
      await updateAgent(editTarget!.id, {
        name: values.name,
        description: values.description,
        systemPrompt: values.systemPrompt,
        model: values.model,
        skillIds: editSkillIds,
      })
      message.success('修改成功')
      setEditOpen(false)
      await reload()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('修改失败')
    } finally {
      setEditing(false)
    }
  }

  /* 删除 */
  const handleDelete = async (id: string) => {
    await deleteAgent(id)
    message.success('智能体已删除')
    await reload()
  }

  /* 详情 */
  const openDetail = (agent: Agent) => {
    setDetailTarget(agent)
    setDetailOpen(true)
  }

  /* 发布为数字员工 */
  const openPublish = (agent: Agent) => {
    setPublishTarget(agent)
    setPublishOpen(true)
  }

  const handlePublish = async () => {
    if (!publishTarget) return
    setPublishing(true)
    try {
      // 更新 agent 状态为 Active
      await updateAgent(publishTarget.id, { status: 'Active' })
      // 创建数字员工
      const dh = await createDigitalHuman(
        publishTarget.name,
        'fault-repair',
        `由智能体「${publishTarget.name}」发布。${publishTarget.description || ''}`,
      )
      message.success('发布成功！已创建数字员工')
      setPublishOpen(false)
      await reload()
      // 跳转到数字员工页面
      navigate(`/digital-worker/business/${dh.id}`)
    } catch {
      message.error('发布失败')
    } finally {
      setPublishing(false)
    }
  }

  /* Skill 选择器（带搜索的复选框列表） */
  const [skillSearch, setSkillSearch] = useState('')

  const renderSkillSelector = (
    selected: string[],
    onChange: (ids: string[]) => void,
  ) => {
    const activeSkills = skills.filter(s => s.status !== 'Disabled')
    const searchLower = skillSearch.toLowerCase()
    const filteredSkills = activeSkills.filter(s =>
      !skillSearch || s.displayName.toLowerCase().includes(searchLower) || s.name.toLowerCase().includes(searchLower)
    )
    return (
      <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 12 }}>
        <Input
          placeholder="搜索 Skill..."
          prefix={<SearchOutlined />}
          allowClear
          size="small"
          value={skillSearch}
          onChange={e => setSkillSearch(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {filteredSkills.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={activeSkills.length === 0 ? '暂无可用 Skill，请先在 Skills Hub注册' : '无匹配结果'} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredSkills.map(s => {
              const checked = selected.includes(s.id)
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (checked) {
                      onChange(selected.filter(id => id !== s.id))
                    } else {
                      onChange([...selected, s.id])
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: checked ? '#e6f4ff' : '#fafafa',
                    border: `1px solid ${checked ? '#91caff' : '#f0f0f0'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <CheckCircleOutlined style={{ color: checked ? '#1677ff' : '#d9d9d9', fontSize: 16 }} />
                  <Tag color={SKILL_CATEGORY_COLORS[s.category]} style={{ margin: 0 }}>{SKILL_CATEGORY_ICONS[s.category]}</Tag>
                  <Text strong style={{ fontSize: 13 }}>{s.displayName}</Text>
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>{s.name}</Text>
                </div>
              )
            })}
          </div>
        )}
        </div>
        {selected.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>已选择 {selected.length} 个 Skill</Text>
          </div>
        )}
      </div>
    )
  }

  /* 表格列 */
  const columns = [
    {
      title: '智能体名称',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, r: Agent) => (
        <Space>
          <span style={{ fontSize: 18 }}>{AGENT_TYPE_ICONS[r.type]}</span>
          <div>
            <Text strong style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => openDetail(r)}>{v}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{r.description?.slice(0, 40) || '-'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v: AgentType) => <Tag color={AGENT_TYPE_COLORS[v]}>{AGENT_TYPE_ICONS[v]} {AGENT_TYPE_LABELS[v]}</Tag>,
    },
    {
      title: '绑定 Skills',
      key: 'skills',
      width: 200,
      render: (_: unknown, r: Agent) => (
        <Space size={4} wrap>
          {r.skillIds.slice(0, 3).map(id => {
            const sk = getSkillObj(id)
            return sk ? (
              <Tag key={id} color={SKILL_CATEGORY_COLORS[sk.category]} style={{ fontSize: 11 }}>{sk.displayName}</Tag>
            ) : (
              <Tag key={id} style={{ fontSize: 11 }}>{id}</Tag>
            )
          })}
          {r.skillIds.length > 3 && <Tag style={{ fontSize: 11 }}>+{r.skillIds.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '模型',
      dataIndex: 'model',
      key: 'model',
      width: 120,
      render: (v: string) => <Tag color="geekblue">{v}</Tag>,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => (
        <span>
          <span className={`status-dot ${v === 'Active' ? 'active' : v === 'Testing' ? 'warning' : 'error'}`} />
          <Tag color={AGENT_STATUS_COLORS[v as keyof typeof AGENT_STATUS_COLORS]}>{v}</Tag>
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: Agent) => (
        <ActionColumn actions={[
          { key: 'view', icon: <EyeOutlined />, tooltip: '详情', onClick: () => openDetail(record) },
          { key: 'edit', icon: <EditOutlined />, tooltip: '编辑', onClick: () => openEdit(record) },
          { key: 'publish', icon: <RocketOutlined />, tooltip: '发布为数字员工', style: { color: '#52c41a' }, onClick: () => openPublish(record) },
          { key: 'delete', icon: <DeleteOutlined />, tooltip: '删除', danger: true, confirm: '确认删除该智能体？', onClick: () => handleDelete(record.id) },
        ]} />
      ),
    },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <PageHeader title="智能体编排" subtitle="创建、编排和管理 AI 智能体，绑定 Skills 支撑业务协同与自动化执行" />

        <StatCards items={[
          { title: '智能体总数', value: list.length, icon: <RobotOutlined />, cls: 'stat-primary' },
          { title: '运行中', value: list.filter(a => a.status === 'Active').length, icon: <CheckCircleOutlined />, cls: 'stat-success' },
          { title: '可用 Skills', value: skills.filter(s => s.status === 'Active').length, icon: <ThunderboltOutlined />, cls: 'stat-warning' },
          { title: '已发布数字员工', value: digitalHumanCount, icon: <TeamOutlined />, cls: 'stat-info' },
        ]} />

        {/* 类型说明 */}
        <Row gutter={12} style={{ marginBottom: 20 }}>
          {AGENT_TYPES.map(t => (
            <Col span={8} key={t}>
              <Card size="small" style={{ background: '#fafafa' }} styles={{ body: { padding: '12px 16px' } }}>
                <Space align="start">
                  <span style={{ fontSize: 22 }}>{AGENT_TYPE_ICONS[t]}</span>
                  <div>
                    <Tag color={AGENT_TYPE_COLORS[t]} style={{ marginBottom: 4 }}>{AGENT_TYPE_LABELS[t]}</Tag>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.6 }}>
                      {AGENT_TYPE_DESCRIPTIONS[t]}
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 工具栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>
            <Radio.Group value={viewMode} onChange={e => setViewMode(e.target.value)} size="small" buttonStyle="solid">
              <Radio.Button value="table"><TableOutlined /> 列表</Radio.Button>
              <Radio.Button value="orchestration"><ApartmentOutlined /> 编排视图</Radio.Button>
            </Radio.Group>
            {viewMode === 'table' && (
              <Input
                placeholder="搜索智能体名称"
                prefix={<SearchOutlined />}
                allowClear
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: 220 }}
                size="small"
              />
            )}
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={reload} size="small">刷新</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setCreateOpen(true); form.resetFields(); setSelectedSkillIds([]) }}
            >
              创建智能体
            </Button>
          </Space>
        </div>

        {viewMode === 'table' ? (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            pagination={filtered.length > 10 ? { pageSize: 10 } : false}
            size="middle"
          />
        ) : (
          <OrchestrationView agents={list} skills={skills} />
        )}
      </Card>

      {/* ===== 创建弹窗 ===== */}
      <Modal
        title={<ModalHeader icon={<RobotOutlined />} title="创建智能体" />}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); setSelectedSkillIds([]) }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
        width={640}
        destroyOnClose
      >
        <Form<CreateForm>
          form={form}
          layout="vertical"
          initialValues={{ type: 'Operational', model: 'Deepexi-Platform-70B' }}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="智能体名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="例如：设备故障诊断 Agent" maxLength={64} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="智能体类型" rules={[{ required: true }]}>
                <Select
                  options={AGENT_TYPES.map(t => ({
                    value: t,
                    label: `${AGENT_TYPE_ICONS[t]} ${AGENT_TYPE_LABELS[t]}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="model" label="推理模型" rules={[{ required: true }]}>
                <Select options={MODEL_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="描述">
                <Input placeholder="智能体职责简述" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="systemPrompt" label="System Prompt" rules={[{ required: true, message: '请输入 System Prompt' }]}>
            <TextArea rows={3} placeholder="你是一个..." maxLength={1000} />
          </Form.Item>

          <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>绑定 Skills</Divider>
          {renderSkillSelector(selectedSkillIds, setSelectedSkillIds)}
        </Form>
      </Modal>

      {/* ===== 编辑弹窗 ===== */}
      <Modal
        title={<ModalHeader icon={<EditOutlined />} title="编辑智能体" />}
        open={editOpen}
        onCancel={() => { setEditOpen(false); editForm.resetFields() }}
        onOk={() => void handleEdit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={editing}
        width={640}
        destroyOnClose
      >
        <Form<CreateForm> form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="智能体名称" rules={[{ required: true }]}>
                <Input maxLength={64} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="智能体类型">
                <Select disabled options={AGENT_TYPES.map(t => ({ value: t, label: `${AGENT_TYPE_ICONS[t]} ${AGENT_TYPE_LABELS[t]}` }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="model" label="推理模型" rules={[{ required: true }]}>
                <Select options={MODEL_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="描述">
                <Input maxLength={100} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="systemPrompt" label="System Prompt" rules={[{ required: true }]}>
            <TextArea rows={3} maxLength={1000} />
          </Form.Item>

          <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>绑定 Skills</Divider>
          {renderSkillSelector(editSkillIds, setEditSkillIds)}
        </Form>
      </Modal>

      {/* ===== 详情弹窗 ===== */}
      <Modal
        title={<ModalHeader icon={<EyeOutlined />} title="智能体详情" />}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setDetailOpen(false)}>关闭</Button>
            {detailTarget && (
              <Button type="primary" icon={<RocketOutlined />} onClick={() => { setDetailOpen(false); openPublish(detailTarget) }}>
                发布为数字员工
              </Button>
            )}
          </Space>
        }
        width={640}
        destroyOnClose
      >
        {detailTarget && (
          <>
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <span style={{ fontSize: 40 }}>{AGENT_TYPE_ICONS[detailTarget.type]}</span>
              <Title level={4} style={{ margin: '8px 0 4px' }}>{detailTarget.name}</Title>
              <Space>
                <Tag color={AGENT_TYPE_COLORS[detailTarget.type]}>{AGENT_TYPE_LABELS[detailTarget.type]}</Tag>
                <Tag color={AGENT_STATUS_COLORS[detailTarget.status]}>{detailTarget.status}</Tag>
                <Tag>{detailTarget.version}</Tag>
                <Tag color="geekblue">{detailTarget.model}</Tag>
              </Space>
              {detailTarget.description && (
                <Paragraph type="secondary" style={{ margin: '8px 0 0' }}>{detailTarget.description}</Paragraph>
              )}
            </div>

            <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>System Prompt</Divider>
            <pre className="code-block" style={{ whiteSpace: 'pre-wrap' }}>{detailTarget.systemPrompt}</pre>

            <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>绑定 Skills ({detailTarget.skillIds.length})</Divider>
            {detailTarget.skillIds.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {detailTarget.skillIds.map(id => {
                  const sk = getSkillObj(id)
                  return (
                    <div key={id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 6, background: '#fafafa',
                      border: '1px solid #f0f0f0',
                    }}>
                      {sk ? (
                        <>
                          <Tag color={SKILL_CATEGORY_COLORS[sk.category]}>{SKILL_CATEGORY_ICONS[sk.category]}</Tag>
                          <Text strong>{sk.displayName}</Text>
                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>{sk.name}</Text>
                        </>
                      ) : (
                        <Text type="secondary">{id} (已删除)</Text>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未绑定任何 Skill" />
            )}

            <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>时间信息</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="创建时间" value={new Date(detailTarget.createdAt).toLocaleDateString('zh-CN')} valueStyle={{ fontSize: 14 }} />
              </Col>
              <Col span={12}>
                <Statistic title="最近更新" value={new Date(detailTarget.updatedAt).toLocaleDateString('zh-CN')} valueStyle={{ fontSize: 14 }} />
              </Col>
            </Row>
          </>
        )}
      </Modal>

      {/* ===== 发布为数字员工弹窗 ===== */}
      <Modal
        title={<ModalHeader icon={<RocketOutlined />} title="发布为数字员工" color="#52c41a" />}
        open={publishOpen}
        onCancel={() => setPublishOpen(false)}
        onOk={handlePublish}
        okText="确认发布"
        cancelText="取消"
        confirmLoading={publishing}
        okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
        destroyOnClose
      >
        {publishTarget && (
          <div style={{ marginTop: 16 }}>
            <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f', marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <span style={{ fontSize: 24 }}>{AGENT_TYPE_ICONS[publishTarget.type]}</span>
                  <div>
                    <Text strong style={{ fontSize: 16 }}>{publishTarget.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{publishTarget.description}</Text>
                  </div>
                </Space>
              </Space>
            </Card>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="智能体类型">
                <Tag color={AGENT_TYPE_COLORS[publishTarget.type]}>{AGENT_TYPE_LABELS[publishTarget.type]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="推理模型">
                <Tag color="geekblue">{publishTarget.model}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="绑定 Skills">
                {publishTarget.skillIds.length} 个
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color={AGENT_STATUS_COLORS[publishTarget.status]}>{publishTarget.status}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6 }}>
              <Text style={{ fontSize: 13 }}>
                <SendOutlined style={{ color: '#faad14', marginRight: 6 }} />
                发布后将自动创建数字员工实例，智能体状态更新为 Active，可在「数字员工」页面查看和使用。
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
