/// <reference types="node" />
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { describe, expect, it } from 'vitest'

const appSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), './App.tsx'),
  'utf8',
)

describe('App route table data platform routes', () => {
  it('registers the extended data platform pages', () => {
    expect(appSource).toContain('<Route path="/datasource" element={<DataSourcePage />} />')
    expect(appSource).toContain('<Route path="/data-platform/ingestion-jobs" element={<DataIngestionPage />} />')
    expect(appSource).toContain('<Route path="/transform" element={<TransformPage />} />')
    expect(appSource).toContain('<Route path="/data-platform/quality" element={<DataQualityPage />} />')
    expect(appSource).toContain('<Route path="/data-platform/catalog" element={<DataCatalogPage />} />')
    expect(appSource).toContain('<Route path="/data-platform/governance" element={<DataGovernancePage />} />')
  })
})
