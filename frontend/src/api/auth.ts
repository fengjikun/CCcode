import type { CurrentUser, LoginPayload, LoginResponse } from '../types/auth'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function login(_payload: LoginPayload): Promise<LoginResponse> {
  await delay(600 + Math.random() * 400) // 600-1000ms 模拟登录验证
  return {
    accessToken: `mock_token_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    tokenType: 'bearer',
    expiresIn: 86400,
    user: { id: 1, username: _payload.username || 'admin' },
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  await delay(150 + Math.random() * 200)
  return { id: 1, username: 'admin' }
}
