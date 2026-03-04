import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
} from 'react'
import * as d3 from 'd3'
import type { GraphNode, GraphLink, NodeConfig, LinkConfig } from '../../types/graph'

// ===== Node configuration =====
export const NODE_CONFIG: Record<string, NodeConfig> = {
  Equipment:     { color: '#1565c0', stroke: '#0d47a1', radius: 24, label: '设  备',   shape: 'rect'    },
  Phenomenon:    { color: '#e53935', stroke: '#b71c1c', radius: 22, label: '现象问题', shape: 'hexagon' },
  SubPhenomenon: { color: '#f57c00', stroke: '#e65100', radius: 17, label: '子现象',   shape: 'hexagon' },
  Checkpoint:    { color: '#00838f', stroke: '#006064', radius: 16, label: '排查点',   shape: 'diamond' },
  Cause:         { color: '#8e24aa', stroke: '#4a148c', radius: 15, label: '原  因',   shape: 'circle'  },
  Solution:      { color: '#2e7d32', stroke: '#1b5e20', radius: 15, label: '解决方案', shape: 'circle'  },
  Component:     { color: '#455a64', stroke: '#263238', radius: 14, label: '部  件',   shape: 'rect'    },
  Parameter:     { color: '#0097a7', stroke: '#006064', radius: 12, label: '参  数',   shape: 'circle'  },
}

// ===== Link configuration =====
export const LINK_CONFIG: Record<string, LinkConfig> = {
  prone_to:    { color: '#1565c0', label: '易发生',   dash: '8,4'  },
  contains:    { color: '#f57c00', label: '包含',     dash: '5,3'  },
  needs_check: { color: '#00838f', label: '需排查',   dash: ''     },
  discovers:   { color: '#0097a7', label: '发现',     dash: '4,2'  },
  located_at:  { color: '#455a64', label: '位于',     dash: '2,4'  },
  caused_by:   { color: '#8e24aa', label: '其原因是', dash: '6,3'  },
  solved_by:   { color: '#2e7d32', label: '解决方案', dash: '3,3'  },
  supports:    { color: '#78909c', label: '采集参数', dash: '1,3'  },
}

// ===== Helper functions =====
function nodeRadius(d: GraphNode): number {
  return (NODE_CONFIG[d.type] || { radius: 14 }).radius
}

function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30)
    return `${r * Math.cos(a)},${r * Math.sin(a)}`
  }).join(' ')
}

function targetPoint(d: any): { x: number; y: number } {
  const dx = d.target.x - d.source.x
  const dy = d.target.y - d.source.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const r = nodeRadius(d.target) + 4
  return { x: d.target.x - (dx / dist) * r, y: d.target.y - (dy / dist) * r }
}

function nodeIcon(type: string): string {
  const icons: Record<string, string> = {
    Equipment:     '\u25A3',
    Phenomenon:    '\u26A0',
    SubPhenomenon: '\u25C8',
    Checkpoint:    '\u25C7',
    Cause:         '\u25CF',
    Solution:      '\u2714',
    Component:     '\u25A0',
    Parameter:     '\u25CE',
  }
  return icons[type] || '\u25CF'
}

function truncate(str: string, len: number): string {
  return str && str.length > len ? str.slice(0, len) + '\u2026' : str
}

function sourceId(l: any): string {
  return typeof l.source === 'object' ? l.source.id : l.source
}

function targetId(l: any): string {
  return typeof l.target === 'object' ? l.target.id : l.target
}

// ===== Types =====
export interface ForceGraphHandle {
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
  restartLayout: () => void
}

interface ForceGraphProps {
  nodes: GraphNode[]
  links: GraphLink[]
  onNodeSelect?: (node: GraphNode | null) => void
  activeTypes: Set<string>
  searchKeyword: string
  showEdgeLabels: boolean
}

// ===== Component =====
const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(
  ({ nodes, links, onNodeSelect, activeTypes, searchKeyword, showEdgeLabels }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement | null>(null)
    const simulationRef = useRef<d3.Simulation<any, any> | null>(null)
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
    const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
    const nodeSelRef = useRef<d3.Selection<SVGGElement, any, SVGGElement, unknown> | null>(null)
    const linkSelRef = useRef<d3.Selection<SVGLineElement, any, SVGGElement, unknown> | null>(null)
    const linkTextSelRef = useRef<d3.Selection<SVGTextElement, any, SVGGElement, unknown> | null>(null)
    const simNodesRef = useRef<any[]>([])
    const simLinksRef = useRef<any[]>([])

    // Tooltip state
    const [tooltip, setTooltip] = useState<{
      visible: boolean
      x: number
      y: number
      node: GraphNode | null
      connCount: number
    }>({ visible: false, x: 0, y: 0, node: null, connCount: 0 })

    // Expose zoom/layout controls
    useImperativeHandle(ref, () => ({
      zoomIn() {
        if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current)
            .transition()
            .duration(300)
            .call(zoomRef.current.scaleBy, 1.4)
        }
      },
      zoomOut() {
        if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current)
            .transition()
            .duration(300)
            .call(zoomRef.current.scaleBy, 0.7)
        }
      },
      zoomReset() {
        if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current)
            .transition()
            .duration(500)
            .call(zoomRef.current.transform, d3.zoomIdentity)
        }
      },
      restartLayout() {
        if (simulationRef.current) {
          simulationRef.current.alpha(0.3).restart()
        }
      },
    }))

    // Build the graph
    useEffect(() => {
      if (!containerRef.current || nodes.length === 0) return

      const container = containerRef.current
      const W = container.clientWidth || 900
      const H = container.clientHeight || 620

      // Clean up previous
      d3.select(container).select('svg').remove()
      if (simulationRef.current) simulationRef.current.stop()

      const svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .style('background', '#fafbfc')

      svgRef.current = svg.node()

      // Arrow markers
      const defs = svg.append('defs')
      Object.entries(LINK_CONFIG).forEach(([rel, cfg]) => {
        defs.append('marker')
          .attr('id', `arrow-${rel}`)
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 30)
          .attr('refY', 0)
          .attr('markerWidth', 6)
          .attr('markerHeight', 6)
          .attr('orient', 'auto')
          .append('path')
          .attr('fill', cfg.color)
          .attr('d', 'M0,-5L10,0L0,5')
      })

      // Zoom
      const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 3])
        .on('zoom', (e) => {
          gSel.attr('transform', e.transform)
        })

      svg.call(zoomBehavior)
      zoomRef.current = zoomBehavior

      const gSel = svg.append('g').attr('class', 'graph-g')
      gRef.current = gSel

      // Deep copy nodes for simulation
      const simNodes = nodes.map((n) => ({ ...n }))
      const nodeById = new Map(simNodes.map((n) => [n.id, n]))

      const simLinks = links
        .filter((l) => {
          const sid = typeof l.source === 'object' ? l.source.id : l.source
          const tid = typeof l.target === 'object' ? l.target.id : l.target
          return nodeById.has(sid) && nodeById.has(tid)
        })
        .map((l) => ({ ...l }))

      simNodesRef.current = simNodes
      simLinksRef.current = simLinks

      // Force simulation
      const simulation = d3.forceSimulation(simNodes)
        .force(
          'link',
          d3.forceLink(simLinks)
            .id((d: any) => d.id)
            .distance((d: any) => {
              if (d.rel === 'prone_to') return 140
              if (d.rel === 'contains') return 100
              if (d.rel === 'needs_check') return 110
              if (d.rel === 'solved_by') return 120
              if (d.rel === 'located_at') return 90
              if (d.rel === 'supports') return 80
              return 95
            })
            .strength(0.4),
        )
        .force('charge', d3.forceManyBody().strength(-280))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .force(
          'collision',
          d3.forceCollide((d: any) => nodeRadius(d) + 14),
        )
        .force('x', d3.forceX(W / 2).strength(0.03))
        .force('y', d3.forceY(H / 2).strength(0.03))

      simulationRef.current = simulation

      // Draw links
      const linkG = gSel.append('g').attr('class', 'links')
      const linkSel = linkG
        .selectAll<SVGLineElement, any>('line')
        .data(simLinks)
        .join('line')
        .attr('stroke', (d) => (LINK_CONFIG[d.rel] || { color: '#aaa' }).color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', (d) => (LINK_CONFIG[d.rel] || { dash: '' }).dash)
        .attr('marker-end', (d) => `url(#arrow-${d.rel})`)
        .attr('opacity', 0.7)

      linkSelRef.current = linkSel

      // Link labels
      const linkLabelG = gSel.append('g').attr('class', 'link-labels')
      const linkTextSel = linkLabelG
        .selectAll<SVGTextElement, any>('text')
        .data(simLinks)
        .join('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('fill', (d) => (LINK_CONFIG[d.rel] || { color: '#999' }).color)
        .attr('dy', -3)
        .text((d) => (LINK_CONFIG[d.rel] || { label: d.rel }).label)

      linkTextSelRef.current = linkTextSel

      // Draw node groups
      const nodeG = gSel.append('g').attr('class', 'nodes')
      const nodeSel = nodeG
        .selectAll<SVGGElement, any>('g')
        .data(simNodes)
        .join('g')
        .attr('cursor', 'pointer')
        .call(
          d3.drag<SVGGElement, any>()
            .on('start', (e, d) => {
              if (!e.active) simulation.alphaTarget(0.3).restart()
              d.fx = d.x
              d.fy = d.y
            })
            .on('drag', (e, d) => {
              d.fx = e.x
              d.fy = e.y
            })
            .on('end', (e, d) => {
              if (!e.active) simulation.alphaTarget(0)
              d.fx = null
              d.fy = null
            }),
        )
        .on('click', (e, d) => {
          e.stopPropagation()
          handleNodeClick(d)
        })
        .on('mouseenter', (e, d) => {
          const rect = container.getBoundingClientRect()
          const connCount = simLinks.filter((l) => sourceId(l) === d.id || targetId(l) === d.id).length
          setTooltip({
            visible: true,
            x: e.clientX - rect.left + 12,
            y: e.clientY - rect.top - 8,
            node: d,
            connCount,
          })
        })
        .on('mousemove', (e) => {
          const rect = container.getBoundingClientRect()
          let x = e.clientX - rect.left + 12
          let y = e.clientY - rect.top - 8
          if (x + 160 > rect.width) x -= 170
          if (y + 80 > rect.height) y -= 90
          setTooltip((prev) => ({ ...prev, x, y }))
        })
        .on('mouseleave', () => {
          setTooltip((prev) => ({ ...prev, visible: false }))
        })

      nodeSelRef.current = nodeSel

      // Node shapes
      nodeSel.each(function (d) {
        const el = d3.select(this)
        const cfg = NODE_CONFIG[d.type] || { color: '#999', stroke: '#555', radius: 14, label: d.type, shape: 'circle' as const }
        const r = nodeRadius(d)
        const shape = cfg.shape || 'circle'

        if (shape === 'rect') {
          el.append('rect')
            .attr('x', -r)
            .attr('y', -r * 0.75)
            .attr('width', r * 2)
            .attr('height', r * 1.5)
            .attr('rx', 4)
            .attr('ry', 4)
            .attr('fill', cfg.color)
            .attr('stroke', cfg.stroke || '#555')
            .attr('stroke-width', 2)
        } else if (shape === 'hexagon') {
          el.append('polygon')
            .attr('points', hexPoints(r))
            .attr('fill', cfg.color)
            .attr('stroke', cfg.stroke || '#555')
            .attr('stroke-width', 2)
        } else if (shape === 'diamond') {
          el.append('polygon')
            .attr('points', `0,${-r} ${r},0 0,${r} ${-r},0`)
            .attr('fill', cfg.color)
            .attr('stroke', cfg.stroke || '#555')
            .attr('stroke-width', 2)
        } else {
          el.append('circle')
            .attr('r', r)
            .attr('fill', cfg.color)
            .attr('stroke', cfg.stroke || '#555')
            .attr('stroke-width', 2)
        }
      })

      // Node icon text
      nodeSel
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', (d) => nodeRadius(d) * 0.75)
        .attr('fill', '#fff')
        .attr('pointer-events', 'none')
        .text((d) => nodeIcon(d.type))

      // Node name labels
      nodeSel
        .append('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'middle')
        .attr('dy', (d) => nodeRadius(d) + 12)
        .attr('font-size', 11)
        .attr('fill', '#333')
        .attr('pointer-events', 'none')
        .text((d) => truncate(d.label, 8))

      // Tick
      simulation.on('tick', () => {
        linkSel
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => targetPoint(d).x)
          .attr('y2', (d: any) => targetPoint(d).y)

        linkTextSel
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2)

        nodeSel.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      })

      // Click on empty space to deselect
      svg.on('click', () => {
        clearSelection()
      })

      return () => {
        simulation.stop()
      }
    }, [nodes, links]) // eslint-disable-line react-hooks/exhaustive-deps

    // Handle node click - highlight connected
    const handleNodeClick = useCallback(
      (d: any) => {
        const simLinks = simLinksRef.current
        const nodeSel = nodeSelRef.current
        const linkSel = linkSelRef.current

        if (!nodeSel || !linkSel) return

        const connected = new Set([d.id])
        simLinks.forEach((l) => {
          const sid = sourceId(l)
          const tid = targetId(l)
          if (sid === d.id) connected.add(tid)
          if (tid === d.id) connected.add(sid)
        })

        nodeSel.attr('opacity', (n: any) => (connected.has(n.id) ? 1 : 0.15))
        linkSel.attr('opacity', (l: any) => {
          const sid = sourceId(l)
          const tid = targetId(l)
          return sid === d.id || tid === d.id ? 1 : 0.05
        })

        onNodeSelect?.(d)
      },
      [onNodeSelect],
    )

    const clearSelection = useCallback(() => {
      const nodeSel = nodeSelRef.current
      const linkSel = linkSelRef.current
      if (!nodeSel || !linkSel) return

      nodeSel.attr('opacity', 1)
      linkSel.attr('opacity', 0.7)
      onNodeSelect?.(null)
    }, [onNodeSelect])

    // Filter by activeTypes
    useEffect(() => {
      const nodeSel = nodeSelRef.current
      const linkSel = linkSelRef.current
      const simNodes = simNodesRef.current

      if (!nodeSel || !linkSel) return

      nodeSel.attr('display', (d: any) => (activeTypes.has(d.type) ? null : 'none'))
      linkSel.attr('display', (l: any) => {
        const sid = sourceId(l)
        const tid = targetId(l)
        const sNode = simNodes.find((n) => n.id === sid)
        const tNode = simNodes.find((n) => n.id === tid)
        return sNode && activeTypes.has(sNode.type) && tNode && activeTypes.has(tNode.type)
          ? null
          : 'none'
      })
    }, [activeTypes])

    // Search highlight
    useEffect(() => {
      const nodeSel = nodeSelRef.current
      const linkSel = linkSelRef.current
      const simNodes = simNodesRef.current

      if (!nodeSel || !linkSel) return

      if (!searchKeyword.trim()) {
        nodeSel.attr('opacity', 1)
        linkSel.attr('opacity', 0.7)
        return
      }

      const kw = searchKeyword.toLowerCase()
      const matchIds = new Set<string>()
      simNodes.forEach((n) => {
        if (n.label.toLowerCase().includes(kw)) matchIds.add(n.id)
      })

      nodeSel.attr('opacity', (d: any) => (matchIds.has(d.id) ? 1 : 0.1))
      linkSel.attr('opacity', (l: any) => {
        const sid = sourceId(l)
        const tid = targetId(l)
        return matchIds.has(sid) && matchIds.has(tid) ? 0.8 : 0.05
      })
    }, [searchKeyword])

    // Toggle edge labels
    useEffect(() => {
      const linkTextSel = linkTextSelRef.current
      if (!linkTextSel) return
      linkTextSel.attr('display', showEdgeLabels ? null : 'none')
    }, [showEdgeLabels])

    const tooltipCfg = tooltip.node ? NODE_CONFIG[tooltip.node.type] : null

    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Tooltip overlay */}
        {tooltip.visible && tooltip.node && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x,
              top: tooltip.y,
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 6,
              padding: '8px 12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
              zIndex: 10,
              fontSize: 12,
              minWidth: 120,
            }}
          >
            <div style={{ color: tooltipCfg?.color || '#333', fontWeight: 600, marginBottom: 2 }}>
              {tooltipCfg?.label || tooltip.node.type}
            </div>
            <div style={{ color: '#333', fontWeight: 500 }}>{tooltip.node.label}</div>
            <div style={{ color: '#888', marginTop: 2 }}>
              连接: {tooltip.connCount} 条边
            </div>
          </div>
        )}
      </div>
    )
  },
)

ForceGraph.displayName = 'ForceGraph'

export default ForceGraph
