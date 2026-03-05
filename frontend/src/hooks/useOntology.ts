import { useState, useEffect, useCallback } from 'react'
import type { ObjectType, LinkType, ActionType, OntologyFunction } from '../types/ontology'
import { getObjectTypes, getLinkTypes, getActionTypes, getFunctions } from '../api/ontology'

export function useObjectTypes() {
  const [data, setData] = useState<ObjectType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setData(await getObjectTypes()) }
    catch (e: any) { setError(e?.message || '加载实体类型失败') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function useLinkTypes() {
  const [data, setData] = useState<LinkType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setData(await getLinkTypes()) }
    catch (e: any) { setError(e?.message || '加载关系类型失败') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function useActionTypes() {
  const [data, setData] = useState<ActionType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setData(await getActionTypes()) }
    catch (e: any) { setError(e?.message || '加载动作类型失败') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function useOntologyFunctions() {
  const [data, setData] = useState<OntologyFunction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setData(await getFunctions()) }
    catch (e: any) { setError(e?.message || '加载函数失败') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function useOntologyStats() {
  const [stats, setStats] = useState({ entities: 0, relations: 0, actions: 0, functions: 0 })
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [ots, lts, ats, fns] = await Promise.all([
        getObjectTypes(), getLinkTypes(), getActionTypes(), getFunctions(),
      ])
      setStats({
        entities: ots.length,
        relations: lts.length,
        actions: ats.length,
        functions: fns.length,
      })
    } catch (e: any) { setError(e?.message || '加载统计数据失败') }
  }, [])

  useEffect(() => { load() }, [load])
  return { stats, error, reload: load }
}
