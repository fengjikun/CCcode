export interface GraphNode {
  id: string
  type: string
  label: string
  props?: Record<string, string>
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  rel: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface NodeConfig {
  color: string
  stroke: string
  radius: number
  label: string
  shape: 'circle' | 'rect' | 'hexagon' | 'diamond'
}

export interface LinkConfig {
  color: string
  label: string
  dash: string
}
