/// <reference types="node" />
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { describe, expect, it } from 'vitest'

const appSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), './App.tsx'),
  'utf8',
)

const appLayoutSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), './components/layout/AppLayout.tsx'),
  'utf8',
)

describe('App digital worker routes', () => {
  it('registers the technical AI worker config route', () => {
    expect(appSource).toContain('<Route path="/digital-worker/dic/:id" element={<DICWorkerConfigPage />} />')
  })

  it('uses digital worker breadcrumbs for the technical AI worker config page', () => {
    expect(appLayoutSource).toContain("if (pathname.match(/^\\/digital-worker\\/dic\\/.+$/)) return ['数字员工应用', '技术AI员工配置']")
  })
})
