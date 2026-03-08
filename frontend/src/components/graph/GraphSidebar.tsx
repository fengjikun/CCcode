import { Input, Checkbox, Tooltip } from 'antd'
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#8c8c8c',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '2px 0 6px',
        borderBottom: '1px solid #f0f0f0',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
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
  const totalNodes = stats ? Object.values(stats.nodeCounts).reduce((a, b) => a + b, 0) : 0

  return (
    <div
      style={{
        width: 230,
        minWidth: 230,
        background: '#fafafa',
        borderRight: '1px solid #e8e8e8',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        fontSize: 13,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 14px 10px',
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
        }}
      >
        <Input
          prefix={<SearchOutlined style={{ color: '#bbb', fontSize: 13 }} />}
          placeholder="搜索节点..."
          allowClear
          size="small"
          onChange={(e) => onSearch(e.target.value)}
          style={{ borderRadius: 6 }}
        />
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Node type filter */}
        <div>
          <SectionTitle>节点类型</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(nodeConfigs).map(([type, cfg]) => {
              const isActive = activeTypes.has(type)
              return (
                <label
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 6px',
                    borderRadius: 5,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    background: isActive ? `${cfg.color}10` : 'transparent',
                    opacity: isActive ? 1 : 0.45,
                  }}
                >
                  <Checkbox
                    checked={isActive}
                    onChange={(e) => onTypeToggle(type, e.target.checked)}
                    style={{ marginInlineEnd: 0 }}
                  />
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 14,
                      height: 14,
                      borderRadius: cfg.shape === 'circle' ? '50%' : cfg.shape === 'rect' ? 2 : 2,
                      background: cfg.color,
                      flexShrink: 0,
                      boxShadow: `0 0 0 2px ${cfg.color}40`,
                    }}
                  />
                  <span style={{ color: '#333', flex: 1 }}>{cfg.label}</span>
                  {stats && (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#fff',
                        background: cfg.color,
                        borderRadius: 10,
                        padding: '0 5px',
                        minWidth: 18,
                        textAlign: 'center',
                        fontWeight: 600,
                        opacity: 0.85,
                      }}
                    >
                      {stats.nodeCounts[type] ?? 0}
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </div>

        {/* Relationship legend */}
        <div>
          <SectionTitle>关系类型</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(linkConfigs).map(([rel, cfg]) => (
              <Tooltip key={rel} title={rel} placement="right">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '2px 6px',
                    borderRadius: 4,
                    cursor: 'default',
                  }}
                >
                  <svg width={28} height={12} style={{ flexShrink: 0 }}>
                    <line
                      x1={0}
                      y1={6}
                      x2={28}
                      y2={6}
                      stroke={cfg.color}
                      strokeWidth={2}
                      strokeDasharray={cfg.dash || undefined}
                    />
                    <polygon
                      points="22,3 28,6 22,9"
                      fill={cfg.color}
                    />
                  </svg>
                  <span style={{ color: '#444', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cfg.label}
                  </span>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Display options */}
        <div>
          <SectionTitle>显示选项</SectionTitle>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 6px',
              borderRadius: 5,
              cursor: 'pointer',
            }}
          >
            <Checkbox
              checked={showEdgeLabels}
              onChange={(e) => onToggleEdgeLabels(e.target.checked)}
              style={{ marginInlineEnd: 0 }}
            />
            <span style={{ color: '#333' }}>显示边标签</span>
          </label>
        </div>

        {/* Statistics summary */}
        {stats && (
          <div>
            <SectionTitle>图谱统计</SectionTitle>
            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #e8e8e8',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  background: '#f5f5f5',
                  borderBottom: '1px solid #e8e8e8',
                }}
              >
                <span style={{ color: '#666', fontSize: 12 }}>节点总数</span>
                <span style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 14 }}>{totalNodes}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                }}
              >
                <span style={{ color: '#666', fontSize: 12 }}>关系总数</span>
                <span style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 14 }}>{stats.edgeCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
