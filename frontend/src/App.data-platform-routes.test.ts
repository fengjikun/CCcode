/// <reference types="node" />
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { describe, expect, it } from 'vitest'

const appSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), './App.tsx'),
  'utf8',
)

describe('App route table data center routes', () => {
  it('registers only the retained data center pages', () => {
    expect(appSource).toContain('<Route path="/datasource" element={<DataSourcePage />} />')
    expect(appSource).toContain('<Route path="/data-platform/ingestion-jobs" element={<DataIngestionPage />} />')
    expect(appSource).toContain('<Route path="/transform" element={<TransformPage />} />')
    expect(appSource).not.toContain('<Route path="/data-platform/quality"')
    expect(appSource).not.toContain('<Route path="/data-platform/catalog"')
    expect(appSource).not.toContain('<Route path="/data-platform/governance"')
  })
})
