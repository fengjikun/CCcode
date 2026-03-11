import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
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
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FunctionOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  ReloadOutlined,
  RocketOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { createProject, deleteProject, listProjects, updateProject } from '../api/projectManagement'
import ModalHeader from '../components/shared/ModalHeader'
import type { ProjectSummary } from '../types/projectMvp'

const { Title, Text, Paragraph } = Typography

/* ═══ Domain category definitions ═══ */

interface DomainDef {
  key: string
  label: string
  shortLabel: string
  icon: React.ReactNode
  color: string
  gradient: string
  description: string
}

const DOMAINS: DomainDef[] = [
  { key: 'manufacturing', label: '制造领域', shortLabel: '制造', icon: <ToolOutlined />, color: '#4f46e5', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', description: '设备本体、工艺流程、BOM结构、产线知识图谱，驱动智能制造决策' },
  { key: 'retail', label: '零售领域', shortLabel: '零售', icon: <ShoppingCartOutlined />, color: '#d97706', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', description: '商品本体、门店模型、会员画像、供应链关系，提升全渠道运营效率' },
  { key: 'medical', label: '医疗领域', shortLabel: '医疗', icon: <ExperimentOutlined />, color: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a, #22c55e)', description: '疾病本体、药物知识、诊疗规范、患者关系，辅助精准医疗决策' },
  { key: 'transport', label: '交通领域', shortLabel: '交通', icon: <RocketOutlined />, color: '#0891b2', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', description: '车辆本体、路网模型、调度规则、运维知识，支撑智慧交通运营' },
  { key: 'general', label: '通用业务', shortLabel: '通用', icon: <SettingOutlined />, color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', description: '组织架构、业务流程、规章制度、跨域知识，构建企业通用语义底座' },
]

const DOMAIN_MAP = Object.fromEntries(DOMAINS.map(d => [d.key, d]))

/* ═══ Ontology capability definitions for the hero section ═══ */
const ONTO_CAPABILITIES = [
  { icon: <AppstoreOutlined />, label: 'Object Types', desc: '业务对象建模' },
  { icon: <TagsOutlined />, label: 'Properties', desc: '属性定义管理' },
  { icon: <BranchesOutlined />, label: 'Link Types', desc: '关系类型编排' },
  { icon: <ThunderboltOutlined />, label: 'Actions', desc: '业务动作注册' },
  { icon: <FunctionOutlined />, label: 'Functions', desc: '计算函数开发' },
  { icon: <NodeIndexOutlined />, label: 'Knowledge Graph', desc: '知识图谱构建' },
]

/* ═══ Helpers ═══ */

interface ProjectForm {
  name: string
  category: string
  description?: string
}

const TAB_ALL = '__all__'
const PINNED_PROJECT_ORDER = ['故障诊断本体', '商品补货本体'] as const

function getPinnedProjectRank(project: Pick<ProjectSummary, 'name'>): number {
  const index = PINNED_PROJECT_ORDER.indexOf(project.name as (typeof PINNED_PROJECT_ORDER)[number])
  return index >= 0 ? index : Number.POSITIVE_INFINITY
}

function sortProjectsForDisplay(list: ProjectSummary[]): ProjectSummary[] {
  return [...list].sort((a, b) => {
    const aRank = getPinnedProjectRank(a)
    const bRank = getPinnedProjectRank(b)
    if (aRank !== bRank) return aRank - bRank
    return 0
  })
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState<string>(TAB_ALL)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(9)
  const [form] = Form.useForm<ProjectForm>()
  const [editForm] = Form.useForm<ProjectForm>()
  const navigate = useNavigate()

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listProjects()
      setProjects(result)
    } catch (error: unknown) {
      message.error((error as Error)?.message || '加载本体失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  // Group projects by category
  const grouped = useMemo(() => {
    const g: Record<string, ProjectSummary[]> = {}
    const uncategorized: ProjectSummary[] = []
    for (const p of projects) {
      const cat = p.category || ''
      if (cat && DOMAIN_MAP[cat]) {
        ;(g[cat] ??= []).push(p)
      } else {
        uncategorized.push(p)
      }
    }
    if (uncategorized.length > 0) g['__uncategorized__'] = uncategorized
    return g
  }, [projects])

  // Domain counts for tab badges
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of DOMAINS) counts[d.key] = (grouped[d.key] || []).length
    counts['__uncategorized__'] = (grouped['__uncategorized__'] || []).length
    return counts
  }, [grouped])

  // Reset page when tab or search changes
  useEffect(() => { setCurrentPage(1) }, [activeTab, searchText])

  // Filtered projects for current view
  const filteredProjects = useMemo(() => {
    let list: ProjectSummary[]
    if (activeTab === TAB_ALL) {
      list = projects
    } else if (activeTab === '__uncategorized__') {
      list = grouped['__uncategorized__'] || []
    } else {
      list = grouped[activeTab] || []
    }
    if (!searchText) return sortProjectsForDisplay(list)
    const q = searchText.toLowerCase()
    return sortProjectsForDisplay(list.filter(
      p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    ))
  }, [projects, grouped, activeTab, searchText])

  const totalProjects = projects.length
  const totalDocs = projects.reduce((sum, p) => sum + p.documentCount, 0)
  const coveredDomains = new Set(projects.map(p => p.category).filter(Boolean)).size

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setCreating(true)
      const created = await createProject(values.name, values.description, values.category)
      message.success('本体创建成功')
      setCreateOpen(false)
      form.resetFields()
      await loadProjects()
      navigate(`/ontology/projects/${created.id}`)
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown })?.errorFields) return
      message.error((error as Error)?.message || '创建本体失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (projectId: string) => {
    setDeletingId(projectId)
    try {
      await deleteProject(projectId)
      message.success('本体已删除')
      await loadProjects()
    } catch (error: unknown) {
      message.error((error as Error)?.message || '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  const openEdit = (project: ProjectSummary, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingProject(project)
    editForm.setFieldsValue({
      name: project.name,
      category: project.category || '',
      description: project.description,
    })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editingProject) return
    try {
      const values = await editForm.validateFields()
      setEditing(true)
      await updateProject(editingProject.id, values.name, values.description, values.category)
      message.success('本体已更新')
      setEditOpen(false)
      setEditingProject(null)
      editForm.resetFields()
      await loadProjects()
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown })?.errorFields) return
      message.error((error as Error)?.message || '更新失败')
    } finally {
      setEditing(false)
    }
  }

  const openCreateWithCategory = (categoryKey?: string) => {
    if (categoryKey && categoryKey !== TAB_ALL && categoryKey !== '__uncategorized__') {
      form.setFieldsValue({ category: categoryKey })
    }
    setCreateOpen(true)
  }

  const categoryOptions = DOMAINS.map(d => ({ label: d.label, value: d.key }))

  /* ═══ Project card ═══ */
  const renderProjectCard = (project: ProjectSummary) => {
    const domain = project.category ? DOMAIN_MAP[project.category] : undefined
    return (
      <Col key={project.id} xs={24} md={12} xl={8}>
        <Card
          hoverable
          className="card-hover"
          style={{
            height: '100%',
            cursor: 'pointer',
            borderRadius: 12,
            border: '1px solid #e2e5f0',
          }}
          styles={{ body: { padding: '20px' } }}
          onClick={() => navigate(`/ontology/projects/${project.id}`)}
        >
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: domain ? `${domain.color}10` : '#f1f5f9',
                  color: domain?.color || '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {domain?.icon || <ApartmentOutlined />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <Title level={5} style={{ margin: 0, lineHeight: 1.3 }} ellipsis>{project.name}</Title>
                  {domain && (
                    <Tag
                      style={{ borderColor: domain.color, color: domain.color, background: `${domain.color}08`, fontSize: 11, lineHeight: '18px', padding: '0 6px', marginTop: 2 }}
                    >
                      {domain.shortLabel}
                    </Tag>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <Paragraph
              type="secondary"
              style={{ margin: 0, minHeight: 40, fontSize: 13, lineHeight: 1.6 }}
              ellipsis={{ rows: 2, expandable: false, tooltip: project.description }}
            >
              {project.description || '未填写本体说明'}
            </Paragraph>

            {/* Metrics */}
            <div style={{ display: 'flex', gap: 16, paddingTop: 4, borderTop: '1px solid #f0f2f8' }}>
              <Tooltip title="文档数量">
                <Text style={{ fontSize: 12, color: '#5e6687' }}><FileTextOutlined style={{ marginRight: 4 }} />{project.documentCount} 文档</Text>
              </Tooltip>
              <Tooltip title="版本数量">
                <Text style={{ fontSize: 12, color: '#5e6687' }}><AppstoreOutlined style={{ marginRight: 4 }} />{project.versionCount} 版本</Text>
              </Tooltip>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
              </Text>
              <Space size={0}>
                <Tooltip title="编辑">
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={e => openEdit(project, e)} style={{ color: '#5e6687' }} />
                </Tooltip>
                <Popconfirm
                  title="确认删除该本体？"
                  description="该操作不可恢复，请谨慎操作。"
                  onConfirm={(e) => { e?.stopPropagation(); void handleDelete(project.id) }}
                  okButtonProps={{ loading: deletingId === project.id }}
                >
                  <Tooltip title="删除">
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
                  </Tooltip>
                </Popconfirm>
              </Space>
            </div>
          </Space>
        </Card>
      </Col>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1400, margin: '0 auto' }}>

      {/* ═══ Hero Banner ═══ */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #0f1e45 0%, #1a2d5e 50%, #162450 100%)',
          border: 'none',
          borderRadius: 14,
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '32px 36px' } }}
      >
        <Row gutter={32} align="middle">
          <Col flex="1">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ApartmentOutlined style={{ color: '#818cf8', fontSize: 20 }} />
              <Text style={{ color: '#818cf8', fontSize: 13, letterSpacing: 2, fontWeight: 500 }}>Deepology 本体语义层</Text>
            </div>
            <Title level={3} style={{ color: '#fff', margin: '0 0 12px', fontWeight: 700 }}>
              覆盖 <span style={{ color: '#faad14' }}>{coveredDomains} 大领域</span> 的企业知识本体
            </Title>
            <Paragraph style={{ color: '#94a8d0', marginBottom: 18, lineHeight: 1.8, fontSize: 14, maxWidth: 520 }}>
              基于 <span style={{ color: '#a5b4fc' }}>Object / Property / Link / Action / Function</span> 五元语义模型，
              为每个领域构建专属知识图谱，驱动 AI 数字员工的精准理解与决策。
            </Paragraph>
            <Space size={12}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCreateWithCategory(activeTab)}
                style={{ background: 'rgba(79,70,229,0.9)', borderColor: 'transparent', boxShadow: '0 2px 12px rgba(79,70,229,0.4)' }}
              >
                新建本体
              </Button>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.3)',
                borderRadius: 8, padding: '6px 14px',
              }}>
                <DatabaseOutlined style={{ color: '#a5b4fc', fontSize: 14 }} />
                <Text style={{ color: '#a5b4fc', fontSize: 13 }}>{totalProjects} 个本体</Text>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.3)',
                borderRadius: 8, padding: '6px 14px',
              }}>
                <FileTextOutlined style={{ color: '#67e8f9', fontSize: 14 }} />
                <Text style={{ color: '#67e8f9', fontSize: 13 }}>{totalDocs} 份文档</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: 300,
            }}>
              {ONTO_CAPABILITIES.map(cap => (
                <div
                  key={cap.label}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '14px 8px',
                    textAlign: 'center', cursor: 'default',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6, color: '#a5b4fc' }}>{cap.icon}</div>
                  <Text style={{ color: '#e0e7ff', fontSize: 11, fontWeight: 600, display: 'block', lineHeight: 1.3 }}>
                    {cap.label}
                  </Text>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Card>

      {/* ═══ Industry Domain Matrix + Filter + Search (combined) ═══ */}
      <Card
        size="small"
        style={{ borderRadius: 14 }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#fffbeb', color: '#d97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>
              <BulbOutlined />
            </div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>领域本体矩阵</span>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>—— 每个领域均具备完整的语义模型与专属知识图谱</Text>
          </div>
          <Space>
            <Input
              placeholder="搜索本体名称…"
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 220 }}
              size="small"
            />
            <Button icon={<ReloadOutlined />} size="small" onClick={() => void loadProjects()} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateWithCategory(activeTab)}>
              新建本体
            </Button>
          </Space>
        </div>

        {/* Domain cards as filter — "全部" + 5 domains in one row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* "全部" card */}
          <div
            onClick={() => setActiveTab(TAB_ALL)}
            style={{
              flex: '1 1 0',
              minWidth: 120,
              border: activeTab === TAB_ALL ? '1.5px solid #4f46e540' : '1px solid #e2e5f0',
              borderRadius: 12,
              padding: '14px 16px',
              background: activeTab === TAB_ALL ? '#4f46e505' : '#fafbfe',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#eef2ff', color: '#4f46e5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                <AppstoreOutlined />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Text strong style={{ fontSize: 14, color: activeTab === TAB_ALL ? '#4f46e5' : '#1a1f36' }}>全部</Text>
                  <Badge count={totalProjects} size="small" style={{ backgroundColor: activeTab === TAB_ALL ? '#4f46e5' : '#d9d9d9' }} />
                </div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 1 }}>所有领域本体</Text>
              </div>
            </div>
          </div>

          {/* Domain cards */}
          {DOMAINS.map(d => {
            const count = domainCounts[d.key] || 0
            const isActive = activeTab === d.key
            return (
              <div
                key={d.key}
                onClick={() => setActiveTab(isActive ? TAB_ALL : d.key)}
                style={{
                  flex: '1 1 0',
                  minWidth: 180,
                  border: isActive ? `1.5px solid ${d.color}40` : '1px solid #e2e5f0',
                  borderRadius: 12,
                  padding: '14px 16px',
                  background: isActive ? `${d.color}05` : '#fafbfe',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `${d.color}12`, color: d.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                  }}>
                    {d.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text strong style={{ fontSize: 13, color: isActive ? d.color : '#1a1f36' }}>{d.label}</Text>
                      {count > 0 && (
                        <Tag color={d.color} style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', borderRadius: 8, marginLeft: 4 }}>
                          {count} 个本体
                        </Tag>
                      )}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'block' }}>
                      {d.description.length > 24 ? d.description.slice(0, 24) + '…' : d.description}
                    </Text>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Uncategorized card — only if exists */}
          {domainCounts['__uncategorized__'] > 0 && (
            <div
              onClick={() => setActiveTab(activeTab === '__uncategorized__' ? TAB_ALL : '__uncategorized__')}
              style={{
                flex: '1 1 0',
                minWidth: 120,
                border: activeTab === '__uncategorized__' ? '1.5px solid #64748b40' : '1px solid #e2e5f0',
                borderRadius: 12,
                padding: '14px 16px',
                background: activeTab === '__uncategorized__' ? '#64748b05' : '#fafbfe',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: '#f1f5f9', color: '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  <FolderOpenOutlined />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text strong style={{ fontSize: 13, color: activeTab === '__uncategorized__' ? '#64748b' : '#1a1f36' }}>未分类</Text>
                    <Badge count={domainCounts['__uncategorized__']} size="small" style={{ backgroundColor: activeTab === '__uncategorized__' ? '#64748b' : '#d9d9d9' }} />
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 1 }}>未归类本体</Text>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ═══ Project Grid ═══ */}
      <Card className="section-card" loading={loading} styles={{ body: { padding: 16 } }}>
        {filteredProjects.length === 0 ? (
          <Empty
            description={searchText ? '未找到匹配的本体项目' : '该领域暂无本体项目'}
            style={{ padding: 48 }}
          >
            {!searchText && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCreateWithCategory(activeTab)}
              >
                创建本体
              </Button>
            )}
          </Empty>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {filteredProjects
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map(p => renderProjectCard(p))}
            </Row>
            {filteredProjects.length > pageSize && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredProjects.length}
                  onChange={(page, size) => { setCurrentPage(page); setPageSize(size) }}
                  showSizeChanger
                  pageSizeOptions={['9', '18', '36']}
                  showTotal={total => `共 ${total} 个本体`}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* ═══ Create Modal ═══ */}
      <Modal
        title={<ModalHeader icon={<PlusOutlined />} title="新建本体" />}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
        destroyOnClose
      >
        <Form<ProjectForm> form={form} layout="vertical">
          <Form.Item name="category" label="领域分类" rules={[{ required: true, message: '请选择领域分类' }]}>
            <Select placeholder="选择所属领域分类" options={categoryOptions} />
          </Form.Item>
          <Form.Item name="name" label="本体名称" rules={[{ required: true, message: '请输入本体名称' }]}>
            <Input placeholder="例如：故障诊断本体、CPQ配置逻辑本体" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="本体说明">
            <Input.TextArea rows={3} placeholder="可选，描述该本体的业务范围与边界" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ═══ Edit Modal ═══ */}
      <Modal
        title={<ModalHeader icon={<EditOutlined />} title="编辑本体" />}
        open={editOpen}
        onCancel={() => { setEditOpen(false); setEditingProject(null); editForm.resetFields() }}
        onOk={() => void handleEdit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={editing}
        destroyOnClose
      >
        <Form<ProjectForm> form={editForm} layout="vertical">
          <Form.Item name="category" label="领域分类" rules={[{ required: true, message: '请选择领域分类' }]}>
            <Select placeholder="选择所属领域分类" options={categoryOptions} />
          </Form.Item>
          <Form.Item name="name" label="本体名称" rules={[{ required: true, message: '请输入本体名称' }]}>
            <Input placeholder="例如：供应商画像本体" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="本体说明">
            <Input.TextArea rows={3} placeholder="可选，描述该本体的业务范围与边界" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
