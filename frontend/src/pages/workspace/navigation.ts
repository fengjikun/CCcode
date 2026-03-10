import type { TabKey } from './types'

const DEFAULT_WORKSPACE_TAB: TabKey = 'documents'
const WORKSPACE_TABS: TabKey[] = ['documents', 'schema', 'extraction', 'actions', 'functions']

export function resolveWorkspaceTab(searchParams: URLSearchParams): TabKey {
  const tab = searchParams.get('tab')
  return tab && WORKSPACE_TABS.includes(tab as TabKey) ? (tab as TabKey) : DEFAULT_WORKSPACE_TAB
}

export function buildProjectWorkspacePath(projectId: string, tab: TabKey): string {
  return `/ontology/projects/${projectId}?tab=${tab}`
}
