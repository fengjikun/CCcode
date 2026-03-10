/// <reference types="node" />
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { describe, expect, it } from 'vitest'

const appLayoutSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), './AppLayout.tsx'),
  'utf8',
)

describe('AppLayout workspace route refresh', () => {
  it('keeps the L4 menu labeled as workspace 工作台', () => {
    expect(appLayoutSource).toContain("label: 'Workspace 工作台'")
  })

  it('uses /studio routes for the workspace menu entries', () => {
    expect(appLayoutSource).toContain("'/studio/skills'")
    expect(appLayoutSource).toContain("'/studio/agents'")
    expect(appLayoutSource).toContain("'/studio/agents/logs'")
  })

  it('groups datasource and dataset prep under 数据平台', () => {
    expect(appLayoutSource).toContain("key: 'data-platform'")
    expect(appLayoutSource).toContain("label: '数据平台'")
    expect(appLayoutSource).toContain("{ key: '/datasource', icon: <DatabaseOutlined />, label: '数据源' }")
    expect(appLayoutSource).toContain("{ key: '/transform', icon: <FileSearchOutlined />, label: '数据集准备' }")
    expect(appLayoutSource).toContain("'/transform': ['数据平台', '数据集准备']")
    expect(appLayoutSource).toContain("'/datasource': ['数据平台', '数据源管理']")
  })

  it('uses workspace 工作台 as the page title parent for L4 pages', () => {
    expect(appLayoutSource).toContain("'/studio/agents': ['workspace 工作台', '智能体编排']")
    expect(appLayoutSource).toContain("'/studio/agents/logs': ['workspace 工作台', '智能体日志']")
    expect(appLayoutSource).toContain("'/studio/skills': ['workspace 工作台', 'Skills Hub']")
  })

  it('defines gateway secondary menu entries under model center', () => {
    expect(appLayoutSource).toContain("key: 'model-lab-gateway'")
    expect(appLayoutSource).toContain("'/model-lab/gateway/models'")
    expect(appLayoutSource).toContain("'/model-lab/gateway/api-keys'")
    expect(appLayoutSource).toContain("'/model-lab/gateway/usage'")
  })

  it('does not keep legacy /coworker keys in the running L4 navigation', () => {
    expect(appLayoutSource).not.toContain("key: 'coworker'")
    expect(appLayoutSource).not.toContain("'/coworker/agents'")
    expect(appLayoutSource).not.toContain("'/coworker/agents/logs'")
    expect(appLayoutSource).not.toContain("'/coworker/skills'")
  })
})
