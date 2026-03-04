import { message } from 'antd'

export async function fetchJSON<T = any>(
  url: string,
  method: string = 'GET',
  body?: unknown,
): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) {
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(url, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.detail || err.error || `请求失败：${res.status}`
    message.error(msg)
    throw new Error(msg)
  }
  if (res.status === 204) return null as T
  return res.json()
}
