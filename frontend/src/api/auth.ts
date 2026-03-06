import { fetchJSON } from './client'
import type { CurrentUser, LoginPayload, LoginResponse } from '../types/auth'

const API = '/api/auth'

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const row = await fetchJSON<any>(`${API}/login`, 'POST', payload)
  const accessToken = typeof row?.accessToken === 'string'
    ? row.accessToken
    : (typeof row?.access_token === 'string' ? row.access_token : '')
  if (!accessToken) {
    throw new Error('登录响应缺少 accessToken')
  }
  const tokenType = typeof row?.tokenType === 'string'
    ? row.tokenType
    : (typeof row?.token_type === 'string' ? row.token_type : 'bearer')
  const expiresIn = typeof row?.expiresIn === 'number'
    ? row.expiresIn
    : (typeof row?.expires_in === 'number' ? row.expires_in : 0)
  const userRow = row?.user || {}
  return {
    accessToken,
    tokenType,
    expiresIn,
    user: {
      id: Number(userRow.id || 0),
      username: String(userRow.username || ''),
    },
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return fetchJSON(`${API}/me`)
}
