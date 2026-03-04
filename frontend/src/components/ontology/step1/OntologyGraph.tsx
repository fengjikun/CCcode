import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import type { ObjectType, LinkType } from '../../../types/ontology'

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']

interface Props {
  objectTypes: ObjectType[]
  linkTypes: LinkType[]
  selectedOTId: number | null
  onSelectOT: (ot: ObjectType) => void
}

interface NodeDatum extends d3.SimulationNodeDatum {
  id: number
  name: string
  displayName: string
  color: string
}

interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  id: number
  label: string
}

const OntologyGraph: React.FC<Props> = ({ objectTypes, linkTypes, selectedOTId, onSelectOT }) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const container = svgRef.current?.parentElement
    const width = container?.clientWidth || 600
    const height = container?.clientHeight || 500

    svg.attr('width', width).attr('height', height)

    // Defs: arrow markers and glow filter
    const defs = svg.append('defs')

    defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#556')

    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const merge = filter.append('feMerge')
    merge.append('feMergeNode').attr('in', 'coloredBlur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Background
    svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#1a1d23')

    const g = svg.append('g')

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom as any)

    // Data
    const nodes: NodeDatum[] = objectTypes.map(ot => ({
      id: ot.id,
      name: ot.name,
      displayName: ot.displayName || ot.name,
      color: ot.color || COLORS[ot.id % COLORS.length],
    }))

    const nodeById = new Map(nodes.map(n => [n.id, n]))

    const links: LinkDatum[] = linkTypes
      .filter(lt => nodeById.has(lt.sourceObjectTypeId) && nodeById.has(lt.targetObjectTypeId))
      .map(lt => ({
        id: lt.id,
        source: nodeById.get(lt.sourceObjectTypeId)!,
        target: nodeById.get(lt.targetObjectTypeId)!,
        label: lt.displayName || lt.name,
      }))

    // Simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink<NodeDatum, LinkDatum>(links).id(d => d.id).distance(160))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(40))

    // Links
    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#556')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)')

    // Link labels
    const linkLabel = g
      .append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .text(d => d.label)
      .attr('fill', '#889')
      .attr('font-size', 10)
      .attr('text-anchor', 'middle')
      .attr('dy', -6)

    // Nodes
    const node = g
      .append('g')
      .selectAll<SVGGElement, NodeDatum>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, NodeDatum>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    // Glow circle (behind)
    node
      .append('circle')
      .attr('r', 22)
      .attr('fill', d => d.color)
      .attr('opacity', 0.25)
      .attr('filter', 'url(#glow)')

    // Main circle
    node
      .append('circle')
      .attr('r', 16)
      .attr('fill', d => d.color)
      .attr('stroke', d => (d.id === selectedOTId ? '#fff' : 'transparent'))
      .attr('stroke-width', 2.5)

    // Label
    node
      .append('text')
      .text(d => d.displayName)
      .attr('fill', '#ddd')
      .attr('font-size', 11)
      .attr('text-anchor', 'middle')
      .attr('dy', 30)

    node.on('click', (_event, d) => {
      const ot = objectTypes.find(o => o.id === d.id)
      if (ot) onSelectOT(ot)
    })

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as NodeDatum).x!)
        .attr('y1', d => (d.source as NodeDatum).y!)
        .attr('x2', d => (d.target as NodeDatum).x!)
        .attr('y2', d => (d.target as NodeDatum).y!)

      linkLabel
        .attr('x', d => ((d.source as NodeDatum).x! + (d.target as NodeDatum).x!) / 2)
        .attr('y', d => ((d.source as NodeDatum).y! + (d.target as NodeDatum).y!) / 2)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [objectTypes, linkTypes, selectedOTId, onSelectOT])

  return (
    <div style={{ flex: 1, background: '#1a1d23', borderRadius: 8, overflow: 'hidden', minHeight: 400 }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export default OntologyGraph
