import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ApartmentOutlined,
  BankOutlined,
  CarOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  MedicineBoxOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import {
  createDigitalHuman,
  deleteDigitalHuman,
  listDigitalHumans,
  updateDigitalHuman,
} from '../api/digitalHuman'
import { ONTOLOGY_CATALOG, type OntologyCatalogEntry } from '../mocks/skills/ontologyCatalog'
import type { DigitalHuman, DigitalHumanType } from '../types/digitalHuman'
import {
  DIGITAL_HUMAN_TYPE_COLORS,
  DIGITAL_HUMAN_TYPE_ICONS,
  DIGITAL_HUMAN_TYPE_LABELS,
} from '../types/digitalHuman'
import type { SkillIndustry } from '../types/skill'
import { SKILL_INDUSTRY_LABELS } from '../types/skill'

const { Title, Text, Paragraph } = Typography

const PAGE_SIZE = 12
const ALL_INDUSTRIES = 'all'
const ALL_PHASES = 'all'
const ALL_TRAINING_TYPES = 'all'
const INDUSTRY_ORDER: SkillIndustry[] = ['manufacturing', 'retail', 'medical', 'transport', 'general']

type IndustryFilter = SkillIndustry | typeof ALL_INDUSTRIES

const INDUSTRY_META: Record<SkillIndustry, { icon: React.ReactNode; accent: string; bg: string; border: string }> = {
  manufacturing: {
    icon: <ApartmentOutlined />,
    accent: '#d46b08',
    bg: 'linear-gradient(135deg, #fff7e6 0%, #fff1f0 100%)',
    border: '#ffd591',
  },
  retail: {
    icon: <ShopOutlined />,
    accent: '#389e0d',
    bg: 'linear-gradient(135deg, #f6ffed 0%, #fffbe6 100%)',
    border: '#b7eb8f',
  },
  medical: {
    icon: <MedicineBoxOutlined />,
    accent: '#cf1322',
    bg: 'linear-gradient(135deg, #fff1f0 0%, #fff7e6 100%)',
    border: '#ffa39e',
  },
  transport: {
    icon: <CarOutlined />,
    accent: '#0958d9',
    bg: 'linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 100%)',
    border: '#91caff',
  },
  general: {
    icon: <BankOutlined />,
    accent: '#531dab',
    bg: 'linear-gradient(135deg, #f9f0ff 0%, #f0f5ff 100%)',
    border: '#d3adf7',
  },
}

const TRAINING_TYPE_COLORS: Record<string, string> = {
  分析类: '#1677ff',
  执行类: '#52c41a',
  决策类: '#722ed1',
  治理类: '#fa8c16',
}

const LEGACY_INDUSTRY_MAP: Partial<Record<DigitalHumanType, SkillIndustry>> = {
  'fault-repair': 'manufacturing',
  'engineering-design': 'manufacturing',
  'process-optimization': 'manufacturing',
  'bom-analysis': 'retail',
  'operation-decision': 'general',
  'store-matching': 'retail',
  'data-ops': 'general',
  'tax-planning': 'general',
}

const ONTOLOGY_BY_CODE = Object.fromEntries(
  ONTOLOGY_CATALOG.map(item => [item.code, item]),
) as Record<string, OntologyCatalogEntry>

interface CreateForm {
  name: string
  ontologyCode: string
  description?: string
}

interface EditForm {
  name: string
  description?: string
}

interface FilterState {
  industry: IndustryFilter
  phase: string
  trainingType: string
  query: string
}

function formatCount(value: number) {
  return value.toLocaleString('zh-CN')
}

function toProjectId(code: string) {
  return `proj-${code.replace(/\./g, '')}`
}

function buildSuggestedName(entry: OntologyCatalogEntry) {
  const base = entry.name.replace(/本体(\([^)]*\))?/, '').replace(/\s+/g, '').trim()
  return `${base || entry.phase}数字员工`
}

function buildSuggestedDescription(entry: OntologyCatalogEntry) {
  return `${SKILL_INDUSTRY_LABELS[entry.industry]} · ${entry.phase} · ${entry.trainingType}｜${entry.agentScene}`
}

function inferDigitalHumanType(entry: OntologyCatalogEntry): DigitalHumanType {
  if (entry.industry === 'manufacturing') {
    if (entry.phase === '研发') return 'engineering-design'
    if (entry.phase === '工艺') return 'process-optimization'
    if (entry.phase === '供应链') return 'bom-analysis'
    if (entry.phase === '售后' || entry.name.includes('故障')) return 'fault-repair'
    return 'operation-decision'
  }
  if (entry.industry === 'retail') {
    if (entry.phase === '采购与供应' || entry.phase === '选品与规划') return 'bom-analysis'
    if (entry.phase === '门店与运营' || entry.phase === '营销与CRM') return 'store-matching'
    return 'operation-decision'
  }
  if (entry.industry === 'medical') {
    if (entry.name.includes('设备')) return 'fault-repair'
    return 'operation-decision'
  }
  if (entry.industry === 'transport') {
    return entry.trainingType === '执行类' ? 'process-optimization' : 'operation-decision'
  }
  if (entry.phase.includes('财务')) return 'tax-planning'
  if (entry.phase.includes('业务分析') || entry.phase.includes('风险')) return 'data-ops'
  return 'operation-decision'
}

function getHumanIndustry(dh: DigitalHuman): SkillIndustry | null {
  return dh.ontologyIndustry ?? LEGACY_INDUSTRY_MAP[dh.type] ?? null
}

function getHumanVisual(dh: DigitalHuman) {
  const industry = getHumanIndustry(dh)
  if (industry) {
    return {
      icon: INDUSTRY_META[industry].icon,
      tagColor: INDUSTRY_META[industry].accent,
      label: SKILL_INDUSTRY_LABELS[industry],
    }
  }
  return {
    icon: DIGITAL_HUMAN_TYPE_ICONS[dh.type],
    tagColor: DIGITAL_HUMAN_TYPE_COLORS[dh.type],
    label: DIGITAL_HUMAN_TYPE_LABELS[dh.type],
  }
}

export default function DigitalHumanListPage() {
  const [list, setList] = useState<DigitalHuman[]>([])
  const [filters, setFilters] = useState<FilterState>({
    industry: ALL_INDUSTRIES,
    phase: ALL_PHASES,
    trainingType: ALL_TRAINING_TYPES,
    query: '',
  })
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<CreateForm>()
  const selectedOntologyCode = Form.useWatch('ontologyCode', form)
  const selectedOntology = selectedOntologyCode ? ONTOLOGY_BY_CODE[selectedOntologyCode] : undefined
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DigitalHuman | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm] = Form.useForm<EditForm>()
  const navigate = useNavigate()

  const reload = useCallback(() => {
    listDigitalHumans()
      .then(items => {
        setList(
          [...items].sort((a, b) => {
            const aTime = new Date(a.updatedAt).getTime()
            const bTime = new Date(b.updatedAt).getTime()
            return bTime - aTime
          }),
        )
      })
      .catch(() => message.error('数字员工加载失败'))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    setPage(1)
  }, [filters.industry, filters.phase, filters.trainingType, filters.query])

  const applyOntologyDefaults = (code: string) => {
    const entry = ONTOLOGY_BY_CODE[code]
    if (!entry) return
    form.setFieldsValue({
      ontologyCode: code,
      name: buildSuggestedName(entry),
      description: buildSuggestedDescription(entry),
    })
  }

  const openCreate = (entry?: OntologyCatalogEntry) => {
    setCreateOpen(true)
    applyOntologyDefaults(entry?.code ?? '0.0.1')
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const entry = ONTOLOGY_BY_CODE[values.ontologyCode]
      if (!entry) {
        message.error('请选择本体模板')
        return
      }
      setCreating(true)
      const dh = await createDigitalHuman({
        name: values.name,
        type: inferDigitalHumanType(entry),
        description: values.description?.trim() || buildSuggestedDescription(entry),
        projectId: toProjectId(entry.code),
        ontologyCode: entry.code,
        ontologyName: entry.name,
        ontologyIndustry: entry.industry,
        ontologyPhase: entry.phase,
        agentScene: entry.agentScene,
        trainingType: entry.trainingType,
      })
      message.success('数字员工创建成功')
      setCreateOpen(false)
      form.resetFields()
      reload()
      navigate(`/digital-worker/business/${dh.id}`)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteDigitalHuman(id)
    message.success('数字员工已删除')
    reload()
  }

  const openEdit = (dh: DigitalHuman) => {
    setEditTarget(dh)
    editForm.setFieldsValue({ name: dh.name, description: dh.description })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editTarget) return
    try {
      const values = await editForm.validateFields()
      setEditing(true)
      await updateDigitalHuman(editTarget.id, { name: values.name, description: values.description })
      message.success('修改成功')
      setEditOpen(false)
      reload()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('修改失败')
    } finally {
      setEditing(false)
    }
  }

  const totalDataCount = ONTOLOGY_CATALOG.reduce((sum, item) => sum + item.dataCount, 0)
  const totalPhaseCount = new Set(ONTOLOGY_CATALOG.map(item => item.phase)).size
  const phaseOptions = useMemo(() => Array.from(
    new Set(
      ONTOLOGY_CATALOG
        .filter(item => filters.industry === ALL_INDUSTRIES || item.industry === filters.industry)
        .map(item => item.phase),
    ),
  ), [filters.industry])

  const trainingTypeOptions = useMemo(() => Array.from(
    new Set(
      ONTOLOGY_CATALOG
        .filter(item => filters.industry === ALL_INDUSTRIES || item.industry === filters.industry)
        .filter(item => filters.phase === ALL_PHASES || item.phase === filters.phase)
        .map(item => item.trainingType),
    ),
  ), [filters.industry, filters.phase])

  const visibleHumans = list.filter(item => {
    const industry = getHumanIndustry(item)
    if (filters.industry !== ALL_INDUSTRIES && industry !== filters.industry) return false
    if (filters.phase !== ALL_PHASES && item.ontologyPhase !== filters.phase) return false
    if (filters.trainingType !== ALL_TRAINING_TYPES && item.trainingType !== filters.trainingType) return false
    const query = filters.query.trim().toLowerCase()
    if (!query) return true
    return [item.name, item.description || '', item.ontologyName || '', item.agentScene || '']
      .join(' ')
      .toLowerCase()
      .includes(query)
  })

  const pagedHumans = visibleHumans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const industryCards = [
    {
      key: ALL_INDUSTRIES,
      label: '全部入口',
      planningCount: ONTOLOGY_CATALOG.length,
      launchedCount: list.length,
      icon: <NodeIndexOutlined />,
      accent: '#1677ff',
      bg: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)',
      border: '#91caff',
    },
    ...INDUSTRY_ORDER.map(industry => {
      const planning = ONTOLOGY_CATALOG.filter(item => item.industry === industry)
      const launched = list.filter(item => getHumanIndustry(item) === industry)
      return {
        key: industry,
        label: SKILL_INDUSTRY_LABELS[industry],
        planningCount: planning.length,
        launchedCount: launched.length,
        icon: INDUSTRY_META[industry].icon,
        accent: INDUSTRY_META[industry].accent,
        bg: INDUSTRY_META[industry].bg,
        border: INDUSTRY_META[industry].border,
      }
    }),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        style={{
          background: 'linear-gradient(135deg, #fff7e6 0%, #f0f5ff 48%, #f6ffed 100%)',
          border: '1px solid #ffd591',
          borderRadius: 20,
        }}
        bodyStyle={{ padding: '28px 28px 24px' }}
      >
        <Row gutter={32} align="middle">
          <Col span={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <TeamOutlined style={{ color: '#1677ff', fontSize: 22 }} />
              <Text style={{ color: '#1677ff', fontSize: 13, letterSpacing: 1.2 }}>数字员工统一入口</Text>
            </div>
            <Title level={2} style={{ margin: '0 0 8px', color: '#1f1f1f' }}>
              当前上架 {list.length} 位业务数字员工
            </Title>
            <Paragraph style={{ color: '#595959', marginBottom: 20, lineHeight: 1.75 }}>
              这个页面作为业务数字员工入口页，按平台已有的行业分类与知识规划做组织设计。
              当前已上架一批高频入口员工，覆盖制造、零售、医疗、交通和通用业务场景。
            </Paragraph>
            <Row gutter={[12, 12]}>
              <Col xs={12} md={6}>
                <div style={{ background: 'rgba(255,255,255,0.72)', borderRadius: 14, padding: 14 }}>
                  <Statistic title="上架员工" value={list.length} suffix="位" />
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div style={{ background: 'rgba(255,255,255,0.72)', borderRadius: 14, padding: 14 }}>
                  <Statistic title="覆盖行业" value={INDUSTRY_ORDER.length} suffix="类" />
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div style={{ background: 'rgba(255,255,255,0.72)', borderRadius: 14, padding: 14 }}>
                  <Statistic title="业务阶段" value={totalPhaseCount} suffix="个" />
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div style={{ background: 'rgba(255,255,255,0.72)', borderRadius: 14, padding: 14 }}>
                  <Statistic title="样本规模" value={formatCount(totalDataCount)} />
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      <Card
        title={(
          <Space>
            <FilterOutlined style={{ color: '#1677ff' }} />
            <span>行业入口导航</span>
            <Text type="secondary" style={{ fontSize: 12 }}>按行业与业务场景切换数字员工入口</Text>
          </Space>
        )}
      >
        <Row gutter={[12, 12]}>
          {industryCards.map(card => {
            const active = filters.industry === card.key
            return (
              <Col key={card.key} xs={12} md={8} xl={4}>
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    industry: card.key as IndustryFilter,
                    phase: ALL_PHASES,
                    trainingType: ALL_TRAINING_TYPES,
                  }))}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 16,
                    padding: 16,
                    border: `1px solid ${active ? card.accent : card.border}`,
                    background: card.bg,
                    cursor: 'pointer',
                    boxShadow: active ? `0 10px 28px ${card.accent}22` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 20, color: card.accent }}>{card.icon}</span>
                    <Tag color={active ? card.accent : 'default'} style={{ marginInlineEnd: 0 }}>
                      {card.launchedCount} 位
                    </Tag>
                  </div>
                  <Text strong style={{ display: 'block', marginBottom: 6 }}>{card.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.7, display: 'block' }}>
                    覆盖 {card.planningCount} 个场景主题 · 当前上架 {card.launchedCount} 位
                  </Text>
                </button>
              </Col>
            )
          })}
        </Row>
      </Card>

      <Card
        title={(
          <Space>
            <SearchOutlined />
            <span>筛选入口</span>
          </Space>
        )}
        extra={(
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>当前显示 {visibleHumans.length} 位</Text>
            <Button
              size="small"
              onClick={() => setFilters({
                industry: ALL_INDUSTRIES,
                phase: ALL_PHASES,
                trainingType: ALL_TRAINING_TYPES,
                query: '',
              })}
            >
              重置
            </Button>
          </Space>
        )}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={10} xl={9}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索员工名称、本体、Agent 场景"
              value={filters.query}
              onChange={(event) => setFilters(prev => ({ ...prev, query: event.target.value }))}
            />
          </Col>
          <Col xs={12} md={5} xl={5}>
            <div
              style={{
                height: 32,
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#fff',
              }}
            >
              <FilterOutlined style={{ color: '#8c8c8c' }} />
              <Text style={{ fontSize: 13 }}>
                {filters.industry === ALL_INDUSTRIES ? '全部行业' : SKILL_INDUSTRY_LABELS[filters.industry]}
              </Text>
            </div>
          </Col>
          <Col xs={12} md={4} xl={4}>
            <Select
              value={filters.phase}
              style={{ width: '100%' }}
              onChange={(value) => setFilters(prev => ({ ...prev, phase: value }))}
              options={[
                { value: ALL_PHASES, label: '全部阶段' },
                ...phaseOptions.map(option => ({ value: option, label: option })),
              ]}
            />
          </Col>
          <Col xs={12} md={3} xl={3}>
            <Select
              value={filters.trainingType}
              style={{ width: '100%' }}
              onChange={(value) => setFilters(prev => ({ ...prev, trainingType: value }))}
              options={[
                { value: ALL_TRAINING_TYPES, label: '全部训练' },
                ...trainingTypeOptions.map(option => ({ value: option, label: option })),
              ]}
            />
          </Col>
          <Col xs={12} md={2} xl={3} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={reload} />
              <Button icon={<PlusOutlined />} type="primary" onClick={() => openCreate()}>
                新建
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} align="top">
        <Col span={24}>
          <Card
            title={(
              <Space>
                <TeamOutlined />
                <span>数字员工入口列表</span>
                <Tag color="blue">{visibleHumans.length}</Tag>
              </Space>
            )}
          >
            {pagedHumans.length === 0 ? (
              <Empty description="当前筛选条件下没有匹配的数字员工" />
            ) : (
              <>
                <Row gutter={[14, 14]}>
                  {pagedHumans.map(dh => {
                    const visual = getHumanVisual(dh)
                    return (
                      <Col key={dh.id} xs={24} md={12} xl={8}>
                        <Card
                          hoverable
                          style={{ height: '100%', borderRadius: 16 }}
                          bodyStyle={{ padding: 18 }}
                          onClick={() => navigate(`/digital-worker/business/${dh.id}`)}
                        >
                          <Space direction="vertical" size={12} style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                              <Space align="start" size={10}>
                                <div
                                  style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 12,
                                    display: 'grid',
                                    placeItems: 'center',
                                    background: '#fafafa',
                                    fontSize: 18,
                                  }}
                                >
                                  {visual.icon}
                                </div>
                                <div>
                                  <Text strong style={{ display: 'block', fontSize: 15 }}>{dh.name}</Text>
                                  <Space wrap size={[6, 6]} style={{ marginTop: 6 }}>
                                    <Tag color={visual.tagColor}>{visual.label}</Tag>
                                    {dh.ontologyPhase && <Tag>{dh.ontologyPhase}</Tag>}
                                    {dh.trainingType && (
                                      <Tag color={TRAINING_TYPE_COLORS[dh.trainingType] || 'blue'}>{dh.trainingType}</Tag>
                                    )}
                                  </Space>
                                </div>
                              </Space>
                            </div>

                            {dh.ontologyName && (
                              <div style={{ background: '#fafafa', borderRadius: 12, padding: 12 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>关联本体</Text>
                                <Paragraph style={{ margin: '4px 0 0' }}>{dh.ontologyName}</Paragraph>
                              </div>
                            )}

                            <Paragraph style={{ margin: 0, minHeight: 44, color: '#595959' }} ellipsis={{ rows: 2 }}>
                              {dh.description || '暂无职责描述'}
                            </Paragraph>

                            {dh.agentScene && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {dh.agentScene}
                              </Text>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                更新时间：{new Date(dh.updatedAt).toLocaleDateString('zh-CN')}
                              </Text>
                              <Space wrap>
                                {dh.projectId && (
                                  <Button
                                    size="small"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      navigate(`/ontology/projects/${dh.projectId}`)
                                    }}
                                  >
                                    查看本体
                                  </Button>
                                )}
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    openEdit(dh)
                                  }}
                                >
                                  编辑
                                </Button>
                                <Popconfirm
                                  title="确认删除该数字员工？"
                                  description="此操作不可恢复。"
                                  onConfirm={() => handleDelete(dh.id)}
                                  onPopupClick={(event) => event.stopPropagation()}
                                >
                                  <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    删除
                                  </Button>
                                </Popconfirm>
                              </Space>
                            </div>
                          </Space>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <Pagination
                    current={page}
                    pageSize={PAGE_SIZE}
                    total={visibleHumans.length}
                    onChange={setPage}
                    showSizeChanger={false}
                  />
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={(
          <Space>
            <NodeIndexOutlined style={{ color: '#1677ff' }} />
            从本体模板创建数字员工
          </Space>
        )}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false)
          form.resetFields()
        }}
        onOk={() => void handleCreate()}
        okText="创建并进入"
        cancelText="取消"
        confirmLoading={creating}
      >
        <Form<CreateForm> form={form} layout="vertical">
          <Form.Item
            name="ontologyCode"
            label="关联本体"
            rules={[{ required: true, message: '请选择本体模板' }]}
            extra="创建后会自动带出本体项目、行业标签和阶段信息"
          >
            <Select
              showSearch
              optionFilterProp="label"
              onChange={applyOntologyDefaults}
              options={ONTOLOGY_CATALOG.map(entry => ({
                value: entry.code,
                label: `${entry.code} · ${SKILL_INDUSTRY_LABELS[entry.industry]} · ${entry.phase} · ${entry.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="name" label="员工名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：故障诊断数字员工" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="职责描述">
            <Input.TextArea rows={4} placeholder="可选，描述该数字员工的工作职责与专长" maxLength={300} />
          </Form.Item>
          {selectedOntology && (
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 12, padding: 12 }}>
              <Space direction="vertical" size={6}>
                <Text strong>{selectedOntology.name}</Text>
                <Space wrap size={[8, 8]}>
                  <Tag color={INDUSTRY_META[selectedOntology.industry].accent}>
                    {SKILL_INDUSTRY_LABELS[selectedOntology.industry]}
                  </Tag>
                  <Tag>{selectedOntology.phase}</Tag>
                  <Tag color={TRAINING_TYPE_COLORS[selectedOntology.trainingType] || 'blue'}>
                    {selectedOntology.trainingType}
                  </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedOntology.agentScene}
                </Text>
              </Space>
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title={(
          <Space>
            <EditOutlined style={{ color: '#1677ff' }} />
            编辑数字员工
          </Space>
        )}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false)
          editForm.resetFields()
        }}
        onOk={() => void handleEdit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={editing}
      >
        <Form<EditForm> form={editForm} layout="vertical">
          {editTarget?.ontologyName && (
            <div style={{ marginBottom: 12 }}>
              <Space wrap size={[8, 8]}>
                {editTarget.ontologyIndustry && (
                  <Tag color={INDUSTRY_META[editTarget.ontologyIndustry].accent}>
                    {SKILL_INDUSTRY_LABELS[editTarget.ontologyIndustry]}
                  </Tag>
                )}
                <Tag>{editTarget.ontologyName}</Tag>
                {editTarget.ontologyPhase && <Tag color="default">{editTarget.ontologyPhase}</Tag>}
              </Space>
            </div>
          )}
          <Form.Item name="name" label="员工名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：供应链运营专员" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="职责描述">
            <Input.TextArea rows={3} placeholder="可选，描述该数字员工的工作职责与专长" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
