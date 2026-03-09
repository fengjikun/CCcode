import type { CurrentUser, LoginPayload, LoginResponse } from '../types/auth'
import { fetchJSON } from './client'

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return fetchJSON<LoginResponse>('/api/auth/login', 'POST', payload)
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return fetchJSON<CurrentUser>('/api/auth/me')
}
