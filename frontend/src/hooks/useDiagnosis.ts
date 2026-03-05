import { useState, useEffect, useCallback } from 'react'
import type { Phenomenon, DiagnosisRecord } from '../types/diagnosis'
import { getPhenomena, getDiagnosisRecords } from '../api/diagnosis'

export function usePhenomena() {
  const [data, setData] = useState<Phenomenon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getPhenomena())
    } catch (e: any) {
      setError(e?.message || '加载故障现象失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load }
}

export function useFaultRecords() {
  const [data, setData] = useState<DiagnosisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getDiagnosisRecords())
    } catch (e: any) {
      setError(e?.message || '加载诊断记录失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load }
}
