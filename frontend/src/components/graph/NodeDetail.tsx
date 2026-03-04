import { Button } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import type { GraphNode, GraphLink, NodeConfig } from '../../types/graph'
import { LINK_CONFIG, NODE_CONFIG } from './ForceGraph'

interface NodeDetailProps {
  node: GraphNode
  links: GraphLink[]
  nodes: GraphNode[]
  nodeConfig: Record<string, NodeConfig>
  onClose: () => void
}

function resolveId(v: string | GraphNode): string {
  return typeof v === 'object' ? v.id : v
}

export default function NodeDetail({ node, links, nodes, nodeConfig, onClose }: NodeDetailProps) {
  const cfg = nodeConfig[node.type] || { color: '#999', label: node.type }
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  const connectedLinks = links.filter((l) => {
    const sid = resolveId(l.source)
    const tid = resolveId(l.target)
    return sid === node.id || tid === node.id
  })

  const properties = Object.entries(node.props || {}).filter(([k]) => k !== 'name')

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 280,
        maxHeight: 'calc(100% - 24px)',
        overflow: 'auto',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        zIndex: 20,
        fontSize: 13,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderLeft: `4px solid ${cfg.color}`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              padding: '1px 8px',
              borderRadius: 4,
              background: `${cfg.color}20`,
              color: cfg.color,
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 4,
              border: `1px solid ${cfg.color}40`,
            }}
          >
            {cfg.label}
          </span>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#222', marginTop: 2 }}>
            {node.label}
          </div>
        </div>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{ marginTop: -2, marginRight: -6 }}
        />
      </div>

      {/* Properties */}
      {properties.length > 0 && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontWeight: 600, color: '#888', fontSize: 11, marginBottom: 6 }}>
            属性
          </div>
          {properties.map(([key, val]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '3px 0',
                gap: 8,
              }}
            >
              <span style={{ color: '#888', flexShrink: 0 }}>{key}</span>
              <span style={{ color: '#333', textAlign: 'right', wordBreak: 'break-all' }}>
                {val}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Connected nodes */}
      {connectedLinks.length > 0 && (
        <div style={{ padding: '10px 14px' }}>
          <div style={{ fontWeight: 600, color: '#888', fontSize: 11, marginBottom: 6 }}>
            关联 ({connectedLinks.length})
          </div>
          {connectedLinks.map((l, i) => {
            const sid = resolveId(l.source)
            const tid = resolveId(l.target)
            const isOut = sid === node.id
            const otherId = isOut ? tid : sid
            const other = nodeById.get(otherId)
            const relCfg = LINK_CONFIG[l.rel] || { color: '#666', label: l.rel }
            const otherCfg = NODE_CONFIG[other?.type || ''] || { color: '#333' }

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '1px 6px',
                    borderRadius: 3,
                    background: `${relCfg.color}20`,
                    color: relCfg.color,
                    fontSize: 11,
                    border: `1px solid ${relCfg.color}40`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isOut ? '\u2192' : '\u2190'} {relCfg.label}
                </span>
                <span style={{ color: otherCfg.color, fontWeight: 500 }}>
                  {other?.label || otherId}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
