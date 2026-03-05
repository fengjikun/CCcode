import { fetchJSON } from './client'
import type { CurrentUser, LoginPayload, LoginResponse } from '../types/auth'

const API = '/api/auth'
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH !== 'false'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms)
  })
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  if (USE_MOCK_AUTH) {
    await sleep(160)
    if (!payload.username || !payload.password) {
      throw new Error('请输入账号和密码')
    }
    return {
      accessToken: `mock_token_${payload.username}`,
      tokenType: 'bearer',
      expiresIn: 86400,
      user: {
        id: 1,
        username: payload.username,
      },
    }
  }
  return fetchJSON(`${API}/login`, 'POST', payload)
}

export async function getCurrentUser(): Promise<CurrentUser> {
  if (USE_MOCK_AUTH) {
    await sleep(100)
    return {
      id: 1,
      username: 'mock-user',
    }
  }
  return fetchJSON(`${API}/me`)
}
