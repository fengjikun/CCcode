# Studio Workspace Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the running L4 frontend routes from `/coworker/*` to `/studio/*` and present the area consistently as `workspace 工作台`, with no old-route compatibility.

**Architecture:** Keep the change local to the route table and layout metadata. Add a lightweight regression test that reads source files and asserts the new route keys and labels, matching the repo's existing static-source test style instead of introducing component-render test infrastructure.

**Tech Stack:** React 19, React Router, TypeScript, Vite, Vitest

---

### Task 1: Add route and label regression tests

**Files:**
- Create: `frontend/src/components/layout/AppLayout.workspace.test.ts`
- Test: `frontend/src/components/layout/AppLayout.workspace.test.ts`

**Step 1: Write the failing test**

```ts
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
    expect(appLayoutSource).toContain("label: 'workspace 工作台'")
  })

  it('uses /studio routes for the workspace menu entries', () => {
    expect(appLayoutSource).toContain("'/studio/skills'")
    expect(appLayoutSource).toContain("'/studio/agents'")
    expect(appLayoutSource).toContain("'/studio/agents/logs'")
  })

  it('uses workspace 工作台 as the page title parent for L4 pages', () => {
    expect(appLayoutSource).toContain("'/studio/agents': ['workspace 工作台', '智能体编排']")
    expect(appLayoutSource).toContain("'/studio/agents/logs': ['workspace 工作台', '智能体日志']")
    expect(appLayoutSource).toContain("'/studio/skills': ['workspace 工作台', 'Skills Hub']")
  })

  it('does not keep legacy /coworker keys in the running L4 navigation', () => {
    expect(appLayoutSource).not.toContain("'/coworker/agents'")
    expect(appLayoutSource).not.toContain("'/coworker/agents/logs'")
    expect(appLayoutSource).not.toContain("'/coworker/skills'")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/components/layout/AppLayout.workspace.test.ts`

Expected: FAIL because `AppLayout.tsx` still contains `/coworker/*` keys and `Co-worker平台`.

**Step 3: Commit the failing test**

```bash
git add frontend/src/components/layout/AppLayout.workspace.test.ts
git commit -m "test: add workspace route refresh guard"
```

### Task 2: Switch the runtime L4 routes to /studio

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx`
- Test: `frontend/src/components/layout/AppLayout.workspace.test.ts`

**Step 1: Write the failing route assertions for App.tsx**

Add a second test file:

```ts
/// <reference types="node" />
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { describe, expect, it } from 'vitest'

const appSource = readFileSync(
  resolve(dirname(new URL(import.meta.url).pathname), '../../App.tsx'),
  'utf8',
)

describe('App route table workspace refresh', () => {
  it('defines only /studio routes for the L4 pages', () => {
    expect(appSource).toContain('<Route path="/studio/agents"')
    expect(appSource).toContain('<Route path="/studio/agents/logs"')
    expect(appSource).toContain('<Route path="/studio/skills"')
    expect(appSource).not.toContain('<Route path="/coworker/agents"')
    expect(appSource).not.toContain('<Route path="/coworker/agents/logs"')
    expect(appSource).not.toContain('<Route path="/coworker/skills"')
  })
})
```

**Step 2: Run the new App route test to verify it fails**

Run: `npm test -- --run frontend/src/components/layout/AppLayout.workspace.test.ts frontend/src/App.workspace-routes.test.ts`

Expected: FAIL because `App.tsx` still defines `/coworker/*`.

**Step 3: Write the minimal implementation**

Update `frontend/src/App.tsx`:

```tsx
        {/* L4 workspace 工作台 */}
        <Route path="/studio/agents" element={<AgentStudioPage />} />
        <Route path="/studio/agents/logs" element={<AgentLogsPage />} />
        <Route path="/studio/skills" element={<SkillsMarketPage />} />
```

Update `frontend/src/components/layout/AppLayout.tsx`:

```tsx
  {
    key: 'coworker',
    icon: <RobotOutlined />,
    label: 'workspace 工作台',
    children: [
      { key: '/studio/skills', icon: <AppstoreOutlined />, label: 'Skills Hub' },
      { key: '/studio/agents', icon: <RobotOutlined />, label: '智能体编排' },
      { key: '/studio/agents/logs', icon: <FileSearchOutlined />, label: '智能体日志' },
    ],
  },
```

and:

```ts
  '/studio/agents': ['workspace 工作台', '智能体编排'],
  '/studio/agents/logs': ['workspace 工作台', '智能体日志'],
  '/studio/skills': ['workspace 工作台', 'Skills Hub'],
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --run frontend/src/components/layout/AppLayout.workspace.test.ts frontend/src/App.workspace-routes.test.ts`

Expected: PASS

**Step 5: Commit the implementation**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/AppLayout.tsx frontend/src/App.workspace-routes.test.ts frontend/src/components/layout/AppLayout.workspace.test.ts
git commit -m "feat: move workspace routes to studio"
```

### Task 3: Verify build and remove leftover runtime references

**Files:**
- Modify: none
- Test: `frontend/src/App.workspace-routes.test.ts`
- Test: `frontend/src/components/layout/AppLayout.workspace.test.ts`

**Step 1: Run the focused tests**

Run: `npm test -- --run frontend/src/App.workspace-routes.test.ts frontend/src/components/layout/AppLayout.workspace.test.ts`

Expected: PASS

**Step 2: Run the frontend production build**

Run: `npm run build`

Expected: Vite build completes without TypeScript or route-related errors.

**Step 3: Search for leftover running-frontend coworker references**

Run: `rg -n "/coworker/|Co-worker平台" frontend/src/App.tsx frontend/src/components/layout frontend/src/pages/platform`

Expected: no matches tied to active L4 route definitions or page-title metadata.

**Step 4: Commit the verification checkpoint**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/AppLayout.tsx frontend/src/App.workspace-routes.test.ts frontend/src/components/layout/AppLayout.workspace.test.ts
git commit -m "chore: verify studio workspace route refresh"
```
