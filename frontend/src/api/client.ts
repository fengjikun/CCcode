import { message } from 'antd'
import { clearAuthSession, getAuthToken } from '../auth/session'

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

  const token = getAuthToken()
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }
  if (body !== undefined) {
    opts.body = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(url, opts)
  } catch {
    const msg = '网络请求失败，请检查网络连接'
    message.error(msg)
    throw new Error(msg)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.detail || err.error || `请求失败：${res.status}`
    if (res.status === 401) {
      clearAuthSession()
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
    message.error(msg)
    throw new Error(msg)
  }
  if (res.status === 204) return null as T
  return res.json()
}

export async function fetchMultipart<T = any>(
  url: string,
  formData: FormData,
  method: string = 'POST',
): Promise<T> {
  if (!navigator.onLine) {
    const msg = '网络连接已断开，请检查网络后重试'
    message.error(msg)
    throw new Error(msg)
  }

  const token = getAuthToken()
  const opts: RequestInit = {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  }

  let res: Response
  try {
    res = await fetch(url, opts)
  } catch {
    const msg = '网络请求失败，请检查网络连接'
    message.error(msg)
    throw new Error(msg)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.detail || err.error || `请求失败：${res.status}`
    if (res.status === 401) {
      clearAuthSession()
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
    message.error(msg)
    throw new Error(msg)
  }
  if (res.status === 204) return null as T
  return res.json()
}
