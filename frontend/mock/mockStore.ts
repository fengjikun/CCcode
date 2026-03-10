import type { MockMethod } from 'vite-plugin-mock'
import { deleteMockStore, ensureMockStore, getMockStore, setMockStore } from './shared'

const mocks: MockMethod[] = [
  {
    url: '/api/mock-store/:namespace/ensure',
    method: 'post',
    response({ query, body }) {
      return ensureMockStore(String(query.namespace), body)
    },
  },
  {
    url: '/api/mock-store/:namespace',
    method: 'get',
    response({ query }) {
      return getMockStore(String(query.namespace)) ?? null
    },
  },
  {
    url: '/api/mock-store/:namespace',
    method: 'put',
    response({ query, body }) {
      return setMockStore(String(query.namespace), body)
    },
  },
  {
    url: '/api/mock-store/:namespace',
    method: 'delete',
    response({ query }) {
      deleteMockStore(String(query.namespace))
      return null
    },
  },
]

export default mocks
