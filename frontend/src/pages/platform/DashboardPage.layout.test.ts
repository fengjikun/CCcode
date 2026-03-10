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
})
