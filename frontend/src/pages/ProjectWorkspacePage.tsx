import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
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
  BulbOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  createEntityType,
  createProjectAction,
  createProjectDataSource,
  createProjectFunction,
  createRelationType,
  deleteProjectAction,
  deleteProjectDataSource,
  deleteProjectDocument,
  deleteProjectFunction,
  getProjectDetail,
  publishRunVersion,
  runAiSchemaInsight,
  removeEntityType,
  removeRelationType,
  runProjectExtraction,
  setActionStatus,
  setFunctionStatus,
  setProjectDataSourceEnabled,
  setProjectDocumentEnabled,
  testProjectDataSourceConnection,
  uploadCustomSkill,
  updateEntityType,
  updateProjectDataSource,
  updateRelationType,
  uploadProjectDocument,
} from '../api/mvpMock'
import type {
  ActionDefinition,
  ActionStatus,
  DataSourceExtractMode,
  DataSourceSyncMode,
  DataSourceType,
  ExtractionRun,
  FunctionDefinition,
  FunctionStatus,
  PropertyDataType,
  ProjectDetail,
  ProjectDocument,
  StructuredDataSource,
} from '../types/projectMvp'
import OntologyGraph from '../components/ontology/step1/OntologyGraph'
import type { LinkType, ObjectType } from '../types/ontology'
import type { DataNode, TreeProps } from 'antd/es/tree'

const { Title, Text } = Typography

const PROPERTY_DATA_TYPES: PropertyDataType[] = ['STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'DATE', 'DATETIME', 'JSON', 'TEXT']
const DATA_SOURCE_TYPE_OPTIONS: Array<{ label: string; value: DataSourceType }> = [
  { label: 'MySQL', value: 'MYSQL' },
  { label: 'PostgreSQL', value: 'POSTGRESQL' },
  { label: 'SQL Server', value: 'SQLSERVER' },
  { label: 'Oracle', value: 'ORACLE' },
  { label: 'ClickHouse', value: 'CLICKHOUSE' },
]
const DEFAULT_PORT_BY_DATA_SOURCE_TYPE: Record<DataSourceType, number> = {
  MYSQL: 3306,
  POSTGRESQL: 5432,
  SQLSERVER: 1433,
  ORACLE: 1521,
  CLICKHOUSE: 8123,
}

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

interface DataSourceFormData {
  name: string
  type: DataSourceType
  host: string
  port: number
  database: string
  schema?: string
  username: string
  password: string
  sslEnabled: boolean
  enabled: boolean
  extractMode: DataSourceExtractMode
  tables?: string[]
  customSql?: string
  rowLimit: number
  syncMode: DataSourceSyncMode
  incrementalColumn?: string
}

interface PublishFormData {
  label: string
  notes?: string
}

type SchemaCreateType = 'ENTITY' | 'RELATION'

interface SchemaCreateFormData {
  type: SchemaCreateType
  entityName?: string
  entityDescription?: string
  entityProperties?: Array<{
    id?: string
    name?: string
    displayName?: string
    dataType?: PropertyDataType
    required?: boolean
    defaultValue?: string
  }>
  relationName?: string
  relationDomain?: string
  relationRange?: string
  relationDescription?: string
  relationProperties?: Array<{
    id?: string
    name?: string
    displayName?: string
    dataType?: PropertyDataType
    required?: boolean
    defaultValue?: string
  }>
}

interface RelationEndpointIssue {
  missingDomain: boolean
  missingRange: boolean
}

interface SchemaViewModel {
  entities: ProjectDetail['schemaConfig']['entityTypes']
  relations: ProjectDetail['schemaConfig']['relationTypes']
  objectTypes: ObjectType[]
  linkTypes: LinkType[]
  graphObjectTypeIdByEntityId: Map<string, number>
  entityIdByGraphObjectTypeId: Map<number, string>
  relationIssuesById: Map<string, RelationEndpointIssue>
  edgeStatsByEntityId: Map<string, { incoming: number; outgoing: number }>
  virtualObjectTypeCount: number
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

function dataSourceStatusTag(status: StructuredDataSource['status']) {
  if (status === 'SUCCESS') return <Tag color="success">已连接</Tag>
  if (status === 'FAILED') return <Tag color="error">连接失败</Tag>
  return <Tag>未测试</Tag>
}

export default function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('documents')
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  const [schemaCreateModalOpen, setSchemaCreateModalOpen] = useState(false)
  const [schemaModalMode, setSchemaModalMode] = useState<'create' | 'edit'>('create')
  const [schemaCreateType, setSchemaCreateType] = useState<SchemaCreateType>('ENTITY')
  const [editingSchemaId, setEditingSchemaId] = useState<string | null>(null)
  const [creatingSchemaItem, setCreatingSchemaItem] = useState(false)
  const [aiInsightModalOpen, setAiInsightModalOpen] = useState(false)
  const [runningAiInsight, setRunningAiInsight] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [selectedSchemaTreeKeys, setSelectedSchemaTreeKeys] = useState<string[]>([])

  const [uploadingSkills, setUploadingSkills] = useState(false)

  const [runningExtraction, setRunningExtraction] = useState(false)
  const [publishingVersion, setPublishingVersion] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)

  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [functionModalOpen, setFunctionModalOpen] = useState(false)
  const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false)
  const [dataSourceModalMode, setDataSourceModalMode] = useState<'create' | 'edit'>('create')
  const [editingDataSourceId, setEditingDataSourceId] = useState<string | null>(null)
  const [savingAction, setSavingAction] = useState(false)
  const [savingFunction, setSavingFunction] = useState(false)
  const [savingDataSource, setSavingDataSource] = useState(false)
  const [testingDataSourceId, setTestingDataSourceId] = useState<string | null>(null)
  const [publishForm] = Form.useForm<PublishFormData>()
  const [schemaCreateForm] = Form.useForm<SchemaCreateFormData>()
  const [actionForm] = Form.useForm<ActionFormData>()
  const [functionForm] = Form.useForm<FunctionFormData>()
  const [dataSourceForm] = Form.useForm<DataSourceFormData>()

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

  const openCreateDataSourceModal = () => {
    setDataSourceModalMode('create')
    setEditingDataSourceId(null)
    dataSourceForm.resetFields()
    dataSourceForm.setFieldsValue({
      name: '',
      type: 'MYSQL',
      host: '',
      port: DEFAULT_PORT_BY_DATA_SOURCE_TYPE.MYSQL,
      database: '',
      schema: '',
      username: '',
      password: '',
      sslEnabled: false,
      enabled: true,
      extractMode: 'TABLE',
      tables: [],
      customSql: '',
      rowLimit: 10000,
      syncMode: 'FULL',
      incrementalColumn: '',
    })
    setDataSourceModalOpen(true)
  }

  const openEditDataSourceModal = (dataSource: StructuredDataSource) => {
    setDataSourceModalMode('edit')
    setEditingDataSourceId(dataSource.id)
    dataSourceForm.resetFields()
    dataSourceForm.setFieldsValue({
      name: dataSource.name,
      type: dataSource.type,
      host: dataSource.host,
      port: dataSource.port,
      database: dataSource.database,
      schema: dataSource.schema || '',
      username: dataSource.username,
      password: dataSource.password,
      sslEnabled: dataSource.sslEnabled,
      enabled: dataSource.enabled,
      extractMode: dataSource.extractMode,
      tables: dataSource.tables,
      customSql: dataSource.customSql || '',
      rowLimit: dataSource.rowLimit,
      syncMode: dataSource.syncMode,
      incrementalColumn: dataSource.incrementalColumn || '',
    })
    setDataSourceModalOpen(true)
  }

  const closeDataSourceModal = () => {
    setDataSourceModalOpen(false)
    setDataSourceModalMode('create')
    setEditingDataSourceId(null)
    dataSourceForm.resetFields()
  }

  const handleSaveDataSource = async () => {
    if (!projectId) return
    try {
      const values = await dataSourceForm.validateFields()
      setSavingDataSource(true)

      const payload = {
        name: values.name,
        type: values.type,
        host: values.host,
        port: values.port,
        database: values.database,
        schema: values.schema,
        username: values.username,
        password: values.password,
        sslEnabled: values.sslEnabled,
        enabled: values.enabled,
        extractMode: values.extractMode,
        tables: values.tables,
        customSql: values.customSql,
        rowLimit: values.rowLimit,
        syncMode: values.syncMode,
        incrementalColumn: values.incrementalColumn,
      }

      if (dataSourceModalMode === 'edit' && editingDataSourceId) {
        await updateProjectDataSource(projectId, editingDataSourceId, payload)
        message.success('数据源已更新')
      } else {
        await createProjectDataSource(projectId, payload)
        message.success('数据源已新增')
      }

      closeDataSourceModal()
      await loadProject()
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.message || '保存数据源失败')
    } finally {
      setSavingDataSource(false)
    }
  }

  const handleTestDataSource = async (dataSourceId: string) => {
    if (!projectId) return
    setTestingDataSourceId(dataSourceId)
    try {
      const result = await testProjectDataSourceConnection(projectId, dataSourceId)
      if (result.status === 'SUCCESS') {
        message.success(`连接测试成功：${result.message}`)
      } else {
        message.error(`连接测试失败：${result.message}`)
      }
      await loadProject()
    } catch (error: any) {
      message.error(error?.message || '连接测试失败')
    } finally {
      setTestingDataSourceId(null)
    }
  }

  const openSchemaCreateModal = () => {
    setSchemaModalMode('create')
    setEditingSchemaId(null)
    setSchemaCreateType('ENTITY')
    schemaCreateForm.resetFields()
    schemaCreateForm.setFieldsValue({ type: 'ENTITY' })
    setSchemaCreateModalOpen(true)
  }

  const openSchemaEditModal = (type: SchemaCreateType, id: string) => {
    setSchemaModalMode('edit')
    setEditingSchemaId(id)
    setSchemaCreateType(type)
    schemaCreateForm.resetFields()

    if (type === 'ENTITY') {
      const entity = project?.schemaConfig.entityTypes.find(item => item.id === id)
      if (!entity) return
      schemaCreateForm.setFieldsValue({
        type: 'ENTITY',
        entityName: entity.name,
        entityDescription: entity.description || '',
        entityProperties: entity.properties.map(item => ({
          id: item.id,
          name: item.name,
          displayName: item.displayName,
          dataType: item.dataType,
          required: item.required,
          defaultValue: item.defaultValue || '',
        })),
      })
    } else {
      const relation = project?.schemaConfig.relationTypes.find(item => item.id === id)
      if (!relation) return
      schemaCreateForm.setFieldsValue({
        type: 'RELATION',
        relationName: relation.name,
        relationDomain: relation.domain,
        relationRange: relation.range,
        relationDescription: relation.description || '',
        relationProperties: relation.properties.map(item => ({
          id: item.id,
          name: item.name,
          displayName: item.displayName,
          dataType: item.dataType,
          required: item.required,
          defaultValue: item.defaultValue || '',
        })),
      })
    }

    setSchemaCreateModalOpen(true)
  }

  const closeSchemaCreateModal = () => {
    setSchemaCreateModalOpen(false)
    setSchemaModalMode('create')
    setEditingSchemaId(null)
    setSchemaCreateType('ENTITY')
    schemaCreateForm.resetFields()
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

  const handleCreateSchemaItem = async () => {
    if (!projectId) return
    try {
      const values = await schemaCreateForm.validateFields()
      setCreatingSchemaItem(true)

      const normalizeProperties = (
        list?: Array<{
          id?: string
          name?: string
          displayName?: string
          dataType?: PropertyDataType
          required?: boolean
          defaultValue?: string
        }>,
      ) => (Array.isArray(list) ? list : [])
        .map((item, index) => ({
          id: item?.id,
          name: (item?.name || '').trim(),
          displayName: (item?.displayName || '').trim(),
          dataType: item?.dataType || 'STRING',
          required: Boolean(item?.required),
          defaultValue: (item?.defaultValue || '').trim(),
          sortOrder: index,
        }))
        .filter(item => item.name)

      if (values.type === 'ENTITY') {
        if (schemaModalMode === 'edit' && editingSchemaId) {
          await updateEntityType(projectId, editingSchemaId, {
            name: values.entityName || '',
            description: values.entityDescription || '',
            properties: normalizeProperties(values.entityProperties),
          })
          message.success('实体类型已更新')
        } else {
          await createEntityType(
            projectId,
            values.entityName || '',
            values.entityDescription,
            normalizeProperties(values.entityProperties),
          )
          message.success('实体类型已新增')
        }
      } else {
        if (schemaModalMode === 'edit' && editingSchemaId) {
          await updateRelationType(projectId, editingSchemaId, {
            name: values.relationName || '',
            domain: values.relationDomain || '',
            range: values.relationRange || '',
            description: values.relationDescription,
            properties: normalizeProperties(values.relationProperties),
          })
          message.success('关系类型已更新')
        } else {
          await createRelationType(projectId, {
            name: values.relationName || '',
            domain: values.relationDomain || '',
            range: values.relationRange || '',
            description: values.relationDescription,
            properties: normalizeProperties(values.relationProperties),
          })
          message.success('关系类型已新增')
        }
      }

      closeSchemaCreateModal()
      await loadProject()
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.message || '保存失败')
    } finally {
      setCreatingSchemaItem(false)
    }
  }

  const handleRunAiInsight = async () => {
    if (!projectId) return
    setRunningAiInsight(true)
    try {
      const result = await runAiSchemaInsight(projectId)
      await loadProject()
      message.success(`AI洞察完成：新增实体 ${result.addedEntityCount}，新增关系 ${result.addedRelationCount}`)
      setAiInsightModalOpen(false)
    } catch (error: any) {
      message.error(error?.message || 'AI洞察执行失败')
    } finally {
      setRunningAiInsight(false)
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

  const dataSourceColumns: ColumnsType<StructuredDataSource> = [
    {
      title: '数据源名称',
      dataIndex: 'name',
      render: (value: string, record) => (
        <Space direction="vertical" size={2}>
          <Text>{value}</Text>
          <Text type="secondary">{record.username}@{record.host}</Text>
        </Space>
      ),
    },
    {
      title: '数据库类型',
      dataIndex: 'type',
      width: 130,
      render: (value: DataSourceType) => <Tag>{value}</Tag>,
    },
    {
      title: '连接信息',
      key: 'connection',
      width: 260,
      render: (_value, record) => (
        <Space direction="vertical" size={2}>
          <Text>{record.host}:{record.port}</Text>
          <Text type="secondary">{record.database}{record.schema ? ` / ${record.schema}` : ''}</Text>
        </Space>
      ),
    },
    {
      title: '抽取策略',
      key: 'extract',
      width: 260,
      render: (_value, record) => (
        <Space wrap size={4}>
          <Tag color="blue">{record.extractMode === 'TABLE' ? '按表抽取' : 'SQL抽取'}</Tag>
          {record.extractMode === 'TABLE' && <Tag>{record.tables.length} 张表</Tag>}
          {record.extractMode === 'SQL' && <Tag>SQL</Tag>}
          <Tag color={record.syncMode === 'INCREMENTAL' ? 'gold' : 'default'}>
            {record.syncMode === 'INCREMENTAL' ? '增量同步' : '全量同步'}
          </Tag>
          <Tag>上限 {record.rowLimit}</Tag>
        </Space>
      ),
    },
    {
      title: '连接状态',
      key: 'status',
      width: 160,
      render: (_value, record) => (
        <Space direction="vertical" size={2}>
          {dataSourceStatusTag(record.status)}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.lastTestAt ? new Date(record.lastTestAt).toLocaleString() : '尚未测试'}
          </Text>
        </Space>
      ),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 88,
      render: (_value, record) => (
        <Switch
          size="small"
          checked={record.enabled}
          onChange={(checked) => {
            if (!projectId) return
            void setProjectDataSourceEnabled(projectId, record.id, checked)
              .then(() => loadProject())
              .catch((error: any) => message.error(error?.message || '更新数据源状态失败'))
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_value, record) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<LinkOutlined />}
            loading={testingDataSourceId === record.id}
            onClick={() => {
              void handleTestDataSource(record.id)
            }}
          >
            测试连接
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditDataSourceModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该数据源？"
            onConfirm={() => {
              if (!projectId) return
              void deleteProjectDataSource(projectId, record.id)
                .then(() => {
                  message.success('数据源已删除')
                  return loadProject()
                })
                .catch((error: any) => message.error(error?.message || '删除失败'))
            }}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
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

  const schemaViewModel = useMemo<SchemaViewModel>(() => {
    const entities = project?.schemaConfig.entityTypes || []
    const relations = project?.schemaConfig.relationTypes || []

    const objectTypes: ObjectType[] = []
    const linkTypes: LinkType[] = []

    const graphObjectTypeIdByEntityId = new Map<string, number>()
    const entityIdByGraphObjectTypeId = new Map<number, string>()
    const objectTypeIdByEntityName = new Map<string, number>()
    const relationIssuesById = new Map<string, RelationEndpointIssue>()
    const edgeStatsByEntityId = new Map<string, { incoming: number; outgoing: number }>()
    const virtualObjectTypeIdByName = new Map<string, number>()

    let nextObjectTypeId = 1

    entities.forEach(entity => {
      const objectTypeId = nextObjectTypeId
      nextObjectTypeId += 1

      objectTypes.push({
        id: objectTypeId,
        name: entity.name,
        displayName: entity.name,
        description: entity.description || '',
      })
      graphObjectTypeIdByEntityId.set(entity.id, objectTypeId)
      entityIdByGraphObjectTypeId.set(objectTypeId, entity.id)
      objectTypeIdByEntityName.set(entity.name, objectTypeId)
      edgeStatsByEntityId.set(entity.id, { incoming: 0, outgoing: 0 })
    })

    const ensureVirtualObjectTypeId = (entityName: string): number => {
      const normalizedName = entityName.trim() || '(空名称)'
      const cachedObjectTypeId = virtualObjectTypeIdByName.get(normalizedName)
      if (cachedObjectTypeId) {
        return cachedObjectTypeId
      }

      const objectTypeId = nextObjectTypeId
      nextObjectTypeId += 1
      virtualObjectTypeIdByName.set(normalizedName, objectTypeId)
      objectTypes.push({
        id: objectTypeId,
        name: `__missing__${normalizedName}`,
        displayName: `未匹配实体: ${normalizedName}`,
        description: '关系引用了不存在的实体类型，请修正 domain / range。',
        color: '#8c8c8c',
      })
      return objectTypeId
    }

    relations.forEach((relation, index) => {
      let sourceObjectTypeId = objectTypeIdByEntityName.get(relation.domain)
      let targetObjectTypeId = objectTypeIdByEntityName.get(relation.range)

      const missingDomain = !sourceObjectTypeId
      const missingRange = !targetObjectTypeId
      if (missingDomain || missingRange) {
        relationIssuesById.set(relation.id, { missingDomain, missingRange })
      }

      if (!sourceObjectTypeId) {
        sourceObjectTypeId = ensureVirtualObjectTypeId(relation.domain)
      }
      if (!targetObjectTypeId) {
        targetObjectTypeId = ensureVirtualObjectTypeId(relation.range)
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

      const sourceEntityId = entityIdByGraphObjectTypeId.get(sourceObjectTypeId)
      if (sourceEntityId) {
        const stats = edgeStatsByEntityId.get(sourceEntityId)
        if (stats) stats.outgoing += 1
      }

      const targetEntityId = entityIdByGraphObjectTypeId.get(targetObjectTypeId)
      if (targetEntityId) {
        const stats = edgeStatsByEntityId.get(targetEntityId)
        if (stats) stats.incoming += 1
      }
    })

    return {
      entities,
      relations,
      objectTypes,
      linkTypes,
      graphObjectTypeIdByEntityId,
      entityIdByGraphObjectTypeId,
      relationIssuesById,
      edgeStatsByEntityId,
      virtualObjectTypeCount: virtualObjectTypeIdByName.size,
    }
  }, [project?.schemaConfig.entityTypes, project?.schemaConfig.relationTypes])

  const schemaEntities = schemaViewModel.entities
  const schemaRelations = schemaViewModel.relations
  const entityOptions = schemaEntities.map(item => ({ label: item.name, value: item.name }))
  const projectVersions = project?.versions || []
  const skillList = project?.schemaConfig.skills || []
  const enabledDocuments = project?.documents.filter(item => item.enabled) || []
  const enabledDataSources = project?.dataSources.filter(item => item.enabled) || []

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

  const selectedGraphNodeId = useMemo(() => {
    if (!selectedEntityId) return null
    return schemaViewModel.graphObjectTypeIdByEntityId.get(selectedEntityId) || null
  }, [schemaViewModel.graphObjectTypeIdByEntityId, selectedEntityId])

  const selectedSchemaNodeStats = useMemo(() => {
    if (!selectedEntityId) return null
    return schemaViewModel.edgeStatsByEntityId.get(selectedEntityId) || { incoming: 0, outgoing: 0 }
  }, [schemaViewModel.edgeStatsByEntityId, selectedEntityId])

  const schemaTreeData = useMemo<DataNode[]>(() => {
    const entityChildren: DataNode[] = schemaEntities.map(entity => ({
      key: `ent:${entity.id}`,
      title: (
        <Space size={6}>
          <Text>{entity.name}</Text>
          <Tag color="blue">{entity.properties.length} 属性</Tag>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(event) => {
              event.stopPropagation()
              openSchemaEditModal('ENTITY', entity.id)
            }}
          />
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

    const relationChildren: DataNode[] = schemaRelations.map(relation => {
      const endpointIssue = schemaViewModel.relationIssuesById.get(relation.id)
      return {
        key: `rel:${relation.id}`,
        title: (
          <Space size={6}>
            <Text>{relation.name}</Text>
            <Text type="secondary">{relation.domain} → {relation.range}</Text>
            <Tag>{relation.properties.length} 属性</Tag>
            {endpointIssue && <Tag color="warning">端点异常</Tag>}
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(event) => {
                event.stopPropagation()
                openSchemaEditModal('RELATION', relation.id)
              }}
            />
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
      }
    })

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
  }, [loadProject, projectId, schemaEntities, schemaRelations, schemaViewModel.relationIssuesById])

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

          <Descriptions size="small" column={5} bordered>
            <Descriptions.Item label="文档">{project.documents.length}</Descriptions.Item>
            <Descriptions.Item label="数据源">{project.dataSources.length}</Descriptions.Item>
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
            label: '1. 数据来源管理',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
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

                <Card
                  title={(
                    <Space size={8}>
                      <DatabaseOutlined />
                      <span>结构化数据源</span>
                    </Space>
                  )}
                  extra={(
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDataSourceModal}>
                      新增数据源
                    </Button>
                  )}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Alert
                      type="info"
                      showIcon
                      message="配置远端数据库后，可将结构化数据纳入抽取来源"
                      description={(
                        <Space wrap size={8}>
                          <Tag color="blue">已启用文档 {enabledDocuments.length}</Tag>
                          <Tag color="green">已启用数据源 {enabledDataSources.length}</Tag>
                          <Text type="secondary">抽取任务可使用文档和数据源混合输入。</Text>
                        </Space>
                      )}
                    />
                    <Table<StructuredDataSource>
                      rowKey="id"
                      size="small"
                      columns={dataSourceColumns}
                      dataSource={project.dataSources}
                      pagination={{ pageSize: 6 }}
                      locale={{ emptyText: '暂无数据源，点击“新增数据源”开始配置' }}
                      scroll={{ x: 1180 }}
                    />
                  </Space>
                </Card>
              </Space>
            ),
          },
          {
            key: 'schema',
            label: '2. 配置与Skill',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Row gutter={[16, 16]} align="top">
                  <Col xs={24} xl={7}>
                    <Card
                      title="实体/关系树"
                      extra={(
                        <Space>
                          <Tag>{schemaEntities.length + schemaRelations.length}</Tag>
                          <Button icon={<BulbOutlined />} onClick={() => setAiInsightModalOpen(true)}>
                            AI洞察
                          </Button>
                          <Button type="primary" icon={<PlusOutlined />} onClick={openSchemaCreateModal}>
                            新增
                          </Button>
                        </Space>
                      )}
                      style={{ height: '100%' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text type="secondary">统一管理实体与关系，点击“新增”后在弹窗里选择类型并填写字段。</Text>

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

                  <Col xs={24} xl={17}>
                    <Card
                      title="本体结构图（实体类型 / 关系类型）"
                      extra={<Text type="secondary">点击节点可高亮查看</Text>}
                      style={{ height: '100%' }}
                    >
                      {schemaEntities.length === 0 && schemaRelations.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无实体类型，先新增实体类型后可查看图谱" />
                      ) : (
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                          {schemaViewModel.relationIssuesById.size > 0 && (
                            <Alert
                              type="warning"
                              showIcon
                              message={(
                                <span>
                                  检测到 {schemaViewModel.relationIssuesById.size} 条关系端点未匹配实体类型，图中已按“未匹配实体”节点展示
                                  {schemaViewModel.virtualObjectTypeCount > 0 ? `（${schemaViewModel.virtualObjectTypeCount} 个）` : ''}。
                                </span>
                              )}
                            />
                          )}
                          <OntologyGraph
                            objectTypes={schemaViewModel.objectTypes}
                            linkTypes={schemaViewModel.linkTypes}
                            selectedOTId={selectedGraphNodeId}
                            onSelectOT={(ot) => {
                              const entityId = schemaViewModel.entityIdByGraphObjectTypeId.get(ot.id)
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
                      <Text type="secondary">基于当前启用文档 + 启用数据源 + 当前配置执行抽取。审核与筛选已迁移到图谱页。</Text>
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
                        disabled={enabledDocuments.length + enabledDataSources.length === 0}
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
        title="AI洞察"
        open={aiInsightModalOpen}
        onCancel={() => setAiInsightModalOpen(false)}
        onOk={() => void handleRunAiInsight()}
        okText="开始扫描"
        cancelText="取消"
        confirmLoading={runningAiInsight}
        okButtonProps={{ disabled: enabledDocuments.length === 0 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Alert
            type="info"
            showIcon
            message="AI 扫描已启用文档"
            description="系统会根据文档主题自动补全建议实体类型与关系类型；同名类型不会重复创建。"
          />
          {enabledDocuments.length > 0 ? (
            <>
              <Text>当前将扫描 {enabledDocuments.length} 个启用文档：</Text>
              <div style={{ maxHeight: 180, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
                {enabledDocuments.map(doc => (
                  <div key={doc.id}>
                    <Text type="secondary">{doc.name}</Text>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Alert type="warning" showIcon message="没有启用中的文档，请先到文档管理启用文档后再执行 AI 洞察。" />
          )}
        </Space>
      </Modal>

      <Modal
        title={schemaModalMode === 'edit' ? '编辑实体/关系' : '新增实体/关系'}
        open={schemaCreateModalOpen}
        onCancel={closeSchemaCreateModal}
        onOk={() => void handleCreateSchemaItem()}
        okText={schemaModalMode === 'edit' ? '保存修改' : '确认新增'}
        cancelText="取消"
        confirmLoading={creatingSchemaItem}
        destroyOnClose
        width={760}
      >
        <Form<SchemaCreateFormData>
          form={schemaCreateForm}
          layout="vertical"
          initialValues={{ type: 'ENTITY' }}
        >
          <Form.Item
            name="type"
            label="新增类型"
            rules={[{ required: true, message: '请选择新增类型' }]}
          >
            <Select<SchemaCreateType>
              options={[
                { label: '实体类型', value: 'ENTITY' },
                { label: '关系类型', value: 'RELATION' },
              ]}
              disabled={schemaModalMode === 'edit'}
              onChange={(value) => setSchemaCreateType(value)}
            />
          </Form.Item>

          {schemaCreateType === 'ENTITY' ? (
            <>
              <Form.Item
                name="entityName"
                label="实体类型名称"
                rules={[{ required: true, message: '请输入实体类型名称' }]}
              >
                <Input placeholder="例如 Device" />
              </Form.Item>
              <Form.Item name="entityDescription" label="描述（可选）">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.List name="entityProperties">
                {(fields, { add, remove }) => (
                  <Card
                    size="small"
                    title="高级属性"
                    extra={<Button size="small" icon={<PlusOutlined />} onClick={() => add({ dataType: 'STRING', required: false })}>添加属性</Button>}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {fields.length === 0 && <Text type="secondary">暂无属性，可按需添加。</Text>}
                      {fields.map(field => (
                        <Card
                          key={field.key}
                          size="small"
                          type="inner"
                          title={`属性 #${field.name + 1}`}
                          extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />}
                        >
                          <Form.Item name={[field.name, 'id']} style={{ display: 'none' }}>
                            <Input />
                          </Form.Item>
                          <Row gutter={12}>
                            <Col span={12}>
                              <Form.Item
                                name={[field.name, 'name']}
                                label="代码名"
                                rules={[{ required: true, message: '请输入代码名' }]}
                              >
                                <Input placeholder="例如 serial_no" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name={[field.name, 'displayName']} label="显示名">
                                <Input placeholder="例如 序列号" />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={12}>
                            <Col span={12}>
                              <Form.Item name={[field.name, 'dataType']} label="数据类型" initialValue="STRING">
                                <Select options={PROPERTY_DATA_TYPES.map(item => ({ label: item, value: item }))} />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name={[field.name, 'required']} label="必填" valuePropName="checked" initialValue={false}>
                                <Switch />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item name={[field.name, 'defaultValue']} label="默认值">
                            <Input />
                          </Form.Item>
                        </Card>
                      ))}
                    </Space>
                  </Card>
                )}
              </Form.List>
            </>
          ) : (
            <>
              <Form.Item
                name="relationName"
                label="关系名称"
                rules={[{ required: true, message: '请输入关系名称' }]}
              >
                <Input placeholder="例如 located_in" />
              </Form.Item>
              <Form.Item
                name="relationDomain"
                label="domain"
                rules={[{ required: true, message: '请选择 domain' }]}
              >
                <Select options={entityOptions} placeholder="选择源实体类型" />
              </Form.Item>
              <Form.Item
                name="relationRange"
                label="range"
                rules={[{ required: true, message: '请选择 range' }]}
              >
                <Select options={entityOptions} placeholder="选择目标实体类型" />
              </Form.Item>
              <Form.Item name="relationDescription" label="描述（可选）">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.List name="relationProperties">
                {(fields, { add, remove }) => (
                  <Card
                    size="small"
                    title="高级属性"
                    extra={<Button size="small" icon={<PlusOutlined />} onClick={() => add({ dataType: 'STRING', required: false })}>添加属性</Button>}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {fields.length === 0 && <Text type="secondary">暂无属性，可按需添加。</Text>}
                      {fields.map(field => (
                        <Card
                          key={field.key}
                          size="small"
                          type="inner"
                          title={`属性 #${field.name + 1}`}
                          extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />}
                        >
                          <Form.Item name={[field.name, 'id']} style={{ display: 'none' }}>
                            <Input />
                          </Form.Item>
                          <Row gutter={12}>
                            <Col span={12}>
                              <Form.Item
                                name={[field.name, 'name']}
                                label="代码名"
                                rules={[{ required: true, message: '请输入代码名' }]}
                              >
                                <Input placeholder="例如 confidence" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name={[field.name, 'displayName']} label="显示名">
                                <Input placeholder="例如 置信度" />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={12}>
                            <Col span={12}>
                              <Form.Item name={[field.name, 'dataType']} label="数据类型" initialValue="STRING">
                                <Select options={PROPERTY_DATA_TYPES.map(item => ({ label: item, value: item }))} />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name={[field.name, 'required']} label="必填" valuePropName="checked" initialValue={false}>
                                <Switch />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item name={[field.name, 'defaultValue']} label="默认值">
                            <Input />
                          </Form.Item>
                        </Card>
                      ))}
                    </Space>
                  </Card>
                )}
              </Form.List>
            </>
          )}
        </Form>
      </Modal>

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

      <Modal
        title={dataSourceModalMode === 'edit' ? '编辑数据源' : '新增数据源'}
        open={dataSourceModalOpen}
        onCancel={closeDataSourceModal}
        onOk={() => void handleSaveDataSource()}
        okText={dataSourceModalMode === 'edit' ? '保存修改' : '确认新增'}
        cancelText="取消"
        confirmLoading={savingDataSource}
        destroyOnClose
        width={820}
      >
        <Form<DataSourceFormData>
          form={dataSourceForm}
          layout="vertical"
          initialValues={{
            type: 'MYSQL',
            port: DEFAULT_PORT_BY_DATA_SOURCE_TYPE.MYSQL,
            sslEnabled: false,
            enabled: true,
            extractMode: 'TABLE',
            rowLimit: 10000,
            syncMode: 'FULL',
          }}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="数据源名称"
                rules={[{ required: true, message: '请输入数据源名称' }]}
              >
                <Input placeholder="例如 MES主库-生产库" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="数据库类型"
                rules={[{ required: true, message: '请选择数据库类型' }]}
              >
                <Select<DataSourceType>
                  options={DATA_SOURCE_TYPE_OPTIONS}
                  onChange={(value) => {
                    dataSourceForm.setFieldValue('port', DEFAULT_PORT_BY_DATA_SOURCE_TYPE[value])
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="host"
                label="数据库地址"
                rules={[{ required: true, message: '请输入数据库地址' }]}
              >
                <Input placeholder="例如 10.23.8.12 或 db.company.internal" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="port"
                label="端口"
                rules={[{ required: true, message: '请输入端口' }]}
              >
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="database"
                label="数据库名"
                rules={[{ required: true, message: '请输入数据库名' }]}
              >
                <Input placeholder="例如 mes_prod" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="schema" label="Schema（可选）">
                <Input placeholder="例如 public" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="账号"
                rules={[{ required: true, message: '请输入账号' }]}
              >
                <Input placeholder="例如 readonly_mes" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password placeholder="请输入数据库密码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="extractMode" label="抽取方式" rules={[{ required: true }]}>
                <Select<DataSourceExtractMode>
                  options={[
                    { label: '按表抽取', value: 'TABLE' },
                    { label: 'SQL 抽取', value: 'SQL' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="syncMode" label="同步方式" rules={[{ required: true }]}>
                <Select<DataSourceSyncMode>
                  options={[
                    { label: '全量同步', value: 'FULL' },
                    { label: '增量同步', value: 'INCREMENTAL' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, current) => prev.extractMode !== current.extractMode}>
            {({ getFieldValue }) => (
              getFieldValue('extractMode') === 'TABLE' ? (
                <Form.Item
                  name="tables"
                  label="目标表"
                  rules={[{ required: true, message: '请至少输入一个表名' }]}
                >
                  <Select
                    mode="tags"
                    tokenSeparators={[',', '\n']}
                    placeholder="输入表名后回车，例如 fault_event, work_order"
                    options={[]}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  name="customSql"
                  label="SQL 语句"
                  rules={[{ required: true, message: '请输入 SQL 语句' }]}
                >
                  <Input.TextArea rows={4} placeholder="SELECT * FROM table_name LIMIT 1000" />
                </Form.Item>
              )
            )}
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="rowLimit"
                label="单次拉取上限"
                rules={[{ required: true, message: '请输入拉取上限' }]}
              >
                <InputNumber min={1} max={200000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item noStyle shouldUpdate={(prev, current) => prev.syncMode !== current.syncMode}>
                {({ getFieldValue }) => (
                  getFieldValue('syncMode') === 'INCREMENTAL' ? (
                    <Form.Item
                      name="incrementalColumn"
                      label="增量字段"
                      rules={[{ required: true, message: '请输入增量字段' }]}
                    >
                      <Input placeholder="例如 updated_at" />
                    </Form.Item>
                  ) : (
                    <Form.Item label="增量字段">
                      <Input disabled placeholder="当前为全量同步，无需配置" />
                    </Form.Item>
                  )
                )}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="sslEnabled" label="启用 SSL" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="enabled" label="创建后启用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
