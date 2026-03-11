import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  ExportOutlined,
  SaveOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { listAgents } from '../api/agentStudio'
import {
  DIC_AGENT_TYPE_BY_CATEGORY,
  DIC_SKILL_CATEGORIES_BY_CATEGORY,
  getDICWorker,
  updateDICWorker,
} from '../api/dicWorker'
import { listSkills } from '../api/skillsMarket'
import type { Agent } from '../types/agent'
import { AGENT_TYPE_LABELS } from '../types/agent'
import type { Skill } from '../types/skill'
import {
  DIC_CATEGORY_COLORS,
  DIC_CATEGORY_LABELS,
  DIC_CATEGORY_WORKSPACE_PATHS,
  DIC_STATUS_COLORS,
  DIC_STATUS_LABELS,
  type DICWorker,
  type DICWorkerChannel,
} from '../types/dicWorker'
import { SERVICE_MODEL_SELECT_OPTIONS } from '../types/modelCatalog'

const { Text, Paragraph, Title } = Typography
const { TextArea } = Input

interface ConfigFormValues {
  name: string
  description?: string
  category: DICWorker['category']
  status: DICWorker['status']
  owner?: string
  maintainersText?: string
  preferredModel?: string
  linkedAgentIds?: string[]
  linkedSkillIds?: string[]
  skills?: string[]
  systemPrompt?: string
  operationBoundary?: string
  publishChannels?: DICWorkerChannel[]
  workspacePath?: string
}

const CHANNEL_OPTIONS: { value: DICWorkerChannel; label: string }[] = [
  { value: '管理平台', label: '管理平台' },
  { value: '运维控制台', label: '运维控制台' },
  { value: '企业微信', label: '企业微信' },
  { value: 'OpenAPI', label: 'OpenAPI' },
]

function formatMaintainers(items?: string[]): string {
  return (items ?? []).join('，')
}

function parseMaintainers(text?: string): string[] {
  return (text ?? '')
    .split(/[，,、\n]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function pickRecommendedAgents(agents: Agent[], worker: DICWorker | null): Agent[] {
  if (!worker) return []
  if (worker.linkedAgentIds?.length) {
    return agents.filter(agent => worker.linkedAgentIds?.includes(agent.id))
  }
  return agents.filter(agent => agent.type === DIC_AGENT_TYPE_BY_CATEGORY[worker.category]).slice(0, 4)
}

function pickRecommendedSkills(skills: Skill[], worker: DICWorker | null): Skill[] {
  if (!worker) return []
  if (worker.linkedSkillIds?.length) {
    return skills.filter(skill => worker.linkedSkillIds?.includes(skill.id))
  }

  const skillCategories = new Set(DIC_SKILL_CATEGORIES_BY_CATEGORY[worker.category])
  const recommended = skills.filter(skill => skillCategories.has(skill.category))
  if (recommended.length > 0) return recommended.slice(0, 6)
  return skills.slice(0, 6)
}

export default function DICWorkerConfigPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm<ConfigFormValues>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [worker, setWorker] = useState<DICWorker | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [skills, setSkills] = useState<Skill[]>([])

  const selectedAgentIds = Form.useWatch('linkedAgentIds', form) ?? []
  const selectedSkillIds = Form.useWatch('linkedSkillIds', form) ?? []
  const selectedCategory = Form.useWatch('category', form) ?? worker?.category
  const currentCategory = selectedCategory as DICWorker['category'] | undefined

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getDICWorker(id), listAgents(), listSkills()])
      .then(([detail, agentItems, skillItems]) => {
        if (!detail) {
          message.error('技术AI员工不存在')
          navigate('/digital-worker/dic', { replace: true })
          return
        }

        setWorker(detail)
        setAgents(agentItems)
        setSkills(skillItems)
        form.setFieldsValue({
          name: detail.name,
          description: detail.description,
          category: detail.category,
          status: detail.status,
          owner: detail.owner,
          maintainersText: formatMaintainers(detail.maintainers),
          preferredModel: detail.preferredModel,
          linkedAgentIds: detail.linkedAgentIds,
          linkedSkillIds: detail.linkedSkillIds,
          skills: detail.skills,
          systemPrompt: detail.systemPrompt,
          operationBoundary: detail.operationBoundary,
          publishChannels: detail.publishChannels,
          workspacePath: detail.workspacePath,
        })
      })
      .catch(() => message.error('技术AI员工配置加载失败'))
      .finally(() => setLoading(false))
  }, [form, id, navigate])

  useEffect(() => {
    if (!currentCategory) return
    const nextPath = DIC_CATEGORY_WORKSPACE_PATHS[currentCategory]
    if (form.getFieldValue('workspacePath') !== nextPath) {
      form.setFieldValue('workspacePath', nextPath)
    }
  }, [currentCategory, form])

  const workerForRecommendation = useMemo(() => {
    if (!worker || !currentCategory) return worker
    return { ...worker, category: currentCategory }
  }, [currentCategory, worker])

  const recommendedAgents = useMemo(
    () => pickRecommendedAgents(agents, workerForRecommendation),
    [agents, workerForRecommendation],
  )
  const recommendedSkills = useMemo(
    () => pickRecommendedSkills(skills, workerForRecommendation),
    [skills, workerForRecommendation],
  )

  const visibleAgents = useMemo(() => {
    if (selectedAgentIds.length === 0) return recommendedAgents
    return agents.filter(agent => selectedAgentIds.includes(agent.id))
  }, [agents, recommendedAgents, selectedAgentIds])

  const visibleSkills = useMemo(() => {
    if (selectedSkillIds.length === 0) return recommendedSkills
    return skills.filter(skill => selectedSkillIds.includes(skill.id))
  }, [recommendedSkills, selectedSkillIds, skills])

  const handleSave = async () => {
    if (!id) return

    try {
      const values = await form.validateFields()
      setSaving(true)
      const updated = await updateDICWorker(id, {
        name: values.name,
        description: values.description?.trim(),
        category: values.category,
        status: values.status,
        owner: values.owner?.trim(),
        maintainers: parseMaintainers(values.maintainersText),
        preferredModel: values.preferredModel,
        linkedAgentIds: values.linkedAgentIds ?? [],
        linkedSkillIds: values.linkedSkillIds ?? [],
        skills: values.skills ?? [],
        systemPrompt: values.systemPrompt?.trim(),
        operationBoundary: values.operationBoundary?.trim(),
        publishChannels: values.publishChannels ?? [],
        workspacePath: values.workspacePath?.trim(),
      })

      if (!updated) {
        message.error('保存失败，技术AI员工不存在')
        return
      }

      setWorker(updated)
      message.success('技术AI员工配置已保存')
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error('保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: 480, display: 'grid', placeItems: 'center' }}>
        <Spin />
      </div>
    )
  }

  if (!worker) {
    return <Empty description="技术AI员工不存在" />
  }

  const category = (currentCategory ?? worker.category) as DICWorker['category']
  const status = (form.getFieldValue('status') ?? worker.status) as DICWorker['status']
  const workspacePath = form.getFieldValue('workspacePath') || worker.workspacePath || DIC_CATEGORY_WORKSPACE_PATHS[category]
  const chatPath = `/chat/${worker.id}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <Space direction="vertical" size={6}>
          <Space size={8} wrap>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/digital-worker/dic')}>
              返回列表
            </Button>
            <Tag color={DIC_CATEGORY_COLORS[category]}>{DIC_CATEGORY_LABELS[category]}</Tag>
            <Tag color={DIC_STATUS_COLORS[status]}>{DIC_STATUS_LABELS[status]}</Tag>
          </Space>
          <Title level={4} style={{ margin: 0 }}>{worker.icon} {form.getFieldValue('name') || worker.name}</Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            面向技术治理、平台运行与知识维护的 AI 员工配置页，结构参考业务AI员工配置页。
          </Paragraph>
        </Space>

        <Space wrap>
          <Button onClick={() => navigate(workspacePath)}>
            进入相关模块
          </Button>
          <Button onClick={() => navigate('/studio/agents')}>
            前往编排台
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            保存配置
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="累计任务" value={worker.tasksCompleted} prefix={<DashboardOutlined />} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="今日任务" value={worker.tasksToday} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="成功率" value={worker.successRate} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="发布渠道" value={form.getFieldValue('publishChannels')?.length ?? worker.publishChannels?.length ?? 0} prefix={<SendOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} align="top">
        <Col xs={24} xl={16}>
          <Form form={form} layout="vertical">
            <Card
              title="基础配置"
              extra={(
                <a
                  className="config-entry-pill"
                  href={chatPath}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="config-entry-pill__label">管理入口</span>
                  <span className="config-entry-pill__path">{chatPath}</span>
                  <ExportOutlined />
                </a>
              )}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="技术AI员工名称"
                    name="name"
                    rules={[{ required: true, message: '请输入技术AI员工名称' }]}
                  >
                    <Input placeholder="例如：本体建模助手" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="责任人" name="owner">
                    <Input placeholder="例如：知识工程负责人" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="员工类别" name="category" rules={[{ required: true, message: '请选择员工类别' }]}>
                    <Select
                      options={Object.entries(DIC_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="运行状态" name="status" rules={[{ required: true, message: '请选择运行状态' }]}>
                    <Select
                      options={Object.entries(DIC_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="职责描述" name="description">
                    <TextArea rows={3} placeholder="描述这个技术AI员工承担的技术能力与工作范围" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="维护协同人" name="maintainersText">
                    <Input placeholder="多个成员可用 ， 或 换行分隔" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="工作台路径" name="workspacePath">
                    <Input placeholder="/ontology/projects" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="编排与执行配置" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="首选模型" name="preferredModel">
                    <Select options={SERVICE_MODEL_SELECT_OPTIONS} placeholder="选择模型" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="能力标签" name="skills">
                    <Select
                      mode="tags"
                      tokenSeparators={[',', '，']}
                      placeholder="输入能力标签"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="挂载 Agent" name="linkedAgentIds">
                    <Select
                      mode="multiple"
                      allowClear
                      optionFilterProp="label"
                      placeholder="选择需要编排到该技术AI员工的 Agent"
                      options={agents.map(agent => ({
                        value: agent.id,
                        label: `${agent.name} · ${AGENT_TYPE_LABELS[agent.type]}`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="挂载 Skill" name="linkedSkillIds">
                    <Select
                      mode="multiple"
                      allowClear
                      optionFilterProp="label"
                      placeholder="选择技能包"
                      options={skills.map(skill => ({
                        value: skill.id,
                        label: `${skill.displayName} · ${skill.phase}`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="系统提示词" name="systemPrompt">
                    <TextArea rows={5} placeholder="定义技术AI员工的执行约束、诊断风格和优先级" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="运行治理" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item label="操作边界" name="operationBoundary">
                    <TextArea rows={4} placeholder="定义可以做什么、不能直接做什么" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="发布渠道" name="publishChannels">
                    <Select
                      mode="multiple"
                      allowClear
                      placeholder="选择渠道"
                      options={CHANNEL_OPTIONS}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Form>
        </Col>

        <Col xs={24} xl={8}>
          <Card title="配置概览">
            <Descriptions column={1} size="small" labelStyle={{ width: 96 }}>
              <Descriptions.Item label="员工 ID">{worker.id}</Descriptions.Item>
              <Descriptions.Item label="平均响应">{worker.avgResponseTime}</Descriptions.Item>
              <Descriptions.Item label="最近活跃">{worker.lastActive}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{new Date(worker.updatedAt).toLocaleString('zh-CN')}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="推荐编排" style={{ marginTop: 16 }}>
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              <div>
                <Text strong>建议挂载 Agents</Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {visibleAgents.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可用 Agent" />
                  ) : visibleAgents.map(agent => (
                    <div key={agent.id} style={{ padding: 12, borderRadius: 12, background: '#fafafa' }}>
                      <Space direction="vertical" size={2}>
                        <Text strong>{agent.name}</Text>
                        <Text type="secondary">{AGENT_TYPE_LABELS[agent.type]} · {agent.model}</Text>
                      </Space>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Text strong>建议挂载 Skills</Text>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {visibleSkills.length === 0
                    ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无推荐 Skill" />
                    : visibleSkills.map(skill => <Tag key={skill.id}>{skill.displayName}</Tag>)}
                </div>
              </div>
            </Space>
          </Card>

          <Card title="发布与治理" style={{ marginTop: 16 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <a
                className="config-entry-card"
                href={chatPath}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="config-entry-card__icon">
                  <SendOutlined />
                </span>
                <span className="config-entry-card__body">
                  <span className="config-entry-card__eyebrow">管理入口</span>
                  <span className="config-entry-card__title">新窗口打开技术 AI 员工管理台</span>
                  <span className="config-entry-card__path">
                    <code>{chatPath}</code>
                    <ExportOutlined />
                  </span>
                </span>
              </a>
              <Descriptions column={1} size="small" labelStyle={{ width: 92 }}>
                <Descriptions.Item label="当前状态">
                  <Tag color={DIC_STATUS_COLORS[status]}>{DIC_STATUS_LABELS[status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="发布渠道">
                  <Space size={[4, 4]} wrap>
                    {(form.getFieldValue('publishChannels') ?? worker.publishChannels ?? []).map((channel: DICWorkerChannel) => (
                      <Tag key={channel}>{channel}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="工作台路径">
                  <Text code>{workspacePath}</Text>
                </Descriptions.Item>
              </Descriptions>

            </Space>
          </Card>

          <Button
            block
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            style={{ marginTop: 16 }}
            onClick={handleSave}
          >
            保存当前配置
          </Button>
        </Col>
      </Row>
    </div>
  )
}
