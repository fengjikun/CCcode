/// <reference types="node" />
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'

import { describe, expect, it } from 'vitest'

const dashboardPageSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), './DashboardPage.tsx'),
  'utf8',
)

describe('DashboardPage responsive layout regression guard', () => {
  it('avoids the old inner horizontal scroll pipeline layout', () => {
    expect(dashboardPageSource).not.toContain("overflowX: 'auto'")
  })

  it('uses responsive breakpoint props for the top stat cards', () => {
    expect(dashboardPageSource).toContain('xs={24}')
    expect(dashboardPageSource).toContain('sm={12}')
    expect(dashboardPageSource).toContain('xl={6}')
  })

  it('lets the lower health and activity sections stack on smaller widths', () => {
    expect(dashboardPageSource).toContain('<Col xs={24} xl={16}>')
    expect(dashboardPageSource).toContain('<Col xs={24} xl={8}>')
  })

  it('refreshes the lower dashboard into a business outcomes view', () => {
    expect(dashboardPageSource).toContain('业务落地成效')
    expect(dashboardPageSource).not.toContain('平台健康度监控')
    expect(dashboardPageSource).not.toContain('平台资源一览')
  })

  it('refreshes the L4 pipeline label away from Co-worker', () => {
    expect(dashboardPageSource).toContain("label: 'workspace'")
    expect(dashboardPageSource).not.toContain("label: 'Co-worker'")
  })

  it('uses ontology project wording instead of object types', () => {
    expect(dashboardPageSource).toContain('本体项目')
    expect(dashboardPageSource).not.toContain('Object Types')
  })

  it('does not hardcode the aligned pipeline counts', () => {
    expect(dashboardPageSource).not.toContain("count: 24")
    expect(dashboardPageSource).not.toContain("count: 89")
    expect(dashboardPageSource).not.toContain("count: 15")
  })
})
