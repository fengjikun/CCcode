import type { DigitalHuman, DigitalHumanType } from '../types/digitalHuman'

const STORAGE_KEY = 'digital_humans'

const DEFAULT_DIGITAL_HUMANS: DigitalHuman[] = [
  {
    id: 'dh-default-device-fault',
    name: '设备运维诊断专员',
    type: 'fault-repair',
    description: '基于设备本体与故障知识图谱，智能监控告警、精准定位根因，自动生成维修工单与处置建议。',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
]

function load(): DigitalHuman[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      save(DEFAULT_DIGITAL_HUMANS)
      return DEFAULT_DIGITAL_HUMANS
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function save(list: DigitalHuman[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function listDigitalHumans(): DigitalHuman[] {
  return load()
}

export function createDigitalHuman(
  name: string,
  type: DigitalHumanType,
  description?: string,
): DigitalHuman {
  const now = new Date().toISOString()
  const dh: DigitalHuman = {
    id: `dh-${Date.now()}`,
    name,
    type,
    description,
    createdAt: now,
    updatedAt: now,
  }
  const list = load()
  list.push(dh)
  save(list)
  return dh
}

export function updateDigitalHuman(
  id: string,
  patch: Partial<Pick<DigitalHuman, 'name' | 'description' | 'projectId'>>,
): DigitalHuman | null {
  const list = load()
  const idx = list.findIndex(d => d.id === id)
  if (idx < 0) return null
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() }
  save(list)
  return list[idx]
}

export function deleteDigitalHuman(id: string): void {
  save(load().filter(d => d.id !== id))
}

export function getDigitalHuman(id: string): DigitalHuman | null {
  return load().find(d => d.id === id) ?? null
}
