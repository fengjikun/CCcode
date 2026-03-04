import { Input, Checkbox } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { NodeConfig, LinkConfig } from '../../types/graph'

export interface GraphStats {
  nodeCounts: Record<string, number>
  edgeCount: number
}

interface GraphSidebarProps {
  nodeConfigs: Record<string, NodeConfig>
  linkConfigs: Record<string, LinkConfig>
  activeTypes: Set<string>
  onTypeToggle: (type: string, checked: boolean) => void
  onSearch: (keyword: string) => void
  stats: GraphStats | null
  showEdgeLabels: boolean
  onToggleEdgeLabels: (show: boolean) => void
}

export default function GraphSidebar({
  nodeConfigs,
  linkConfigs,
  activeTypes,
  onTypeToggle,
  onSearch,
  stats,
  showEdgeLabels,
  onToggleEdgeLabels,
}: GraphSidebarProps) {
  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        padding: '12px 10px',
        gap: 16,
        fontSize: 13,
      }}
    >
      {/* Search */}
      <div>
        <Input
          prefix={<SearchOutlined style={{ color: '#bbb' }} />}
          placeholder="搜索节点..."
          allowClear
          size="small"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Node type legend */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6, color: '#555' }}>节点类型</div>
        {Object.entries(nodeConfigs).map(([type, cfg]) => (
          <label
            key={type}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
              cursor: 'pointer',
            }}
          >
            <Checkbox
              checked={activeTypes.has(type)}
              onChange={(e) => onTypeToggle(type, e.target.checked)}
              style={{ marginInlineEnd: 0 }}
            />
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: cfg.shape === 'circle' ? '50%' : 2,
                background: cfg.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#333' }}>{cfg.label}</span>
          </label>
        ))}
      </div>

      {/* Relationship type legend */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6, color: '#555' }}>关系类型</div>
        {Object.entries(linkConfigs).map(([rel, cfg]) => (
          <div key={rel} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <svg width={30} height={10} style={{ flexShrink: 0 }}>
              <line
                x1={0}
                y1={5}
                x2={30}
                y2={5}
                stroke={cfg.color}
                strokeWidth={2}
                strokeDasharray={cfg.dash || undefined}
              />
            </svg>
            <span style={{ color: '#555' }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Display options */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6, color: '#555' }}>显示选项</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <Checkbox
            checked={showEdgeLabels}
            onChange={(e) => onToggleEdgeLabels(e.target.checked)}
            style={{ marginInlineEnd: 0 }}
          />
          <span style={{ color: '#333' }}>显示边标签</span>
        </label>
      </div>

      {/* Statistics */}
      {stats && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#555' }}>图谱统计</div>
          {Object.entries(stats.nodeCounts).map(([type, count]) => {
            const cfg = nodeConfigs[type]
            return (
              <div
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 0',
                  borderLeft: `3px solid ${cfg?.color || '#999'}`,
                  paddingLeft: 8,
                  marginBottom: 3,
                }}
              >
                <span style={{ color: '#555' }}>{cfg?.label || type}</span>
                <span style={{ fontWeight: 600, color: '#333' }}>{count}</span>
              </div>
            )
          })}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 0',
              borderLeft: '3px solid #90a4ae',
              paddingLeft: 8,
              marginTop: 4,
            }}
          >
            <span style={{ color: '#555' }}>边</span>
            <span style={{ fontWeight: 600, color: '#333' }}>{stats.edgeCount}</span>
          </div>
        </div>
      )}
    </div>
  )
}
