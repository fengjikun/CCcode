/// <reference types="node" />
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { describe, expect, it } from 'vitest'

const hookSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), './useProjectWorkspace.ts'),
  'utf8',
)

describe('useProjectWorkspace polling behavior', () => {
  it('does not schedule interval-based polling for project status refresh', () => {
    expect(hookSource).not.toContain('setInterval(')
  })
})
