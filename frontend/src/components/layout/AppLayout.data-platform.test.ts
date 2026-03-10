/// <reference types="node" />
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { describe, expect, it } from 'vitest'

const appLayoutSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), './AppLayout.tsx'),
  'utf8',
)

describe('AppLayout data platform navigation', () => {
  it('groups the data platform pages under a shared parent menu', () => {
    expect(appLayoutSource).toContain("key: 'data-platform'")
    expect(appLayoutSource).toContain("label: '数据平台'")
    expect(appLayoutSource).toContain("'/datasource'")
    expect(appLayoutSource).toContain("'/data-platform/ingestion-jobs'")
    expect(appLayoutSource).toContain("'/transform'")
    expect(appLayoutSource).toContain("'/data-platform/quality'")
    expect(appLayoutSource).toContain("'/data-platform/catalog'")
    expect(appLayoutSource).toContain("'/data-platform/governance'")
  })

  it('uses 数据平台 as the page title parent for all data platform entries', () => {
    expect(appLayoutSource).toContain("'/datasource': ['数据平台', '数据源管理']")
    expect(appLayoutSource).toContain("'/data-platform/ingestion-jobs': ['数据平台', '数据接入任务']")
    expect(appLayoutSource).toContain("'/transform': ['数据平台', '数据集准备']")
    expect(appLayoutSource).toContain("'/data-platform/quality': ['数据平台', '数据质量']")
    expect(appLayoutSource).toContain("'/data-platform/catalog': ['数据平台', '数据目录']")
    expect(appLayoutSource).toContain("'/data-platform/governance': ['数据平台', '数据治理']")
  })
})
