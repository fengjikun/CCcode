import { describe, expect, it } from 'vitest'

import { buildProjectWorkspacePath, resolveWorkspaceTab } from './navigation'

describe('workspace navigation helpers', () => {
  it('returns the tab from query params when it is valid', () => {
    expect(resolveWorkspaceTab(new URLSearchParams('tab=extraction'))).toBe('extraction')
  })

  it('falls back to documents when the query param is missing or invalid', () => {
    expect(resolveWorkspaceTab(new URLSearchParams(''))).toBe('documents')
    expect(resolveWorkspaceTab(new URLSearchParams('tab=unknown'))).toBe('documents')
  })

  it('builds a workspace path that preserves the requested tab', () => {
    expect(buildProjectWorkspacePath('proj-1', 'extraction')).toBe('/ontology/projects/proj-1?tab=extraction')
  })
})
