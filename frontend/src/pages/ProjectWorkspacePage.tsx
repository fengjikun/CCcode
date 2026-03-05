import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tree,
  Typography,
  message,
} from 'antd'
import {
  ApartmentOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  createEntityProperty,
  createEntityType,
  createProjectAction,
  createProjectFunction,
  createRelationType,
  deleteProjectAction,
  deleteProjectDocument,
  deleteProjectFunction,
  getProjectDetail,
  publishRunVersion,
  removeEntityProperty,
  removeEntityType,
  removeRelationType,
  runProjectExtraction,
  setActionStatus,
  setFunctionStatus,
  setProjectDocumentEnabled,
  uploadCustomSkill,
  uploadProjectDocument,
} from '../api/mvpMock'
import type {
  ActionDefinition,
  ActionStatus,
  EntityPropertyConfig,
  ExtractionRun,
  FunctionDefinition,
  FunctionStatus,
  PropertyDataType,
  ProjectDetail,
  ProjectDocument,
} from '../types/projectMvp'
import OntologyGraph from '../components/ontology/step1/OntologyGraph'
import type { LinkType, ObjectType } from '../types/ontology'
import type { DataNode, TreeProps } from 'antd/es/tree'

const { Title, Text } = Typography

const PROPERTY_DATA_TYPES: PropertyDataType[] = ['STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'DATE', 'DATETIME', 'JSON', 'TEXT']

type TabKey = 'documents' | 'schema' | 'extraction' | 'actions' | 'functions'

interface ActionFormData {
  name: string
  description?: string
  status: ActionStatus
}

interface FunctionFormData {
  name: string
  description?: string
  scriptContent: string
  status: FunctionStatus
}

interface PublishFormData {
  label: string
  notes?: string
}

function runStatusTag(status: ExtractionRun['status']) {
  if (status === 'RUNNING') return <Tag color="processing">运行中</Tag>
  if (status === 'FAILED') return <Tag color="error">失败</Tag>
  return <Tag color="success">已完成</Tag>
}

function actionStatusTag(status: ActionStatus) {
  if (status === 'ACTIVE') return <Tag color="success">ACTIVE</Tag>
  return <Tag color="default">DRAFT</Tag>
}

function functionStatusTag(status: FunctionStatus) {
  if (status === 'ACTIVE') return <Tag color="success">ACTIVE</Tag>
  return <Tag color="default">DRAFT</Tag>
}

export default function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('documents')
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  const [entityName, setEntityName] = useState('')
  const [entityDescription, setEntityDescription] = useState('')
  const [addingEntity, setAddingEntity] = useState(false)

  const [relationName, setRelationName] = useState('')
  const [relationDescription, setRelationDescription] = useState('')
  const [relationDomain, setRelationDomain] = useState<string>()
  const [relationRange, setRelationRange] = useState<string>()
  const [addingRelation, setAddingRelation] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [selectedSchemaTreeKeys, setSelectedSchemaTreeKeys] = useState<string[]>([])

  const [propertyName, setPropertyName] = useState('')
  const [propertyDisplayName, setPropertyDisplayName] = useState('')
  const [propertyDataType, setPropertyDataType] = useState<PropertyDataType>('STRING')
  const [propertyRequired, setPropertyRequired] = useState(false)
  const [propertyDefaultValue, setPropertyDefaultValue] = useState('')
  const [addingProperty, setAddingProperty] = useState(false)

  const [uploadingSkills, setUploadingSkills] = useState(false)

  const [runningExtraction, setRunningExtraction] = useState(false)
  const [publishingVersion, setPublishingVersion] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)

  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [functionModalOpen, setFunctionModalOpen] = useState(false)
  const [savingAction, setSavingAction] = useState(false)
  const [savingFunction, setSavingFunction] = useState(false)
  const [publishForm] = Form.useForm<PublishFormData>()
  const [actionForm] = Form.useForm<ActionFormData>()
  const [functionForm] = Form.useForm<FunctionFormData>()

  const [uploadingDocs, setUploadingDocs] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const skillZipInputRef = useRef<HTMLInputElement>(null)

  const loadProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const result = await getProjectDetail(projectId)
      setProject(result)
      if (!activeRunId && result.runs.length > 0) {
        setActiveRunId(result.runs[0].id)
      }
    } catch (error: any) {
      message.error(error?.message || '加载项目失败')
      navigate('/projects', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [activeRunId, navigate, projectId])

  useEffect(() => {
    void loadProject()
  }, [loadProject])

  useEffect(() => {
    if (!projectId || !project) return
    const hasRunning = project.runs.some(run => run.status === 'RUNNING')
    if (!hasRunning) return

    const timer = window.setInterval(() => {
      void loadProject()
    }, 2000)

    return () => {
      window.clearInterval(timer)
    }
  }, [loadProject, project, projectId])

  const selectedRun = useMemo(() => {
    if (!project) return null
    if (activeRunId) {
      const run = project.runs.find(item => item.id === activeRunId)
      if (run) return run
    }
    return project.runs[0] || null
  }, [activeRunId, project])

  const handlePickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!projectId) return
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return

    setUploadingDocs(true)
    try {
      for (const file of Array.from(fileList)) {
        const lower = file.name.toLowerCase()
        if (!lower.endsWith('.docx') && !lower.endsWith('.md')) {
          message.warning(`${file.name} 非支持格式，已跳过`)
          continue
        }
        await uploadProjectDocument(projectId, file)
      }
      message.success('文档上传完成')
      await loadProject()
    } catch (error: any) {
      message.error(error?.message || '上传文档失败')
    } finally {
      setUploadingDocs(false)
      event.target.value = ''
    }
  }

  const handleAddEntity = async () => {
    if (!projectId) return
    setAddingEntity(true)
    try {
      await createEntityType(projectId, entityName, entityDescription)
      setEntityName('')
      setEntityDescription('')
      message.success('实体类型已新增')
      await loadProject()
    } catch (error: any) {
      message.error(error?.message || '新增实体类型失败')
    } finally {
      setAddingEntity(false)
    }
  }

  const handleUploadSkillZip = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!projectId) return
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return

    setUploadingSkills(true)
    try {
      for (const file of Array.from(fileList)) {
        const lower = file.name.toLowerCase()
        if (!lower.endsWith('.zip')) {
          message.warning(`${file.name} 不是 zip，已跳过`)
          continue
        }
        await uploadCustomSkill(projectId, file)
      }
      message.success('Skill 上传成功')
      await loadProject()
    } catch (error: any) {
      message.error(error?.message || 'Skill 上传失败')
    } finally {
      setUploadingSkills(false)
      event.target.value = ''
    }
  }

  const handleAddRelation = async () => {
    if (!projectId || !relationDomain || !relationRange) {
      message.warning('请填写关系名称并选择 domain/range')
      return
    }
    setAddingRelation(true)
    try {
      await createRelationType(projectId, {
        name: relationName,
        domain: relationDomain,
        range: relationRange,
        description: relationDescription,
      })
      setRelationName('')
      setRelationDescription('')
      setRelationDomain(undefined)
      setRelationRange(undefined)
      message.success('关系类型已新增')
      await loadProject()
    } catch (error: any) {
      message.error(error?.message || '新增关系类型失败')
    } finally {
      setAddingRelation(false)
    }
  }

  const handleAddProperty = async () => {
    if (!projectId || !selectedEntityId) {
      message.warning('请先在树中选择一个实体类型')
      return
    }
    setAddingProperty(true)
    try {
      await createEntityProperty(projectId, selectedEntityId, {
        name: propertyName,
        displayName: propertyDisplayName,
        dataType: propertyDataType,
        required: propertyRequired,
        defaultValue: propertyDefaultValue,
      })
      setPropertyName('')
      setPropertyDisplayName('')
      setPropertyDataType('STRING')
      setPropertyRequired(false)
      setPropertyDefaultValue('')
      message.success('属性已新增')
      await loadProject()
      setSelectedSchemaTreeKeys([`ent:${selectedEntityId}`])
    } catch (error: any) {
      message.error(error?.message || '新增属性失败')
    } finally {
      setAddingProperty(false)
    }
  }

  const handleDeleteProperty = async (entityTypeId: string, propertyId: string) => {
    if (!projectId) return
    try {
      await removeEntityProperty(projectId, entityTypeId, propertyId)
      message.success('属性已删除')
      await loadProject()
      setSelectedSchemaTreeKeys([`ent:${entityTypeId}`])
    } catch (error: any) {
      message.error(error?.message || '删除属性失败')
    }
  }

  const handleRunExtraction = async () => {
    if (!projectId) return
    setRunningExtraction(true)
    try {
      const run = await runProjectExtraction(projectId)
      setActiveRunId(run.id)
      message.success('抽取任务已启动')
      await loadProject()
      setActiveTab('extraction')
    } catch (error: any) {
      message.error(error?.message || '启动抽取失败')
    } finally {
      setRunningExtraction(false)
    }
  }

  const handlePublishVersion = async () => {
    if (!projectId || !selectedRun) return
    try {
      const values = await publishForm.validateFields()
      setPublishingVersion(true)
      await publishRunVersion(projectId, selectedRun.id, values.label)
      message.success('本体版本已发布')
      setPublishModalOpen(false)
      publishForm.resetFields()
      await loadProject()
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.message || '发布失败')
    } finally {
      setPublishingVersion(false)
    }
  }

  const handleCreateAction = async () => {
    if (!projectId) return
    try {
      const values = await actionForm.validateFields()
      setSavingAction(true)
      await createProjectAction(projectId, values)
      message.success('动作已新增')
      setActionModalOpen(false)
      actionForm.resetFields()
      await loadProject()
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.message || '新增动作失败')
    } finally {
      setSavingAction(false)
    }
  }

  const handleCreateFunction = async () => {
    if (!projectId) return
    try {
      const values = await functionForm.validateFields()
      setSavingFunction(true)
      await createProjectFunction(projectId, values)
      message.success('函数已新增')
      setFunctionModalOpen(false)
      functionForm.resetFields()
      await loadProject()
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.message || '新增函数失败')
    } finally {
      setSavingFunction(false)
    }
  }

  const documentColumns: ColumnsType<ProjectDocument> = [
    { title: '文档名称', dataIndex: 'name' },
    {
      title: '类型',
      dataIndex: 'fileType',
      width: 100,
      render: (value: ProjectDocument['fileType']) => <Tag>{value.toUpperCase()}</Tag>,
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 120,
      render: (value: number) => `${(value / 1024).toFixed(1)} KB`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: ProjectDocument['status']) => (value === 'READY'
        ? <Tag color="success">READY</Tag>
        : <Tag color="error">FAILED</Tag>),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 100,
      render: (_value, record) => (
        <Switch
          size="small"
          checked={record.enabled}
          onChange={(checked) => {
            if (!projectId) return
            void setProjectDocumentEnabled(projectId, record.id, checked)
              .then(() => loadProject())
              .catch((error: any) => {
                message.error(error?.message || '更新文档状态失败')
              })
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_value, record) => (
        <Popconfirm
          title="确认删除该文档？"
          onConfirm={() => {
            if (!projectId) return
            void deleteProjectDocument(projectId, record.id)
              .then(() => {
                message.success('文档已删除')
                return loadProject()
              })
              .catch((error: any) => message.error(error?.message || '删除失败'))
          }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  const actionColumns: ColumnsType<ActionDefinition> = [
    { title: '名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', render: (value?: string) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (value: ActionStatus) => actionStatusTag(value) },
    {
      title: '切换',
      key: 'switch',
      width: 120,
      render: (_value, record) => (
        <Switch
          checked={record.status === 'ACTIVE'}
          onChange={(checked) => {
            if (!projectId) return
            const status: ActionStatus = checked ? 'ACTIVE' : 'DRAFT'
            void setActionStatus(projectId, record.id, status)
              .then(() => loadProject())
              .catch((error: any) => message.error(error?.message || '更新状态失败'))
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_value, record) => (
        <Popconfirm
          title="确认删除动作？"
          onConfirm={() => {
            if (!projectId) return
            void deleteProjectAction(projectId, record.id)
              .then(() => {
                message.success('动作已删除')
                return loadProject()
              })
              .catch((error: any) => message.error(error?.message || '删除失败'))
          }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  const functionColumns: ColumnsType<FunctionDefinition> = [
    { title: '名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', render: (value?: string) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (value: FunctionStatus) => functionStatusTag(value) },
    {
      title: '切换',
      key: 'switch',
      width: 120,
      render: (_value, record) => (
        <Switch
          checked={record.status === 'ACTIVE'}
          onChange={(checked) => {
            if (!projectId) return
            const status: FunctionStatus = checked ? 'ACTIVE' : 'DRAFT'
            void setFunctionStatus(projectId, record.id, status)
              .then(() => loadProject())
              .catch((error: any) => message.error(error?.message || '更新状态失败'))
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_value, record) => (
        <Popconfirm
          title="确认删除函数？"
          onConfirm={() => {
            if (!projectId) return
            void deleteProjectFunction(projectId, record.id)
              .then(() => {
                message.success('函数已删除')
                return loadProject()
              })
              .catch((error: any) => message.error(error?.message || '删除失败'))
          }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  const versionColumns: ColumnsType<ProjectDetail['versions'][number]> = [
    {
      title: '版本',
      dataIndex: 'version',
      width: 100,
      render: (value: string, record) => (
        <Space>
          <Tag color={project?.currentVersionId === record.id ? 'green' : 'default'}>{value}</Tag>
          {project?.currentVersionId === record.id && <Tag color="success">当前</Tag>}
        </Space>
      ),
    },
    { title: '标签', dataIndex: 'label' },
    { title: '来源任务', dataIndex: 'sourceRunId', width: 160 },
    {
      title: '实体/关系',
      width: 140,
      render: (_value, record) => `E${record.entityCount} / R${record.relationCount}`,
    },
    {
      title: '发布时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      width: 100,
      render: (_value, record) => (
        <Button size="small" onClick={() => navigate(`/projects/${project?.id}/graph?versionId=${record.id}`)}>
          图谱
        </Button>
      ),
    },
  ]

  const entityOptions = project?.schemaConfig.entityTypes.map(item => ({ label: item.name, value: item.name })) || []
  const schemaRelations = project?.schemaConfig.relationTypes || []
  const schemaEntities = project?.schemaConfig.entityTypes || []
  const projectVersions = project?.versions || []
  const skillList = project?.schemaConfig.skills || []

  const schemaGraphData = useMemo(() => {
    const idByEntityName = new Map<string, number>()
    const entityIdByName = new Map<string, string>()
    const objectTypes: ObjectType[] = schemaEntities.map((entity, index) => {
      const id = index + 1
      idByEntityName.set(entity.name, id)
      entityIdByName.set(entity.name, entity.id)
      return {
        id,
        name: entity.name,
        displayName: entity.name,
        description: entity.description || '',
      }
    })

    const linkTypes: LinkType[] = []
    schemaRelations.forEach((relation, index) => {
      const sourceObjectTypeId = idByEntityName.get(relation.domain)
      const targetObjectTypeId = idByEntityName.get(relation.range)
      if (!sourceObjectTypeId || !targetObjectTypeId) {
        return
      }

      linkTypes.push({
        id: index + 1,
        name: relation.name,
        displayName: relation.name,
        sourceObjectTypeId,
        targetObjectTypeId,
        cardinality: 'N:N',
        description: relation.description || undefined,
      })
    })

    return { objectTypes, linkTypes, idByEntityName, entityIdByName }
  }, [schemaEntities, schemaRelations])

  useEffect(() => {
    if (!selectedEntityId) return
    const exists = schemaEntities.some(item => item.id === selectedEntityId)
    if (!exists) {
      setSelectedEntityId(null)
      setSelectedSchemaTreeKeys([])
    }
  }, [schemaEntities, selectedEntityId])

  const selectedEntity = useMemo(
    () => schemaEntities.find(item => item.id === selectedEntityId) || null,
    [schemaEntities, selectedEntityId],
  )

  const selectedGraphNodeId = useMemo(
    () => (selectedEntity ? schemaGraphData.idByEntityName.get(selectedEntity.name) || null : null),
    [schemaGraphData.idByEntityName, selectedEntity],
  )

  const selectedSchemaNodeStats = useMemo(() => {
    if (!selectedEntity) return null
    const outgoing = schemaRelations.filter(item => item.domain === selectedEntity.name).length
    const incoming = schemaRelations.filter(item => item.range === selectedEntity.name).length
    return { incoming, outgoing }
  }, [schemaRelations, selectedEntity])

  const schemaTreeData = useMemo<DataNode[]>(() => {
    const entityChildren: DataNode[] = schemaEntities.map(entity => ({
      key: `ent:${entity.id}`,
      title: (
        <Space size={6}>
          <Text>{entity.name}</Text>
          <Tag color="blue">{entity.properties.length} 属性</Tag>
          <Popconfirm
            title="删除实体类型？"
            onConfirm={() => {
              if (!projectId) return
              void removeEntityType(projectId, entity.id)
                .then(() => {
                  message.success('实体类型已删除')
                  return loadProject()
                })
                .catch((error: any) => message.error(error?.message || '删除失败'))
            }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(event) => event.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
      children: entity.properties
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(property => ({
          key: `prop:${entity.id}:${property.id}`,
          title: (
            <Space size={6}>
              <Text type="secondary">{property.displayName}</Text>
              <Tag>{property.dataType}</Tag>
              {property.required && <Tag color="error">必填</Tag>}
            </Space>
          ),
          isLeaf: true,
        })),
    }))

    const relationChildren: DataNode[] = schemaRelations.map(relation => ({
      key: `rel:${relation.id}`,
      title: (
        <Space size={6}>
          <Text>{relation.name}</Text>
          <Text type="secondary">{relation.domain} → {relation.range}</Text>
          <Popconfirm
            title="删除关系类型？"
            onConfirm={() => {
              if (!projectId) return
              void removeRelationType(projectId, relation.id)
                .then(() => {
                  message.success('关系类型已删除')
                  return loadProject()
                })
                .catch((error: any) => message.error(error?.message || '删除失败'))
            }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(event) => event.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
      isLeaf: true,
    }))

    return [
      {
        key: 'root:entities',
        title: (
          <Space size={6}>
            <AppstoreOutlined />
            <Text>实体类型 ({schemaEntities.length})</Text>
          </Space>
        ),
        children: entityChildren,
      },
      {
        key: 'root:relations',
        title: (
          <Space size={6}>
            <ApartmentOutlined />
            <Text>关系类型 ({schemaRelations.length})</Text>
          </Space>
        ),
        children: relationChildren,
      },
    ]
  }, [loadProject, projectId, schemaEntities, schemaRelations])

  const handleSchemaTreeSelect: TreeProps['onSelect'] = (keys) => {
    const normalizedKeys = keys.map(item => String(item))
    setSelectedSchemaTreeKeys(normalizedKeys)
    const target = normalizedKeys[0]
    if (!target) return

    if (target.startsWith('ent:')) {
      setSelectedEntityId(target.replace('ent:', ''))
      return
    }
    if (target.startsWith('prop:')) {
      const [_, entityId] = target.split(':')
      if (entityId) {
        setSelectedEntityId(entityId)
      }
    }
  }

  const propertyColumns: ColumnsType<EntityPropertyConfig> = [
    { title: '显示名', dataIndex: 'displayName', width: 120 },
    { title: '代码', dataIndex: 'name', width: 120 },
    { title: '类型', dataIndex: 'dataType', width: 100, render: (value: EntityPropertyConfig['dataType']) => <Tag>{value}</Tag> },
    { title: '必填', dataIndex: 'required', width: 70, render: (value: boolean) => (value ? <Tag color="error">是</Tag> : '-') },
    { title: '默认值', dataIndex: 'defaultValue', render: (value?: string) => value || '-' },
    {
      title: '操作',
      width: 70,
      render: (_value, record) => (
        <Popconfirm
          title="删除属性？"
          onConfirm={() => {
            if (!selectedEntity) return
            void handleDeleteProperty(selectedEntity.id, record.id)
          }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  if (loading && !project) {
    return <Card loading style={{ minHeight: 320 }} />
  }

  if (!project) {
    return <Empty description="项目不存在或已删除" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>
                返回项目列表
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => void loadProject()} loading={loading}>
                刷新
              </Button>
            </Space>
            <Tag color="blue">Project ID: {project.id}</Tag>
          </Space>

          <Title level={4} style={{ margin: 0 }}>{project.name}</Title>
          <Text type="secondary">{project.description || '未填写项目描述'}</Text>

          <Descriptions size="small" column={4} bordered>
            <Descriptions.Item label="文档">{project.documents.length}</Descriptions.Item>
            <Descriptions.Item label="实体类型">{project.schemaConfig.entityTypes.length}</Descriptions.Item>
            <Descriptions.Item label="关系类型">{project.schemaConfig.relationTypes.length}</Descriptions.Item>
            <Descriptions.Item label="版本">{project.versions.length}</Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={key => setActiveTab(key as TabKey)}
        items={[
          {
            key: 'documents',
            label: '1. 文档管理',
            children: (
              <Card>
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Text type="secondary">支持上传多个 .docx/.md，后续抽取使用“启用中”文档集合。</Text>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".docx,.md"
                        style={{ display: 'none' }}
                        onChange={(event) => {
                          void handlePickFiles(event)
                        }}
                      />
                      <Button
                        icon={<PlusOutlined />}
                        type="primary"
                        loading={uploadingDocs}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        上传文档
                      </Button>
                    </div>
                  </Space>
                  <Table<ProjectDocument>
                    rowKey="id"
                    size="small"
                    columns={documentColumns}
                    dataSource={project.documents}
                    pagination={{ pageSize: 6 }}
                  />
                </Space>
              </Card>
            ),
          },
          {
            key: 'schema',
            label: '2. 配置与Skill',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Row gutter={[16, 16]} align="top">
                  <Col xs={24} xl={7}>
                    <Card title="实体/关系树" extra={<Tag>{schemaEntities.length + schemaRelations.length}</Tag>} style={{ height: '100%' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>新增实体类型</Text>
                        <Input
                          placeholder="实体类型名称，例如 Device"
                          value={entityName}
                          onChange={event => setEntityName(event.target.value)}
                        />
                        <Input
                          placeholder="描述（可选）"
                          value={entityDescription}
                          onChange={event => setEntityDescription(event.target.value)}
                        />
                        <Button type="primary" loading={addingEntity} onClick={() => void handleAddEntity()}>
                          新增实体类型
                        </Button>
                        <Divider style={{ margin: '8px 0' }} />

                        <Text strong>新增关系类型</Text>
                        <Input
                          placeholder="关系名称，例如 located_in"
                          value={relationName}
                          onChange={event => setRelationName(event.target.value)}
                        />
                        <Space style={{ width: '100%' }} wrap>
                          <Select
                            style={{ minWidth: 160 }}
                            placeholder="domain"
                            value={relationDomain}
                            options={entityOptions}
                            onChange={value => setRelationDomain(value)}
                          />
                          <Select
                            style={{ minWidth: 160 }}
                            placeholder="range"
                            value={relationRange}
                            options={entityOptions}
                            onChange={value => setRelationRange(value)}
                          />
                        </Space>
                        <Input
                          placeholder="描述（可选）"
                          value={relationDescription}
                          onChange={event => setRelationDescription(event.target.value)}
                        />
                        <Button type="primary" loading={addingRelation} onClick={() => void handleAddRelation()}>
                          新增关系类型
                        </Button>

                        <Divider style={{ margin: '8px 0' }} />

                        <Tree
                          treeData={schemaTreeData}
                          selectedKeys={selectedSchemaTreeKeys}
                          onSelect={handleSchemaTreeSelect}
                          defaultExpandAll
                          height={380}
                          style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}
                        />
                      </Space>
                    </Card>
                  </Col>

                  <Col xs={24} xl={5}>
                    <Card
                      title="属性配置"
                      extra={selectedEntity ? <Tag color="blue">{selectedEntity.name}</Tag> : null}
                      style={{ height: '100%' }}
                    >
                      {selectedEntity ? (
                        <Space direction="vertical" style={{ width: '100%' }} size={10}>
                          <Input
                            placeholder="属性代码名，例如 serial_no"
                            value={propertyName}
                            onChange={event => setPropertyName(event.target.value)}
                          />
                          <Input
                            placeholder="属性显示名（可选）"
                            value={propertyDisplayName}
                            onChange={event => setPropertyDisplayName(event.target.value)}
                          />
                          <Space style={{ width: '100%' }} wrap>
                            <Select<PropertyDataType>
                              value={propertyDataType}
                              style={{ minWidth: 130 }}
                              options={PROPERTY_DATA_TYPES.map(item => ({ label: item, value: item }))}
                              onChange={value => setPropertyDataType(value)}
                            />
                            <Space size={6}>
                              <Text type="secondary">必填</Text>
                              <Switch checked={propertyRequired} onChange={checked => setPropertyRequired(checked)} />
                            </Space>
                          </Space>
                          <Input
                            placeholder="默认值（可选）"
                            value={propertyDefaultValue}
                            onChange={event => setPropertyDefaultValue(event.target.value)}
                          />
                          <Button type="primary" loading={addingProperty} onClick={() => void handleAddProperty()}>
                            添加属性
                          </Button>

                          <Table<EntityPropertyConfig>
                            rowKey="id"
                            size="small"
                            pagination={false}
                            dataSource={selectedEntity.properties.slice().sort((a, b) => a.sortOrder - b.sortOrder)}
                            columns={propertyColumns}
                            locale={{ emptyText: '当前实体暂无属性' }}
                            scroll={{ x: 520, y: 260 }}
                          />
                        </Space>
                      ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="在左侧树中选择一个实体类型后配置属性" />
                      )}
                    </Card>
                  </Col>

                  <Col xs={24} xl={12}>
                    <Card
                      title="本体结构图（实体类型 / 关系类型）"
                      extra={<Text type="secondary">点击节点可高亮查看</Text>}
                      style={{ height: '100%' }}
                    >
                      {schemaGraphData.objectTypes.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无实体类型，先新增实体类型后可查看图谱" />
                      ) : (
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                          <OntologyGraph
                            objectTypes={schemaGraphData.objectTypes}
                            linkTypes={schemaGraphData.linkTypes}
                            selectedOTId={selectedGraphNodeId}
                            onSelectOT={(ot) => {
                              const entityId = schemaGraphData.entityIdByName.get(ot.name)
                              if (entityId) {
                                setSelectedEntityId(entityId)
                                setSelectedSchemaTreeKeys([`ent:${entityId}`])
                              }
                            }}
                          />
                          {selectedEntity && selectedSchemaNodeStats && (
                            <Space wrap>
                              <Tag color="blue">实体：{selectedEntity.name}</Tag>
                              <Tag color="cyan">出边 {selectedSchemaNodeStats.outgoing}</Tag>
                              <Tag color="geekblue">入边 {selectedSchemaNodeStats.incoming}</Tag>
                            </Space>
                          )}
                        </Space>
                      )}
                    </Card>
                  </Col>
                </Row>

                <Card
                  title={(
                    <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ letterSpacing: 1, fontWeight: 700 }}>Skills</span>
                      <Tag>{skillList.length}</Tag>
                    </Space>
                  )}
                  extra={(
                    <>
                      <input
                        ref={skillZipInputRef}
                        type="file"
                        multiple
                        accept=".zip"
                        style={{ display: 'none' }}
                        onChange={(event) => {
                          void handleUploadSkillZip(event)
                        }}
                      />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        loading={uploadingSkills}
                        onClick={() => skillZipInputRef.current?.click()}
                      />
                    </>
                  )}
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {skillList.length === 0 && (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 Skill。" />
                    )}
                    {skillList.map(skill => (
                      <Card
                        key={skill.id}
                        size="small"
                        title={skill.name}
                        extra={skill.enabled ? <Tag color="success">enabled</Tag> : <Tag>disabled</Tag>}
                      >
                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                          <Text type="secondary">{skill.description || '暂无介绍'}</Text>
                          <Space wrap>
                            {(skill.tags || []).map(tag => (
                              <Tag key={tag}>{tag}</Tag>
                            ))}
                            {skill.fileName && <Tag>{skill.fileName}</Tag>}
                            {skill.blocked && <Tag color="orange">blocked</Tag>}
                          </Space>
                          {skill.missing && (
                            <Text type="secondary">Missing: {skill.missing}</Text>
                          )}
                        </Space>
                      </Card>
                    ))}
                  </Space>
                </Card>
              </Space>
            ),
          },
          {
            key: 'extraction',
            label: '3. 全量抽取与版本',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Card>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                    <div>
                      <Title level={5} style={{ marginBottom: 6 }}>抽取任务</Title>
                      <Text type="secondary">基于当前启用文档 + 当前配置执行抽取。审核与筛选已迁移到图谱页。</Text>
                    </div>
                    <Space>
                      {selectedRun && (
                        <Button onClick={() => navigate(`/projects/${project.id}/graph?runId=${selectedRun.id}`)}>
                          进入图谱审核
                        </Button>
                      )}
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        loading={runningExtraction}
                        onClick={() => void handleRunExtraction()}
                      >
                        发起全量抽取
                      </Button>
                    </Space>
                  </Space>
                  {selectedRun ? (
                    <div style={{ marginTop: 16 }}>
                      <Space style={{ marginBottom: 8 }}>
                        {runStatusTag(selectedRun.status)}
                        <Text>创建时间：{new Date(selectedRun.createdAt).toLocaleString()}</Text>
                      </Space>
                      <Progress percent={selectedRun.progress} status={selectedRun.status === 'FAILED' ? 'exception' : 'active'} />
                      <Space wrap style={{ marginTop: 12 }}>
                        <Tag color="blue">候选实体 {selectedRun.candidateEntityCount}</Tag>
                        <Tag color="purple">候选关系 {selectedRun.candidateRelationCount}</Tag>
                        <Tag color="orange">待审核 {selectedRun.pendingReviewCount}</Tag>
                      </Space>
                    </div>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无抽取任务" />
                  )}
                </Card>

                <Card title="发布本体版本">
                  {selectedRun ? (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Alert
                        type="info"
                        showIcon
                        message="仅用于原型评审"
                        description="发布时会固化当前 run 的审核结果，动作与函数可据此挂载版本。"
                      />
                      <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                        <Text type="secondary">
                          当前任务：{selectedRun.id}，状态：{selectedRun.status}，待审核：{selectedRun.pendingReviewCount}
                        </Text>
                        <Space>
                          <Button
                            onClick={() => navigate(`/projects/${project.id}/graph?runId=${selectedRun.id}`)}
                          >
                            查看图谱
                          </Button>
                          <Button
                            type="primary"
                            icon={<RocketOutlined />}
                            disabled={selectedRun.status !== 'COMPLETED'}
                            onClick={() => {
                              const nextVersionNo = projectVersions.length + 1
                              publishForm.setFieldsValue({
                                label: `本体版本 v${nextVersionNo}`,
                                notes: '',
                              })
                              setPublishModalOpen(true)
                            }}
                          >
                            发布版本
                          </Button>
                        </Space>
                      </Space>
                      <Table
                        rowKey="id"
                        size="small"
                        columns={versionColumns}
                        dataSource={projectVersions}
                        locale={{ emptyText: '暂无已发布版本' }}
                        pagination={{ pageSize: 5 }}
                      />
                    </Space>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先执行抽取任务" />
                  )}
                </Card>
              </Space>
            ),
          },
          {
            key: 'actions',
            label: '4. 动作管理',
            children: (
              <Card
                extra={(
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setActionModalOpen(true)}>
                    新增动作
                  </Button>
                )}
              >
                <Table<ActionDefinition>
                  rowKey="id"
                  size="small"
                  columns={actionColumns}
                  dataSource={project.actions}
                  pagination={{ pageSize: 8 }}
                />
              </Card>
            ),
          },
          {
            key: 'functions',
            label: '5. Function 管理',
            children: (
              <Card
                extra={(
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setFunctionModalOpen(true)}>
                    新增函数
                  </Button>
                )}
              >
                <Table<FunctionDefinition>
                  rowKey="id"
                  size="small"
                  columns={functionColumns}
                  dataSource={project.functions}
                  pagination={{ pageSize: 8 }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="发布本体版本"
        open={publishModalOpen}
        onCancel={() => setPublishModalOpen(false)}
        onOk={() => void handlePublishVersion()}
        okText="确认发布"
        cancelText="取消"
        confirmLoading={publishingVersion}
      >
        <Form<PublishFormData>
          form={publishForm}
          layout="vertical"
        >
          <Form.Item
            name="label"
            label="版本标签"
            rules={[{ required: true, message: '请输入版本标签' }]}
          >
            <Input placeholder="例如：v3-新增回零失败场景" maxLength={80} />
          </Form.Item>
          <Form.Item name="notes" label="发布说明（可选）">
            <Input.TextArea rows={4} placeholder="例如：本次新增 C 型设备场景，补充3条关系定义。" maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增动作"
        open={actionModalOpen}
        onCancel={() => setActionModalOpen(false)}
        onOk={() => void handleCreateAction()}
        okText="保存"
        cancelText="取消"
        confirmLoading={savingAction}
      >
        <Form<ActionFormData>
          form={actionForm}
          layout="vertical"
          initialValues={{ status: 'DRAFT' }}
        >
          <Form.Item name="name" label="动作名称" rules={[{ required: true, message: '请输入动作名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="初始状态" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'DRAFT', value: 'DRAFT' },
                { label: 'ACTIVE', value: 'ACTIVE' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增函数"
        open={functionModalOpen}
        onCancel={() => setFunctionModalOpen(false)}
        onOk={() => void handleCreateFunction()}
        okText="保存"
        cancelText="取消"
        confirmLoading={savingFunction}
        width={760}
      >
        <Form<FunctionFormData>
          form={functionForm}
          layout="vertical"
          initialValues={{ status: 'DRAFT', scriptContent: 'def run(input_data):\n    return input_data' }}
        >
          <Form.Item name="name" label="函数名称" rules={[{ required: true, message: '请输入函数名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="scriptContent" label="脚本内容" rules={[{ required: true, message: '请输入函数脚本' }]}>
            <Input.TextArea rows={8} />
          </Form.Item>
          <Form.Item name="status" label="初始状态" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'DRAFT', value: 'DRAFT' },
                { label: 'ACTIVE', value: 'ACTIVE' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
