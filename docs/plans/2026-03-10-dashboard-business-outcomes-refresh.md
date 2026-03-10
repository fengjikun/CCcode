# Dashboard Business Outcomes Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reposition the dashboard homepage around business adoption and digital worker value by replacing the health table with a business outcomes board and removing the resource overview section.

**Architecture:** Keep the existing dashboard shell, pipeline overview, top stat cards, and real-time activity timeline. Replace the left-side lower section with a static business-outcomes presentation model in `DashboardPage.tsx`, and add only page-scoped styling hooks in `frontend/src/styles/global.css`.

**Tech Stack:** React, TypeScript, Ant Design 5, Vitest, shared global CSS

---

### Task 1: Lock the new homepage contract with a failing regression test

**Files:**
- Modify: `frontend/src/pages/platform/DashboardPage.layout.test.ts`
- Test: `frontend/src/pages/platform/DashboardPage.layout.test.ts`

**Step 1: Write the failing test**

- Assert that `业务落地成效` exists in the page source
- Assert that `平台健康度监控` no longer exists
- Assert that `平台资源一览` no longer exists

**Step 2: Run test to verify it fails**

Run: `npm test --prefix frontend -- DashboardPage.layout.test.ts`
Expected: FAIL because the old health and resource sections are still present.

### Task 2: Implement the business-outcomes board

**Files:**
- Modify: `frontend/src/pages/platform/DashboardPage.tsx`
- Modify: `frontend/src/styles/global.css`

**Step 1: Remove the old operations-oriented sections**

- Remove the health-table card
- Remove the resource-overview card
- Drop now-unused imports and data fetching

**Step 2: Add the new business-outcomes data model**

- Add a compact metric list for business adoption indicators
- Add a scenario list with short descriptions and status tags

**Step 3: Render the new board**

- Replace the left column card content with a business-outcomes layout
- Keep the right-side `实时活动` timeline unchanged

**Step 4: Add page-scoped styling**

- Add metric tiles, scenario cards, and small responsive adjustments
- Keep the look aligned with the existing dashboard visual language

### Task 3: Verify the refresh

**Files:**
- Modify: `frontend/src/pages/platform/DashboardPage.tsx`
- Modify: `frontend/src/styles/global.css`
- Modify: `frontend/src/pages/platform/DashboardPage.layout.test.ts`

**Step 1: Run the regression test**

Run: `npm test --prefix frontend -- DashboardPage.layout.test.ts`
Expected: PASS

**Step 2: Run the production build**

Run: `npm run build --prefix frontend`
Expected: PASS with no TypeScript or bundling errors

**Step 3: Review the diff**

Run: `git diff -- frontend/src/pages/platform/DashboardPage.tsx frontend/src/styles/global.css frontend/src/pages/platform/DashboardPage.layout.test.ts docs/plans/2026-03-10-dashboard-business-outcomes-design.md docs/plans/2026-03-10-dashboard-business-outcomes-refresh.md`
Expected: Only the dashboard refresh changes appear
