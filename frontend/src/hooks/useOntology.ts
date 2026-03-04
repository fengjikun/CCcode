import { useState, useEffect, useCallback } from 'react'
import type { ObjectType, LinkType, ActionType, OntologyFunction } from '../types/ontology'
import { getObjectTypes, getLinkTypes, getActionTypes, getFunctions } from '../api/ontology'

export function useObjectTypes() {
  const [data, setData] = useState<ObjectType[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await getObjectTypes()) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export function useLinkTypes() {
  const [data, setData] = useState<LinkType[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await getLinkTypes()) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export function useActionTypes() {
  const [data, setData] = useState<ActionType[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await getActionTypes()) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export function useOntologyFunctions() {
  const [data, setData] = useState<OntologyFunction[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await getFunctions()) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export function useOntologyStats() {
  const [stats, setStats] = useState({ entities: 0, relations: 0, actions: 0, functions: 0 })

  const load = useCallback(async () => {
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
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])
  return { stats, reload: load }
}
