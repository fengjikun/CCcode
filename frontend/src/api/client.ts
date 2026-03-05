import { message } from 'antd'

export async function fetchJSON<T = any>(
  url: string,
  method: string = 'GET',
  body?: unknown,
): Promise<T> {
  if (!navigator.onLine) {
    const msg = '网络连接已断开，请检查网络后重试'
    message.error(msg)
    throw new Error(msg)
  }

  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) {
    opts.body = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(url, opts)
  } catch (e) {
    const msg = '网络请求失败，请检查网络连接'
    message.error(msg)
    throw new Error(msg)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.detail || err.error || `请求失败：${res.status}`
    message.error(msg)
    throw new Error(msg)
  }
  if (res.status === 204) return null as T
  return res.json()
}
