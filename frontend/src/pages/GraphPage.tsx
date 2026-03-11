import { useState, useRef, useMemo, useCallback } from 'react'
import { Button, Spin, Result, Tooltip } from 'antd'
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useGraphData } from '../hooks/useGraphData'
import ForceGraph, { NODE_CONFIG, LINK_CONFIG } from '../components/graph/ForceGraph'
import type { ForceGraphHandle } from '../components/graph/ForceGraph'
import GraphSidebar from '../components/graph/GraphSidebar'
import type { GraphStats } from '../components/graph/GraphSidebar'
import NodeDetail from '../components/graph/NodeDetail'
import type { GraphNode } from '../types/graph'

export default function GraphPage() {
  const { data, loading, error, reload } = useGraphData()
  const graphRef = useRef<ForceGraphHandle>(null)

  const [activeTypes, setActiveTypes] = useState<Set<string>>(
    () => new Set(Object.keys(NODE_CONFIG)),
  )
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [showEdgeLabels, setShowEdgeLabels] = useState(false)

  const handleTypeToggle = useCallback((type: string, checked: boolean) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (checked) next.add(type)
      else next.delete(type)
      return next
    })
  }, [])

  const handleNodeSelect = useCallback((node: GraphNode | null) => {
    setSelectedNode(node)
  }, [])

  const stats: GraphStats | null = useMemo(() => {
    if (!data) return null
    const nodeCounts: Record<string, number> = {}
    data.nodes.forEach((n) => {
      nodeCounts[n.type] = (nodeCounts[n.type] || 0) + 1
    })
    return { nodeCounts, edgeCount: data.links.length }
  }, [data])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
        <Spin size="large" tip="加载本体数据集..." />
      </div>
    )
  }

  if (error) {
    return (
      <Result
        status="error"
        title="本体数据集加载失败"
        subTitle={error}
        extra={<Button onClick={reload}>重试</Button>}
      />
    )
  }

  if (!data || data.nodes.length === 0) {
    return (
      <Result
        status="info"
        title="暂无本体数据集"
        subTitle="请先在本体管理中补充数据，再进行检索与关联查看"
      />
    )
  }

  const toolbarButtons = [
    { icon: <ZoomInOutlined />, title: '放大', onClick: () => graphRef.current?.zoomIn() },
    { icon: <ZoomOutOutlined />, title: '缩小', onClick: () => graphRef.current?.zoomOut() },
    { icon: <FullscreenOutlined />, title: '重置视图', onClick: () => graphRef.current?.zoomReset() },
    { icon: <ReloadOutlined />, title: '重新布局', onClick: () => graphRef.current?.restartLayout() },
  ]

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 48px - 32px - 16px)',
        background: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #e8e8e8',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <GraphSidebar
        nodeConfigs={NODE_CONFIG}
        linkConfigs={LINK_CONFIG}
        activeTypes={activeTypes}
        onTypeToggle={handleTypeToggle}
        onSearch={setSearchKeyword}
        stats={stats}
        showEdgeLabels={showEdgeLabels}
        onToggleEdgeLabels={setShowEdgeLabels}
      />

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 15,
            display: 'flex',
            gap: 1,
            background: '#fff',
            borderRadius: 8,
            padding: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            border: '1px solid #e8e8e8',
          }}
        >
          {toolbarButtons.map(({ icon, title, onClick }, i) => (
            <Tooltip key={i} title={title} placement="bottom">
              <Button
                type="text"
                size="small"
                icon={icon}
                onClick={onClick}
                style={{
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#555',
                  borderRadius: 5,
                }}
              />
            </Tooltip>
          ))}
        </div>

        <ForceGraph
          ref={graphRef}
          nodes={data.nodes}
          links={data.links}
          onNodeSelect={handleNodeSelect}
          activeTypes={activeTypes}
          searchKeyword={searchKeyword}
          showEdgeLabels={showEdgeLabels}
        />

        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            links={data.links}
            nodes={data.nodes}
            nodeConfig={NODE_CONFIG}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  )
}
