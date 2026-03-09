import { fetchJSON } from './client'

const BASE = '/api/mock-store'

export async function ensureMockStore<T>(namespace: string, defaults: T): Promise<T> {
  return fetchJSON<T>(`${BASE}/${namespace}/ensure`, 'POST', defaults)
}

export async function getMockStore<T>(namespace: string): Promise<T> {
  return fetchJSON<T>(`${BASE}/${namespace}`)
}

export async function setMockStore<T>(namespace: string, value: T): Promise<T> {
  return fetchJSON<T>(`${BASE}/${namespace}`, 'PUT', value)
}

export async function resetMockStore(namespace: string): Promise<void> {
  await fetchJSON<void>(`${BASE}/${namespace}`, 'DELETE')
}
