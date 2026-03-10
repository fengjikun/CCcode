import { useRef, useState, type ChangeEvent } from 'react'
import { Alert, Button, Card, Popconfirm, Space, Switch, Table, Tag, Typography, message } from 'antd'
import { DatabaseOutlined, DeleteOutlined, EditOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  deleteProjectDataSource,
  deleteProjectDocument,
  setProjectDataSourceEnabled,
  setProjectDocumentEnabled,
  testProjectDataSourceConnection,
  uploadProjectDocument,
} from '../../../api/projectManagement'
import type { DataSourceType, ProjectDetail, ProjectDocument, StructuredDataSource } from '../../../types/projectMvp'
import { dataSourceStatusTag, getErrorMessage } from '../helpers'
import DataSourceModal from '../modals/DataSourceModal'

const { Text } = Typography

interface DocumentsTabProps {
  projectId: string
  project: ProjectDetail
  loadProject: () => void
  enabledDocuments: ProjectDocument[]
  enabledDataSources: StructuredDataSource[]
}

export default function DocumentsTab({
  projectId,
  project,
  loadProject,
  enabledDocuments,
  enabledDataSources,
}: DocumentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [testingDataSourceId, setTestingDataSourceId] = useState<string | null>(null)
  const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false)
  const [dataSourceModalMode, setDataSourceModalMode] = useState<'create' | 'edit'>('create')
  const [editingDataSource, setEditingDataSource] = useState<StructuredDataSource | null>(null)

  const handlePickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return

    setUploadingDocs(true)
    try {
      for (const file of Array.from(fileList)) {
        const lower = file.name.toLowerCase()
        if (!lower.endsWith('.docx') && !lower.endsWith('.md') && !lower.endsWith('.xlsx')) {
          message.warning(`${file.name} 非支持格式，已跳过`)
          continue
        }
        await uploadProjectDocument(projectId, file)
      }
      message.success('文档上传完成')
      loadProject()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '上传文档失败'))
    } finally {
      setUploadingDocs(false)
      event.target.value = ''
    }
  }

  const handleTestDataSource = async (dataSourceId: string) => {
    setTestingDataSourceId(dataSourceId)
    try {
      const result = await testProjectDataSourceConnection(projectId, dataSourceId)
      if (result.status === 'SUCCESS') {
        message.success(`连接测试成功：${result.message}`)
      } else {
        message.error(`连接测试失败：${result.message}`)
      }
      loadProject()
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '连接测试失败'))
    } finally {
      setTestingDataSourceId(null)
    }
  }

  const openCreateDataSourceModal = () => {
    setDataSourceModalMode('create')
    setEditingDataSource(null)
    setDataSourceModalOpen(true)
  }

  const openEditDataSourceModal = (dataSource: StructuredDataSource) => {
    setDataSourceModalMode('edit')
    setEditingDataSource(dataSource)
    setDataSourceModalOpen(true)
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
      render: (value: ProjectDocument['status']) => (
        value === 'READY' ? <Tag color="success">READY</Tag> : <Tag color="error">FAILED</Tag>
      ),
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
            void setProjectDocumentEnabled(projectId, record.id, checked)
              .then(() => loadProject())
              .catch((error: unknown) => message.error(getErrorMessage(error, '更新文档状态失败')))
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
            void deleteProjectDocument(projectId, record.id)
              .then(() => {
                message.success('文档已删除')
                return loadProject()
              })
              .catch((error: unknown) => message.error(getErrorMessage(error, '删除失败')))
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
            void setProjectDataSourceEnabled(projectId, record.id, checked)
              .then(() => loadProject())
              .catch((error: unknown) => message.error(getErrorMessage(error, '更新数据源状态失败')))
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
            onClick={() => { void handleTestDataSource(record.id) }}
          >
            校验配置
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditDataSourceModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该数据源？"
            onConfirm={() => {
              void deleteProjectDataSource(projectId, record.id)
                .then(() => {
                  message.success('数据源已删除')
                  return loadProject()
                })
                .catch((error: unknown) => message.error(getErrorMessage(error, '删除失败')))
            }}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Text type="secondary">支持上传多个 .docx/.md/.xlsx，后续抽取使用"启用中"文档集合。</Text>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".docx,.md,.xlsx"
                style={{ display: 'none' }}
                onChange={(event) => { void handlePickFiles(event) }}
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
            locale={{ emptyText: '暂无数据源，点击"新增数据源"开始配置' }}
            scroll={{ x: 1180 }}
          />
        </Space>
      </Card>

      <DataSourceModal
        open={dataSourceModalOpen}
        mode={dataSourceModalMode}
        editingDataSource={editingDataSource}
        onClose={() => setDataSourceModalOpen(false)}
        onSuccess={loadProject}
        projectId={projectId}
      />
    </Space>
  )
}
