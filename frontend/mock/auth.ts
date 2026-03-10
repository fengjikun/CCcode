import type { MockMethod } from 'vite-plugin-mock'
import { buildLoginResponse, getAdminUser, MOCK_ACCESS_TOKEN, readBearerToken, sendJSON } from './shared'

const mocks: MockMethod[] = [
  {
    url: '/api/auth/login',
    method: 'post',
    rawResponse(req, res) {
      this.parseJson().then(body => {
        if (body.username !== 'admin' || body.password !== 'admin20260312') {
          sendJSON(res, 401, { detail: '用户名或密码错误' })
          return
        }
        sendJSON(res, 200, buildLoginResponse())
      })
    },
  },
  {
    url: '/api/auth/me',
    method: 'get',
    rawResponse(req, res) {
      if (readBearerToken(req.headers) !== MOCK_ACCESS_TOKEN) {
        sendJSON(res, 401, { detail: '未登录或 Token 失效' })
        return
      }
      sendJSON(res, 200, getAdminUser())
    },
  },
]

export default mocks
