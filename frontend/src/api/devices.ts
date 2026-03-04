import { fetchJSON } from './client'
import type { Device, DevicePayload } from '../types/device'

const API = '/api/devices'

export function getDevices(params?: {
  keyword?: string
  status?: string
  type?: string
}): Promise<Device[]> {
  const query = new URLSearchParams()
  if (params?.keyword) query.append('keyword', params.keyword)
  if (params?.status) query.append('status', params.status)
  if (params?.type) query.append('type', params.type)
  const qs = query.toString()
  return fetchJSON(`${API}${qs ? '?' + qs : ''}`)
}

export function getDevice(id: number): Promise<Device> {
  return fetchJSON(`${API}/${id}`)
}

export function getDeviceTypes(): Promise<string[]> {
  return fetchJSON(`${API}/types`)
}

export function createDevice(payload: DevicePayload): Promise<Device> {
  return fetchJSON(API, 'POST', payload)
}

export function updateDevice(id: number, payload: DevicePayload): Promise<Device> {
  return fetchJSON(`${API}/${id}`, 'PUT', payload)
}

export function deleteDevice(id: number): Promise<void> {
  return fetchJSON(`${API}/${id}`, 'DELETE')
}
