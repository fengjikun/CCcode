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
import { DeleteOutlined, FolderOpenOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { createProject, deleteProject, listProjects } from '../api/mvpMock'
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
  const [form] = Form.useForm<ProjectForm>()
  const navigate = useNavigate()

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listProjects()
      setProjects(result)
    } catch (error: any) {
      message.error(error?.message || '加载项目失败')
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
      message.success('项目创建成功')
      setCreateOpen(false)
      form.resetFields()
      await loadProjects()
      navigate(`/projects/${created.id}`)
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.message || '创建项目失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (projectId: string) => {
    setDeletingId(projectId)
    try {
      await deleteProject(projectId)
      message.success('项目已删除')
      await loadProjects()
    } catch (error: any) {
      message.error(error?.message || '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>项目管理</Title>
            <Text type="secondary">按项目隔离文档、抽取配置、本体版本、动作和函数。</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void loadProjects()} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建项目
            </Button>
          </Space>
        </div>
      </Card>

      <Card loading={loading}>
        {projects.length === 0 ? (
          <Empty description="暂无项目，先创建一个项目开始原型评审" />
        ) : (
          <Row gutter={[16, 16]}>
            {projects.map(project => (
              <Col key={project.id} xs={24} md={12} xl={8}>
                <Card
                  hoverable
                  style={{ height: '100%' }}
                  actions={[
                    <Space key="open" onClick={() => navigate(`/projects/${project.id}`)}>
                      <FolderOpenOutlined />
                      进入项目
                    </Space>,
                    <Popconfirm
                      key="delete"
                      title="确认删除该项目？"
                      description="该操作仅用于原型演示数据。"
                      onConfirm={() => void handleDelete(project.id)}
                      okButtonProps={{ loading: deletingId === project.id }}
                    >
                      <Space style={{ color: '#ff4d4f' }}>
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
                      {project.description || '未填写项目描述'}
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
        title="新建项目"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
      >
        <Form<ProjectForm> form={form} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="例如：设备故障本体-试点项目" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={4} placeholder="可选，描述项目目标和范围" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

