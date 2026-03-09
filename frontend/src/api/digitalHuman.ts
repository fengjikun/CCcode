import type { DigitalHuman, DigitalHumanType } from '../types/digitalHuman'
import { ensureMockStore, setMockStore } from './mockStoreClient'

const STORE_KEY = 'digital-humans'

interface DHStore {
  items: DigitalHuman[]
}

const DEFAULT_STORE: DHStore = {
  items: [
    {
      id: 'dh-default-device-fault',
      name: '设备运维诊断专员',
      type: 'fault-repair',
      description: '基于设备本体与故障知识图谱，智能监控告警与处置建议。',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
}

async function loadStore(): Promise<DHStore> {
  return ensureMockStore<DHStore>(STORE_KEY, DEFAULT_STORE)
}

async function saveStore(store: DHStore): Promise<void> {
  await setMockStore(STORE_KEY, store)
}

export async function listDigitalHumans(): Promise<DigitalHuman[]> {
  return (await loadStore()).items
}

export async function createDigitalHuman(
  name: string,
  type: DigitalHumanType,
  description?: string,
): Promise<DigitalHuman> {
  const now = new Date().toISOString()
  const dh: DigitalHuman = {
    id: `dh-${Date.now()}`,
    name,
    type,
    description,
    createdAt: now,
    updatedAt: now,
  }
  const store = await loadStore()
  store.items.push(dh)
  await saveStore(store)
  return dh
}

export async function updateDigitalHuman(
  id: string,
  patch: Partial<Pick<DigitalHuman, 'name' | 'description' | 'projectId'>>,
): Promise<DigitalHuman | null> {
  const store = await loadStore()
  const idx = store.items.findIndex(d => d.id === id)
  if (idx < 0) return null
  store.items[idx] = { ...store.items[idx], ...patch, updatedAt: new Date().toISOString() }
  await saveStore(store)
  return store.items[idx]
}

export async function deleteDigitalHuman(id: string): Promise<void> {
  const store = await loadStore()
  store.items = store.items.filter(d => d.id !== id)
  await saveStore(store)
}

export async function getDigitalHuman(id: string): Promise<DigitalHuman | null> {
  return (await loadStore()).items.find(d => d.id === id) ?? null
}
