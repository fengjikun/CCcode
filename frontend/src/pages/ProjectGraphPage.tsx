import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Result,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  ExpandOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { GraphData, GraphLink, GraphNode, LinkConfig, NodeConfig } from '../types/graph'
import ForceGraph, { LINK_CONFIG, NODE_CONFIG } from '../components/graph/ForceGraph'
import type { ForceGraphHandle } from '../components/graph/ForceGraph'
import GraphSidebar from '../components/graph/GraphSidebar'
import type { GraphStats } from '../components/graph/GraphSidebar'
import NodeDetail from '../components/graph/NodeDetail'
import { getProjectDetail, updateRunReviewItem } from '../api/projectManagement'
import type { ProjectDetail, ReviewItem, ReviewStatus } from '../types/projectMvp'

const { Title, Text } = Typography

const FALLBACK_COLORS = ['#1565c0', '#e53935', '#f57c00', '#00838f', '#8e24aa', '#2e7d32', '#455a64', '#6d4c41']
const FALLBACK_SHAPES: Array<NodeConfig['shape']> = ['circle', 'rect', 'hexagon', 'diamond']

function parseEntity(item: ReviewItem): { type: string; name: string } | null {
  const parts = item.title.split('::')
  if (parts.length < 2) return null
  const type = parts[0].trim()
  const name = parts.slice(1).join('::').trim()
  if (!type || !name) return null
  return { type, name }
}

function parseRelation(item: ReviewItem): { domain: string; rel: string; range: string } | null {
  const match = item.title.match(/^(.+)\s-\[(.+)\]->\s(.+)$/)
  if (!match) return null
  const domain = match[1].trim()
  const rel = match[2].trim()
  const range = match[3].trim()
  if (!domain || !rel || !range) return null
  return { domain, rel, range }
}

function typeConfig(type: string, idx: number): NodeConfig {
  const known = NODE_CONFIG[type]
  if (known) return known
  const color = FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
  return {
    color,
    stroke: '#263238',
    radius: 15,
    label: type,
    shape: FALLBACK_SHAPES[idx % FALLBACK_SHAPES.length],
  }
}

function linkTypeConfig(rel: string, idx: number): LinkConfig {
  const known = LINK_CONFIG[rel]
  if (known) return known
  const color = FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
  return {
    color,
    label: rel,
    dash: idx % 2 === 0 ? '' : '5,3',
  }
}

function buildGraphFromReviews(
  reviews: ReviewItem[],
  allowedStatuses: Set<ReviewStatus>,
): GraphData {
  const entityCandidates = reviews.filter(item => item.kind === 'ENTITY' && allowedStatuses.has(item.status))
  const relationCandidates = reviews.filter(item => item.kind === 'RELATION' && allowedStatuses.has(item.status))

  const nodes: GraphNode[] = []
  const keyToNodeId = new Map<string, string>()
  const typeBuckets = new Map<string, string[]>()

  for (const item of entityCandidates) {
    const parsed = parseEntity(item)
    if (!parsed) continue
    const key = `${parsed.type}::${parsed.name}`
    if (keyToNodeId.has(key)) continue
    const nodeId = `node_${keyToNodeId.size + 1}`
    keyToNodeId.set(key, nodeId)
    const bucket = typeBuckets.get(parsed.type) || []
    bucket.push(nodeId)
    typeBuckets.set(parsed.type, bucket)

    nodes.push({
      id: nodeId,
      type: parsed.type,
      label: parsed.name,
      props: {
        status: item.status,
        confidence: `${Math.round(item.confidence * 100)}%`,
        evidence: item.evidence,
      },
    })
  }

  const links: GraphLink[] = []
  const relTypeCursor = new Map<string, number>()

  for (const item of relationCandidates) {
    const parsed = parseRelation(item)
    if (!parsed) continue
    const domainNodes = typeBuckets.get(parsed.domain) || []
    const rangeNodes = typeBuckets.get(parsed.range) || []
    if (domainNodes.length === 0 || rangeNodes.length === 0) continue

    const cursorKey = `${parsed.domain}_${parsed.rel}_${parsed.range}`
    const cursor = relTypeCursor.get(cursorKey) || 0
    relTypeCursor.set(cursorKey, cursor + 1)

    const source = domainNodes[cursor % domainNodes.length]
    const target = rangeNodes[cursor % rangeNodes.length]

    links.push({
      source,
      target,
      rel: parsed.rel,
    })
  }

  return { nodes, links }
}

function graphStats(data: GraphData): GraphStats {
  const nodeCounts: Record<string, number> = {}
  data.nodes.forEach(node => {
    nodeCounts[node.type] = (nodeCounts[node.type] || 0) + 1
  })
  return {
    nodeCounts,
    edgeCount: data.links.length,
  }
}

function reviewStatusTag(status: ReviewStatus) {
  if (status === 'APPROVED') return <Tag color="success">APPROVED</Tag>
  if (status === 'REJECTED') return <Tag color="error">REJECTED</Tag>
  return <Tag color="warning">PENDING</Tag>
}

export default function ProjectGraphPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const graphRef = useRef<ForceGraphHandle>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [selectedSource, setSelectedSource] = useState<string>()
  const [allowedStatuses, setAllowedStatuses] = useState<ReviewStatus[]>(['APPROVED', 'PENDING'])
  const [pendingOnly, setPendingOnly] = useState(false)
  const [selectedRelations, setSelectedRelations] = useState<string[]>([])
  const [reviewKeyword, setReviewKeyword] = useState('')
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null)

  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [showEdgeLabels, setShowEdgeLabels] = useState(false)

  const loadProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const detail = await getProjectDetail(projectId)
      setProject(detail)

      const runIdFromQuery = searchParams.get('runId')
      const versionIdFromQuery = searchParams.get('versionId')

      const sourceFromQuery = versionIdFromQuery
        ? `version:${versionIdFromQuery}`
        : (runIdFromQuery ? `run:${runIdFromQuery}` : undefined)

      if (sourceFromQuery) {
        setSelectedSource(sourceFromQuery)
      } else if (detail.currentVersionId) {
        setSelectedSource(`version:${detail.currentVersionId}`)
      } else if (detail.runs[0]) {
        setSelectedSource(`run:${detail.runs[0].id}`)
      } else {
        setSelectedSource(undefined)
      }
    } catch (err: any) {
      const msg = err?.message || '加载项目图谱失败'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [projectId, searchParams])

  useEffect(() => {
    void loadProject()
  }, [loadProject])

  const sourceOptions = useMemo(() => {
    if (!project) return []
    const versionOptions = project.versions.map(version => ({
      label: `版本 ${version.version} · ${version.label}`,
      value: `version:${version.id}`,
    }))
    const runOptions = project.runs.map(run => ({
      label: `任务 ${new Date(run.createdAt).toLocaleString()} (${run.status})`,
      value: `run:${run.id}`,
    }))
    return [...versionOptions, ...runOptions]
  }, [project])

  const selectedRun = useMemo(() => {
    if (!project || !selectedSource) return null
    if (selectedSource.startsWith('version:')) {
      const versionId = selectedSource.replace('version:', '')
      const version = project.versions.find(item => item.id === versionId)
      if (!version) return null
      return project.runs.find(item => item.id === version.sourceRunId) || null
    }
    if (selectedSource.startsWith('run:')) {
      const runId = selectedSource.replace('run:', '')
      return project.runs.find(item => item.id === runId) || null
    }
    return null
  }, [project, selectedSource])
  const sourceIsVersion = selectedSource?.startsWith('version:') ?? false

  const handleSourceChange = useCallback((value: string) => {
    setSelectedSource(value)
    if (value.startsWith('version:')) {
      setSearchParams({ versionId: value.replace('version:', '') }, { replace: true })
    } else if (value.startsWith('run:')) {
      setSearchParams({ runId: value.replace('run:', '') }, { replace: true })
    }
  }, [setSearchParams])

  useEffect(() => {
    if (!selectedSource) return
    if (selectedSource.startsWith('version:')) {
      setAllowedStatuses(['APPROVED'])
      setPendingOnly(false)
    } else {
      setAllowedStatuses(['APPROVED', 'PENDING'])
    }
  }, [selectedSource])

  const effectiveStatusSet = useMemo(
    () => new Set<ReviewStatus>(pendingOnly ? ['PENDING'] : allowedStatuses),
    [allowedStatuses, pendingOnly],
  )

  const filteredReviewItems = useMemo(() => {
    if (!selectedRun) return []
    const keyword = reviewKeyword.trim().toLowerCase()
    return selectedRun.reviewItems.filter(item => {
      if (!effectiveStatusSet.has(item.status)) return false
      if (selectedRelations.length > 0 && item.kind === 'RELATION') {
        const relation = parseRelation(item)
        if (!relation || !selectedRelations.includes(relation.rel)) return false
      }
      if (!keyword) return true
      return item.title.toLowerCase().includes(keyword) || item.evidence.toLowerCase().includes(keyword)
    })
  }, [effectiveStatusSet, reviewKeyword, selectedRelations, selectedRun])

  const handleReviewAction = useCallback(async (itemId: string, status: ReviewStatus) => {
    if (!projectId || !selectedRun || sourceIsVersion) return
    setReviewingItemId(itemId)
    try {
      await updateRunReviewItem(projectId, selectedRun.id, itemId, status)
      message.success('审核状态已更新')
      await loadProject()
    } catch (err: any) {
      message.error(err?.message || '审核失败')
    } finally {
      setReviewingItemId(null)
    }
  }, [loadProject, projectId, selectedRun, sourceIsVersion])

  const reviewColumns: ColumnsType<ReviewItem> = useMemo(() => [
    {
      title: '类型',
      dataIndex: 'kind',
      width: 100,
      render: (value: ReviewItem['kind']) => <Tag>{value}</Tag>,
    },
    { title: '候选项', dataIndex: 'title', width: 280 },
    {
      title: '置信度',
      dataIndex: 'confidence',
      width: 100,
      render: (value: number) => `${Math.round(value * 100)}%`,
    },
    { title: '证据', dataIndex: 'evidence' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: ReviewStatus) => reviewStatusTag(value),
    },
    {
      title: '审核',
      key: 'action',
      width: 180,
      render: (_value, record: ReviewItem) => (
        <Space>
          <Button
            size="small"
            type="primary"
            ghost
            disabled={sourceIsVersion || record.status === 'APPROVED'}
            loading={reviewingItemId === record.id}
            onClick={() => void handleReviewAction(record.id, 'APPROVED')}
          >
            通过
          </Button>
          <Button
            size="small"
            danger
            ghost
            disabled={sourceIsVersion || record.status === 'REJECTED'}
            loading={reviewingItemId === record.id}
            onClick={() => void handleReviewAction(record.id, 'REJECTED')}
          >
            驳回
          </Button>
        </Space>
      ),
    },
  ], [handleReviewAction, reviewingItemId, sourceIsVersion])

  const rawGraph = useMemo(() => {
    if (!selectedRun) return { nodes: [], links: [] }
    return buildGraphFromReviews(selectedRun.reviewItems, effectiveStatusSet)
  }, [effectiveStatusSet, selectedRun])

  const relationOptions = useMemo(
    () => Array.from(new Set(rawGraph.links.map(link => link.rel))).map(rel => ({ label: rel, value: rel })),
    [rawGraph.links],
  )

  const filteredGraph = useMemo(() => {
    if (selectedRelations.length === 0) return rawGraph
    const links = rawGraph.links.filter(link => selectedRelations.includes(link.rel))
    const linkedNodeIds = new Set<string>()
    links.forEach(link => {
      const source = typeof link.source === 'object' ? link.source.id : link.source
      const target = typeof link.target === 'object' ? link.target.id : link.target
      linkedNodeIds.add(source)
      linkedNodeIds.add(target)
    })
    const nodes = rawGraph.nodes.filter(node => linkedNodeIds.has(node.id))
    return { nodes, links }
  }, [rawGraph, selectedRelations])

  const nodeConfigMap = useMemo(() => {
    const map: Record<string, NodeConfig> = {}
    const uniqueTypes = Array.from(new Set(rawGraph.nodes.map(node => node.type)))
    uniqueTypes.forEach((type, idx) => {
      map[type] = typeConfig(type, idx)
    })
    return map
  }, [rawGraph.nodes])

  const linkConfigMap = useMemo(() => {
    const map: Record<string, LinkConfig> = {}
    const uniqueRels = Array.from(new Set(rawGraph.links.map(link => link.rel)))
    uniqueRels.forEach((rel, idx) => {
      map[rel] = linkTypeConfig(rel, idx)
    })
    return map
  }, [rawGraph.links])

  useEffect(() => {
    const next = new Set(Object.keys(nodeConfigMap))
    setActiveTypes(next)
  }, [nodeConfigMap])

  const stats = useMemo(() => graphStats(filteredGraph), [filteredGraph])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 420 }}>
        <Spin size="large" tip="加载项目图谱..." />
      </div>
    )
  }

  if (error) {
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle={error}
        extra={<Button onClick={() => void loadProject()}>重试</Button>}
      />
    )
  }

  if (!project) {
    return <Empty description="项目不存在或已删除" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${project.id}`)}>
                返回项目工作台
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => void loadProject()} loading={loading}>
                刷新
              </Button>
            </Space>
            <Text type="secondary">项目：{project.name}</Text>
          </Space>

          <Title level={5} style={{ margin: 0 }}>抽取结果图谱展示</Title>
          <Text type="secondary">支持按版本/任务切换数据源，支持状态、关系、节点类型和关键词过滤。</Text>

          <Space wrap>
            <Select
              style={{ minWidth: 420 }}
              placeholder="选择版本或任务"
              value={selectedSource}
              options={sourceOptions}
              onChange={handleSourceChange}
            />
            <Select<ReviewStatus[]>
              mode="multiple"
              style={{ minWidth: 260 }}
              value={allowedStatuses}
              options={[
                { label: 'APPROVED', value: 'APPROVED' },
                { label: 'PENDING', value: 'PENDING' },
                { label: 'REJECTED', value: 'REJECTED' },
              ]}
              onChange={values => setAllowedStatuses(values)}
              placeholder="审核状态过滤"
            />
            <Select<string[]>
              mode="multiple"
              allowClear
              style={{ minWidth: 280 }}
              value={selectedRelations}
              options={relationOptions}
              onChange={values => setSelectedRelations(values)}
              placeholder="关系过滤"
            />
            <Space>
              <Switch
                checked={pendingOnly}
                disabled={sourceIsVersion}
                onChange={checked => setPendingOnly(checked)}
              />
              <Text type="secondary">只看待审核</Text>
            </Space>
          </Space>
        </Space>
      </Card>

      {!selectedRun ? (
        <Result status="info" title="暂无可展示数据" subTitle="请先在项目中完成抽取任务或发布版本" />
      ) : (
        <>
          <Card title="任务与审核">
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Space wrap>
                <Tag color={selectedRun.status === 'COMPLETED' ? 'success' : selectedRun.status === 'FAILED' ? 'error' : 'processing'}>
                  任务状态: {selectedRun.status}
                </Tag>
                <Tag color="blue">候选实体 {selectedRun.candidateEntityCount}</Tag>
                <Tag color="purple">候选关系 {selectedRun.candidateRelationCount}</Tag>
                <Tag color="orange">待审核 {selectedRun.pendingReviewCount}</Tag>
              </Space>
              {sourceIsVersion && (
                <Alert
                  type="info"
                  showIcon
                  message="当前是版本视图（只读）"
                  description="如需执行审核，请切换到某个抽取任务（run）视图。"
                />
              )}
              <Space wrap>
                <Input
                  allowClear
                  style={{ width: 320 }}
                  value={reviewKeyword}
                  onChange={event => setReviewKeyword(event.target.value)}
                  placeholder="按候选项或证据搜索审核记录"
                />
                <Text type="secondary">当前列表：{filteredReviewItems.length} 条</Text>
              </Space>
              <Table<ReviewItem>
                rowKey="id"
                size="small"
                columns={reviewColumns}
                dataSource={filteredReviewItems}
                pagination={{ pageSize: 8 }}
              />
            </Space>
          </Card>

          {filteredGraph.nodes.length === 0 ? (
            <Card>
              <Alert
                type="warning"
                showIcon
                message="当前过滤条件下无图谱数据"
                description="你可以放宽状态过滤或清空关系过滤后重试。"
              />
            </Card>
          ) : (
            <div
              style={{
                display: 'flex',
                height: 'calc(100vh - 48px - 32px - 180px)',
                background: '#fff',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #f0f0f0',
              }}
            >
              <GraphSidebar
                nodeConfigs={nodeConfigMap}
                linkConfigs={linkConfigMap}
                activeTypes={activeTypes}
                onTypeToggle={(type, checked) => {
                  setActiveTypes(prev => {
                    const next = new Set(prev)
                    if (checked) next.add(type)
                    else next.delete(type)
                    return next
                  })
                }}
                onSearch={setSearchKeyword}
                stats={stats}
                showEdgeLabels={showEdgeLabels}
                onToggleEdgeLabels={setShowEdgeLabels}
              />

              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    zIndex: 15,
                    display: 'flex',
                    gap: 4,
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: 6,
                    padding: 4,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <Button size="small" icon={<ZoomInOutlined />} onClick={() => graphRef.current?.zoomIn()} />
                  <Button size="small" icon={<ZoomOutOutlined />} onClick={() => graphRef.current?.zoomOut()} />
                  <Button size="small" icon={<ExpandOutlined />} onClick={() => graphRef.current?.zoomReset()} />
                  <Button size="small" icon={<ReloadOutlined />} onClick={() => graphRef.current?.restartLayout()} />
                </div>

                <ForceGraph
                  ref={graphRef}
                  nodes={filteredGraph.nodes}
                  links={filteredGraph.links}
                  activeTypes={activeTypes}
                  searchKeyword={searchKeyword}
                  showEdgeLabels={showEdgeLabels}
                  onNodeSelect={setSelectedNode}
                />

                {selectedNode && (
                  <NodeDetail
                    node={selectedNode}
                    links={filteredGraph.links}
                    nodes={filteredGraph.nodes}
                    nodeConfig={nodeConfigMap}
                    onClose={() => setSelectedNode(null)}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
