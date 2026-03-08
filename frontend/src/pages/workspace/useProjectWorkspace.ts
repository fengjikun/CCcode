import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { getProjectDetail } from '../../api/projectManagement'
import type { AiInsightRun, ExtractionRun, ProjectDetail } from '../../types/projectMvp'
import { getErrorMessage } from './helpers'
import type { LinkType, ObjectType } from '../../types/ontology'
import type { TabKey, SchemaViewModel } from './types'

export function useProjectWorkspace(projectId: string | undefined) {
  const navigate = useNavigate()

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('documents')
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  const aiInsightRunStatusRef = useRef<{ id: string; status: AiInsightRun['status'] } | null>(null)
  const extractionRunStatusRef = useRef<{ id: string; status: ExtractionRun['status'] } | null>(null)

  const loadProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const result = await getProjectDetail(projectId)
      setProject(result)
      if (!activeRunId && result.runs.length > 0) {
        setActiveRunId(result.runs[0].id)
      }
    } catch (error: unknown) {
      message.error(getErrorMessage(error, '加载本体失败'))
      navigate('/ontology/projects', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [activeRunId, navigate, projectId])

  useEffect(() => {
    void loadProject()
  }, [loadProject])

  // Poll while any run is active
  useEffect(() => {
    if (!projectId || !project) return
    const hasRunning = project.runs.some(run => run.status === 'RUNNING') || project.aiInsightRun?.status === 'RUNNING'
    if (!hasRunning) return

    const timer = window.setInterval(() => {
      void loadProject()
    }, 2000)

    return () => {
      window.clearInterval(timer)
    }
  }, [loadProject, project, projectId])

  // Notify when AI insight run completes/fails
  useEffect(() => {
    const aiInsightRun = project?.aiInsightRun
    if (!aiInsightRun) {
      aiInsightRunStatusRef.current = null
      return
    }
    const prev = aiInsightRunStatusRef.current
    if (prev && prev.id === aiInsightRun.id && prev.status === 'RUNNING' && aiInsightRun.status === 'COMPLETED') {
      message.success(`AI洞察完成：新增实体 ${aiInsightRun.addedEntityCount}，新增关系 ${aiInsightRun.addedRelationCount}`)
    }
    if (prev && prev.id === aiInsightRun.id && prev.status === 'RUNNING' && aiInsightRun.status === 'FAILED') {
      message.error(aiInsightRun.errorMessage || 'AI洞察执行失败')
    }
    aiInsightRunStatusRef.current = { id: aiInsightRun.id, status: aiInsightRun.status }
  }, [project?.aiInsightRun])

  // Notify when extraction run completes/fails
  useEffect(() => {
    const latestExtractionRun = project?.runs?.[0]
    if (!latestExtractionRun) {
      extractionRunStatusRef.current = null
      return
    }
    const prev = extractionRunStatusRef.current
    if (prev && prev.id === latestExtractionRun.id && prev.status === 'RUNNING' && latestExtractionRun.status === 'COMPLETED') {
      message.success(
        `全量抽取完成：候选实体 ${latestExtractionRun.candidateEntityCount}，候选关系 ${latestExtractionRun.candidateRelationCount}`,
      )
    }
    if (prev && prev.id === latestExtractionRun.id && prev.status === 'RUNNING' && latestExtractionRun.status === 'FAILED') {
      message.error(latestExtractionRun.errorMessage || '全量抽取执行失败')
    }
    extractionRunStatusRef.current = { id: latestExtractionRun.id, status: latestExtractionRun.status }
  }, [project?.runs])

  const selectedRun = useMemo(() => {
    if (!project) return null
    if (activeRunId) {
      const run = project.runs.find(item => item.id === activeRunId)
      if (run) return run
    }
    return project.runs[0] || null
  }, [activeRunId, project])

  const schemaViewModel = useMemo<SchemaViewModel>(() => {
    const entities = project?.schemaConfig.entityTypes || []
    const relations = project?.schemaConfig.relationTypes || []

    const objectTypes: ObjectType[] = []
    const linkTypes: LinkType[] = []

    const graphObjectTypeIdByEntityId = new Map<string, number>()
    const entityIdByGraphObjectTypeId = new Map<number, string>()
    const objectTypeIdByEntityName = new Map<string, number>()
    const relationIssuesById = new Map<string, { missingDomain: boolean; missingRange: boolean }>()
    const edgeStatsByEntityId = new Map<string, { incoming: number; outgoing: number }>()
    const virtualObjectTypeIdByName = new Map<string, number>()

    let nextObjectTypeId = 1

    entities.forEach(entity => {
      const objectTypeId = nextObjectTypeId
      nextObjectTypeId += 1

      objectTypes.push({
        id: objectTypeId,
        name: entity.name,
        displayName: entity.name,
        description: entity.description || '',
      })
      graphObjectTypeIdByEntityId.set(entity.id, objectTypeId)
      entityIdByGraphObjectTypeId.set(objectTypeId, entity.id)
      objectTypeIdByEntityName.set(entity.name, objectTypeId)
      edgeStatsByEntityId.set(entity.id, { incoming: 0, outgoing: 0 })
    })

    const ensureVirtualObjectTypeId = (entityName: string): number => {
      const normalizedName = entityName.trim() || '(空名称)'
      const cachedId = virtualObjectTypeIdByName.get(normalizedName)
      if (cachedId) return cachedId

      const objectTypeId = nextObjectTypeId
      nextObjectTypeId += 1
      virtualObjectTypeIdByName.set(normalizedName, objectTypeId)
      objectTypes.push({
        id: objectTypeId,
        name: `__missing__${normalizedName}`,
        displayName: `未匹配实体: ${normalizedName}`,
        description: '关系引用了不存在的实体类型，请修正 domain / range。',
        color: '#8c8c8c',
      })
      return objectTypeId
    }

    relations.forEach((relation, index) => {
      let sourceObjectTypeId = objectTypeIdByEntityName.get(relation.domain)
      let targetObjectTypeId = objectTypeIdByEntityName.get(relation.range)

      const missingDomain = !sourceObjectTypeId
      const missingRange = !targetObjectTypeId
      if (missingDomain || missingRange) {
        relationIssuesById.set(relation.id, { missingDomain, missingRange })
      }

      if (!sourceObjectTypeId) sourceObjectTypeId = ensureVirtualObjectTypeId(relation.domain)
      if (!targetObjectTypeId) targetObjectTypeId = ensureVirtualObjectTypeId(relation.range)

      linkTypes.push({
        id: index + 1,
        name: relation.name,
        displayName: relation.name,
        sourceObjectTypeId,
        targetObjectTypeId,
        cardinality: 'N:N',
        description: relation.description || undefined,
      })

      const sourceEntityId = entityIdByGraphObjectTypeId.get(sourceObjectTypeId)
      if (sourceEntityId) {
        const stats = edgeStatsByEntityId.get(sourceEntityId)
        if (stats) stats.outgoing += 1
      }

      const targetEntityId = entityIdByGraphObjectTypeId.get(targetObjectTypeId)
      if (targetEntityId) {
        const stats = edgeStatsByEntityId.get(targetEntityId)
        if (stats) stats.incoming += 1
      }
    })

    return {
      entities,
      relations,
      objectTypes,
      linkTypes,
      graphObjectTypeIdByEntityId,
      entityIdByGraphObjectTypeId,
      relationIssuesById,
      edgeStatsByEntityId,
      virtualObjectTypeCount: virtualObjectTypeIdByName.size,
    }
  }, [project?.schemaConfig.entityTypes, project?.schemaConfig.relationTypes])

  // Stable graph data: only update when node/edge content actually changes (avoids D3 flicker on polling)
  const [stableGraphData, setStableGraphData] = useState<{ objectTypes: ObjectType[]; linkTypes: LinkType[] }>(
    () => ({ objectTypes: schemaViewModel.objectTypes, linkTypes: schemaViewModel.linkTypes }),
  )
  const graphFingerprint = schemaViewModel.objectTypes.map(o => `${o.id}:${o.name}:${o.color}`).join('|')
    + '##' + schemaViewModel.linkTypes.map(l => `${l.id}:${l.sourceObjectTypeId}:${l.targetObjectTypeId}`).join('|')

  useEffect(() => {
    setStableGraphData({ objectTypes: schemaViewModel.objectTypes, linkTypes: schemaViewModel.linkTypes })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphFingerprint])

  const aiInsightRun = project?.aiInsightRun
  const aiInsightBusy = aiInsightRun?.status === 'RUNNING'
  const extractionBusy = Boolean(project?.runs.some(run => run.status === 'RUNNING'))
  const enabledDocuments = project?.documents.filter(item => item.enabled) || []
  const enabledDataSources = project?.dataSources.filter(item => item.enabled) || []
  const projectVersions = project?.versions || []
  const skillList = project?.schemaConfig.skills || []

  return {
    project,
    loading,
    loadProject,
    navigate,
    activeTab,
    setActiveTab,
    activeRunId,
    setActiveRunId,
    selectedRun,
    schemaViewModel,
    stableGraphData,
    aiInsightRun,
    aiInsightBusy,
    extractionBusy,
    enabledDocuments,
    enabledDataSources,
    projectVersions,
    skillList,
  }
}
