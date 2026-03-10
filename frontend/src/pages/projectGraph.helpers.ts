import type { GraphData, GraphLink, GraphNode } from '../types/graph'
import type { ReviewItem, ReviewStatus } from '../types/projectMvp'

export const UNTYPED_ENTITY_TYPE = 'Uncategorized'

export function parseEntityTitle(title: string): { type: string; name: string } | null {
  const legacyMatch = title.match(/^(.+?)::(.+)$/)
  if (legacyMatch) {
    const type = legacyMatch[1].trim()
    const name = legacyMatch[2].trim()
    return type && name ? { type, name } : null
  }

  const suffixMatch = title.match(/^(.*?)\s*[（(]\s*([A-Za-z][\w-]*)\s*[）)]$/)
  if (suffixMatch) {
    const name = suffixMatch[1].trim()
    const type = suffixMatch[2].trim()
    return type && name ? { type, name } : null
  }

  const fallbackName = title.trim()
  if (!fallbackName) return null

  return {
    type: UNTYPED_ENTITY_TYPE,
    name: fallbackName,
  }
}

function parseEndpoint(raw: string): { type?: string; name: string } | null {
  const value = raw.trim().replace(/^\((.*)\)$/, '$1').trim()
  if (!value) return null

  const legacyMatch = value.match(/^(.+?)::(.+)$/)
  if (legacyMatch) {
    const type = legacyMatch[1].trim()
    const name = legacyMatch[2].trim()
    if (type && name) return { type, name }
  }

  const suffixMatch = value.match(/^(.*?)\s*[（(]\s*([A-Za-z][\w-]*)\s*[）)]$/)
  if (suffixMatch) {
    const name = suffixMatch[1].trim()
    const type = suffixMatch[2].trim()
    if (type && name) return { type, name }
  }

  const colonMatch = value.match(/^([^:：()（）]+)\s*[:：]\s*(.+)$/)
  if (colonMatch) {
    const type = colonMatch[1].trim()
    const name = colonMatch[2].trim()
    return type && name ? { type, name } : null
  }

  return { name: value }
}

export function parseRelationTitle(title: string): {
  domain?: string
  rel: string
  range?: string
  domainName?: string
  rangeName?: string
} | null {
  const detailMatch = title.match(/^(.+?)::(.+?)\s*-\[(.+?)\]->\s*(.+?)::(.+)$/)
  if (detailMatch) {
    const domain = detailMatch[1].trim()
    const domainName = detailMatch[2].trim()
    const rel = detailMatch[3].trim()
    const range = detailMatch[4].trim()
    const rangeName = detailMatch[5].trim()
    if (!domain || !domainName || !rel || !range || !rangeName) return null
    return { domain, rel, range, domainName, rangeName }
  }

  const bracketMatch = title.match(/^(.+?)\s*-\[(.+?)\]->\s*(.+)$/)
  if (bracketMatch) {
    const source = parseEndpoint(bracketMatch[1])
    const rel = bracketMatch[2].trim()
    const target = parseEndpoint(bracketMatch[3])
    if (!source || !rel || !target) return null
    return {
      domain: source.type,
      rel,
      range: target.type,
      domainName: source.name,
      rangeName: target.name,
    }
  }

  const arrowMatch = title.match(/^(.+?)\s*(?:→|->)\s*([A-Za-z_][\w-]*)\s*(?:→|->)\s*(.+)$/)
  if (arrowMatch) {
    const source = parseEndpoint(arrowMatch[1])
    const rel = arrowMatch[2].trim()
    const target = parseEndpoint(arrowMatch[3])
    if (!source || !rel || !target) return null
    return {
      domain: source.type,
      rel,
      range: target.type,
      domainName: source.name,
      rangeName: target.name,
    }
  }

  return null
}

export function buildGraphFromReviews(
  reviews: ReviewItem[],
  allowedStatuses: Set<ReviewStatus>,
): GraphData {
  const entityCandidates = reviews.filter(item => item.kind === 'ENTITY' && allowedStatuses.has(item.status))
  const relationCandidates = reviews.filter(item => item.kind === 'RELATION' && allowedStatuses.has(item.status))

  const nodes: GraphNode[] = []
  const keyToNodeId = new Map<string, string>()
  const typeBuckets = new Map<string, string[]>()
  const nodeLabels = new Map<string, string[]>()
  const nodesById = new Map<string, GraphNode>()

  for (const item of entityCandidates) {
    const parsed = parseEntityTitle(item.title)
    if (!parsed) continue
    const key = `${parsed.type}::${parsed.name}`
    if (keyToNodeId.has(key)) continue
    const nodeId = `node_${keyToNodeId.size + 1}`
    keyToNodeId.set(key, nodeId)
    const bucket = typeBuckets.get(parsed.type) || []
    bucket.push(nodeId)
    typeBuckets.set(parsed.type, bucket)

    const sameLabelNodes = nodeLabels.get(parsed.name) || []
    sameLabelNodes.push(nodeId)
    nodeLabels.set(parsed.name, sameLabelNodes)

    const node: GraphNode = {
      id: nodeId,
      type: parsed.type,
      label: parsed.name,
      props: {
        status: item.status,
        confidence: `${Math.round(item.confidence * 100)}%`,
        evidence: item.evidence,
      },
    }
    nodes.push(node)
    nodesById.set(nodeId, node)
  }

  const links: GraphLink[] = []
  const relTypeCursor = new Map<string, number>()

  for (const item of relationCandidates) {
    const parsed = parseRelationTitle(item.title)
    if (!parsed) continue
    let source = ''
    let target = ''

    if (parsed.domain && parsed.domainName) {
      source = keyToNodeId.get(`${parsed.domain}::${parsed.domainName}`) || ''
    }
    if (parsed.range && parsed.rangeName) {
      target = keyToNodeId.get(`${parsed.range}::${parsed.rangeName}`) || ''
    }

    const cursorKey = [
      parsed.domain || parsed.domainName || 'any',
      parsed.rel,
      parsed.range || parsed.rangeName || 'any',
    ].join('_')
    const cursor = relTypeCursor.get(cursorKey) || 0
    relTypeCursor.set(cursorKey, cursor + 1)

    if (!source && parsed.domainName) {
      const candidates = (nodeLabels.get(parsed.domainName) || []).filter(nodeId => {
        if (!parsed.domain) return true
        return nodesById.get(nodeId)?.type === parsed.domain
      })
      source = candidates[cursor % candidates.length] || ''
    }

    if (!target && parsed.rangeName) {
      const candidates = (nodeLabels.get(parsed.rangeName) || []).filter(nodeId => {
        if (!parsed.range) return true
        return nodesById.get(nodeId)?.type === parsed.range
      })
      target = candidates[cursor % candidates.length] || ''
    }

    if ((!source || !target) && parsed.domain && parsed.range) {
      const domainNodes = typeBuckets.get(parsed.domain) || []
      const rangeNodes = typeBuckets.get(parsed.range) || []
      if (domainNodes.length > 0 && rangeNodes.length > 0) {
        source ||= domainNodes[cursor % domainNodes.length]
        target ||= rangeNodes[cursor % rangeNodes.length]
      }
    }

    if (!source || !target) continue

    links.push({
      source,
      target,
      rel: parsed.rel,
    })
  }

  return { nodes, links }
}
