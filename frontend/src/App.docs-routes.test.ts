/// <reference types="node" />
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { describe, expect, it } from 'vitest'

const appSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), './App.tsx'),
  'utf8',
)

describe('App docs route', () => {
  it('exposes the standalone product introduction page at /docs', () => {
    expect(appSource).toContain("import DocsProductPage from './pages/DocsProductPage'")
    expect(appSource).toContain('<Route path="/docs" element={<DocsProductPage />} />')
  })
})
