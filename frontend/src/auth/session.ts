import type { CurrentUser } from '../types/auth'

const TOKEN_KEY = 'cc_auth_token'
const USER_KEY = 'cc_auth_user'

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getAuthUser(): CurrentUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<CurrentUser>
    if (typeof parsed.id === 'number' && typeof parsed.username === 'string') {
      return { id: parsed.id, username: parsed.username }
    }
  } catch {
    return null
  }
  return null
}

export function setAuthSession(token: string, user: CurrentUser): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken())
}
