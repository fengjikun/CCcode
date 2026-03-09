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
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloudDownloadOutlined,
  CodeOutlined,
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
  UserOutlined,
} from '@ant-design/icons'
import {
  createSkill,
  deleteSkill,
  listSkills,
  updateSkill,
  toggleSkillStatus,
  listImportableFunctions,
  importFunctionAsSkill,
} from '../../api/skillsMarket'
import type { OntologyFunctionItem } from '../../api/skillsMarket'
import type { Skill, SkillTemplateFile, SkillScriptFile } from '../../types/skill'
import {
  SKILL_CATEGORIES,
  SKILL_CATEGORY_COLORS,
  SKILL_CATEGORY_ICONS,
  SKILL_CATEGORY_LABELS,
  SKILL_STATUS_COLORS,
} from '../../types/skill'
import ModalHeader from '../../components/shared/ModalHeader'
import ActionColumn from '../../components/shared/ActionColumn'
import type { SkillCategory, SkillStatus } from '../../types/skill'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

/* ──────────── 表单类型 ──────────── */
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

/* ──────────── 文件列表编辑器 ──────────── */
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
      {files.map((f, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <Input
            placeholder={placeholder}
            value={f.name}
            onChange={e => {
              const next = [...files]; next[i] = { ...next[i], name: e.target.value }; onChange(next)
            }}
            style={{ flex: 2 }}
            size="small"
          />
          <Input
            placeholder="说明"
            value={f.description || ''}
            onChange={e => {
              const next = [...files]; next[i] = { ...next[i], description: e.target.value }; onChange(next)
            }}
            style={{ flex: 2 }}
            size="small"
          />
          <Button
            type="text" danger size="small" icon={<MinusCircleOutlined />}
            onClick={() => onChange(files.filter((_, idx) => idx !== i))}
          />
        </div>
      ))}
    </div>
  )
}

/* ──────────── 目录树组件 ──────────── */
function SkillDirectoryTree({ skill }: { skill: Skill }) {
  const hasRef = !!skill.reference
  const hasTpl = skill.templates.length > 0
  const hasScr = skill.scripts.length > 0
  const fileCount = 1 + (hasRef ? 1 : 0) + skill.templates.length + skill.scripts.length

  return (
    <div className="dir-tree" style={{ fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace', fontSize: 13 }}>
      <div className="dir-item" style={{ fontWeight: 600 }}>
        <FolderOpenOutlined style={{ marginRight: 6, color: '#faad14' }} />
        {skill.name}/
        <Text type="secondary" style={{ fontSize: 11, marginLeft: 8, fontWeight: 400 }}>
          {fileCount} 个文件
        </Text>
      </div>
      {/* SKILL.md — 必要 */}
      <div className="dir-item" style={{ paddingLeft: 24 }}>
        <FileMarkdownOutlined style={{ marginRight: 6, color: '#7c3aed' }} />
        SKILL.md
        <Tag color="purple" style={{ marginLeft: 8, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>必要</Tag>
        <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>— 名称、触发时机、工具、执行流程</Text>
      </div>
      {/* reference.md — 可选 */}
      {hasRef && (
        <div className="dir-item" style={{ paddingLeft: 24 }}>
          <FileTextOutlined style={{ marginRight: 6, color: '#1677ff' }} />
          reference.md
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— 格式范本、专有名词、填写范例</Text>
        </div>
      )}
      {/* template/ */}
      {hasTpl && (
        <>
          <div className="dir-item" style={{ paddingLeft: 24 }}>
            <FolderOutlined style={{ marginRight: 6, color: '#faad14' }} />
            template/
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— 输出模板</Text>
          </div>
          {skill.templates.map(t => (
            <div key={t.name} className="dir-item" style={{ paddingLeft: 48 }}>
              📋 {t.name}
              {t.description && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— {t.description}</Text>}
            </div>
          ))}
        </>
      )}
      {/* scripts/ */}
      {hasScr && (
        <>
          <div className="dir-item" style={{ paddingLeft: 24 }}>
            <FolderOutlined style={{ marginRight: 6, color: '#faad14' }} />
            scripts/
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— 执行脚本</Text>
          </div>
          {skill.scripts.map(s => (
            <div key={s.name} className="dir-item" style={{ paddingLeft: 48 }}>
              📜 {s.name}
              {s.description && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>— {s.description}</Text>}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/* ──────────── 主页面 ──────────── */
export default function SkillsMarketPage() {
  const [list, setList] = useState<Skill[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<SkillCategory | 'all'>('all')

  // 注册弹窗
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<SkillFormValues>()
  const [templates, setTemplates] = useState<SkillTemplateFile[]>([])
  const [scripts, setScripts] = useState<SkillScriptFile[]>([])

  // 编辑弹窗
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Skill | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm] = Form.useForm<SkillFormValues>()
  const [editTemplates, setEditTemplates] = useState<SkillTemplateFile[]>([])
  const [editScripts, setEditScripts] = useState<SkillScriptFile[]>([])

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<Skill | null>(null)

  // 本体导入弹窗
  const [importOpen, setImportOpen] = useState(false)
  const [importFunctions, setImportFunctions] = useState<OntologyFunctionItem[]>([])
  const [selectedImports, setSelectedImports] = useState<string[]>([])

  const reload = useCallback(async () => {
    setList(await listSkills())
  }, [])

  useEffect(() => { reload() }, [reload])

  /* 过滤 */
  const filtered = list.filter(s => {
    if (filterCategory !== 'all' && s.category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return s.displayName.toLowerCase().includes(q)
        || s.name.toLowerCase().includes(q)
        || s.tags.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  /* 统计 */
  const totalInstalls = list.reduce((sum, s) => sum + s.installs, 0)
  const activeCount = list.filter(s => s.status === 'Active').length

  /* 创建 */
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
        templates: templates.filter(t => t.name.trim()),
        scripts: scripts.filter(s => s.name.trim()),
        dependencies: values.dependencies,
        tags: values.tags ? values.tags.split(/[,，、\s]+/).filter(Boolean) : [],
      })
      message.success('Skill 创建成功')
      setCreateOpen(false)
      form.resetFields()
      setTemplates([])
      setScripts([])
      await reload()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  /* 编辑 */
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
    try {
      const values = await editForm.validateFields()
      setEditing(true)
      await updateSkill(editTarget!.id, {
        displayName: values.displayName,
        description: values.description,
        instructions: values.instructions,
        reference: values.reference || undefined,
        category: values.category,
        dependencies: values.dependencies,
        templates: editTemplates.filter(t => t.name.trim()),
        scripts: editScripts.filter(s => s.name.trim()),
        tags: values.tags ? values.tags.split(/[,，、\s]+/).filter(Boolean) : [],
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
    await deleteSkill(id)
    message.success('Skill 已删除')
    await reload()
  }

  /* 状态切换 */
  const handleToggle = async (id: string) => {
    await toggleSkillStatus(id)
    message.success('状态已更新')
    await reload()
  }

  /* 详情 */
  const openDetail = (skill: Skill) => {
    setDetailTarget(skill)
    setDetailOpen(true)
  }

  /* 从本体导入 */
  const openImport = async () => {
    const fns = await listImportableFunctions()
    // 过滤掉已导入的（按 name 匹配）
    const existingNames = list.map(s => s.tags).flat()
    setImportFunctions(fns.filter(f => !existingNames.includes(f.name)))
    setSelectedImports([])
    setImportOpen(true)
  }

  const handleImport = async () => {
    if (selectedImports.length === 0) {
      message.warning('请选择要导入的 Function')
      return
    }
    const selected = importFunctions.filter(f => selectedImports.includes(f.id))
    await Promise.all(selected.map(fn => importFunctionAsSkill(fn)))
    message.success(`成功导入 ${selected.length} 个 Function 为 Skill`)
    setImportOpen(false)
    await reload()
  }

  /* Skill 表单 (创建/编辑复用) */
  const renderSkillForm = (
    formInst: ReturnType<typeof Form.useForm<SkillFormValues>>[0],
    tplFiles: SkillTemplateFile[],
    setTplFiles: (f: SkillTemplateFile[]) => void,
    scrFiles: SkillScriptFile[],
    setScrFiles: (f: SkillScriptFile[]) => void,
  ) => (
    <Form<SkillFormValues> form={formInst} layout="vertical" style={{ marginTop: 16 }}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="displayName" label="Skill 显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="例如：设备故障诊断专家" maxLength={64} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="name" label="Skill ID（目录名）" rules={[{ required: true, message: '请输入标识名' }]}
            extra="小写字母 + 连字符，如 equipment-fault-diagnosis"
          >
            <Input placeholder="例如：equipment-fault-diagnosis" maxLength={64} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select
              options={SKILL_CATEGORIES.map(c => ({
                value: c,
                label: `${SKILL_CATEGORY_ICONS[c]} ${SKILL_CATEGORY_LABELS[c]}`,
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="tags" label="标签"
            extra="逗号分隔，如：设备运维, 故障诊断, IoT"
          >
            <Input placeholder="设备运维, 故障诊断" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="description" label="触发描述" rules={[{ required: true, message: '请输入描述' }]}
        extra="Agent 根据此描述判断何时自动加载该 Skill（最多 200 字）"
      >
        <TextArea rows={2} placeholder="描述该 Skill 的功能和适用场景" maxLength={200} showCount />
      </Form.Item>

      {/* SKILL.md */}
      <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>
        <FileMarkdownOutlined style={{ marginRight: 4, color: '#7c3aed' }} />
        SKILL.md <Tag color="purple" style={{ fontSize: 10, marginLeft: 4, lineHeight: '16px', padding: '0 4px' }}>必要</Tag>
      </Divider>
      <Form.Item name="instructions" rules={[{ required: true, message: '请输入 SKILL.md 内容' }]}
        extra="主设定：名称、触发时机、可用工具、执行流程、输出规范"
      >
        <TextArea
          rows={10}
          placeholder={`# Skill 名称\n\n> **触发时机**：当...时自动加载。\n\n## 可用工具\n\n- \`tool-name\` — 说明\n\n## 执行流程\n\n1. ...\n2. ...\n\n## 输出规范\n\n- ...`}
          style={{ fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace', fontSize: 13 }}
        />
      </Form.Item>

      {/* reference.md */}
      <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>
        <FileTextOutlined style={{ marginRight: 4, color: '#1677ff' }} />
        reference.md <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>（可选）</Text>
      </Divider>
      <Form.Item name="reference"
        extra="补充参考：格式范本、专有名词、填写范例等"
      >
        <TextArea
          rows={6}
          placeholder={`# 参考资料\n\n## 专有名词\n\n| 缩写 | 全称 | 说明 |\n|------|------|------|\n| ... | ... | ... |\n\n## 填写范例\n\n...`}
          style={{ fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace', fontSize: 13 }}
        />
      </Form.Item>

      {/* template/ */}
      <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>
        <FolderOutlined style={{ marginRight: 4, color: '#faad14' }} />
        template/ <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>（可选）</Text>
      </Divider>
      <FileListEditor
        title="输出模板文件"
        icon={<span>📋</span>}
        placeholder="文件名，如 report.md"
        files={tplFiles}
        onChange={setTplFiles}
      />

      {/* scripts/ */}
      <Divider titlePlacement="left" plain style={{ margin: '8px 0 16px', fontSize: 13 }}>
        <FolderOutlined style={{ marginRight: 4, color: '#52c41a' }} />
        scripts/ <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>（可选）</Text>
      </Divider>
      <FileListEditor
        title="执行脚本文件"
        icon={<span>📜</span>}
        placeholder="文件名，如 analyze.py"
        files={scrFiles}
        onChange={setScrFiles}
      />

      <Divider style={{ margin: '8px 0 16px' }} />
      <Form.Item name="dependencies" label="依赖说明（可选）">
        <Input placeholder="例如：python>=3.8, pandas>=1.5.0, sensor-data-api" />
      </Form.Item>
    </Form>
  )

  /* 表格列 — 资源概况 */
  const getFileCount = (s: Skill) => {
    let count = 1 // SKILL.md
    if (s.reference) count++
    count += s.templates.length + s.scripts.length
    return count
  }

  /* 表格列 */
  const columns = [
    {
      title: 'Skill',
      key: 'skill',
      render: (_: unknown, r: Skill) => (
        <Space>
          <span style={{ fontSize: 20 }}>{SKILL_CATEGORY_ICONS[r.category]}</span>
          <div>
            <Text strong style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => openDetail(r)}>
              {r.displayName}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>{r.name}/</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 110,
      render: (v: SkillCategory) => (
        <Tag color={SKILL_CATEGORY_COLORS[v]}>{SKILL_CATEGORY_ICONS[v]} {SKILL_CATEGORY_LABELS[v]}</Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 280,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{v.length > 60 ? v.slice(0, 60) + '...' : v}</Text>
      ),
    },
    {
      title: '目录结构',
      key: 'structure',
      width: 160,
      render: (_: unknown, r: Skill) => {
        const parts: string[] = ['SKILL.md']
        if (r.reference) parts.push('reference.md')
        if (r.templates.length > 0) parts.push(`template/ (${r.templates.length})`)
        if (r.scripts.length > 0) parts.push(`scripts/ (${r.scripts.length})`)
        return (
          <Tooltip title={parts.join('\n')} overlayStyle={{ whiteSpace: 'pre-line' }}>
            <Space size={4} wrap>
              <Tag icon={<FileMarkdownOutlined />} color="purple">SKILL.md</Tag>
              {r.reference && <Tag icon={<FileTextOutlined />} color="blue">ref</Tag>}
              {r.templates.length > 0 && <Tag icon={<FolderOutlined />} color="orange">tpl:{r.templates.length}</Tag>}
              {r.scripts.length > 0 && <Tag icon={<CodeOutlined />} color="green">scripts:{r.scripts.length}</Tag>}
            </Space>
          </Tooltip>
        )
      },
    },
    {
      title: '安装量',
      dataIndex: 'installs',
      key: 'installs',
      width: 90,
      sorter: (a: Skill, b: Skill) => a.installs - b.installs,
      render: (v: number) => (
        <Space size={4}>
          <DownloadOutlined style={{ color: '#8c8c8c' }} />
          {v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Draft', value: 'Draft' },
        { text: 'Disabled', value: 'Disabled' },
      ],
      onFilter: (value: unknown, record: Skill) => record.status === value,
      render: (v: SkillStatus) => (
        <span>
          <span className={`status-dot ${v === 'Active' ? 'active' : v === 'Draft' ? 'warning' : 'error'}`} />
          <Tag color={SKILL_STATUS_COLORS[v]}>{v}</Tag>
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: Skill) => (
        <ActionColumn actions={[
          { key: 'view', icon: <EyeOutlined />, tooltip: '查看详情', onClick: () => openDetail(record) },
          { key: 'edit', icon: <EditOutlined />, tooltip: '编辑', onClick: () => openEdit(record) },
          { key: 'toggle', icon: <CheckCircleOutlined />, tooltip: record.status === 'Active' ? '禁用' : '启用', onClick: () => handleToggle(record.id) },
          { key: 'delete', icon: <DeleteOutlined />, tooltip: '删除', danger: true, confirm: '确认删除该 Skill？', onClick: () => handleDelete(record.id) },
        ]} />
      ),
    },
  ]

  /* 统计卡片 */
  const statItems = [
    { title: 'Skills 总数', value: list.length, icon: <AppstoreOutlined />, color: '#4f46e5', bg: '#eef2ff' },
    { title: '已启用', value: activeCount, icon: <CheckCircleOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: '分类覆盖', value: new Set(list.map(s => s.category)).size, icon: <TagOutlined />, color: '#7c3aed', bg: '#f5f3ff' },
    { title: '总安装量', value: totalInstalls >= 1000 ? `${(totalInstalls / 1000).toFixed(1)}K` : totalInstalls, icon: <CloudDownloadOutlined />, color: '#d97706', bg: '#fffbeb' },
  ]

  return (
    <div className="page-container">
      <Card className="section-card">
        <div className="page-header">
          <Title level={4}>Skills Hub</Title>
          <Text type="secondary">
            L4 能力资产 — 将专业知识、工作流与最佳实践封装为可复用的 AI Skill，Agent 按需自动加载
          </Text>
        </div>

        {/* 统计 */}
        <Row gutter={[14, 14]} style={{ margin: '16px 0 20px' }}>
          {statItems.map(s => (
            <Col span={6} key={s.title}>
              <Card size="small" className="stat-card card-hover" styles={{ body: { padding: '16px 18px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="stat-icon-wrap" style={{ background: s.bg, color: s.color }}>
                    {s.icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>{s.title}</Text>
                    <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 分类说明 */}
        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          {SKILL_CATEGORIES.map(c => (
            <Col span={4} key={c}>
              <Card
                size="small"
                hoverable
                style={{
                  background: filterCategory === c ? '#e6f4ff' : '#fafafa',
                  borderColor: filterCategory === c ? '#91caff' : undefined,
                  cursor: 'pointer',
                }}
                styles={{ body: { padding: '10px 12px', textAlign: 'center' } }}
                onClick={() => setFilterCategory(filterCategory === c ? 'all' : c)}
              >
                <div style={{ fontSize: 22, marginBottom: 2 }}>{SKILL_CATEGORY_ICONS[c]}</div>
                <Text strong style={{ fontSize: 12 }}>{SKILL_CATEGORY_LABELS[c]}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {list.filter(s => s.category === c).length} 个
                </Text>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 工具栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>
            <Select
              value={filterCategory}
              onChange={setFilterCategory}
              style={{ width: 150 }}
              size="small"
              options={[
                { value: 'all', label: '全部分类' },
                ...SKILL_CATEGORIES.map(c => ({
                  value: c,
                  label: `${SKILL_CATEGORY_ICONS[c]} ${SKILL_CATEGORY_LABELS[c]}`,
                })),
              ]}
            />
            <Input
              placeholder="搜索 Skill 名称 / 标签"
              prefix={<SearchOutlined />}
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 260 }}
              size="small"
            />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={reload} size="small">刷新</Button>
            <Button
              icon={<ImportOutlined />}
              onClick={openImport}
            >
              从本体导入
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setCreateOpen(true); form.resetFields(); setTemplates([]); setScripts([]) }}
            >
              创建 Skill
            </Button>
          </Space>
        </div>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          pagination={filtered.length > 10 ? { pageSize: 10, showSizeChanger: true, showTotal: t => `共 ${t} 条` } : false}
          size="middle"
        />
      </Card>

      {/* ===== 创建弹窗 ===== */}
      <Modal
        title={<ModalHeader icon={<FolderOpenOutlined />} title="创建 Skill" color="#faad14" />}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); setTemplates([]); setScripts([]) }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
        width={800}
        destroyOnClose
      >
        {renderSkillForm(form, templates, setTemplates, scripts, setScripts)}
      </Modal>

      {/* ===== 编辑弹窗 ===== */}
      <Modal
        title={<ModalHeader icon={<EditOutlined />} title="编辑 Skill" />}
        open={editOpen}
        onCancel={() => { setEditOpen(false); editForm.resetFields() }}
        onOk={() => void handleEdit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={editing}
        width={800}
        destroyOnClose
      >
        {renderSkillForm(editForm, editTemplates, setEditTemplates, editScripts, setEditScripts)}
      </Modal>

      {/* ===== 详情弹窗 ===== */}
      <Modal
        title={<ModalHeader icon={<EyeOutlined />} title="Skill 详情" />}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
        width={800}
        destroyOnClose
      >
        {detailTarget && (
          <>
            {/* 头部 */}
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <span style={{ fontSize: 40 }}>{SKILL_CATEGORY_ICONS[detailTarget.category]}</span>
              <Title level={4} style={{ margin: '8px 0 4px' }}>{detailTarget.displayName}</Title>
              <Space wrap>
                <Tag color={SKILL_CATEGORY_COLORS[detailTarget.category]}>
                  {SKILL_CATEGORY_LABELS[detailTarget.category]}
                </Tag>
                <Tag color={SKILL_STATUS_COLORS[detailTarget.status]}>{detailTarget.status}</Tag>
                <Tag icon={<UserOutlined />}>{detailTarget.author}</Tag>
                <Tag icon={<DownloadOutlined />}>{detailTarget.installs.toLocaleString()} 安装</Tag>
              </Space>
              <Paragraph type="secondary" style={{ margin: '8px auto 0', maxWidth: 500 }}>
                {detailTarget.description}
              </Paragraph>
            </div>

            {/* 标签 */}
            {detailTarget.tags.length > 0 && (
              <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
                {detailTarget.tags.map(t => <Tag key={t} color="default" style={{ margin: 2 }}>{t}</Tag>)}
              </div>
            )}

            {/* 目录结构 */}
            <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>
              <FolderOpenOutlined style={{ marginRight: 4 }} />目录结构 ({getFileCount(detailTarget)} 个文件)
            </Divider>
            <SkillDirectoryTree skill={detailTarget} />

            {/* SKILL.md */}
            <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>
              <FileMarkdownOutlined style={{ marginRight: 4, color: '#7c3aed' }} />
              SKILL.md
              <Tag color="purple" style={{ fontSize: 10, marginLeft: 6, lineHeight: '16px', padding: '0 4px' }}>必要</Tag>
            </Divider>
            <pre className="code-block" style={{ whiteSpace: 'pre-wrap', maxHeight: 360, overflowY: 'auto' }}>
              {detailTarget.instructions}
            </pre>

            {/* reference.md */}
            {detailTarget.reference && (
              <>
                <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>
                  <FileTextOutlined style={{ marginRight: 4, color: '#1677ff' }} />
                  reference.md
                </Divider>
                <pre className="code-block" style={{ whiteSpace: 'pre-wrap', maxHeight: 280, overflowY: 'auto' }}>
                  {detailTarget.reference}
                </pre>
              </>
            )}

            {/* 元信息 */}
            <Divider titlePlacement="left" plain style={{ fontSize: 13 }}>元信息</Divider>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Skill ID"><Text code>{detailTarget.name}</Text></Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag color={SKILL_CATEGORY_COLORS[detailTarget.category]}>{SKILL_CATEGORY_LABELS[detailTarget.category]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="依赖">{detailTarget.dependencies || '无'}</Descriptions.Item>
              <Descriptions.Item label="作者">{detailTarget.author}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{new Date(detailTarget.createdAt).toLocaleDateString('zh-CN')}</Descriptions.Item>
              <Descriptions.Item label="最近更新">{new Date(detailTarget.updatedAt).toLocaleDateString('zh-CN')}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>

      {/* ===== 从本体导入弹窗 ===== */}
      <Modal
        title={<ModalHeader icon={<ImportOutlined />} title="从本体 Function 导入" color="#7c3aed" />}
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={handleImport}
        okText={`导入 (${selectedImports.length})`}
        cancelText="取消"
        okButtonProps={{ disabled: selectedImports.length === 0 }}
        width={640}
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <div style={{
            padding: '10px 14px', background: '#f9f0ff', border: '1px solid #d3adf7',
            borderRadius: 6, marginBottom: 16, fontSize: 13,
          }}>
            <ImportOutlined style={{ color: '#7c3aed', marginRight: 6 }} />
            从 L3 本体项目中的 Function 定义导入为 Skill，自动生成 SKILL.md 和脚本文件。
          </div>
          {importFunctions.length === 0 ? (
            <Empty description="所有可用 Function 已导入" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {importFunctions.map(fn => {
                const checked = selectedImports.includes(fn.id)
                return (
                  <div
                    key={fn.id}
                    onClick={() => {
                      setSelectedImports(prev =>
                        checked ? prev.filter(id => id !== fn.id) : [...prev, fn.id]
                      )
                    }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      background: checked ? '#f9f0ff' : '#fafafa',
                      border: `1px solid ${checked ? '#d3adf7' : '#f0f0f0'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <CheckCircleOutlined style={{ color: checked ? '#7c3aed' : '#d9d9d9', fontSize: 18, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 14 }}>{fn.name}()</Text>
                        <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                          {fn.projectName}
                        </Tag>
                        <Tag color={fn.status === 'ACTIVE' ? 'green' : 'default'} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                          {fn.status}
                        </Tag>
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{fn.description}</Text>
                      <pre style={{
                        margin: '6px 0 0', padding: '6px 10px', background: '#f6f8fa',
                        borderRadius: 4, fontSize: 11, lineHeight: 1.5, overflow: 'hidden',
                        maxHeight: 60, color: '#586069',
                      }}>
                        {fn.scriptContent}
                      </pre>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {selectedImports.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <Text type="secondary">已选择 {selectedImports.length} 个 Function，导入后将创建对应 Skill（状态为 Draft）</Text>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
