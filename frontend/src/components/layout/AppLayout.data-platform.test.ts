/// <reference types="node" />
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { describe, expect, it } from 'vitest'

const appLayoutSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), './AppLayout.tsx'),
  'utf8',
)

describe('AppLayout data center navigation', () => {
  it('groups the data center pages under a shared parent menu', () => {
    expect(appLayoutSource).toContain("key: 'data-platform'")
    expect(appLayoutSource).toContain("label: '数据中心'")
    expect(appLayoutSource).toContain("'/datasource'")
    expect(appLayoutSource).toContain("'/data-platform/ingestion-jobs'")
    expect(appLayoutSource).toContain("'/transform'")
    expect(appLayoutSource).not.toContain("'/data-platform/quality'")
    expect(appLayoutSource).not.toContain("'/data-platform/catalog'")
    expect(appLayoutSource).not.toContain("'/data-platform/governance'")
  })

  it('uses 数据中心 as the page title parent for the remaining data center entries', () => {
    expect(appLayoutSource).toContain("'/datasource': ['数据中心', '数据源管理']")
    expect(appLayoutSource).toContain("'/data-platform/ingestion-jobs': ['数据中心', '数据接入任务']")
    expect(appLayoutSource).toContain("'/transform': ['数据中心', '数据集准备']")
  })
})
