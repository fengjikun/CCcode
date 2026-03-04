import { useState, useEffect, useCallback } from 'react'
import type { Phenomenon, DiagnosisRecord } from '../types/diagnosis'
import { getPhenomena, getDiagnosisRecords } from '../api/diagnosis'

export function usePhenomena() {
  const [data, setData] = useState<Phenomenon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPhenomena()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}

export function useFaultRecords() {
  const [data, setData] = useState<DiagnosisRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getDiagnosisRecords())
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, reload: load }
}
