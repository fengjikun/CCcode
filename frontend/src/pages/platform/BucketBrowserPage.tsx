import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Tree,
  Typography,
} from 'antd'
import type { DataNode } from 'antd/es/tree'
import {
  ArrowLeftOutlined,
  FileExcelOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { getDataSource } from '../../api/dataSource'
import { ONTOLOGY_DEFS, getProjectDetail } from '../../api/projectManagement'
import type { DataSource } from '../../types/dataSource'
import type { ProjectDocument } from '../../types/projectMvp'
import PageHeader from '../../components/shared/PageHeader'

const { Text } = Typography

/* ──────────── 文件类型 ──────────── */
type FileEntryType = 'folder' | 'pdf' | 'json' | 'csv' | 'jsonl' | 'parquet' | 'yaml' | 'txt' | 'docx' | 'md' | 'xlsx'

interface FileEntry {
  key: string
  name: string
  type: FileEntryType
  size?: string
  lastModified?: string
  path: string
}

function fileIcon(type: FileEntryType) {
  if (type === 'folder') return <FolderOpenOutlined style={{ color: '#faad14' }} />
  if (type === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />
  if (type === 'docx') return <FileWordOutlined style={{ color: '#1677ff' }} />
  if (type === 'xlsx') return <FileExcelOutlined style={{ color: '#52c41a' }} />
  if (type === 'json' || type === 'jsonl' || type === 'yaml')
    return <FileTextOutlined style={{ color: '#1677ff' }} />
  if (type === 'md') return <FileTextOutlined style={{ color: '#722ed1' }} />
  return <FileOutlined style={{ color: '#8c8c8c' }} />
}

function fileTagColor(type: FileEntryType): string {
  const map: Record<string, string> = {
    pdf: 'red',
    docx: 'blue',
    md: 'purple',
    xlsx: 'green',
    json: 'geekblue',
    jsonl: 'geekblue',
    csv: 'cyan',
    parquet: 'volcano',
    yaml: 'gold',
    txt: 'default',
  }
  return map[type] ?? 'default'
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

/* ──────────── 项目文档 → FileEntry ──────────── */
function projectDocToFileEntry(doc: ProjectDocument, basePath: string): FileEntry {
  return {
    key: doc.id,
    name: doc.name,
    type: doc.fileType as FileEntryType,
    size: formatSize(doc.size),
    lastModified: doc.uploadedAt.slice(0, 10),
    path: basePath,
  }
}

/* ──────────── bucket → 关联项目 ID ──────────── */
function resolveProjectIdFromBucket(bucket: string): string | null {
  for (const [code, , industry] of ONTOLOGY_DEFS) {
    const codeSlug = code.replace(/\./g, '-')
    const projId = `proj-${code.replace(/\./g, '')}`
    const industrySlug = industry.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const prefix = `ontology-${industrySlug}-${codeSlug}-`
    if (bucket.startsWith(prefix)) return projId
  }
  return null
}

/* ──────────── 文件树 ──────────── */
interface TreeNode {
  key: string
  title: string
  icon?: React.ReactNode
  children?: TreeNode[]
  isLeaf?: boolean
  _path: string
}

interface BucketTree {
  treeNodes: TreeNode[]
  filesByPath: Record<string, FileEntry[]>
}

function buildTree(ds: DataSource, linkedDocs: ProjectDocument[]): BucketTree {
  const prefix = ds.connection.pathPrefix?.replace(/\/$/, '') || ds.name
  const bucketName = ds.connection.bucket || ds.name

  const filesByPath: Record<string, FileEntry[]> = {}

  // 根目录
  filesByPath['/'] = [
    { key: 'readme', name: 'README.md', type: 'txt', size: '2.4 KB', lastModified: '2025-03-10', path: '/' },
    { key: 'bucket-config', name: 'bucket-config.yaml', type: 'yaml', size: '1.1 KB', lastModified: '2025-02-28', path: '/' },
  ]

  // prefix 层
  const prefixPath = `/${prefix}`
  filesByPath[prefixPath] = [
    { key: 'manifest', name: 'manifest.json', type: 'json', size: '8.7 KB', lastModified: '2025-03-08', path: prefixPath },
  ]

  // documents 目录 — 优先用关联项目文档，否则用占位内容
  const docsPath = `${prefixPath}/documents`
  filesByPath[docsPath] = linkedDocs.length > 0
    ? linkedDocs.map(d => projectDocToFileEntry(d, docsPath))
    : [
        { key: 'doc1', name: `${ds.name}_技术规范_v1.pdf`, type: 'pdf', size: '4.2 MB', lastModified: '2025-03-01', path: docsPath },
        { key: 'doc2', name: `${ds.name}_设备手册_2024.pdf`, type: 'pdf', size: '12.8 MB', lastModified: '2024-12-15', path: docsPath },
        { key: 'doc3', name: '数据字典.pdf', type: 'pdf', size: '1.9 MB', lastModified: '2025-01-20', path: docsPath },
        { key: 'doc4', name: '接口说明.txt', type: 'txt', size: '38.5 KB', lastModified: '2025-02-14', path: docsPath },
      ]

  // graph-assets 目录
  const graphPath = `${prefixPath}/graph-assets`
  filesByPath[graphPath] = [
    { key: 'schema', name: 'schema.json', type: 'json', size: '156.2 KB', lastModified: '2025-03-09', path: graphPath },
    { key: 'entities', name: 'entities.csv', type: 'csv', size: '2.3 MB', lastModified: '2025-03-07', path: graphPath },
    { key: 'relations', name: 'relations.csv', type: 'csv', size: '1.1 MB', lastModified: '2025-03-07', path: graphPath },
    { key: 'embeddings', name: 'embeddings.parquet', type: 'parquet', size: '45.6 MB', lastModified: '2025-03-05', path: graphPath },
  ]

  // extraction-output 目录（含子目录）
  const extractPath = `${prefixPath}/extraction-output`
  filesByPath[extractPath] = []

  const run1Path = `${extractPath}/run_20260301`
  filesByPath[run1Path] = [
    { key: 'run1-ent', name: 'entities.jsonl', type: 'jsonl', size: '890.3 KB', lastModified: '2026-03-01', path: run1Path },
    { key: 'run1-rel', name: 'relations.jsonl', type: 'jsonl', size: '342.1 KB', lastModified: '2026-03-01', path: run1Path },
    { key: 'run1-meta', name: 'run_meta.json', type: 'json', size: '4.2 KB', lastModified: '2026-03-01', path: run1Path },
  ]

  const run2Path = `${extractPath}/run_20260215`
  filesByPath[run2Path] = [
    { key: 'run2-ent', name: 'entities.jsonl', type: 'jsonl', size: '812.7 KB', lastModified: '2026-02-15', path: run2Path },
    { key: 'run2-rel', name: 'relations.jsonl', type: 'jsonl', size: '298.4 KB', lastModified: '2026-02-15', path: run2Path },
    { key: 'run2-meta', name: 'run_meta.json', type: 'json', size: '4.1 KB', lastModified: '2026-02-15', path: run2Path },
  ]

  // raw-data 目录
  const rawPath = `${prefixPath}/raw-data`
  filesByPath[rawPath] = [
    { key: 'raw1', name: 'batch_20260310.parquet', type: 'parquet', size: '128.4 MB', lastModified: '2026-03-10', path: rawPath },
    { key: 'raw2', name: 'batch_20260301.parquet', type: 'parquet', size: '115.2 MB', lastModified: '2026-03-01', path: rawPath },
    { key: 'raw3', name: 'batch_20260215.parquet', type: 'parquet', size: '99.8 MB', lastModified: '2026-02-15', path: rawPath },
  ]

  const treeNodes: TreeNode[] = [
    {
      key: '/',
      title: bucketName,
      icon: <FolderOutlined style={{ color: '#faad14' }} />,
      _path: '/',
      children: [
        {
          key: prefixPath,
          title: prefix,
          icon: <FolderOutlined style={{ color: '#faad14' }} />,
          _path: prefixPath,
          children: [
            {
              key: docsPath,
              title: `documents (${filesByPath[docsPath].length})`,
              icon: <FolderOutlined style={{ color: '#faad14' }} />,
              _path: docsPath,
              isLeaf: false,
            },
            {
              key: graphPath,
              title: 'graph-assets',
              icon: <FolderOutlined style={{ color: '#faad14' }} />,
              _path: graphPath,
              isLeaf: false,
            },
            {
              key: extractPath,
              title: 'extraction-output',
              icon: <FolderOutlined style={{ color: '#faad14' }} />,
              _path: extractPath,
              children: [
                {
                  key: run1Path,
                  title: 'run_20260301',
                  icon: <FolderOutlined style={{ color: '#faad14' }} />,
                  _path: run1Path,
                  isLeaf: false,
                },
                {
                  key: run2Path,
                  title: 'run_20260215',
                  icon: <FolderOutlined style={{ color: '#faad14' }} />,
                  _path: run2Path,
                  isLeaf: false,
                },
              ],
            },
            {
              key: rawPath,
              title: 'raw-data',
              icon: <FolderOutlined style={{ color: '#faad14' }} />,
              _path: rawPath,
              isLeaf: false,
            },
          ],
        },
      ],
    },
  ]

  return { treeNodes, filesByPath }
}

/* ──────────── 面包屑 ──────────── */
function pathToBreadcrumb(path: string, bucketName: string): { title: string }[] {
  if (path === '/') return [{ title: bucketName }]
  const parts = path.split('/').filter(Boolean)
  const items: { title: string }[] = [{ title: bucketName }]
  for (const p of parts) items.push({ title: p })
  return items
}

/* ──────────── 主页面 ──────────── */
export default function BucketBrowserPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [ds, setDs] = useState<DataSource | null>(null)
  const [linkedDocs, setLinkedDocs] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPath, setSelectedPath] = useState<string>('/')
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['/'])

  const loadData = () => {
    if (!id) return
    setLoading(true)
    getDataSource(id)
      .then(async d => {
        setDs(d)
        if (d?.connection.bucket) {
          const projId = resolveProjectIdFromBucket(d.connection.bucket)
          if (projId) {
            try {
              const detail = await getProjectDetail(projId)
              setLinkedDocs(detail.documents.filter(doc => doc.enabled && doc.status === 'READY'))
            } catch {
              setLinkedDocs([])
            }
          }
        }
        if (d) setSelectedPath('/')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const { treeNodes, filesByPath } = useMemo(() => {
    if (!ds) return { treeNodes: [], filesByPath: {} }
    return buildTree(ds, linkedDocs)
  }, [ds, linkedDocs])

  const currentFiles = filesByPath[selectedPath] ?? []
  const breadcrumbItems = ds ? pathToBreadcrumb(selectedPath, ds.connection.bucket || ds.name) : []

  const fileColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row: FileEntry) => (
        <Space>
          {fileIcon(row.type)}
          <Text>{name}</Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (t: FileEntryType) =>
        t === 'folder' ? null : <Tag color={fileTagColor(t)}>{t.toUpperCase()}</Tag>,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 110,
      render: (v?: string) => v ? <Text type="secondary">{v}</Text> : '-',
    },
    {
      title: '最后修改',
      dataIndex: 'lastModified',
      key: 'lastModified',
      width: 120,
      render: (v?: string) => v ? <Text type="secondary">{v}</Text> : '-',
    },
  ]

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!ds) {
    return (
      <div className="page-container">
        <Empty description="数据源不存在" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => navigate('/datasource')}>返回列表</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <Card className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <PageHeader
            title={`桶浏览 — ${ds.name}`}
            subtitle={`${ds.type} · ${ds.connection.endpoint} · ${ds.connection.bucket}`}
          />
          <Space style={{ marginTop: 4 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/datasource')}>
              返回列表
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              刷新
            </Button>
          </Space>
        </div>

        {/* 统计栏 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              <Badge status="success" text={<Text type="secondary">Bucket</Text>} />
              <Text strong>{ds.connection.bucket}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Badge status="processing" text={<Text type="secondary">Region</Text>} />
              <Text strong>{ds.connection.region}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Badge status="default" text={<Text type="secondary">路径前缀</Text>} />
              <Text strong>{ds.connection.pathPrefix || '/'}</Text>
            </Space>
          </Col>
          {linkedDocs.length > 0 && (
            <Col>
              <Space>
                <Badge status="warning" text={<Text type="secondary">关联本体文档</Text>} />
                <Text strong>{linkedDocs.length} 份</Text>
              </Space>
            </Col>
          )}
        </Row>

        {/* 正文：左侧目录树 + 右侧文件表格 */}
        <Row gutter={16} style={{ minHeight: 480 }}>
          <Col span={6}>
            <Card
              size="small"
              style={{ height: '100%', minHeight: 480 }}
              styles={{ body: { padding: '8px 4px' } }}
              title={<Text style={{ fontSize: 13 }}>目录结构</Text>}
            >
              <Tree
                treeData={treeNodes as DataNode[]}
                defaultExpandAll
                expandedKeys={expandedKeys}
                onExpand={keys => setExpandedKeys(keys as string[])}
                selectedKeys={[selectedPath]}
                onSelect={keys => {
                  if (keys.length > 0) setSelectedPath(keys[0] as string)
                }}
                showIcon
                blockNode
              />
            </Card>
          </Col>

          <Col span={18}>
            <Card
              size="small"
              style={{ height: '100%' }}
              title={
                <Breadcrumb items={breadcrumbItems} style={{ fontSize: 13 }} />
              }
            >
              <Table
                dataSource={currentFiles}
                columns={fileColumns}
                rowKey="key"
                size="small"
                pagination={currentFiles.length > 20 ? { pageSize: 20, showTotal: t => `共 ${t} 个文件` } : false}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该目录暂无文件" /> }}
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
