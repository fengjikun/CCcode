import { useCallback, useEffect, useState } from 'react'
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
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileMarkdownOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  ImportOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TagOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  createSkill,
  deleteSkill,
  filterImportableFunctions,
  getSkillsMarketInsightStats,
  importFunctionAsSkill,
  listImportableFunctions,
  listSkills,
  toggleSkillStatus,
  updateSkill,
} from '../../api/skillsMarket'
import type { OntologyFunctionItem } from '../../api/skillsMarket'
import ModalHeader from '../../components/shared/ModalHeader'
import ActionColumn from '../../components/shared/ActionColumn'
import {
  collectPhaseOptions,
  filterSkills,
  getFeaturedSkills,
  type SkillsMarketFilters,
} from './skillsMarket.helpers'
import type {
  Skill,
  SkillCategory,
  SkillCoverageLevel,
  SkillIndustry,
  SkillMarketType,
  SkillScriptFile,
  SkillsMarketInsightStats,
  SkillStatus,
  SkillTemplateFile,
} from '../../types/skill'
import {
  SKILL_CATEGORIES,
  SKILL_CATEGORY_COLORS,
  SKILL_CATEGORY_ICONS,
  SKILL_CATEGORY_LABELS,
  SKILL_COVERAGE_LEVEL_COLORS,
  SKILL_COVERAGE_LEVEL_LABELS,
  SKILL_INDUSTRY_LABELS,
  SKILL_MARKET_TYPE_COLORS,
  SKILL_MARKET_TYPE_LABELS,
  SKILL_STATUS_COLORS,
} from '../../types/skill'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface SkillFormValues {
  name: string
  displayName: string
  category: SkillCategory
  description: string
  instructions: string
  reference?: string
  dependencies?: string
  tags?: string
}

const DEFAULT_FILTERS: SkillsMarketFilters = {
  query: '',
  category: 'all',
  marketType: 'all',
  industry: 'all',
  phase: 'all',
  coverageLevel: 'all',
}

function FileListEditor({
  title,
  icon,
  placeholder,
  files,
  onChange,
}: {
  title: string
  icon: React.ReactNode
  placeholder: string
  files: { name: string; description?: string }[]
  onChange: (files: { name: string; description?: string }[]) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Space size={4}>
          {icon}
          <Text strong style={{ fontSize: 13 }}>{title}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>（可选）</Text>
        </Space>
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => onChange([...files, { name: '', description: '' }])}
        >
          添加
        </Button>
      </div>
      {files.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文件" style={{ margin: '4px 0' }} />
      )}
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <Input
            placeholder={placeholder}
            value={file.name}
            onChange={(event) => {
              const next = [...files]
              next[index] = { ...next[index], name: event.target.value }
              onChange(next)
            }}
            style={{ flex: 2 }}
            size="small"
          />
          <Input
            placeholder="说明"
            value={file.description || ''}
            onChange={(event) => {
              const next = [...files]
              next[index] = { ...next[index], description: event.target.value }
              onChange(next)
            }}
            style={{ flex: 2 }}
            size="small"
          />
          <Button
            type="text"
            danger
            size="small"
            icon={<MinusCircleOutlined />}
            onClick={() => onChange(files.filter((_, current) => current !== index))}
          />
        </div>
      ))}
    </div>
  )
}

function SkillDirectoryTree({ skill }: { skill: Skill }) {
  const fileCount = 1 + (skill.reference ? 1 : 0) + skill.templates.length + skill.scripts.length

  return (
    <div style={{ fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace', fontSize: 13 }}>
      <div style={{ fontWeight: 600 }}>
        <FolderOpenOutlined style={{ marginRight: 6, color: '#faad14' }} />
        {skill.name}/
        <Text type="secondary" style={{ fontSize: 11, marginLeft: 8, fontWeight: 400 }}>
          {fileCount} 个文件
        </Text>
      </div>
      <div style={{ paddingLeft: 24 }}>
        <FileMarkdownOutlined style={{ marginRight: 6, color: '#7c3aed' }} />
        SKILL.md
      </div>
      {skill.reference && (
        <div style={{ paddingLeft: 24 }}>
          <FileTextOutlined style={{ marginRight: 6, color: '#1677ff' }} />
          reference.md
        </div>
      )}
      {skill.templates.length > 0 && (
        <>
          <div style={{ paddingLeft: 24 }}>
            <FolderOutlined style={{ marginRight: 6, color: '#faad14' }} />
            template/
          </div>
          {skill.templates.map((item) => (
            <div key={item.name} style={{ paddingLeft: 48 }}>
              {item.name}
              {item.description && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>- {item.description}</Text>}
            </div>
          ))}
        </>
      )}
      {skill.scripts.length > 0 && (
        <>
          <div style={{ paddingLeft: 24 }}>
            <FolderOutlined style={{ marginRight: 6, color: '#52c41a' }} />
            scripts/
          </div>
          {skill.scripts.map((item) => (
            <div key={item.name} style={{ paddingLeft: 48 }}>
              {item.name}
              {item.description && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>- {item.description}</Text>}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function formatCompactNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return `${value}`
}

function getFileCount(skill: Skill): number {
  return 1 + (skill.reference ? 1 : 0) + skill.templates.length + skill.scripts.length
}

export default function SkillsMarketPage() {
  const [list, setList] = useState<Skill[]>([])
  const [stats, setStats] = useState<SkillsMarketInsightStats | null>(null)
  const [filters, setFilters] = useState<SkillsMarketFilters>(DEFAULT_FILTERS)

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<SkillFormValues>()
  const [templates, setTemplates] = useState<SkillTemplateFile[]>([])
  const [scripts, setScripts] = useState<SkillScriptFile[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Skill | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm] = Form.useForm<SkillFormValues>()
  const [editTemplates, setEditTemplates] = useState<SkillTemplateFile[]>([])
  const [editScripts, setEditScripts] = useState<SkillScriptFile[]>([])

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<Skill | null>(null)

  const [importOpen, setImportOpen] = useState(false)
  const [importFunctions, setImportFunctions] = useState<OntologyFunctionItem[]>([])
  const [selectedImports, setSelectedImports] = useState<string[]>([])

  const reload = useCallback(async () => {
    const [skills, insightStats] = await Promise.all([listSkills(), getSkillsMarketInsightStats()])
    setList(skills)
    setStats(insightStats)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const filtered = filterSkills(list, filters)
  const featured = getFeaturedSkills(list, 6)
  const phaseOptions = collectPhaseOptions(list)
  const insightStats = stats || {
    totalSkills: list.length,
    businessSkills: list.filter((skill) => skill.marketType === 'business').length,
    generalSkills: list.filter((skill) => skill.marketType === 'general').length,
    coveredOntologies: new Set(list.flatMap((skill) => skill.sourceOntologyCodes)).size,
    coveredIndustries: new Set(list.map((skill) => skill.industry)).size,
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setCreating(true)
      await createSkill({
        name: values.name,
        displayName: values.displayName,
        category: values.category,
        description: values.description,
        instructions: values.instructions,
        reference: values.reference || undefined,
        templates: templates.filter((item) => item.name.trim()),
        scripts: scripts.filter((item) => item.name.trim()),
        dependencies: values.dependencies,
        tags: values.tags ? values.tags.split(/[,，、\s]+/).filter(Boolean) : [],
      })
      message.success('Skill 创建成功')
      setCreateOpen(false)
      form.resetFields()
      setTemplates([])
      setScripts([])
      await reload()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (skill: Skill) => {
    setEditTarget(skill)
    editForm.setFieldsValue({
      name: skill.name,
      displayName: skill.displayName,
      category: skill.category,
      description: skill.description,
      instructions: skill.instructions,
      reference: skill.reference || '',
      dependencies: skill.dependencies,
      tags: skill.tags.join(', '),
    })
    setEditTemplates([...skill.templates])
    setEditScripts([...skill.scripts])
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editTarget) return
    try {
      const values = await editForm.validateFields()
      setEditing(true)
      await updateSkill(editTarget.id, {
        displayName: values.displayName,
        description: values.description,
        instructions: values.instructions,
        reference: values.reference || undefined,
        category: values.category,
        dependencies: values.dependencies,
        templates: editTemplates.filter((item) => item.name.trim()),
        scripts: editScripts.filter((item) => item.name.trim()),
        tags: values.tags ? values.tags.split(/[,，、\s]+/).filter(Boolean) : [],
      })
      message.success('修改成功')
      setEditOpen(false)
      await reload()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error('修改失败')
    } finally {
      setEditing(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteSkill(id)
    message.success('Skill 已删除')
    await reload()
  }

  const handleToggle = async (id: string) => {
    await toggleSkillStatus(id)
    message.success('状态已更新')
    await reload()
  }

  const openDetail = (skill: Skill) => {
    setDetailTarget(skill)
    setDetailOpen(true)
  }

  const openImport = async () => {
    const functions = await listImportableFunctions()
    setImportFunctions(filterImportableFunctions(functions, list))
    setSelectedImports([])
    setImportOpen(true)
  }

  const handleImport = async () => {
    if (selectedImports.length === 0) {
      message.warning('请选择要导入的 Function')
      return
    }
    const selected = importFunctions.filter((item) => selectedImports.includes(item.id))
    await Promise.all(selected.map((item) => importFunctionAsSkill(item)))
    message.success(`成功导入 ${selected.length} 个 Function 为 Skill`)
    setImportOpen(false)
    await reload()
  }

  const renderSkillForm = (
    formInstance: ReturnType<typeof Form.useForm<SkillFormValues>>[0],
    templateFiles: SkillTemplateFile[],
    onTemplateChange: (next: SkillTemplateFile[]) => void,
    scriptFiles: SkillScriptFile[],
    onScriptChange: (next: SkillScriptFile[]) => void,
    readOnlyName = false,
  ) => (
    <Form<SkillFormValues> form={formInstance} layout="vertical" style={{ marginTop: 16 }}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="displayName" label="Skill 显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="例如：设备故障诊断专家" maxLength={64} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="name"
            label="Skill ID（目录名）"
            rules={[{ required: true, message: '请输入标识名' }]}
            extra="小写字母 + 连字符，如 equipment-fault-diagnosis"
          >
            <Input placeholder="例如：equipment-fault-diagnosis" maxLength={64} disabled={readOnlyName} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select
              options={SKILL_CATEGORIES.map((category) => ({
                value: category,
                label: `${SKILL_CATEGORY_ICONS[category]} ${SKILL_CATEGORY_LABELS[category]}`,
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="tags" label="标签" extra="逗号分隔，如：设备运维, 故障诊断, IoT">
            <Input placeholder="设备运维, 故障诊断" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        name="description"
        label="触发描述"
        rules={[{ required: true, message: '请输入描述' }]}
        extra="Agent 根据此描述判断何时自动加载该 Skill（最多 200 字）"
      >
        <TextArea rows={2} placeholder="描述该 Skill 的功能和适用场景" maxLength={200} showCount />
      </Form.Item>

      <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>
        <FileMarkdownOutlined style={{ marginRight: 4, color: '#7c3aed' }} />
        SKILL.md
      </Divider>
      <Form.Item name="instructions" rules={[{ required: true, message: '请输入 SKILL.md 内容' }]}>
        <TextArea rows={10} style={{ fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace', fontSize: 13 }} />
      </Form.Item>

      <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>
        <FileTextOutlined style={{ marginRight: 4, color: '#1677ff' }} />
        reference.md
      </Divider>
      <Form.Item name="reference">
        <TextArea rows={6} style={{ fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace', fontSize: 13 }} />
      </Form.Item>

      <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>
        <FolderOutlined style={{ marginRight: 4, color: '#faad14' }} />
        template/
      </Divider>
      <FileListEditor
        title="输出模板文件"
        icon={<span>📋</span>}
        placeholder="文件名，如 report.md"
        files={templateFiles}
        onChange={onTemplateChange}
      />

      <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>
        <FolderOutlined style={{ marginRight: 4, color: '#52c41a' }} />
        scripts/
      </Divider>
      <FileListEditor
        title="执行脚本文件"
        icon={<span>📜</span>}
        placeholder="文件名，如 analyze.py"
        files={scriptFiles}
        onChange={onScriptChange}
      />

      <Divider style={{ margin: '8px 0 16px' }} />
      <Form.Item name="dependencies" label="依赖说明（可选）">
        <Input placeholder="例如：python>=3.8, pandas>=1.5.0, sensor-data-api" />
      </Form.Item>
    </Form>
  )

  const columns: ColumnsType<Skill> = [
    {
      title: 'Skill',
      key: 'skill',
      width: 240,
      render: (_, record) => (
        <Space align="start">
          <span style={{ fontSize: 20 }}>{SKILL_CATEGORY_ICONS[record.category]}</span>
          <div>
            <Text strong style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => openDetail(record)}>
              {record.displayName}
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>{record.name}</Text>
            </div>
            <Space size={[4, 4]} wrap style={{ marginTop: 6 }}>
              <Tag color={SKILL_CATEGORY_COLORS[record.category]}>{SKILL_CATEGORY_LABELS[record.category]}</Tag>
              <Tag color={SKILL_MARKET_TYPE_COLORS[record.marketType]}>{SKILL_MARKET_TYPE_LABELS[record.marketType]}</Tag>
            </Space>
          </div>
        </Space>
      ),
    },
    {
      title: '适用范围',
      key: 'scope',
      width: 190,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{SKILL_INDUSTRY_LABELS[record.industry]}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.phase}</Text>
          <Tag color={SKILL_COVERAGE_LEVEL_COLORS[record.coverageLevel]}>{SKILL_COVERAGE_LEVEL_LABELS[record.coverageLevel]}</Tag>
        </Space>
      ),
    },
    {
      title: '推荐说明',
      key: 'recommendation',
      width: 320,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.recommendationReason}
          </Text>
          <Space size={[4, 4]} wrap>
            {record.sourceOntologyNames.slice(0, 2).map((item) => (
              <Tag key={item}>{item}</Tag>
            ))}
            {record.sourceOntologyNames.length > 2 && <Tag>+{record.sourceOntologyNames.length - 2}</Tag>}
          </Space>
        </Space>
      ),
    },
    {
      title: '执行指标',
      key: 'metrics',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{formatCompactNumber(record.usageCount)} 调用</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            成功率 {record.successRate?.toFixed(1) || '--'}%
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.avgLatencyMs || '--'} ms
          </Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: SkillStatus) => (
        <span>
          <span className={`status-dot ${value === 'Active' ? 'active' : value === 'Draft' ? 'warning' : 'error'}`} />
          <Tag color={SKILL_STATUS_COLORS[value]}>{value}</Tag>
        </span>
      ),
    },
    {
      title: '文件',
      key: 'files',
      width: 120,
      render: (_, record) => (
        <Tooltip title={`共 ${getFileCount(record)} 个文件`}>
          <Space size={4} wrap>
            <Tag color="purple">SKILL</Tag>
            {record.reference && <Tag color="blue">REF</Tag>}
            {record.templates.length > 0 && <Tag color="orange">TPL {record.templates.length}</Tag>}
            {record.scripts.length > 0 && <Tag color="green">PY {record.scripts.length}</Tag>}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <ActionColumn
          actions={[
            { key: 'view', icon: <EyeOutlined />, tooltip: '查看详情', onClick: () => openDetail(record) },
            { key: 'edit', icon: <EditOutlined />, tooltip: '编辑', onClick: () => openEdit(record) },
            {
              key: 'toggle',
              icon: <CheckCircleOutlined />,
              tooltip: record.status === 'Active' ? '禁用' : '启用',
              onClick: () => handleToggle(record.id),
            },
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              tooltip: '删除',
              danger: true,
              confirm: '确认删除该 Skill？',
              onClick: () => handleDelete(record.id),
            },
          ]}
        />
      ),
    },
  ]

  const statItems = [
    { title: 'Skill 总数', value: insightStats.totalSkills, icon: <AppstoreOutlined />, color: '#4f46e5', bg: '#eef2ff' },
    { title: '业务 Skill', value: insightStats.businessSkills, icon: <ThunderboltOutlined />, color: '#0f766e', bg: '#ecfeff' },
    { title: '通用 Skill', value: insightStats.generalSkills, icon: <TagOutlined />, color: '#a16207', bg: '#fefce8' },
    { title: '覆盖本体', value: insightStats.coveredOntologies, icon: <CheckCircleOutlined />, color: '#15803d', bg: '#f0fdf4' },
    { title: '覆盖行业', value: insightStats.coveredIndustries, icon: <CloudDownloadOutlined />, color: '#c2410c', bg: '#fff7ed' },
  ]

  const marketTypeOptions: { value: SkillMarketType | 'all'; label: string }[] = [
    { value: 'all', label: '全部类型' },
    { value: 'business', label: SKILL_MARKET_TYPE_LABELS.business },
    { value: 'general', label: SKILL_MARKET_TYPE_LABELS.general },
  ]

  const industryOptions: { value: SkillIndustry | 'all'; label: string }[] = [
    { value: 'all', label: '全部行业' },
    ...(['manufacturing', 'retail', 'medical', 'transport', 'general'] as SkillIndustry[]).map((industry) => ({
      value: industry,
      label: SKILL_INDUSTRY_LABELS[industry],
    })),
  ]

  const coverageOptions: { value: SkillCoverageLevel | 'all'; label: string }[] = [
    { value: 'all', label: '全部覆盖等级' },
    { value: 'core', label: SKILL_COVERAGE_LEVEL_LABELS.core },
    { value: 'enhanced', label: SKILL_COVERAGE_LEVEL_LABELS.enhanced },
    { value: 'optional', label: SKILL_COVERAGE_LEVEL_LABELS.optional },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>Skills Hub</Title>
          <Text type="secondary">
            L4 能力资产市场，按本体推荐业务 Skill，并混合展示跨行业复用的通用 Skill。
          </Text>
        </div>

        <Row gutter={[14, 14]} style={{ margin: '16px 0 20px' }}>
          {statItems.map((item) => (
            <Col xs={24} sm={12} lg={Math.floor(24 / statItems.length)} key={item.title}>
              <Card size="small" className="stat-card card-hover" styles={{ body: { padding: '16px 18px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="stat-icon-wrap" style={{ background: item.bg, color: item.color }}>
                    {item.icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>{item.title}</Text>
                    <div style={{ fontSize: 24, fontWeight: 700, color: item.color, lineHeight: 1.2 }}>{item.value}</div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <div className="skills-market-featured">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <Title level={5} style={{ marginBottom: 4 }}>推荐 Skill</Title>
              <Text type="secondary">优先展示本体驱动的业务能力与高复用通用能力。</Text>
            </div>
            <Tag color="geekblue">{featured.length} 个推荐位</Tag>
          </div>
          <Row gutter={[12, 12]}>
            {featured.map((skill) => (
              <Col xs={24} md={12} xl={8} key={skill.id}>
                <Card hoverable className="skills-market-featured-card" onClick={() => openDetail(skill)}>
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Space align="start">
                        <span style={{ fontSize: 24 }}>{SKILL_CATEGORY_ICONS[skill.category]}</span>
                        <div>
                          <Text strong>{skill.displayName}</Text>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>{SKILL_INDUSTRY_LABELS[skill.industry]} · {skill.phase}</Text>
                          </div>
                        </div>
                      </Space>
                      <Tag color={SKILL_MARKET_TYPE_COLORS[skill.marketType]}>{SKILL_MARKET_TYPE_LABELS[skill.marketType]}</Tag>
                    </div>
                    <Paragraph type="secondary" style={{ marginBottom: 0, minHeight: 44 }}>
                      {skill.recommendationReason}
                    </Paragraph>
                    <Space size={[4, 4]} wrap>
                      {skill.capabilities.slice(0, 3).map((item) => (
                        <Tag key={item}>{item}</Tag>
                      ))}
                    </Space>
                    <div className="skills-market-featured-meta">
                      <span>{formatCompactNumber(skill.usageCount)} 调用</span>
                      <span>{skill.successRate?.toFixed(1)}% 成功率</span>
                      <span>{skill.avgLatencyMs} ms</span>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <Card size="small" style={{ marginTop: 20, marginBottom: 16, background: '#fafafa' }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12} xl={6}>
              <Input
                placeholder="搜索 Skill / 本体 / 场景"
                prefix={<SearchOutlined />}
                allowClear
                value={filters.query}
                onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
              />
            </Col>
            <Col xs={12} md={12} xl={4}>
              <Select
                value={filters.marketType}
                onChange={(value) => setFilters((prev) => ({ ...prev, marketType: value }))}
                options={marketTypeOptions}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={12} md={12} xl={4}>
              <Select
                value={filters.industry}
                onChange={(value) => setFilters((prev) => ({ ...prev, industry: value }))}
                options={industryOptions}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={12} md={12} xl={4}>
              <Select
                value={filters.category}
                onChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
                options={[
                  { value: 'all', label: '全部分类' },
                  ...SKILL_CATEGORIES.map((category) => ({
                    value: category,
                    label: `${SKILL_CATEGORY_ICONS[category]} ${SKILL_CATEGORY_LABELS[category]}`,
                  })),
                ]}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={12} md={12} xl={3}>
              <Select
                value={filters.phase}
                onChange={(value) => setFilters((prev) => ({ ...prev, phase: value }))}
                options={[
                  { value: 'all', label: '全部阶段' },
                  ...phaseOptions.map((phase) => ({ value: phase, label: phase })),
                ]}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={12} md={12} xl={3}>
              <Select
                value={filters.coverageLevel}
                onChange={(value) => setFilters((prev) => ({ ...prev, coverageLevel: value }))}
                options={coverageOptions}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, gap: 12, flexWrap: 'wrap' }}>
            <Text type="secondary">当前结果 {filtered.length} 条</Text>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => void reload()} size="small">刷新</Button>
              <Button onClick={() => setFilters(DEFAULT_FILTERS)} size="small">重置筛选</Button>
              <Button icon={<ImportOutlined />} onClick={() => void openImport()}>从本体导入</Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setCreateOpen(true)
                  form.resetFields()
                  setTemplates([])
                  setScripts([])
                }}
              >
                创建 Skill
              </Button>
            </Space>
          </div>
        </Card>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1320 }}
          pagination={filtered.length > 10 ? { pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` } : false}
        />
      </Card>

      <Modal
        title={<ModalHeader icon={<FolderOpenOutlined />} title="创建 Skill" color="#faad14" />}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false)
          form.resetFields()
          setTemplates([])
          setScripts([])
        }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
        width={800}
        destroyOnClose
      >
        {renderSkillForm(form, templates, setTemplates, scripts, setScripts)}
      </Modal>

      <Modal
        title={<ModalHeader icon={<EditOutlined />} title="编辑 Skill" />}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false)
          editForm.resetFields()
        }}
        onOk={() => void handleEdit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={editing}
        width={800}
        destroyOnClose
      >
        {renderSkillForm(editForm, editTemplates, setEditTemplates, editScripts, setEditScripts, true)}
      </Modal>

      <Modal
        title={<ModalHeader icon={<EyeOutlined />} title="Skill 详情" />}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
        width={860}
        destroyOnClose
      >
        {detailTarget && (
          <>
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <span style={{ fontSize: 40 }}>{SKILL_CATEGORY_ICONS[detailTarget.category]}</span>
              <Title level={4} style={{ margin: '8px 0 4px' }}>{detailTarget.displayName}</Title>
              <Space wrap>
                <Tag color={SKILL_CATEGORY_COLORS[detailTarget.category]}>{SKILL_CATEGORY_LABELS[detailTarget.category]}</Tag>
                <Tag color={SKILL_MARKET_TYPE_COLORS[detailTarget.marketType]}>{SKILL_MARKET_TYPE_LABELS[detailTarget.marketType]}</Tag>
                <Tag color={SKILL_COVERAGE_LEVEL_COLORS[detailTarget.coverageLevel]}>{SKILL_COVERAGE_LEVEL_LABELS[detailTarget.coverageLevel]}</Tag>
                <Tag icon={<UserOutlined />}>{detailTarget.author}</Tag>
                <Tag icon={<DownloadOutlined />}>{detailTarget.installs.toLocaleString()} 安装</Tag>
              </Space>
              <Paragraph type="secondary" style={{ margin: '8px auto 0', maxWidth: 640 }}>
                {detailTarget.description}
              </Paragraph>
            </div>

            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="适用行业">{SKILL_INDUSTRY_LABELS[detailTarget.industry]}</Descriptions.Item>
              <Descriptions.Item label="业务阶段">{detailTarget.phase}</Descriptions.Item>
              <Descriptions.Item label="调用量">{detailTarget.usageCount.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="成功率">{detailTarget.successRate?.toFixed(1) || '--'}%</Descriptions.Item>
              <Descriptions.Item label="平均耗时">{detailTarget.avgLatencyMs || '--'} ms</Descriptions.Item>
              <Descriptions.Item label="目录文件">{getFileCount(detailTarget)} 个</Descriptions.Item>
              <Descriptions.Item label="推荐场景" span={2}>
                <Space size={[4, 4]} wrap>
                  {detailTarget.recommendedFor.map((item) => <Tag key={item}>{item}</Tag>)}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="来源本体" span={2}>
                <Space size={[4, 4]} wrap>
                  {detailTarget.sourceOntologyNames.length === 0 ? (
                    <Text type="secondary">未绑定本体</Text>
                  ) : (
                    detailTarget.sourceOntologyNames.map((item) => <Tag key={item}>{item}</Tag>)
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="能力标签" span={2}>
                <Space size={[4, 4]} wrap>
                  {detailTarget.capabilities.map((item) => <Tag color="blue" key={item}>{item}</Tag>)}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="推荐理由" span={2}>
                {detailTarget.recommendationReason}
              </Descriptions.Item>
            </Descriptions>

            <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>
              <FolderOpenOutlined style={{ marginRight: 4 }} />目录结构 ({getFileCount(detailTarget)} 个文件)
            </Divider>
            <SkillDirectoryTree skill={detailTarget} />

            <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>
              <FileMarkdownOutlined style={{ marginRight: 4, color: '#7c3aed' }} />
              SKILL.md
            </Divider>
            <pre className="code-block" style={{ whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto' }}>
              {detailTarget.instructions}
            </pre>

            {detailTarget.reference && (
              <>
                <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>
                  <FileTextOutlined style={{ marginRight: 4, color: '#1677ff' }} />
                  reference.md
                </Divider>
                <pre className="code-block" style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto' }}>
                  {detailTarget.reference}
                </pre>
              </>
            )}
          </>
        )}
      </Modal>

      <Modal
        title={<ModalHeader icon={<ImportOutlined />} title="从本体 Function 导入" color="#7c3aed" />}
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={() => void handleImport()}
        okText={`导入 (${selectedImports.length})`}
        cancelText="取消"
        okButtonProps={{ disabled: selectedImports.length === 0 }}
        width={680}
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              padding: '10px 14px',
              background: '#f9f0ff',
              border: '1px solid #d3adf7',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <ImportOutlined style={{ color: '#7c3aed', marginRight: 6 }} />
            从 L3 本体项目的 Function 导入能力入口，自动映射为业务 Skill 并补齐基础元数据。
          </div>
          {importFunctions.length === 0 ? (
            <Empty description="所有可用 Function 已导入" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {importFunctions.map((item) => {
                const checked = selectedImports.includes(item.id)
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedImports((prev) => (
                        checked ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                      ))
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: checked ? '#f9f0ff' : '#fafafa',
                      border: `1px solid ${checked ? '#d3adf7' : '#f0f0f0'}`,
                    }}
                  >
                    <CheckCircleOutlined style={{ color: checked ? '#7c3aed' : '#d9d9d9', fontSize: 18, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 14 }}>{item.name}()</Text>
                        <Tag color="purple" style={{ fontSize: 10 }}>{item.projectName}</Tag>
                        <Tag color={item.status === 'ACTIVE' ? 'green' : 'default'} style={{ fontSize: 10 }}>{item.status}</Tag>
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                      <pre
                        style={{
                          margin: '6px 0 0',
                          padding: '6px 10px',
                          background: '#f6f8fa',
                          borderRadius: 4,
                          fontSize: 11,
                          lineHeight: 1.5,
                          overflow: 'hidden',
                          maxHeight: 64,
                          color: '#586069',
                        }}
                      >
                        {item.scriptContent}
                      </pre>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {selectedImports.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <Text type="secondary">已选择 {selectedImports.length} 个 Function，导入后将创建对应业务 Skill。</Text>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
