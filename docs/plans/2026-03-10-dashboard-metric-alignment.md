# Dashboard Metric Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make dashboard counts for data sources, ontology projects, and digital humans match the existing source pages.

**Architecture:** Keep `frontend/src/api/dashboard.ts` as the dashboard-facing API, but turn it into a small aggregation layer over the source feature APIs. Update `DashboardPage.tsx` to render the aligned counts from fetched stats instead of hardcoded pipeline values for L1, L3, and L7.

**Tech Stack:** React 19, TypeScript, Vite, Vitest

---

### Task 1: Add a failing dashboard aggregation API test

**Files:**
- Create: `frontend/src/api/dashboard.test.ts`
- Modify: `frontend/src/api/dashboard.ts`
- Test: `frontend/src/api/dashboard.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('./dataSource', () => ({
  listDataSources: vi.fn(async () => [{ id: 'ds-1' }, { id: 'ds-2' }]),
}))

vi.mock('./projectManagement', () => ({
  listProjects: vi.fn(async () => [{ id: 'proj-1' }, { id: 'proj-2' }, { id: 'proj-3' }]),
}))

vi.mock('./digitalHuman', () => ({
  listDigitalHumans: vi.fn(async () => [{ id: 'dh-1' }]),
}))

it('aggregates aligned counts from the source feature APIs', async () => {
  const stats = await getPlatformStats()
  expect(stats.datasources).toBe(2)
  expect(stats.ontologyProjects).toBe(3)
  expect(stats.digitalWorkers).toBe(1)
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/api/dashboard.test.ts`
Expected: FAIL because `getPlatformStats()` still returns dashboard store constants and does not expose `ontologyProjects`

**Step 3: Write minimal implementation**

```ts
const [dataSources, projects, digitalHumans] = await Promise.all([
  listDataSources(),
  listProjects(),
  listDigitalHumans(),
])

return {
  ...store.stats,
  datasources: dataSources.length,
  ontologyProjects: projects.length,
  digitalWorkers: digitalHumans.length,
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/api/dashboard.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/api/dashboard.ts frontend/src/api/dashboard.test.ts
git commit -m "test: aggregate aligned dashboard metrics"
```

### Task 2: Update dashboard labels and pipeline rendering

**Files:**
- Modify: `frontend/src/pages/platform/DashboardPage.tsx`
- Test: `frontend/src/pages/platform/DashboardPage.layout.test.ts`

**Step 1: Write the failing test**

```ts
it('uses ontology project wording instead of object types', () => {
  expect(dashboardPageSource).toContain('本体项目')
  expect(dashboardPageSource).not.toContain('Object Types')
})
```

```ts
it('does not hardcode old aligned pipeline counts', () => {
  expect(dashboardPageSource).not.toContain("count: 24")
  expect(dashboardPageSource).not.toContain("count: 89")
  expect(dashboardPageSource).not.toContain("count: 15")
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/platform/DashboardPage.layout.test.ts`
Expected: FAIL because the page still uses `Object Types` and hardcoded pipeline counts

**Step 3: Write minimal implementation**

```tsx
const stages: Stage[] = [
  { key: 'L1', count: stats.datasources, ... },
  { key: 'L3', count: stats.ontologyProjects, ... },
  { key: 'L7', count: stats.digitalWorkers, ... },
]
```

```tsx
{ title: '本体项目', value: stats.ontologyProjects, ... }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/platform/DashboardPage.layout.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/pages/platform/DashboardPage.tsx frontend/src/pages/platform/DashboardPage.layout.test.ts
git commit -m "feat: align dashboard labels and pipeline counts"
```

### Task 3: Run focused regression checks

**Files:**
- Test: `frontend/src/api/dashboard.test.ts`
- Test: `frontend/src/pages/platform/DashboardPage.layout.test.ts`

**Step 1: Run focused tests**

Run: `npm test -- --run src/api/dashboard.test.ts src/pages/platform/DashboardPage.layout.test.ts`
Expected: PASS with all targeted tests green

**Step 2: Run full frontend test suite**

Run: `npm test`
Expected: PASS with no failing test files

**Step 3: Run frontend build**

Run: `npm run build`
Expected: PASS with TypeScript compilation and Vite build succeeding

**Step 4: Commit**

```bash
git add docs/plans/2026-03-10-dashboard-metric-alignment-design.md docs/plans/2026-03-10-dashboard-metric-alignment.md
git commit -m "docs: add dashboard metric alignment plan"
```
