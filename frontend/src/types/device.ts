export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'FAULT'

export interface Device {
  id: number
  name: string
  type: string | null
  location: string | null
  status: DeviceStatus
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface DevicePayload {
  name: string
  type?: string
  location?: string
  status?: DeviceStatus
  description?: string
}
