import { Button, Tag } from 'antd'
import { CloseOutlined, NodeIndexOutlined } from '@ant-design/icons'
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
        width: 290,
        maxHeight: 'calc(100% - 24px)',
        overflow: 'auto',
        background: '#fff',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        zIndex: 20,
        fontSize: 13,
        border: '1px solid #e8e8e8',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 14px 12px',
          borderBottom: '1px solid #f0f0f0',
          background: `linear-gradient(135deg, ${cfg.color}15 0%, ${cfg.color}05 100%)`,
          borderRadius: '10px 10px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, paddingRight: 8 }}>
            <Tag
              style={{
                borderColor: `${cfg.color}60`,
                color: cfg.color,
                background: `${cfg.color}15`,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.04em',
                marginBottom: 6,
                border: `1px solid ${cfg.color}50`,
              }}
            >
              {cfg.label}
            </Tag>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', lineHeight: 1.4, wordBreak: 'break-all' }}>
              {node.label}
            </div>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ marginTop: -2, marginRight: -4, color: '#999', flexShrink: 0 }}
          />
        </div>
      </div>

      {/* Properties */}
      {properties.length > 0 && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #f5f5f5' }}>
          <div style={{ fontWeight: 700, color: '#999', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            属性
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {properties.map(([key, val]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: '#fafafa',
                  borderRadius: 5,
                  padding: '4px 8px',
                }}
              >
                <span style={{ color: '#888', flexShrink: 0, fontSize: 12 }}>{key}</span>
                <span style={{ color: '#333', textAlign: 'right', wordBreak: 'break-all', fontSize: 12 }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected nodes */}
      {connectedLinks.length > 0 && (
        <div style={{ padding: '12px 14px' }}>
          <div
            style={{
              fontWeight: 700,
              color: '#999',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <NodeIndexOutlined style={{ fontSize: 12 }} />
            关联节点 ({connectedLinks.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {connectedLinks.map((l, i) => {
              const sid = resolveId(l.source)
              const tid = resolveId(l.target)
              const isOut = sid === node.id
              const otherId = isOut ? tid : sid
              const other = nodeById.get(otherId)
              const relCfg = LINK_CONFIG[l.rel] || { color: '#666', label: l.rel }
              const otherCfg = NODE_CONFIG[other?.type || ''] || { color: '#555', label: other?.type || '' }

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 8px',
                    borderRadius: 6,
                    background: '#fafafa',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: otherCfg.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: '#333', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {other?.label || otherId}
                  </span>
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: 3,
                      background: `${relCfg.color}15`,
                      color: relCfg.color,
                      fontSize: 10,
                      border: `1px solid ${relCfg.color}30`,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {isOut ? '→' : '←'} {relCfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
