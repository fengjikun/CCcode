/// <reference types="node" />
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { describe, expect, it } from 'vitest'

const appSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), './App.tsx'),
  'utf8',
)

describe('App route table workspace refresh', () => {
  it('defines only /studio routes for the L4 pages', () => {
    expect(appSource).toContain('<Route path="/studio/agents"')
    expect(appSource).toContain('<Route path="/studio/agents/logs"')
    expect(appSource).toContain('<Route path="/studio/skills"')
    expect(appSource).not.toContain('<Route path="/coworker/agents"')
    expect(appSource).not.toContain('<Route path="/coworker/agents/logs"')
    expect(appSource).not.toContain('<Route path="/coworker/skills"')
  })

  it('defines nested routes for the gateway secondary menu', () => {
    expect(appSource).toContain('<Route path="/model-lab/gateway" element={<Navigate to="/model-lab/gateway/models" replace />} />')
    expect(appSource).toContain('<Route path="/model-lab/gateway/models" element={<GatewayModelsPage />} />')
    expect(appSource).toContain('<Route path="/model-lab/gateway/api-keys" element={<GatewayApiKeysPage />} />')
    expect(appSource).toContain('<Route path="/model-lab/gateway/usage" element={<GatewayUsagePage />} />')
  })
})
