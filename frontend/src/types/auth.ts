export interface CurrentUser {
  id: number
  username: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: CurrentUser
}
