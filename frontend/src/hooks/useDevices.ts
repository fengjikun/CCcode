import { useState, useEffect, useCallback } from 'react'
import type { Device } from '../types/device'
import { getDevices, getDeviceTypes } from '../api/devices'

export function useDevices(params?: { keyword?: string; status?: string; type?: string }) {
  const [data, setData] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const devices = await getDevices(params)
      setData(devices)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [params?.keyword, params?.status, params?.type])

  useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load }
}

export function useDeviceTypes() {
  const [types, setTypes] = useState<string[]>([])

  const load = useCallback(async () => {
    try {
      setTypes(await getDeviceTypes())
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  return { types, reload: load }
}
