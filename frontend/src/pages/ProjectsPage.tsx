import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { createProject, deleteProject, listProjects, updateProject } from '../api/projectManagement'
import type { ProjectSummary } from '../types/projectMvp'

const { Title, Text } = Typography

interface ProjectForm {
  name: string
  description?: string
}

function runStatusTag(status?: ProjectSummary['latestRunStatus']) {
  if (!status) return <Tag>无任务</Tag>
  if (status === 'RUNNING') return <Tag color="processing">运行中</Tag>
  if (status === 'FAILED') return <Tag color="error">失败</Tag>
  return <Tag color="success">已完成</Tag>
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

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setCreating(true)
      const created = await createProject(values.name, values.description)
      message.success('本体创建成功')
      setCreateOpen(false)
      form.resetFields()
      await loadProjects()
      navigate(`/projects/${created.id}`)
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
    editForm.setFieldsValue({ name: project.name, description: project.description })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editingProject) return
    try {
      const values = await editForm.validateFields()
      setEditing(true)
      await updateProject(editingProject.id, values.name, values.description)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>本体管理</Title>
            <Text type="secondary">按本体管理文档、抽取配置、版本发布、动作与函数，支撑业务落地。</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void loadProjects()} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建本体
            </Button>
          </Space>
        </div>
      </Card>

      <Card loading={loading}>
        {projects.length === 0 ? (
          <Empty description="暂无本体，先创建一个本体开始使用" />
        ) : (
          <Row gutter={[16, 16]}>
            {projects.map(project => (
              <Col key={project.id} xs={24} md={12} xl={8}>
                <Card
                  hoverable
                  style={{ height: '100%', cursor: 'pointer' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  actions={[
                    <Space key="edit" onClick={e => openEdit(project, e)}>
                      <EditOutlined />
                      编辑
                    </Space>,
                    <Popconfirm
                      key="delete"
                      title="确认删除该本体？"
                      description="该操作不可恢复，请谨慎操作。"
                      onConfirm={(e) => { e?.stopPropagation(); void handleDelete(project.id) }}
                      okButtonProps={{ loading: deletingId === project.id }}
                    >
                      <Space style={{ color: '#ff4d4f' }} onClick={e => e.stopPropagation()}>
                        <DeleteOutlined />
                        删除
                      </Space>
                    </Popconfirm>,
                  ]}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={5} style={{ margin: 0 }}>{project.name}</Title>
                      {runStatusTag(project.latestRunStatus)}
                    </div>
                    <Text type="secondary" style={{ minHeight: 40 }}>
                      {project.description || '未填写本体说明'}
                    </Text>
                    <Text>文档数：{project.documentCount}</Text>
                    <Text>版本数：{project.versionCount}</Text>
                    <Text type="secondary">更新时间：{new Date(project.updatedAt).toLocaleString()}</Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Modal
        title="新建本体"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
      >
        <Form<ProjectForm> form={form} layout="vertical">
          <Form.Item name="name" label="本体名称" rules={[{ required: true, message: '请输入本体名称' }]}>
            <Input placeholder="例如：设备故障诊断本体-产线A" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="本体说明">
            <Input.TextArea rows={4} placeholder="可选，描述该本体的业务范围与边界" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>

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
          <Form.Item name="name" label="本体名称" rules={[{ required: true, message: '请输入本体名称' }]}>
            <Input placeholder="例如：设备故障诊断本体-产线A" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="本体说明">
            <Input.TextArea rows={4} placeholder="可选，描述该本体的业务范围与边界" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
