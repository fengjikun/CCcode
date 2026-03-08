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
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BulbOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReloadOutlined,
  RocketOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { createProject, deleteProject, listProjects, updateProject } from '../api/projectManagement'
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
}

const DOMAINS: DomainDef[] = [
  { key: 'rd', label: '研发 R&D', shortLabel: '研发', icon: <BulbOutlined />, color: '#4f46e5', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)' },
  { key: 'process', label: '工艺 Process', shortLabel: '工艺', icon: <SettingOutlined />, color: '#d97706', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)' },
  { key: 'mfg', label: '生产 Mfg', shortLabel: '生产', icon: <ToolOutlined />, color: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a, #22c55e)' },
  { key: 'scm', label: '供应链 SCM', shortLabel: '供应链', icon: <ShoppingCartOutlined />, color: '#0891b2', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)' },
  { key: 'sales', label: '销售 Sales', shortLabel: '销售', icon: <RocketOutlined />, color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' },
  { key: 'service', label: '售后 Service', shortLabel: '售后', icon: <ExperimentOutlined />, color: '#e11d48', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)' },
]

const DOMAIN_MAP = Object.fromEntries(DOMAINS.map(d => [d.key, d]))

/* ═══ Helpers ═══ */

function runStatusTag(status?: ProjectSummary['latestRunStatus']) {
  if (!status) return <Tag>无任务</Tag>
  if (status === 'RUNNING') return <Tag color="processing">运行中</Tag>
  if (status === 'FAILED') return <Tag color="error">失败</Tag>
  return <Tag color="success">已完成</Tag>
}

interface ProjectForm {
  name: string
  category: string
  description?: string
}

const TAB_ALL = '__all__'

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
    if (!searchText) return list
    const q = searchText.toLowerCase()
    return list.filter(
      p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    )
  }, [projects, grouped, activeTab, searchText])

  // Stats
  const totalProjects = projects.length
  const totalDocs = projects.reduce((s, p) => s + p.documentCount, 0)
  const totalVersions = projects.reduce((s, p) => s + p.versionCount, 0)
  const coveredDomains = new Set(
    projects.map(p => p.category).filter(c => c && DOMAIN_MAP[c])
  ).size

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

  /* ═══ Tab item style ═══ */
  const tabStyle = (key: string, domain?: DomainDef): React.CSSProperties => {
    const isActive = activeTab === key
    const color = domain?.color || '#64748b'
    return {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 16px',
      borderRadius: 10,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      background: isActive ? (domain ? `${color}10` : '#f1f5f9') : 'transparent',
      border: isActive ? `1.5px solid ${color}` : '1.5px solid transparent',
      color: isActive ? color : '#64748b',
      fontWeight: isActive ? 600 : 400,
      fontSize: 14,
      whiteSpace: 'nowrap' as const,
    }
  }

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
            borderRadius: 10,
            borderTop: domain ? `3px solid ${domain.color}` : '3px solid #e5e7eb',
          }}
          onClick={() => navigate(`/ontology/projects/${project.id}`)}
          actions={[
            <Space key="edit" onClick={e => openEdit(project, e)}>
              <EditOutlined /> 编辑
            </Space>,
            <Popconfirm
              key="delete"
              title="确认删除该本体？"
              description="该操作不可恢复，请谨慎操作。"
              onConfirm={(e) => { e?.stopPropagation(); void handleDelete(project.id) }}
              okButtonProps={{ loading: deletingId === project.id }}
            >
              <Space style={{ color: '#ff4d4f' }} onClick={e => e.stopPropagation()}>
                <DeleteOutlined /> 删除
              </Space>
            </Popconfirm>,
          ]}
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={5} style={{ margin: 0, flex: 1, minWidth: 0 }} ellipsis>{project.name}</Title>
              {runStatusTag(project.latestRunStatus)}
            </div>
            {activeTab === TAB_ALL && domain && (
              <Tag
                style={{ borderColor: domain.color, color: domain.color, background: `${domain.color}08` }}
              >
                {domain.icon} <span style={{ marginLeft: 4 }}>{domain.shortLabel}</span>
              </Tag>
            )}
            <Paragraph
              type="secondary"
              style={{ margin: 0, minHeight: 40 }}
              ellipsis={{ rows: 2, expandable: false, tooltip: project.description }}
            >
              {project.description || '未填写本体说明'}
            </Paragraph>
            <div style={{ display: 'flex', gap: 16 }}>
              <Text><FileTextOutlined style={{ marginRight: 4 }} />{project.documentCount} 文档</Text>
              <Text><AppstoreOutlined style={{ marginRight: 4 }} />{project.versionCount} 版本</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              更新：{new Date(project.updatedAt).toLocaleString()}
            </Text>
          </Space>
        </Card>
      </Col>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ═══ Header ═══ */}
      <Card className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              <ApartmentOutlined style={{ marginRight: 8, color: '#4f46e5' }} />
              本体管理
            </Title>
            <Text type="secondary">
              覆盖研发、工艺、生产、供应链、销售、售后 6 大业务环节，按分类管理本体项目。
            </Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void loadProjects()} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateWithCategory(activeTab)}>
              新建本体
            </Button>
          </Space>
        </div>
      </Card>

      {/* ═══ Stats ═══ */}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic title="本体项目" value={totalProjects} prefix={<ApartmentOutlined />} className="stat-primary" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic title="覆盖环节" value={coveredDomains} suffix={<Text type="secondary" style={{ fontSize: 14 }}>/ 6</Text>} className="stat-info" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic title="文档 / 版本" value={totalDocs} suffix={<Text type="secondary" style={{ fontSize: 14 }}>/ {totalVersions} 版本</Text>} prefix={<FileTextOutlined />} className="stat-success" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic title="运行中任务" value={projects.filter(p => p.latestRunStatus === 'RUNNING').length} prefix={<ThunderboltOutlined />} className="stat-warning" />
          </Card>
        </Col>
      </Row>

      {/* ═══ Tab Bar + Search ═══ */}
      <Card className="section-card" bodyStyle={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {/* "全部" tab */}
            <div style={tabStyle(TAB_ALL)} onClick={() => setActiveTab(TAB_ALL)}>
              <AppstoreOutlined />
              <span>全部</span>
              <Badge count={totalProjects} size="small" style={{ backgroundColor: activeTab === TAB_ALL ? '#4f46e5' : '#d9d9d9' }} />
            </div>
            {/* Domain tabs */}
            {DOMAINS.map(d => (
              <div key={d.key} style={tabStyle(d.key, d)} onClick={() => setActiveTab(d.key)}>
                {d.icon}
                <span>{d.shortLabel}</span>
                {domainCounts[d.key] > 0 && (
                  <Badge count={domainCounts[d.key]} size="small" style={{ backgroundColor: activeTab === d.key ? d.color : '#d9d9d9' }} />
                )}
              </div>
            ))}
            {/* Uncategorized tab */}
            {domainCounts['__uncategorized__'] > 0 && (
              <div style={tabStyle('__uncategorized__')} onClick={() => setActiveTab('__uncategorized__')}>
                <FolderOpenOutlined />
                <span>未分类</span>
                <Badge count={domainCounts['__uncategorized__']} size="small" style={{ backgroundColor: activeTab === '__uncategorized__' ? '#64748b' : '#d9d9d9' }} />
              </div>
            )}
          </div>
          {/* Search */}
          <Input
            placeholder="搜索本体名称…"
            prefix={<SearchOutlined />}
            allowClear
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 220, flexShrink: 0 }}
          />
        </div>
      </Card>

      {/* ═══ Project Grid ═══ */}
      <Card className="section-card" loading={loading} bodyStyle={{ padding: 16 }}>
        {filteredProjects.length === 0 ? (
          <Empty
            description={searchText ? '未找到匹配的本体项目' : '该分类暂无本体项目'}
            style={{ padding: 40 }}
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
        title="新建本体"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
      >
        <Form<ProjectForm> form={form} layout="vertical">
          <Form.Item name="category" label="业务环节" rules={[{ required: true, message: '请选择业务环节' }]}>
            <Select placeholder="选择所属业务环节" options={categoryOptions} />
          </Form.Item>
          <Form.Item name="name" label="本体名称" rules={[{ required: true, message: '请输入本体名称' }]}>
            <Input placeholder="例如：设备维修本体、CPQ(配置报价)本体" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="本体说明">
            <Input.TextArea rows={3} placeholder="可选，描述该本体的业务范围与边界" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ═══ Edit Modal ═══ */}
      <Modal
        title="编辑本体"
        open={editOpen}
        onCancel={() => { setEditOpen(false); setEditingProject(null); editForm.resetFields() }}
        onOk={() => void handleEdit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={editing}
      >
        <Form<ProjectForm> form={editForm} layout="vertical">
          <Form.Item name="category" label="业务环节" rules={[{ required: true, message: '请选择业务环节' }]}>
            <Select placeholder="选择所属业务环节" options={categoryOptions} />
          </Form.Item>
          <Form.Item name="name" label="本体名称" rules={[{ required: true, message: '请输入本体名称' }]}>
            <Input placeholder="例如：设备故障诊断本体" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="本体说明">
            <Input.TextArea rows={3} placeholder="可选，描述该本体的业务范围与边界" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
