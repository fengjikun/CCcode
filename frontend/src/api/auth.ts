import { fetchJSON } from './client'
import type { CurrentUser, LoginPayload, LoginResponse } from '../types/auth'

const API = '/api/auth'

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return fetchJSON(`${API}/login`, 'POST', payload)
}

export function getCurrentUser(): Promise<CurrentUser> {
  return fetchJSON(`${API}/me`)
}
