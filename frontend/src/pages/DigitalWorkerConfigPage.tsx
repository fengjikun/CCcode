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
  ApartmentOutlined,
  ArrowLeftOutlined,
  BranchesOutlined,
  DeploymentUnitOutlined,
  ExportOutlined,
  RobotOutlined,
  SaveOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { getProjectDetail, listProjects } from '../api/projectManagement'
import { getDigitalHuman, updateDigitalHuman } from '../api/digitalHuman'
import { listAgents } from '../api/agentStudio'
import { listSkills } from '../api/skillsMarket'
import type { ProjectDetail, ProjectSummary } from '../types/projectMvp'
import type { DigitalHuman, DigitalHumanType } from '../types/digitalHuman'
import { DIGITAL_HUMAN_TYPE_DESCRIPTIONS, DIGITAL_HUMAN_TYPE_LABELS } from '../types/digitalHuman'
import { SERVICE_MODEL_SELECT_OPTIONS } from '../types/modelCatalog'
import type { Agent, AgentType } from '../types/agent'
import { AGENT_TYPE_LABELS } from '../types/agent'
import type { Skill } from '../types/skill'

const { Text, Paragraph, Title } = Typography
const { TextArea } = Input

interface ConfigFormValues {
  name: string
  description?: string
  projectId?: string
  owner?: string
  maintainersText?: string
  preferredModel?: string
  linkedAgentIds?: string[]
  linkedSkillIds?: string[]
  targetUsers?: string
  serviceBoundary?: string
  systemPrompt?: string
  handoffTarget?: string
  publishStatus?: DigitalHuman['publishStatus']
  publishChannels?: string[]
}

const CHANNEL_OPTIONS = [
  { value: '管理平台', label: '管理平台' },
  { value: '门户/H5', label: '门户/H5' },
  { value: '企业微信', label: '企业微信' },
  { value: 'OpenAPI', label: 'OpenAPI' },
]

const STATUS_META: Record<NonNullable<DigitalHuman['publishStatus']>, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  testing: { label: '测试中', color: 'blue' },
  published: { label: '已发布', color: 'green' },
}

const AGENT_TYPE_BY_HUMAN: Record<DigitalHumanType, AgentType> = {
  'fault-repair': 'Operational',
  'engineering-design': 'Analytical',
  'process-optimization': 'Operational',
  'bom-analysis': 'Analytical',
  'operation-decision': 'Analytical',
  'store-matching': 'Support',
  'data-ops': 'Analytical',
  'tax-planning': 'Analytical',
}

function formatMaintainers(items?: string[]): string {
  return (items ?? []).join('，')
}

function parseMaintainers(text?: string): string[] {
  return (text ?? '')
    .split(/[，,、\n]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function pickRecommendedAgents(agents: Agent[], worker: DigitalHuman | null): Agent[] {
  if (!worker) return []
  if (worker.linkedAgentIds?.length) {
    return agents.filter(agent => worker.linkedAgentIds?.includes(agent.id))
  }
  return agents.filter(agent => agent.type === AGENT_TYPE_BY_HUMAN[worker.type]).slice(0, 3)
}

function pickRecommendedSkills(skills: Skill[], worker: DigitalHuman | null): Skill[] {
  if (!worker) return []
  if (worker.linkedSkillIds?.length) {
    return skills.filter(skill => worker.linkedSkillIds?.includes(skill.id))
  }

  const ontologyMatched = skills.filter(skill => worker.ontologyCode && skill.sourceOntologyCodes.includes(worker.ontologyCode))
  if (ontologyMatched.length > 0) return ontologyMatched.slice(0, 6)

  return skills
    .filter(skill => skill.industry === worker.ontologyIndustry || skill.recommendedFor.some(item => item.includes(worker.name)))
    .slice(0, 6)
}

function buildProjectStats(projectDetail: ProjectDetail | null) {
  if (!projectDetail) return []
  return [
    { title: '文档', value: projectDetail.documents.length, icon: <ApartmentOutlined /> },
    { title: '实体', value: projectDetail.schemaConfig.entityTypes.length, icon: <BranchesOutlined /> },
    { title: '关系', value: projectDetail.schemaConfig.relationTypes.length, icon: <DeploymentUnitOutlined /> },
    { title: '函数/动作', value: projectDetail.functions.length + projectDetail.actions.length, icon: <ThunderboltOutlined /> },
  ]
}

export default function DigitalWorkerConfigPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm<ConfigFormValues>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [worker, setWorker] = useState<DigitalHuman | null>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [skills, setSkills] = useState<Skill[]>([])

  const selectedProjectId = Form.useWatch('projectId', form)
  const selectedAgentIds = Form.useWatch('linkedAgentIds', form) ?? []
  const selectedSkillIds = Form.useWatch('linkedSkillIds', form) ?? []

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getDigitalHuman(id), listProjects(), listAgents(), listSkills()])
      .then(([detail, projectItems, agentItems, skillItems]) => {
        if (!detail) {
          message.error('AI员工不存在')
          navigate('/digital-worker/business', { replace: true })
          return
        }

        setWorker(detail)
        setProjects(projectItems)
        setAgents(agentItems)
        setSkills(skillItems)
        form.setFieldsValue({
          name: detail.name,
          description: detail.description,
          projectId: detail.projectId,
          owner: detail.owner,
          maintainersText: formatMaintainers(detail.maintainers),
          preferredModel: detail.preferredModel,
          linkedAgentIds: detail.linkedAgentIds,
          linkedSkillIds: detail.linkedSkillIds,
          targetUsers: detail.targetUsers,
          serviceBoundary: detail.serviceBoundary,
          systemPrompt: detail.systemPrompt,
          handoffTarget: detail.handoffTarget,
          publishStatus: detail.publishStatus,
          publishChannels: detail.publishChannels,
        })
      })
      .catch(() => message.error('AI员工配置加载失败'))
      .finally(() => setLoading(false))
  }, [form, id, navigate])

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectDetail(null)
      return
    }

    getProjectDetail(selectedProjectId)
      .then(setProjectDetail)
      .catch(() => setProjectDetail(null))
  }, [selectedProjectId])

  const recommendedAgents = useMemo(() => pickRecommendedAgents(agents, worker), [agents, worker])
  const recommendedSkills = useMemo(() => pickRecommendedSkills(skills, worker), [skills, worker])

  const visibleAgents = useMemo(() => {
    if (selectedAgentIds.length === 0) return recommendedAgents
    return agents.filter(agent => selectedAgentIds.includes(agent.id))
  }, [agents, recommendedAgents, selectedAgentIds])

  const visibleSkills = useMemo(() => {
    if (selectedSkillIds.length === 0) return recommendedSkills
    return skills.filter(skill => selectedSkillIds.includes(skill.id))
  }, [recommendedSkills, selectedSkillIds, skills])

  const projectStats = useMemo(() => buildProjectStats(projectDetail), [projectDetail])

  const handleSave = async () => {
    if (!id) return

    try {
      const values = await form.validateFields()
      setSaving(true)
      const updated = await updateDigitalHuman(id, {
        name: values.name,
        description: values.description?.trim(),
        projectId: values.projectId,
        owner: values.owner?.trim(),
        maintainers: parseMaintainers(values.maintainersText),
        preferredModel: values.preferredModel,
        linkedAgentIds: values.linkedAgentIds ?? [],
        linkedSkillIds: values.linkedSkillIds ?? [],
        targetUsers: values.targetUsers?.trim(),
        serviceBoundary: values.serviceBoundary?.trim(),
        systemPrompt: values.systemPrompt?.trim(),
        handoffTarget: values.handoffTarget?.trim(),
        publishStatus: values.publishStatus,
        publishChannels: values.publishChannels ?? [],
      })

      if (!updated) {
        message.error('保存失败，AI员工不存在')
        return
      }

      setWorker(updated)
      message.success('AI员工配置已保存')
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
    return <Empty description="AI员工不存在" />
  }

  const publishStatus = worker.publishStatus ?? 'draft'
  const publishMeta = STATUS_META[publishStatus]
  const chatPath = `/chat/${worker.id}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <Space direction="vertical" size={6}>
          <Space size={8} wrap>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/digital-worker/business')}>
              返回列表
            </Button>
            <Tag color="blue">{DIGITAL_HUMAN_TYPE_LABELS[worker.type]}</Tag>
            {worker.ontologyPhase && <Tag>{worker.ontologyPhase}</Tag>}
            <Tag color={publishMeta.color}>{publishMeta.label}</Tag>
          </Space>
          <Title level={4} style={{ margin: 0 }}>{worker.name}</Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {DIGITAL_HUMAN_TYPE_DESCRIPTIONS[worker.type]}
          </Paragraph>
        </Space>

        <Space wrap>
          {worker.projectId && (
            <Button onClick={() => navigate(`/ontology/projects/${worker.projectId}`)}>
              查看本体
            </Button>
          )}
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
            <Statistic title="关联本体" value={worker.ontologyName || '未绑定'} prefix={<ApartmentOutlined />} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="挂载 Agents" value={visibleAgents.length} prefix={<RobotOutlined />} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="生效 Skills" value={visibleSkills.length} prefix={<ThunderboltOutlined />} />
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
                    label="AI员工名称"
                    name="name"
                    rules={[{ required: true, message: '请输入 AI员工名称' }]}
                  >
                    <Input placeholder="例如：工程合规审查专员" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="责任人" name="owner">
                    <Input placeholder="例如：研发规范负责人" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="职责描述" name="description">
                    <TextArea rows={3} placeholder="描述这个 AI员工在管理端承担的职责范围" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="关联本体项目" name="projectId">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="选择本体项目"
                      options={projects.map(project => ({ value: project.id, label: project.name }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="维护协同人" name="maintainersText">
                    <Input placeholder="多个成员可用 ， 或 换行分隔" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="编排与知识装配" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="首选模型" name="preferredModel">
                    <Select options={SERVICE_MODEL_SELECT_OPTIONS} placeholder="选择模型" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="发布状态" name="publishStatus">
                    <Select
                      options={Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
                      placeholder="选择状态"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="挂载 Agent" name="linkedAgentIds">
                    <Select
                      mode="multiple"
                      allowClear
                      optionFilterProp="label"
                      placeholder="选择需要编排到该 AI员工的 Agent"
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
                    <TextArea rows={5} placeholder="定义该 AI员工的行为约束、输出风格和优先级" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="服务边界与交付方式" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item label="面向对象" name="targetUsers">
                    <Input placeholder="例如：工程师、设计审核员、研发经理" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="服务边界" name="serviceBoundary">
                    <TextArea rows={4} placeholder="定义可以做什么、不能直接做什么" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="外部承接端" name="handoffTarget">
                    <Input placeholder="例如：统一门户 Chat 端" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
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
              <Descriptions.Item label="所属阶段">{worker.ontologyPhase || '未配置'}</Descriptions.Item>
              <Descriptions.Item label="训练类型">{worker.trainingType || '未配置'}</Descriptions.Item>
              <Descriptions.Item label="Agent 场景">{worker.agentScene || '未配置'}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{new Date(worker.updatedAt).toLocaleString('zh-CN')}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            title="关联本体资产"
            style={{ marginTop: 16 }}
            extra={selectedProjectId ? <Button size="small" onClick={() => navigate(`/ontology/projects/${selectedProjectId}`)}>进入本体</Button> : null}
          >
            {projectDetail ? (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div>
                  <Text strong>{projectDetail.name}</Text>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    {projectDetail.description || '当前项目已绑定为 AI员工的知识底座。'}
                  </Paragraph>
                </div>
                <Row gutter={[12, 12]}>
                  {projectStats.map(item => (
                    <Col span={12} key={item.title}>
                      <Card size="small">
                        <Statistic title={item.title} value={item.value} prefix={item.icon} />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Space>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未绑定本体项目" />
            )}
          </Card>

          <Card
            title="推荐编排"
            style={{ marginTop: 16 }}
            extra={<Button size="small" onClick={() => navigate('/studio/agents')}>去编排台</Button>}
          >
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
                  <span className="config-entry-card__title">新窗口打开业务 AI 员工管理台</span>
                  <span className="config-entry-card__path">
                    <code>{chatPath}</code>
                    <ExportOutlined />
                  </span>
                </span>
              </a>
              <Descriptions column={1} size="small" labelStyle={{ width: 92 }}>
                <Descriptions.Item label="当前状态">
                  <Tag color={publishMeta.color}>{publishMeta.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="发布渠道">
                  <Space size={[4, 4]} wrap>
                    {(form.getFieldValue('publishChannels') ?? worker.publishChannels ?? []).map((channel: string) => (
                      <Tag key={channel}>{channel}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="交互承接">
                  {form.getFieldValue('handoffTarget') || worker.handoffTarget || '待配置'}
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
